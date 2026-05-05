# ======================================================
# Script: Run developer versions of the full-stack website.
# ======================================================

# Optionally opens the developer website
$openBrowser = Read-Host "Do you want to open the developer website? (y/n)"

# Starts React frontend
Write-Host ">> Starting React frontend" -ForegroundColor Cyan
$frontendProcess = Start-Process powershell -PassThru -ArgumentList "-NoExit", "-Command", "
Write-Host '================ FRONTEND =================' -ForegroundColor Green
cd '$PSScriptRoot'
npm run dev
"

# Starts Flask cards service
# Write-Host ">> Starting Flask cards service" -ForegroundColor Cyan
# $backendProcess = Start-Process powershell -PassThru -ArgumentList "-NoExit", "-Command", "
# Write-Host '================ BACKEND ==================' -ForegroundColor Magenta
# cd '$PSScriptRoot\..'
# . '$PSScriptRoot\..\.venv\Scripts\Activate'
# flask --app web_app.cards_service run --port 5000
# "

# Opens the developer website
if ($openBrowser -match "^[Yy]") {
    Write-Host ">> Opening developer website" -ForegroundColor Cyan
    Start-Process "http://localhost:5173"
} else {
    Write-Host ">> Not opening developer website" -ForegroundColor Cyan
}

# Wait for some sort input to stop server processes
Read-Host "Press ENTER to stop server processes"
Write-Host ">> Stopping servers" -ForegroundColor Cyan
taskkill /PID $frontendProcess.Id /T /F 2>$null
taskkill /PID $backendProcess.Id /T /F 2>$null


# States the script is complete
Write-Host ">> Script complete" -ForegroundColor Cyan