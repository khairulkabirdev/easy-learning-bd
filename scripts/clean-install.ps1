$ErrorActionPreference = "Stop"

Write-Host "EasyLearningBD clean dependency install" -ForegroundColor Cyan

if (Test-Path "node_modules") {
  Write-Host "Removing node_modules..."
  Remove-Item -Recurse -Force "node_modules"
}

if (Test-Path "package-lock.json") {
  Write-Host "Removing stale package-lock.json..."
  Remove-Item -Force "package-lock.json"
}

Write-Host "Verifying npm cache..."
npm cache verify

Write-Host "Installing dependencies..."
npm install

Write-Host "Running lint..."
npm run lint

Write-Host "Running build..."
npm run build

Write-Host "Done. A fresh package-lock.json has been generated." -ForegroundColor Green
