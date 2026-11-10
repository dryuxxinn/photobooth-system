# Self-elevate to Administrator if not already running as Admin
if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell.exe -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"") -Verb RunAs
    exit
}

Clear-Host
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "   Sweet Studio Photobooth - Penghubung Kamera USB Canon EOS 700D   " -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""

$usbipdPath = "C:\Program Files\usbipd-win\usbipd.exe"
if (!(Test-Path $usbipdPath)) {
    Write-Host "[ERROR] usbipd-win belum terpasang di $usbipdPath." -ForegroundColor Red
    pause
    exit 1
}

Write-Host "[1/3] Memindai kamera Canon EOS pada port USB..." -ForegroundColor Gray
$listOutput = & $usbipdPath list
$canonLine = $listOutput | Where-Object { $_ -match "Canon" -or $_ -match "04a9:" }

if (!$canonLine) {
    Write-Host "[PERINGATAN] Kamera Canon EOS tidak terdeteksi pada port USB!" -ForegroundColor Red
    Write-Host "Pastikan kamera Canon sudah dinyalakan (ON) dan kabel USB terpasang erat." -ForegroundColor Yellow
    Write-Host ""
    $listOutput
    pause
    exit 1
}

# Extract BUSID (first token on the line)
$busid = ($canonLine.Trim() -split "\s+")[0]
Write-Host "[OK] Ditemukan: $canonLine" -ForegroundColor Green
Write-Host "[OK] Target BUSID: $busid" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] Melakukan binding USB port $busid..." -ForegroundColor Gray
& $usbipdPath bind --busid $busid --force 2>$null

Write-Host "[3/3] Menghubungkan kamera ke WSL2 / Docker..." -ForegroundColor Gray
& $usbipdPath attach --wsl --busid $busid

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "   SUKSES! Kamera Canon EOS 700D telah terhubung ke Docker.          " -ForegroundColor Yellow
Write-Host "   Silakan buka http://localhost:3000 dan pilih 'Kamera Server'       " -ForegroundColor Cyan
Write-Host "   untuk langsung jepret dengan shutter mekanis kamera!              " -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""
pause
