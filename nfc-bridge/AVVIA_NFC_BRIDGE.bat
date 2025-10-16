@echo off
chcp 65001 >nul
title NFC USB Bridge - FLUPSY Management System
color 0A

echo.
echo ============================================
echo    NFC USB Bridge - FLUPSY Management
echo ============================================
echo.

REM Verifica se Python è installato
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERRORE: Python non trovato!
    echo.
    echo Installa Python da: https://www.python.org/downloads/
    echo Assicurati di selezionare "Add Python to PATH" durante l'installazione
    echo.
    pause
    exit /b 1
)

echo ✅ Python rilevato
python --version
echo.

REM Verifica se le dipendenze sono installate
echo 📦 Controllo dipendenze...
pip show pyscard >nul 2>&1
if errorlevel 1 (
    echo.
    echo 📥 Installazione dipendenze richieste...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo.
        echo ❌ ERRORE: Impossibile installare le dipendenze
        pause
        exit /b 1
    )
) else (
    echo ✅ Dipendenze già installate
)

echo.
echo ============================================
echo    Avvio NFC USB Bridge Server
echo ============================================
echo.
echo 🔌 Collega il lettore NFC alla porta USB
echo 📡 Server in ascolto su ws://localhost:8765
echo.
echo ⚠️  NON CHIUDERE QUESTA FINESTRA durante l'uso
echo    Premi CTRL+C per arrestare il server
echo.
echo ============================================
echo.

REM Avvia il bridge Python
python nfc_usb_bridge.py

REM Pausa sempre alla fine per vedere eventuali errori
echo.
echo ============================================
echo    Bridge terminato
echo ============================================
pause
