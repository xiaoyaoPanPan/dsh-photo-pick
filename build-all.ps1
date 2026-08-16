# Build all photo-pick packages in dependency order (Windows).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pkgs = @(
  'dsh-photo-pick',
  'dsh-photo-pick-local',
  'dsh-tool-photo-pick',
  'dsh-photo-pick-ui',
  'dsh-photo-pick-app'
)
foreach ($pkg in $pkgs) {
  Push-Location (Join-Path $root $pkg)
  try {
    Write-Host "==> building $pkg"
    npx tsc -b
    if ($LASTEXITCODE -ne 0) { throw "tsc failed for $pkg" }
    npx tsdown
    if ($LASTEXITCODE -ne 0) { throw "tsdown failed for $pkg" }
  } finally {
    Pop-Location
  }
}
Write-Host 'photo-pick build complete'
