# Creates a desktop shortcut for DeepSeek Harness desktop app.
# Target: electron.exe  Args: this project directory
$ErrorActionPreference = "Stop"

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$electronExe = Join-Path $projectDir "node_modules\electron\dist\electron.exe"

if (-not (Test-Path $electronExe)) {
    Write-Error "electron.exe not found at $electronExe. Run install.cmd first."
    exit 1
}

$desktop = [Environment]::GetFolderPath("Desktop")
$lnkPath = Join-Path $desktop "DeepSeek Harness.lnk"

$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($lnkPath)
$sc.TargetPath = $electronExe
$sc.Arguments = "`"$projectDir`""
$sc.WorkingDirectory = $projectDir
$sc.IconLocation = $electronExe
$sc.Description = "DeepSeek Harness - click to start server and UI"
$sc.Save()

Write-Host "Shortcut created: $lnkPath"
