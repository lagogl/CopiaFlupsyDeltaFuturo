@echo off
echo =======================================
echo   TEST SISTEMA - Diagnostica NFC Bridge
echo =======================================
echo.

echo [1/4] Test Python...
python --version
if errorlevel 1 (
    echo ERRORE: Python non trovato!
    echo Installa Python da: https://www.python.org/downloads/
    goto :fine
)
echo OK - Python funziona
echo.

echo [2/4] Test pip...
pip --version
if errorlevel 1 (
    echo ERRORE: pip non trovato!
    goto :fine
)
echo OK - pip funziona
echo.

echo [3/4] Controllo file nfc_usb_bridge.py...
if exist nfc_usb_bridge.py (
    echo OK - File trovato
) else (
    echo ERRORE: nfc_usb_bridge.py non trovato in questa cartella!
    echo Assicurati che il file sia nella stessa cartella di questo script.
    goto :fine
)
echo.

echo [4/4] Test dipendenze...
pip show websockets >nul 2>&1
if errorlevel 1 (
    echo ATTENZIONE: websockets non installato
    echo Installazione in corso...
    pip install websockets pyscard
) else (
    echo OK - Dipendenze installate
)
echo.

echo =======================================
echo   Tutti i test completati!
echo =======================================
echo.
echo Se tutti i test sono OK, usa START_BRIDGE.bat
echo per avviare il server NFC.
echo.

:fine
echo.
pause
