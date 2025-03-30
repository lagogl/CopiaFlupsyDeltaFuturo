# Guida per Testare la Funzionalità WebSocket

Questo documento spiega come verificare che le funzionalità WebSocket dell'applicazione FLUPSY stiano funzionando correttamente.

## Indicatore di Connessione WebSocket

1. Apri l'applicazione nel browser.
2. Controlla l'angolo in basso a destra: dovresti vedere un piccolo indicatore circolare:
   - **Verde** con un'icona WiFi: indica connessione WebSocket attiva
   - **Rosso** con un'icona WiFi barrata: indica disconnessione

## Test di Base: Creazione di un'Operazione

Per verificare che le notifiche in tempo reale vengano inviate:

1. Vai alla pagina **Operazioni** o **Operazioni Rapide**
2. Crea una nuova operazione per un cestello esistente (es. operazione di peso)
3. Dopo aver salvato l'operazione, dovresti vedere:
   - Un toast di notifica che appare automaticamente
   - L'operazione che appare immediatamente nella lista senza dover ricaricare la pagina

## Test di Riconnessione

Per verificare la riconnessione automatica:

1. Con la console sviluppatore aperta (F12), vai alla scheda "Network"
2. Filtra per "WS" per vedere solo le connessioni WebSocket
3. Seleziona la connessione `/ws` e interrompila cliccando con il pulsante destro del mouse e selezionando "Close connection"
4. Dovresti vedere l'indicatore diventare rosso momentaneamente
5. Entro pochi secondi (3 secondi max), il WebSocket dovrebbe riconnettersi automaticamente e l'indicatore tornare verde

## Verifica via Console

Per confermare il funzionamento sotto il cofano:

1. Apri la console sviluppatore (F12)
2. Dovresti vedere messaggi come:
   - `WebSocket connesso`
   - `Ricevuto messaggio WebSocket: {type: "connection", ...}`
3. Quando vengono effettuate operazioni, dovresti vedere messaggi come:
   - `Ricevuto messaggio WebSocket: {type: "operation_created", ...}`

## Messaggi in Tempo Reale

Quando altri utenti effettuano operazioni (o simulando con un'altra scheda/finestra del browser):

1. Apri due schede dell'applicazione 
2. Nella prima scheda, crea/modifica un'operazione o sposta un cestello
3. Nella seconda scheda, dovresti vedere:
   - Notifiche toast che appaiono automaticamente
   - Dati che si aggiornano senza necessità di ricaricare la pagina

## Risoluzione Problemi

Se l'indicatore WebSocket è rosso:

1. Verifica che il server sia in esecuzione
2. Assicurati che il percorso WebSocket ('/ws') non sia bloccato da firewall
3. Controlla la console sviluppatore per eventuali errori
4. Ricarica la pagina per forzare una nuova connessione