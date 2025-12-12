# Run this script as Administrator to open firewall for Expo Metro
New-NetFirewallRule -DisplayName "Expo Metro Bundler" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow
Write-Host "Firewall rule added successfully!" -ForegroundColor Green
Write-Host "You can now connect to Expo from your iPhone at 192.168.4.206:8081" -ForegroundColor Green
pause
