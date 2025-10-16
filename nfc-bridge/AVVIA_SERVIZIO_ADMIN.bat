@echo off
echo =======================================
echo   AVVIO SERVIZIO SMART CARD (ADMIN)
echo =======================================
echo.

REM Verifica se eseguito come amministratore
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Eseguito come Amministratore
    echo.
    goto :admin
) else (
    echo [ATTENZIONE] Non eseguito come Amministratore!
    echo.
    echo Questo script DEVE essere eseguito come amministratore.
    echo.
    echo COME FARE:
    echo 1. Click DESTRO su questo file
    echo 2. Seleziona "Esegui come amministratore"
    echo.
    pause
    exit /b 1
)

:admin
echo [1] Configurazione servizio Smart Card su Automatico...
sc config SCardSvr start= auto
if errorlevel 1 (
    echo ERRORE nella configurazione!
    goto :fine
)
echo OK
echo.

echo [2] Avvio servizio Smart Card...
net start SCardSvr
if errorlevel 1 (
    echo ATTENZIONE: Il servizio potrebbe essere già avviato o ci sono problemi
)
echo.

echo [3] Verifica stato finale:
sc query SCardSvr
echo.

echo =======================================
if errorlevel 1 (
    echo   SERVIZIO NON AVVIATO
    echo.
    echo Possibili cause:
    echo - Lettore NFC non collegato
    echo - Driver del lettore non installati
    echo - Servizio Plug and Play non attivo
) else (
    echo   SERVIZIO AVVIATO CON SUCCESSO!
    echo.
    echo Ora puoi eseguire START_BRIDGE.bat
)
echo =======================================
echo.

:fine
pause
