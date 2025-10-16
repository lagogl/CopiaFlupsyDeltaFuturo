@echo off
echo =======================================
echo   VERIFICA SERVIZIO SMART CARD
echo =======================================
echo.

echo [1] Stato servizio Smart Card:
sc query SCardSvr
echo.

echo [2] Configurazione servizio:
sc qc SCardSvr
echo.

echo [3] Servizi dipendenti (Plug and Play):
sc query PlugPlay
echo.

echo [4] Lettori rilevati in Gestione Dispositivi:
echo Cerca "Smart card readers" o il tuo lettore NFC
echo.

echo =======================================
echo   TENTATIVO AVVIO SERVIZIO
echo =======================================
echo.
echo Avvio servizio Smart Card...
net start SCardSvr
echo.

echo Stato dopo avvio:
sc query SCardSvr
echo.

pause
