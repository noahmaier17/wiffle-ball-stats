# ======================================================
# Script: Run developer versions of the full-stack website.
# ======================================================

# Optionally opens the developer website
$openBrowser = Read-Host "Do you want to open the developer website? (y/n)"

# Starts Vercel Web App
Write-Host ">> Starting Vercel Web App" -ForegroundColor Cyan
$projectRoot = Resolve-Path "$PSScriptRoot\..\.."

# Load .env.local so sensitive keys are available to serverless functions
$envVars = ""
Get-Content "$projectRoot\.env.local" | ForEach-Object {
    if ($_ -match "^([^#][^=]+)=(.*)$") {
        $envVars += "`$env:$($matches[1]) = '$($matches[2])'; "
    }
}

$frontendProcess = Start-Process powershell -PassThru -ArgumentList "-NoExit", "-Command", "
Write-Host '================ WEB APP =================' -ForegroundColor Green
$envVars
cd '$projectRoot'
vercel dev
"

# Opens the developer website
if ($openBrowser -match "^[Yy]") {
    Write-Host ">> Opening developer website" -ForegroundColor Cyan
    Start-Process "http://localhost:3000"
} else {
    Write-Host ">> Not opening developer website" -ForegroundColor Cyan
}

# Wait for some sort input to stop server processes
Read-Host "Press ENTER to stop server processes"
Write-Host ">> Stopping servers" -ForegroundColor Cyan
taskkill /PID $frontendProcess.Id /T /F 2>$null

# States the script is complete
Write-Host ">> Script complete" -ForegroundColor Cyan