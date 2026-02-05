# Lambda Build Script for Windows
# Run this before terraform apply to install dependencies

$ErrorActionPreference = "Stop"

$functions = @("syncUser", "recordSighting", "getLeaderboard")

foreach ($func in $functions) {
    Write-Host "Building $func..." -ForegroundColor Cyan
    Push-Location $func
    
    # Remove old node_modules if exists
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules"
    }
    
    # Install production dependencies only
    npm install --omit=dev
    
    Pop-Location
    Write-Host "$func built successfully!" -ForegroundColor Green
}

Write-Host "`nAll Lambda functions built. You can now run 'terraform apply'" -ForegroundColor Yellow
