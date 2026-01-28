# Stop all node processes
Write-Host "Stopping all node processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Remove Next.js dev lock
Write-Host "Removing Next.js dev lock..." -ForegroundColor Yellow
Remove-Item -Path ".next\dev\lock" -Force -ErrorAction SilentlyContinue

Write-Host "Cleanup complete. You can now run 'npm run dev' safely." -ForegroundColor Green
