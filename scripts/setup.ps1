# Use: powershell -NoProfile -File scripts/setup.ps1 -Install
[CmdletBinding()]
param(
    [switch]$Install,
    [Alias('Profile')][ValidateSet('build', 'video')][string]$Mode = 'video',
    [string]$StateDir,
    [switch]$RecheckBrowser
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
function Find-PrevisPython {
    $locations = @($env:CAMERA_PREVIS_PYTHON,
        "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe",
        "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\bin\python.exe")
    foreach ($name in @('python', 'python3')) {
        $command = Get-Command $name -ErrorAction SilentlyContinue
        if ($command -and $command.Source -notlike '*\Microsoft\WindowsApps\*') { $locations += $command.Source }
    }
    if (Get-Command py -ErrorAction SilentlyContinue) {
        $located = & py -3 -c 'import sys; print(sys.executable)' 2>$null
        if ($LASTEXITCODE -eq 0) { $locations += $located }
    }
    foreach ($base in @("$env:LOCALAPPDATA\Programs\Python", "$env:ProgramFiles")) {
        $locations += @(Get-ChildItem "$base\Python*\python.exe" -ErrorAction SilentlyContinue | ForEach-Object FullName)
    }
    foreach ($candidate in $locations) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            & $candidate -c 'import sys; sys.exit(0 if sys.version_info >= (3,8) else 1)' 2>$null
            if ($LASTEXITCODE -eq 0) { return $candidate }
        }
    }
    return $null
}
$previsPython = Find-PrevisPython
if (-not $previsPython) {
    if (-not $Install) { throw 'Python 3.8+ is missing. Codex: rerun with -Install.' }
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw 'Python and WinGet are missing. Codex: install an official Python runtime or Microsoft App Installer with the required OS permission, then retry.'
    }
    & winget install --id Python.Python.3.12 --exact --source winget --scope user --silent --accept-package-agreements --accept-source-agreements --disable-interactivity --no-upgrade | ForEach-Object { [Console]::Error.WriteLine($_) }
    if ($LASTEXITCODE -ne 0) { throw 'Python installation failed. Inspect WinGet output before continuing.' }
    $previsPython = Find-PrevisPython
    if (-not $previsPython) { throw 'Python was not found after installation. Codex: locate and verify the installed executable, then retry.' }
}
$env:CAMERA_PREVIS_PYTHON = $previsPython
$previsArgs = @((Join-Path $PSScriptRoot 'setup_env.py'), '--profile', $Mode)
if ($Install) { $previsArgs += '--install' }
if ($StateDir) { $previsArgs += @('--state-dir', $StateDir) }
if ($RecheckBrowser) { $previsArgs += '--recheck-browser' }
& $previsPython @previsArgs
exit $LASTEXITCODE
