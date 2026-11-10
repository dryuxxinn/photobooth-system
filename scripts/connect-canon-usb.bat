@echo off
:: Jalankan skrip PowerShell dengan hak Administrator otomatis
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0connect-canon-usb.ps1"
