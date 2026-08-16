/**
 * Native open / reveal for photo-pick (OS default app / file manager).
 * @module dsh-photo-pick-local/native-open
 */
import { runNativeCommand } from '@deepseek-ai/dsh-native-command';
/** PowerShell single-quoted literal. */
function powershellLiteral(path) {
    return `'${path.replace(/'/g, "''")}'`;
}
/**
 * Run a PowerShell script via `-EncodedCommand` (avoids argv quoting traps).
 * @param script - PowerShell source.
 */
function powershellEncodedArgs(script) {
    return ['-NoProfile', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')];
}
/**
 * Win32 focus helper: bring exactly one HWND above the Web UI.
 * Callers must pass a single target handle — never spray-focus by title keywords.
 */
const WINDOWS_FOCUS_HELPER = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class DshFg {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
  public static void Focus(IntPtr hwnd) {
    if (hwnd == IntPtr.Zero) return;
    ShowWindow(hwnd, 9);
    uint forePid;
    IntPtr fore = GetForegroundWindow();
    uint foreTid = GetWindowThreadProcessId(fore, out forePid);
    uint curTid = GetCurrentThreadId();
    if (foreTid != curTid) AttachThreadInput(curTid, foreTid, true);
    BringWindowToTop(hwnd);
    SetForegroundWindow(hwnd);
    if (foreTid != curTid) AttachThreadInput(curTid, foreTid, false);
  }
}
"@
function Focus-Handle([IntPtr]$hwnd) { if ($hwnd -ne [IntPtr]::Zero) { [DshFg]::Focus($hwnd) } }
function Get-WindowHandleSet {
  $set = New-Object 'System.Collections.Generic.HashSet[long]'
  Get-Process | Where-Object { $_.MainWindowHandle -ne 0 } | ForEach-Object {
    [void]$set.Add([int64]$_.MainWindowHandle)
  }
  return $set
}
`;
/**
 * Reveal a path in the platform file manager (select file when supported).
 * @param path - absolute filesystem path.
 * @param signal - cancellation.
 * @param run - injectable runner (tests).
 */
export async function revealPhotoPickPath(path, signal, run = runNativeCommand) {
    try {
        if (process.platform === 'win32') {
            const winPath = path.replace(/\//g, '\\');
            const script = `${WINDOWS_FOCUS_HELPER}
$path = ${powershellLiteral(winPath)}
$dir = Split-Path -LiteralPath $path -Parent
$name = Split-Path -LiteralPath $path -Leaf
$shell = New-Object -ComObject Shell.Application
function Find-FolderWindow([string]$dirPath) {
  foreach ($w in @($shell.Windows())) {
    try {
      if ($null -ne $w.Document -and $null -ne $w.Document.Folder -and $w.Document.Folder.Self.Path -eq $dirPath) {
        return $w
      }
    } catch {}
  }
  return $null
}
$before = Get-WindowHandleSet
$win = Find-FolderWindow $dir
if ($null -eq $win) {
  $shell.Explore($dir)
  Start-Sleep -Milliseconds 500
  $win = Find-FolderWindow $dir
}
if ($null -ne $win) {
  $item = $win.Document.Folder.ParseName($name)
  if ($null -ne $item) { $win.Document.SelectItem($item, 1 + 4 + 8 + 16) }
  $win.Visible = $true
  Focus-Handle ([IntPtr]$win.HWND)
} else {
  Start-Process -FilePath explorer.exe -ArgumentList ${powershellLiteral(`/select,${winPath}`)}
  Start-Sleep -Milliseconds 500
  $after = Get-Process | Where-Object {
    $_.MainWindowHandle -ne 0 -and -not $before.Contains([int64]$_.MainWindowHandle)
  } | Select-Object -First 1
  if ($null -ne $after) { Focus-Handle ([IntPtr]$after.MainWindowHandle) }
}
`;
            await run('powershell.exe', powershellEncodedArgs(script), signal);
            return;
        }
        if (process.platform === 'darwin') {
            await run('open', ['-R', path], signal);
            return;
        }
        const { dirname } = await import('node:path');
        await run('xdg-open', [dirname(path)], signal);
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`failed to reveal path: ${detail}`);
    }
}
/**
 * Whether a failed explorer.exe spawn is the known benign exit-code-1 case.
 * @param error - runner rejection.
 */
export function isWindowsExplorerBogusFailure(error) {
    if (error === null || typeof error !== 'object')
        return false;
    const code = error.code;
    return code === 1;
}
/**
 * Open a path with the OS default application.
 * @param path - absolute filesystem path.
 * @param signal - cancellation.
 * @param run - injectable runner (tests).
 */
export async function openPhotoPickPath(path, signal, run = runNativeCommand) {
    try {
        if (process.platform === 'win32') {
            const winPath = path.replace(/\//g, '\\');
            // Only raise one new (or filename-matched) window — never every "Photos"/「图片」title.
            const script = `${WINDOWS_FOCUS_HELPER}
$path = ${powershellLiteral(winPath)}
$name = Split-Path -LiteralPath $path -Leaf
$base = [System.IO.Path]::GetFileNameWithoutExtension($name)
$before = Get-WindowHandleSet
Invoke-Item -LiteralPath $path
Start-Sleep -Milliseconds 800
$newWindows = @(Get-Process | Where-Object {
  $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -and -not $before.Contains([int64]$_.MainWindowHandle)
})
$target = $newWindows | Where-Object {
  $_.MainWindowTitle -like ("*" + $name + "*") -or $_.MainWindowTitle -like ("*" + $base + "*")
} | Select-Object -First 1
if ($null -eq $target) { $target = $newWindows | Select-Object -First 1 }
if ($null -ne $target) {
  Focus-Handle ([IntPtr]$target.MainWindowHandle)
} else {
  $wshell = New-Object -ComObject WScript.Shell
  if (-not $wshell.AppActivate($name)) { [void]$wshell.AppActivate($base) }
}
`;
            await run('powershell.exe', powershellEncodedArgs(script), signal);
            return;
        }
        if (process.platform === 'darwin') {
            await run('open', [path], signal);
            return;
        }
        await run('xdg-open', [path], signal);
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`failed to open path: ${detail}`);
    }
}
//# sourceMappingURL=native-open.js.map