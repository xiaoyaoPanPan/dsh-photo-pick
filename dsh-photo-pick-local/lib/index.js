import { basename, extname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import "@deepseek-ai/cordis";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { PhotoPick, PhotoPickError } from "dsh-photo-pick";
import z from "@deepseek-ai/schemastery";
import sharp from "sharp";
import { createReadStream, realpathSync } from "node:fs";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { runNativeCommand } from "@deepseek-ai/dsh-native-command";
import { createUserMessage } from "@deepseek-ai/dsh-llm";
//#region src/vision-image.ts
/**
* Downscale vision payloads so provider edge limits (e.g. ModelScope 2048) pass.
* Copied from `dsh-media-local/vision-image` (same raster prep contract).
* @module dsh-photo-pick-local/vision-image
*/
/** Default longest edge for vision uploads (ModelScope Qwen-VL free tier). */
const DEFAULT_VISION_MAX_EDGE_PX = 2048;
/**
* Keep images within `maxEdgePx` on the longest side; re-encode oversized
* rasters as JPEG so dimension-limited providers accept them.
* Undecodable bytes are returned unchanged so callers can still attempt upload.
* @param data - original image bytes.
* @param mediaType - caller-declared media type (re-verified by sharp when possible).
* @param maxEdgePx - longest allowed edge; values `<= 0` disable resizing.
*/
async function prepareVisionImage(data, mediaType, maxEdgePx = DEFAULT_VISION_MAX_EDGE_PX) {
	const original = Buffer.from(data);
	const sourceBytes = original.length;
	try {
		const image = sharp(original, {
			failOn: "error",
			limitInputPixels: false
		});
		const meta = await image.metadata();
		const width = meta.width ?? 0;
		const height = meta.height ?? 0;
		if (width <= 0 || height <= 0) return {
			data: original,
			mediaType,
			sourceBytes,
			sourceWidth: width,
			sourceHeight: height,
			width,
			height,
			resized: false
		};
		if (maxEdgePx <= 0 || width <= maxEdgePx && height <= maxEdgePx) return {
			data: original,
			mediaType,
			sourceBytes,
			sourceWidth: width,
			sourceHeight: height,
			width,
			height,
			resized: false
		};
		const scale = Math.min(maxEdgePx / width, maxEdgePx / height);
		const nextWidth = Math.max(1, Math.floor(width * scale));
		const nextHeight = Math.max(1, Math.floor(height * scale));
		return {
			data: await image.resize(nextWidth, nextHeight, {
				fit: "fill",
				withoutEnlargement: true
			}).jpeg({
				quality: 85,
				mozjpeg: true
			}).toBuffer(),
			mediaType: "image/jpeg",
			sourceBytes,
			sourceWidth: width,
			sourceHeight: height,
			width: nextWidth,
			height: nextHeight,
			resized: true
		};
	} catch {
		return {
			data: original,
			mediaType,
			sourceBytes,
			sourceWidth: 0,
			sourceHeight: 0,
			width: 0,
			height: 0,
			resized: false
		};
	}
}
//#endregion
//#region src/config.ts
/**
* Photo-pick-local composition / user-settings fields for vision scoring.
* Adapted from `dsh-media-local/config` (same Host LLM catalog knobs).
* @module dsh-photo-pick-local/config
*/
/** Max file bytes sent to vision by default (5 MiB). */
const DEFAULT_MAX_VISION_BYTES = 5242880;
/** Settings namespace for live vision configuration. */
const PHOTO_PICK_SETTINGS_NAMESPACE = settingsNamespace("photo-pick-local");
/** Default spacing between vision calls. */
const DEFAULT_VISION_MIN_INTERVAL_MS = 2e3;
/** Default extra attempts after a 429. */
const DEFAULT_VISION_MAX_RETRIES = 4;
/** Default base backoff for 429 retries. */
const DEFAULT_VISION_RETRY_BACKOFF_MS = 2e3;
/** Default parallel scoring workers. */
const DEFAULT_VISION_CONCURRENCY = 1;
/** Hard cap for {@link Config.visionConcurrency}. */
const MAX_VISION_CONCURRENCY = 8;
/** Default max candidates scored in one job. */
const DEFAULT_MAX_CANDIDATES = 24;
/** Default top-K picks returned. */
const DEFAULT_TOP_K = 3;
/** Schemastery schema for composition entry and user settings. */
const ConfigSchema = z.object({
	visionEnabled: z.boolean().default(true),
	visionLlmProvider: z.string().default(""),
	visionModel: z.string().default(""),
	visionScorePrompt: z.string().default(""),
	maxVisionBytes: z.number().default(DEFAULT_MAX_VISION_BYTES),
	visionMaxEdgePx: z.number().default(DEFAULT_VISION_MAX_EDGE_PX),
	visionMinIntervalMs: z.number().default(DEFAULT_VISION_MIN_INTERVAL_MS),
	visionMaxRetries: z.number().default(4),
	visionRetryBackoffMs: z.number().default(DEFAULT_VISION_RETRY_BACKOFF_MS),
	visionConcurrency: z.number().default(1)
});
/**
* Resolve a partial config into required fields.
* @param config - composition or settings section.
* @returns fully defaulted config.
*/
function resolveConfig(config = {}) {
	return {
		visionEnabled: config.visionEnabled ?? true,
		visionLlmProvider: config.visionLlmProvider ?? "",
		visionModel: config.visionModel ?? "",
		visionScorePrompt: config.visionScorePrompt ?? "",
		maxVisionBytes: config.maxVisionBytes ?? 5242880,
		visionMaxEdgePx: config.visionMaxEdgePx ?? 2048,
		visionMinIntervalMs: config.visionMinIntervalMs ?? 2e3,
		visionMaxRetries: config.visionMaxRetries ?? 4,
		visionRetryBackoffMs: config.visionRetryBackoffMs ?? 2e3,
		visionConcurrency: clampVisionConcurrency(config.visionConcurrency ?? 1)
	};
}
/**
* Clamp concurrency into `[1, {@link MAX_VISION_CONCURRENCY}]`.
* @param value - raw config number.
*/
function clampVisionConcurrency(value) {
	if (!Number.isFinite(value)) return 1;
	return Math.min(8, Math.max(1, Math.floor(value)));
}
//#endregion
//#region src/paths.ts
/**
* Root validation and path containment helpers for local photo-pick.
* Adapted from `dsh-media-local/paths` (same workspace-root policy).
* @module dsh-photo-pick-local/paths
*/
/**
* Canonicalize an existing directory path.
* @param root - caller-supplied root.
* @returns absolute realpath of a directory.
*/
async function resolveWorkspaceRoot(root) {
	const absolute = resolve(root);
	let canonical;
	try {
		canonical = await realpath(absolute);
	} catch {
		throw new PhotoPickError(`workspace root is missing or unreadable: ${absolute}`, "ROOT_MISSING");
	}
	if (!(await stat(canonical)).isDirectory()) throw new PhotoPickError(`workspace root is not a directory: ${canonical}`, "INVALID_ROOT");
	assertAllowedRoot(canonical);
	return canonical;
}
/**
* Reject drive roots and the bare user home directory.
* @param canonical - realpath directory.
*/
function assertAllowedRoot(canonical) {
	const normalized = trimSep(canonical);
	let home;
	try {
		home = trimSep(realpathSync(homedir()));
	} catch {
		home = trimSep(resolve(homedir()));
	}
	if (normalized.toLowerCase() === home.toLowerCase()) throw new PhotoPickError("refusing to use the user home directory as a photo-pick root", "INVALID_ROOT");
	const driveRoot = trimSep(parse(canonical).root);
	if (driveRoot !== "" && normalized.toLowerCase() === driveRoot.toLowerCase()) throw new PhotoPickError("refusing to use a drive or filesystem root as a photo-pick root", "INVALID_ROOT");
}
/**
* Resolve a user path under `root` and ensure it cannot escape.
* @param root - canonical workspace root.
* @param requested - absolute or root-relative path.
* @returns canonical file path that exists under root.
*/
async function resolveContainedPath(root, requested) {
	const absolute = isAbsolute(requested) ? resolve(requested) : resolve(root, requested);
	let canonical;
	try {
		canonical = await realpath(absolute);
	} catch {
		throw new PhotoPickError(`path not found under workspace root: ${requested}`, "NOT_FOUND");
	}
	const rel = relative(root, canonical);
	if (rel.startsWith("..") || isAbsolute(rel)) throw new PhotoPickError(`path escapes workspace root: ${requested}`, "PATH_ESCAPE");
	return canonical;
}
/**
* Relative path using `/` separators for stable display keys.
* @param root - canonical root.
* @param filePath - canonical file path under root.
*/
function toRelativePosix(root, filePath) {
	return relative(root, filePath).split(sep).join("/");
}
function trimSep(value) {
	return value.replace(/[/\\]+$/, "");
}
//#endregion
//#region src/discover.ts
/**
* Discover image files under a workspace root for the photo-pick UI.
* @module dsh-photo-pick-local/discover
*/
/** Image extensions listed in the photo-pick workspace panel. */
const IMAGE_EXT$1 = /* @__PURE__ */ new Set([
	".png",
	".jpg",
	".jpeg",
	".webp",
	".gif"
]);
/**
* Recursively list image files under `root`.
* @param root - canonical workspace directory.
* @param signal - cancellation.
* @param limit - soft cap on returned rows.
*/
async function walkImages(root, signal, limit = 500) {
	const out = [];
	async function walk(dir) {
		signal?.throwIfAborted();
		if (out.length >= limit) return;
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			signal?.throwIfAborted();
			if (out.length >= limit) return;
			if (entry.name.startsWith(".")) continue;
			const absolute = join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(absolute);
				continue;
			}
			if (!entry.isFile()) continue;
			if (!IMAGE_EXT$1.has(extname(entry.name).toLowerCase())) continue;
			const info = await stat(absolute);
			out.push({
				absolutePath: absolute,
				relativePath: toRelativePosix(root, absolute),
				size: info.size,
				mtimeMs: info.mtimeMs
			});
		}
	}
	await walk(root);
	out.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
	return out;
}
//#endregion
//#region src/http-json.ts
/** Write a JSON response with content-type and length. */
function writeJson$1(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"content-length": Buffer.byteLength(payload)
	});
	res.end(payload);
}
/**
* Parse `root` from a query string (`?root=`).
* @param url - request URL (pathname + search).
*/
function rootFromUrl(url) {
	if (url === void 0) return void 0;
	const q = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
	const root = new URLSearchParams(q).get("root");
	if (root === null || root.trim().length === 0) return void 0;
	return root;
}
//#endregion
//#region src/candidates-http.ts
/** Stable path for candidate listing (`?root=`). */
const PHOTO_PICK_CANDIDATES_HTTP_PATH = "/api/photo-pick/candidates";
/**
* Register GET `/api/photo-pick/candidates` when webServer is present.
* @param ctx - fiber with webServer.
*/
function registerPhotoPickCandidatesHttp(ctx) {
	return ctx.webServer.register({
		kind: "exact",
		path: PHOTO_PICK_CANDIDATES_HTTP_PATH,
		handler: (req, res) => {
			handle$4(req, res);
		}
	});
}
async function handle$4(req, res) {
	try {
		if ((req.method ?? "GET") !== "GET") {
			writeJson$1(res, 405, { error: "method-not-allowed" });
			return;
		}
		const root = rootFromUrl(req.url);
		if (root === void 0) {
			writeJson$1(res, 400, { error: "missing-root" });
			return;
		}
		const canonical = await resolveWorkspaceRoot(root);
		writeJson$1(res, 200, {
			root: canonical,
			images: (await walkImages(canonical)).map((row) => ({
				relativePath: row.relativePath,
				size: row.size,
				mtimeMs: row.mtimeMs
			}))
		});
	} catch (error) {
		writePhotoPickError(res, error);
	}
}
function writePhotoPickError(res, error) {
	if (error instanceof PhotoPickError) {
		writeJson$1(res, error.code === "ROOT_MISSING" || error.code === "INVALID_ROOT" ? 400 : 500, {
			error: error.message,
			code: error.code
		});
		return;
	}
	writeJson$1(res, 500, { error: (error instanceof Error ? error.message : String(error)).slice(0, 300) });
}
//#endregion
//#region src/file-http.ts
/**
* Loopback HTTP face for serving a root-contained image for photo-pick UI preview.
* @module dsh-photo-pick-local/file-http
*/
/** GET preview path (`?root=` + `&path=` relative). */
const PHOTO_PICK_FILE_HTTP_PATH = "/api/photo-pick/file";
const MAX_PREVIEW_BYTES = 41943040;
const IMAGE_TYPES = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif"
};
/**
* Register GET `/api/photo-pick/file` when webServer is present.
* @param ctx - fiber with webServer.
*/
function registerPhotoPickFileHttp(ctx) {
	return ctx.webServer.register({
		kind: "exact",
		path: PHOTO_PICK_FILE_HTTP_PATH,
		handler: (req, res) => {
			handle$3(req, res);
		}
	});
}
async function handle$3(req, res) {
	try {
		if ((req.method ?? "GET") !== "GET") {
			writeJson$1(res, 405, { error: "method-not-allowed" });
			return;
		}
		const parsed = parseQuery(req.url);
		if (parsed === void 0) {
			writeJson$1(res, 400, { error: "missing-root-or-path" });
			return;
		}
		const absolute = await resolveContainedPath(await resolveWorkspaceRoot(parsed.root), parsed.relativePath);
		const ext = extname(absolute).toLowerCase();
		const type = IMAGE_TYPES[ext];
		if (type === void 0) {
			writeJson$1(res, 415, { error: "unsupported-media-type" });
			return;
		}
		const info = await stat(absolute);
		if (info.size > MAX_PREVIEW_BYTES) {
			writeJson$1(res, 413, { error: "preview-too-large" });
			return;
		}
		res.writeHead(200, {
			"content-type": type,
			"content-length": info.size,
			"cache-control": "private, max-age=60"
		});
		createReadStream(absolute).pipe(res);
	} catch (error) {
		if (error instanceof PhotoPickError) {
			writeJson$1(res, error.code === "NOT_FOUND" || error.code === "PATH_ESCAPE" ? 404 : error.code === "ROOT_MISSING" || error.code === "INVALID_ROOT" ? 400 : 500, {
				error: error.message,
				code: error.code
			});
			return;
		}
		writeJson$1(res, 500, { error: (error instanceof Error ? error.message : String(error)).slice(0, 300) });
	}
}
function parseQuery(url) {
	if (url === void 0) return void 0;
	const q = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
	const params = new URLSearchParams(q);
	const root = params.get("root");
	const relativePath = params.get("path");
	if (root === null || root.trim().length === 0) return void 0;
	if (relativePath === null || relativePath.trim().length === 0) return void 0;
	return {
		root,
		relativePath
	};
}
//#endregion
//#region src/native-open.ts
/**
* Native open / reveal for photo-pick (OS default app / file manager).
* @module dsh-photo-pick-local/native-open
*/
/** PowerShell single-quoted literal. */
function powershellLiteral(path) {
	return `'${path.replace(/'/g, "''")}'`;
}
/**
* Run a PowerShell script via `-EncodedCommand` (avoids argv quoting traps).
* @param script - PowerShell source.
*/
function powershellEncodedArgs(script) {
	return [
		"-NoProfile",
		"-EncodedCommand",
		Buffer.from(script, "utf16le").toString("base64")
	];
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
async function revealPhotoPickPath(path, signal, run = runNativeCommand) {
	try {
		if (process.platform === "win32") {
			const winPath = path.replace(/\//g, "\\");
			await run("powershell.exe", powershellEncodedArgs(`${WINDOWS_FOCUS_HELPER}
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
`), signal);
			return;
		}
		if (process.platform === "darwin") {
			await run("open", ["-R", path], signal);
			return;
		}
		const { dirname } = await import("node:path");
		await run("xdg-open", [dirname(path)], signal);
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`failed to reveal path: ${detail}`);
	}
}
/**
* Whether a failed explorer.exe spawn is the known benign exit-code-1 case.
* @param error - runner rejection.
*/
function isWindowsExplorerBogusFailure(error) {
	if (error === null || typeof error !== "object") return false;
	return error.code === 1;
}
/**
* Open a path with the OS default application.
* @param path - absolute filesystem path.
* @param signal - cancellation.
* @param run - injectable runner (tests).
*/
async function openPhotoPickPath(path, signal, run = runNativeCommand) {
	try {
		if (process.platform === "win32") {
			const winPath = path.replace(/\//g, "\\");
			await run("powershell.exe", powershellEncodedArgs(`${WINDOWS_FOCUS_HELPER}
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
`), signal);
			return;
		}
		if (process.platform === "darwin") {
			await run("open", [path], signal);
			return;
		}
		await run("xdg-open", [path], signal);
	} catch (error) {
		const detail = error instanceof Error ? error.message : String(error);
		throw new Error(`failed to open path: ${detail}`);
	}
}
//#endregion
//#region src/open-http.ts
/** POST open path. */
const PHOTO_PICK_OPEN_HTTP_PATH = "/api/photo-pick/open";
/**
* Register POST `/api/photo-pick/open` when webServer is present.
* @param ctx - fiber with webServer.
*/
function registerPhotoPickOpenHttp(ctx) {
	return ctx.webServer.register({
		kind: "exact",
		path: PHOTO_PICK_OPEN_HTTP_PATH,
		handler: (req, res) => {
			handle$2(req, res);
		}
	});
}
async function handle$2(req, res) {
	try {
		if ((req.method ?? "GET") !== "POST") {
			writeJson$1(res, 405, { error: "method-not-allowed" });
			return;
		}
		const body = await readJsonBody$1(req);
		const root = typeof body.root === "string" ? body.root : "";
		const relativePath = typeof body.path === "string" ? body.path : "";
		if (root.trim().length === 0 || relativePath.trim().length === 0) {
			writeJson$1(res, 400, { error: "missing-root-or-path" });
			return;
		}
		await openPhotoPickPath(await resolveContainedPath(await resolveWorkspaceRoot(root), relativePath), new AbortController().signal);
		writeJson$1(res, 200, { ok: true });
	} catch (error) {
		if (error instanceof PhotoPickError) {
			writeJson$1(res, error.code === "NOT_FOUND" || error.code === "PATH_ESCAPE" ? 404 : error.code === "ROOT_MISSING" || error.code === "INVALID_ROOT" ? 400 : 500, {
				error: error.message,
				code: error.code
			});
			return;
		}
		writeJson$1(res, 500, { error: (error instanceof Error ? error.message : String(error)).slice(0, 300) });
	}
}
async function readJsonBody$1(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
	if (chunks.length === 0) return {};
	try {
		const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
		return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
//#endregion
//#region src/reveal-http.ts
/** POST reveal path. */
const PHOTO_PICK_REVEAL_HTTP_PATH = "/api/photo-pick/reveal";
/**
* Register POST `/api/photo-pick/reveal` when webServer is present.
* @param ctx - fiber with webServer.
*/
function registerPhotoPickRevealHttp(ctx) {
	return ctx.webServer.register({
		kind: "exact",
		path: PHOTO_PICK_REVEAL_HTTP_PATH,
		handler: (req, res) => {
			handle$1(req, res);
		}
	});
}
async function handle$1(req, res) {
	try {
		if ((req.method ?? "GET") !== "POST") {
			writeJson$1(res, 405, { error: "method-not-allowed" });
			return;
		}
		const body = await readJsonBody(req);
		const root = typeof body.root === "string" ? body.root : "";
		const relativePath = typeof body.path === "string" ? body.path : "";
		if (root.trim().length === 0 || relativePath.trim().length === 0) {
			writeJson$1(res, 400, { error: "missing-root-or-path" });
			return;
		}
		await revealPhotoPickPath(await resolveContainedPath(await resolveWorkspaceRoot(root), relativePath), new AbortController().signal);
		writeJson$1(res, 200, { ok: true });
	} catch (error) {
		if (error instanceof PhotoPickError) {
			writeJson$1(res, error.code === "NOT_FOUND" || error.code === "PATH_ESCAPE" ? 404 : error.code === "ROOT_MISSING" || error.code === "INVALID_ROOT" ? 400 : 500, {
				error: error.message,
				code: error.code
			});
			return;
		}
		writeJson$1(res, 500, { error: (error instanceof Error ? error.message : String(error)).slice(0, 300) });
	}
}
async function readJsonBody(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
	if (chunks.length === 0) return {};
	try {
		const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
		return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
}
//#endregion
//#region src/parse-score.ts
/** Cap retained response text for diagnostics. */
const MAX_VISION_RESPONSE_CHARS = 4e3;
/**
* Truncate a vision reply for storage / tool output.
* @param text - raw model text.
*/
function truncateVisionResponse(text) {
	if (text.length <= 4e3) return text;
	return `${text.slice(0, MAX_VISION_RESPONSE_CHARS)}…`;
}
/**
* Extract `{ score, reasons, flaws }` from a model reply.
* Tolerates fenced JSON and surrounding prose.
* @param text - raw assistant text.
* @returns parsed score, or `undefined` when unusable.
*/
function parseVisionScoreJson(text) {
	const json = extractJsonObject(text);
	if (json === void 0) return void 0;
	let parsed;
	try {
		parsed = JSON.parse(json);
	} catch {
		return;
	}
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return void 0;
	const row = parsed;
	const scoreRaw = row.score;
	const score = typeof scoreRaw === "number" ? scoreRaw : typeof scoreRaw === "string" ? Number(scoreRaw) : NaN;
	if (!Number.isFinite(score)) return void 0;
	return {
		score: Math.min(100, Math.max(0, Math.round(score))),
		reasons: stringList(row.reasons),
		flaws: stringList(row.flaws)
	};
}
function stringList(value) {
	if (!Array.isArray(value)) return [];
	return value.filter((item) => typeof item === "string").map((item) => item.trim()).filter((item) => item.length > 0).slice(0, 8);
}
function extractJsonObject(text) {
	const body = (text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text).trim();
	const start = body.indexOf("{");
	const end = body.lastIndexOf("}");
	if (start < 0 || end <= start) return void 0;
	return body.slice(start, end + 1);
}
//#endregion
//#region src/vision-throttle.ts
/**
* Create a throttle scoped to one pickBest job.
* @param options - concurrency, interval, and retry policy.
*/
function createVisionThrottle(options) {
	const concurrency = Math.max(1, Math.floor(options.concurrency));
	let active = 0;
	let lastStartAt = 0;
	const waiters = [];
	const wake = () => {
		const next = waiters.shift();
		if (next !== void 0) next();
	};
	const acquire = async (signal) => {
		for (;;) {
			signal?.throwIfAborted();
			if (active < concurrency) {
				const elapsed = Date.now() - lastStartAt;
				if (options.minIntervalMs <= 0 || lastStartAt === 0 || elapsed >= options.minIntervalMs) {
					active += 1;
					lastStartAt = Date.now();
					return;
				}
				await sleep(options.minIntervalMs - elapsed, signal);
				continue;
			}
			await new Promise((resolve, reject) => {
				const onAbort = () => {
					const index = waiters.indexOf(resolve);
					if (index >= 0) waiters.splice(index, 1);
					reject(signal?.reason instanceof Error ? signal.reason : /* @__PURE__ */ new Error("aborted"));
				};
				if (signal?.aborted) {
					onAbort();
					return;
				}
				waiters.push(resolve);
				signal?.addEventListener("abort", onAbort, { once: true });
			});
		}
	};
	const release = () => {
		active = Math.max(0, active - 1);
		wake();
	};
	return { async run(invoke, signal) {
		await acquire(signal);
		try {
			let attempt = 0;
			for (;;) {
				signal?.throwIfAborted();
				const result = await invoke();
				if (result.rateLimited && attempt < options.maxRetries) {
					attempt += 1;
					await sleep(options.retryBackoffMs * 2 ** (attempt - 1), signal);
					continue;
				}
				return result;
			}
		} finally {
			release();
		}
	} };
}
/**
* Whether a failure reason looks like provider rate limiting.
* @param reason - error message.
*/
function isRateLimitReason(reason) {
	if (reason === void 0 || reason.length === 0) return false;
	const text = reason.toLowerCase();
	return text.includes("429") || text.includes("rate limit") || text.includes("rate_limit") || text.includes("too many requests");
}
function sleep(ms, signal) {
	if (ms <= 0) return Promise.resolve();
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason instanceof Error ? signal.reason : /* @__PURE__ */ new Error("aborted"));
			return;
		}
		const timer = setTimeout(() => {
			signal?.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal?.reason instanceof Error ? signal.reason : /* @__PURE__ */ new Error("aborted"));
		};
		signal?.addEventListener("abort", onAbort, { once: true });
	});
}
//#endregion
//#region src/vision-score.ts
/**
* Vision quality scoring via the Host LLM catalog.
* Adapted from `dsh-media-local/vision-llm` (single-image stream + attachment).
* @module dsh-photo-pick-local/vision-score
*/
/** Attachment-supported raster types (same vocabulary as `dsh-attachment`). */
const MEDIA_TYPES = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif"
};
/** Default quality-scoring instruction (JSON suffix appended at request time). */
const PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT = [
	"你正在从一组近似照片（例如连拍人像）中评估「这一张」是否值得保留。",
	"请给出 0–100 的综合保留分，用于选出最好的照片。",
	"加分项：对焦清晰、曝光正确、构图舒服、表情自然、眼睛睁开、运动模糊少、无明显瑕疵。",
	"减分项：模糊、闭眼/眨眼、表情尴尬、严重过曝/欠曝、主体被裁切、噪点重、杂乱背景干扰主体。"
].join("");
/** Fixed JSON response-format suffix always appended to the scoring prompt. */
const PHOTO_PICK_SCORE_JSON_SUFFIX = [
	"",
	"只回复一个 JSON 对象（不要 markdown 代码块），字段名保持英文：",
	"{\"score\":0-100,\"reasons\":[\"简短优点\",...],\"flaws\":[\"简短缺点\",...]}",
	"reasons 与 flaws 各最多 4 条；允许空数组。数组内的文字请用中文。"
].join("\n");
/**
* Build the effective scoring prompt.
* Custom text replaces only the free-form instruction; the JSON suffix is always appended.
* Optional `criteria` from the tool call is appended as a user preference line.
* @param custom - settings override; empty keeps the built-in instruction.
* @param criteria - optional per-call preference text.
*/
function resolveScorePrompt(custom, criteria) {
	const trimmed = custom?.trim() ?? "";
	let instruction = trimmed.length > 0 ? trimmed : PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT;
	const extra = criteria?.trim();
	if (extra !== void 0 && extra.length > 0) instruction = `${instruction}\n用户偏好：${extra}`;
	if (instruction.includes(PHOTO_PICK_SCORE_JSON_SUFFIX)) return instruction;
	return `${instruction}${PHOTO_PICK_SCORE_JSON_SUFFIX}`;
}
/**
* Score one image via the configured LLM route.
* @param filePath - absolute image path.
* @param relativePath - root-relative path for the result row.
* @param config - LLM vision config.
* @param signal - cancellation.
*/
async function scoreImageWithLlm(filePath, relativePath, config, signal) {
	const base = {
		path: filePath,
		relativePath,
		score: 0,
		reasons: [],
		flaws: []
	};
	try {
		const info = await stat(filePath);
		if (info.size > config.maxBytes) return {
			ok: false,
			rateLimited: false,
			score: {
				...base,
				error: `vision-oversize:${info.size}>${config.maxBytes}`
			}
		};
		const mediaType = mediaTypeOf(filePath);
		if (mediaType === void 0) return {
			ok: false,
			rateLimited: false,
			score: {
				...base,
				error: "vision-unsupported-media-type"
			}
		};
		const prepared = await prepareVisionImage(await readFile(filePath), mediaType, config.maxEdgePx ?? 2048);
		if (prepared.data.length > config.maxBytes) return {
			ok: false,
			rateLimited: false,
			score: {
				...base,
				error: `vision-oversize:${prepared.data.length}>${config.maxBytes}`
			}
		};
		const attachment = await config.attachments.saveImage({
			data: prepared.data,
			mediaType: prepared.mediaType,
			name: prepared.resized ? `${basename(filePath, extname(filePath))}.jpg` : basename(filePath)
		});
		const prompt = config.prompt;
		let text;
		try {
			text = await collectAssistantText(config.llm.stream({
				provider: config.provider,
				model: config.model,
				maxTokens: 300,
				messages: [createUserMessage({
					content: [{
						type: "text",
						text: prompt
					}, {
						type: "image",
						attachment
					}],
					source: {
						kind: "plugin",
						plugin: "dsh-photo-pick-local"
					}
				})],
				...signal === void 0 ? {} : { signal }
			}));
		} catch (error) {
			if (signal?.aborted) throw error;
			const detail = error instanceof Error ? error.message : String(error);
			return {
				ok: false,
				rateLimited: isRateLimitReason(detail),
				score: {
					...base,
					error: detail.slice(0, 200)
				}
			};
		}
		const parsed = parseVisionScoreJson(text);
		if (parsed === void 0) return {
			ok: false,
			rateLimited: false,
			score: {
				...base,
				error: `vision-parse:${truncateVisionResponse(text).slice(0, 120)}`
			}
		};
		return {
			ok: true,
			rateLimited: false,
			score: {
				path: filePath,
				relativePath,
				score: parsed.score,
				reasons: parsed.reasons,
				flaws: parsed.flaws
			}
		};
	} catch (error) {
		if (signal?.aborted) throw error;
		const detail = error instanceof Error ? error.message : String(error);
		return {
			ok: false,
			rateLimited: isRateLimitReason(detail),
			score: {
				...base,
				error: detail.slice(0, 200)
			}
		};
	}
}
function mediaTypeOf(filePath) {
	return MEDIA_TYPES[extname(filePath).toLowerCase()];
}
async function collectAssistantText(stream) {
	let text = "";
	for await (const chunk of stream) {
		if (chunk.type === "text-delta") text += chunk.text;
		if (chunk.type === "finish" && chunk.reason.kind === "aborted") throw new Error(chunk.reason.failure.message);
		if (chunk.type === "finish" && chunk.reason.kind === "error") throw new Error(chunk.reason.failure.message);
	}
	return text;
}
//#endregion
//#region src/settings-http.ts
/** Stable path for describe + update. */
const PHOTO_PICK_SETTINGS_HTTP_PATH = "/api/photo-pick/settings";
/**
* Register GET/PUT for the photo-pick settings namespace when webServer + settings are present.
* @param ctx - fiber with webServer and settings.
* @param ns - photo-pick-local settings namespace.
* @returns disposer removing the route.
*/
function registerPhotoPickSettingsHttp(ctx, ns) {
	return ctx.webServer.register({
		kind: "exact",
		path: PHOTO_PICK_SETTINGS_HTTP_PATH,
		handler: (req, res) => {
			handle(ctx, ns, req, res);
		}
	});
}
async function handle(ctx, ns, req, res) {
	try {
		const method = req.method ?? "GET";
		if (method === "GET") {
			writeJson(res, 200, await describeView(ctx, ns));
			return;
		}
		if (method === "PUT" || method === "POST") {
			if (!ctx.settings.writable) {
				writeJson(res, 403, { error: "settings-readonly" });
				return;
			}
			const patch = parsePatch(await readJson(req));
			if (patch === void 0) {
				writeJson(res, 400, { error: "invalid-body" });
				return;
			}
			await ctx.settings.update(ns, patch);
			writeJson(res, 200, await describeView(ctx, ns));
			return;
		}
		writeJson(res, 405, { error: "method-not-allowed" });
	} catch (error) {
		writeJson(res, 500, { error: (error instanceof Error ? error.message : String(error)).slice(0, 300) });
	}
}
async function describeView(ctx, ns) {
	const row = ctx.settings.describe({ redactSecrets: true }).filter((row) => row.ns === ns)[0];
	const value = row?.value ?? {};
	return {
		visionEnabled: value.visionEnabled !== false,
		visionLlmProvider: typeof value.visionLlmProvider === "string" ? value.visionLlmProvider : "",
		visionModel: typeof value.visionModel === "string" ? value.visionModel : "",
		defaultVisionScorePrompt: PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT,
		visionScoreJsonSuffix: PHOTO_PICK_SCORE_JSON_SUFFIX,
		visionScorePrompt: typeof value.visionScorePrompt === "string" ? value.visionScorePrompt : "",
		models: await listVisionModels(ctx),
		revision: row?.revision ?? 0,
		writable: ctx.settings.writable
	};
}
/**
* List Host LLM catalog entries for the photo-pick settings picker.
* Vision-capable models are sorted first within each provider group.
* @param ctx - Host context (llm optional).
*/
async function listVisionModels(ctx) {
	const llm = ctx.get("llm");
	if (llm === void 0) return [];
	const out = [];
	for (const provider of llm.listProviders()) {
		let models;
		try {
			models = await llm.listModels(provider.id);
		} catch {
			continue;
		}
		const rows = [];
		for (const model of models) {
			let supportsVision;
			try {
				const resolved = await llm.resolveModelInfo(provider.id, model.id);
				if (resolved.inputModalities !== void 0) supportsVision = resolved.inputModalities.includes("image");
			} catch {
				supportsVision = void 0;
			}
			rows.push({
				provider: provider.id,
				providerName: provider.name,
				id: model.id,
				name: model.name,
				...supportsVision === void 0 ? {} : { supportsVision }
			});
		}
		rows.sort((a, b) => Number(b.supportsVision === true) - Number(a.supportsVision === true));
		out.push(...rows);
	}
	return out;
}
/** Parse a settings PUT body into a config patch (exported for unit tests). */
function parsePhotoPickSettingsPatch(body) {
	return parsePatch(body);
}
function parsePatch(body) {
	if (body === null || typeof body !== "object" || Array.isArray(body)) return void 0;
	const raw = body;
	const patch = {};
	if ("visionEnabled" in raw) {
		if (typeof raw.visionEnabled !== "boolean") return void 0;
		patch.visionEnabled = raw.visionEnabled;
	}
	if ("visionLlmProvider" in raw) {
		if (typeof raw.visionLlmProvider !== "string") return void 0;
		patch.visionLlmProvider = raw.visionLlmProvider.trim();
	}
	if ("visionModel" in raw) {
		if (typeof raw.visionModel !== "string") return void 0;
		patch.visionModel = raw.visionModel.trim();
	}
	if ("visionScorePrompt" in raw) {
		if (typeof raw.visionScorePrompt !== "string") return void 0;
		patch.visionScorePrompt = raw.visionScorePrompt;
	}
	return patch;
}
async function readJson(req) {
	const chunks = [];
	for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	const text = Buffer.concat(chunks).toString("utf8").trim();
	if (text.length === 0) return {};
	return JSON.parse(text);
}
function writeJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"content-length": Buffer.byteLength(payload)
	});
	res.end(payload);
}
//#endregion
//#region src/index.ts
/**
* Local photo-pick backend: workspace containment, vision scoring, optional media search.
* @module dsh-photo-pick-local
*/
/** Image extensions accepted for scoring (aligned with media vision rasters). */
const IMAGE_EXT = /* @__PURE__ */ new Set([
	".png",
	".jpg",
	".jpeg",
	".webp",
	".gif"
]);
/**
* Host-local {@link PhotoPick} over `ctx.llm` + `ctx.attachments`.
*/
var LocalPhotoPick = class extends PhotoPick {
	static Config = ConfigSchema;
	/** Optional override scorer (tests). */
	scoreImage = void 0;
	entry;
	current;
	inflight = /* @__PURE__ */ new Map();
	/**
	* @param ctx - Cordis context.
	* @param config - optional cordis.yml fields.
	*/
	constructor(ctx, config = {}) {
		super(ctx);
		this.entry = resolveConfig(config);
		this.current = () => this.entry;
		installSettingsSection(ctx, PHOTO_PICK_SETTINGS_NAMESPACE, ConfigSchema, this.entry, {
			setSource: (source) => {
				this.current = source;
			},
			onChange: () => {}
		});
		ctx.inject(["webServer", "settings"], (scoped) => {
			scoped.effect(() => registerPhotoPickSettingsHttp(scoped, PHOTO_PICK_SETTINGS_NAMESPACE), "photoPick.settingsHttp");
		});
		ctx.inject(["webServer"], (scoped) => {
			scoped.effect(() => registerPhotoPickCandidatesHttp(scoped), "photoPick.candidatesHttp");
			scoped.effect(() => registerPhotoPickFileHttp(scoped), "photoPick.fileHttp");
			scoped.effect(() => registerPhotoPickOpenHttp(scoped), "photoPick.openHttp");
			scoped.effect(() => registerPhotoPickRevealHttp(scoped), "photoPick.revealHttp");
		});
	}
	/** @inheritdoc */
	async pickBest(root, options) {
		const canonical = await resolveWorkspaceRoot(root);
		if (this.inflight.get(canonical) !== void 0) throw new PhotoPickError("a photo-pick job is already running for this root", "BUSY");
		const job = this.runPick(canonical, options).finally(() => {
			this.inflight.delete(canonical);
		});
		this.inflight.set(canonical, job);
		return job;
	}
	async runPick(root, options) {
		const resolved = resolveConfig(this.current());
		if (!resolved.visionEnabled) throw new PhotoPickError("vision scoring is disabled in photo-pick settings", "VISION_DISABLED");
		if (resolved.visionLlmProvider.length === 0 || resolved.visionModel.length === 0) throw new PhotoPickError("configure visionLlmProvider and visionModel (Settings → Models route ids)", "VISION_UNAVAILABLE");
		const llm = this.ctx.get("llm");
		const attachments = this.ctx.get("attachments");
		if (llm === void 0 || attachments === void 0) throw new PhotoPickError("ctx.llm and ctx.attachments are required for vision scoring", "VISION_UNAVAILABLE");
		const maxCandidates = Math.max(1, Math.min(24, Math.floor(options.maxCandidates ?? 24)));
		const topK = Math.max(1, Math.min(maxCandidates, Math.floor(options.topK ?? 3)));
		const candidates = await this.resolveCandidates(root, options, maxCandidates);
		if (candidates.length === 0) throw new PhotoPickError("no image candidates: pass paths[] or a mediaLibrary query with image hits", "NO_CANDIDATES");
		const prompt = resolveScorePrompt(resolved.visionScorePrompt, options.criteria);
		const throttle = createVisionThrottle({
			concurrency: clampVisionConcurrency(resolved.visionConcurrency),
			minIntervalMs: Math.max(0, resolved.visionMinIntervalMs),
			maxRetries: Math.max(0, Math.floor(resolved.visionMaxRetries)),
			retryBackoffMs: Math.max(0, resolved.visionRetryBackoffMs)
		});
		const scoreFn = this.scoreImage ?? scoreImageWithLlm;
		const scoreConfig = {
			provider: resolved.visionLlmProvider,
			model: resolved.visionModel,
			maxBytes: resolved.maxVisionBytes,
			maxEdgePx: resolved.visionMaxEdgePx,
			prompt,
			llm,
			attachments
		};
		const scored = await Promise.all(candidates.map(async (candidate) => {
			return (await throttle.run(() => scoreFn(candidate.path, candidate.relativePath, scoreConfig, options.signal), options.signal)).score;
		}));
		const ranked = [...scored].sort((a, b) => {
			const aOk = a.error === void 0;
			if (aOk !== (b.error === void 0)) return aOk ? -1 : 1;
			return b.score - a.score;
		});
		return {
			picks: ranked.filter((row) => row.error === void 0).slice(0, topK),
			ranked,
			visionProvider: resolved.visionLlmProvider,
			visionModel: resolved.visionModel,
			visionCalls: scored.length
		};
	}
	async resolveCandidates(root, options, maxCandidates) {
		const out = [];
		const seen = /* @__PURE__ */ new Set();
		const push = (absolute, relativePath) => {
			if (!isImagePath(absolute)) return;
			if (seen.has(absolute)) return;
			seen.add(absolute);
			out.push({
				path: absolute,
				relativePath
			});
		};
		if (options.paths !== void 0) for (const requested of options.paths) {
			if (out.length >= maxCandidates) break;
			const absolute = await resolveContainedPath(root, requested);
			push(absolute, toRelativePosix(root, absolute));
		}
		const query = options.query?.trim();
		if (query && query.length > 0 && out.length < maxCandidates) {
			const library = this.ctx.get("mediaLibrary");
			if (library === void 0) {
				if (options.paths === void 0 || options.paths.length === 0) throw new PhotoPickError("mediaLibrary query requires the media plugin (ctx.mediaLibrary); pass paths[] instead", "NO_CANDIDATES");
			} else {
				const hits = await library.search(root, {
					query,
					limit: maxCandidates
				});
				for (const hit of hits) {
					if (out.length >= maxCandidates) break;
					if (hit.kind !== "image") continue;
					const absolute = await resolveContainedPath(root, hit.path);
					push(absolute, hit.relativePath || toRelativePosix(root, absolute));
				}
			}
		}
		return out.slice(0, maxCandidates);
	}
};
function isImagePath(filePath) {
	return IMAGE_EXT.has(extname(filePath).toLowerCase());
}
//#endregion
export { ConfigSchema, DEFAULT_MAX_CANDIDATES, DEFAULT_MAX_VISION_BYTES, DEFAULT_TOP_K, DEFAULT_VISION_CONCURRENCY, DEFAULT_VISION_MAX_EDGE_PX, DEFAULT_VISION_MAX_RETRIES, DEFAULT_VISION_MIN_INTERVAL_MS, DEFAULT_VISION_RETRY_BACKOFF_MS, LocalPhotoPick, LocalPhotoPick as default, MAX_VISION_CONCURRENCY, PHOTO_PICK_OPEN_HTTP_PATH, PHOTO_PICK_REVEAL_HTTP_PATH, PHOTO_PICK_SCORE_INSTRUCTION_DEFAULT, PHOTO_PICK_SCORE_JSON_SUFFIX, PHOTO_PICK_SETTINGS_HTTP_PATH, PHOTO_PICK_SETTINGS_NAMESPACE, assertAllowedRoot, clampVisionConcurrency, createVisionThrottle, isRateLimitReason, isWindowsExplorerBogusFailure, openPhotoPickPath, parsePhotoPickSettingsPatch, parseVisionScoreJson, prepareVisionImage, registerPhotoPickOpenHttp, registerPhotoPickRevealHttp, registerPhotoPickSettingsHttp, resolveConfig, resolveContainedPath, resolveScorePrompt, resolveWorkspaceRoot, revealPhotoPickPath, scoreImageWithLlm, truncateVisionResponse };
