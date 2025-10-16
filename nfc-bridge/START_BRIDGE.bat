@echo off
title NFC Bridge - FLUPSY
echo.
echo =======================================
echo   NFC USB Bridge - FLUPSY Management
echo =======================================
echo.
echo Avvio del server NFC in corso...
echo.

python nfc_usb_bridge.py
if errorlevel 1 (
    echo.
    echo ERRORE durante l'avvio!
)

echo.
echo Premi un tasto per chiudere...
pause >nul
