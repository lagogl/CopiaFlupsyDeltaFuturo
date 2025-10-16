# 🔌 NFC USB Bridge

Bridge locale per collegare lettori NFC USB (come NFC Tool Pro) all'app web FLUPSY.

## 📋 Requisiti

- **Python 3.7+** (Windows/Mac/Linux)
- **Lettore NFC USB** (NFC Tool Pro, ACR122U, ecc.)
- **Driver del lettore** installati

## 🚀 Installazione

### 1. Installa Python
Scarica da: https://www.python.org/downloads/

### 2. Installa dipendenze
```bash
pip install websockets pyscard
```

**Windows:** Potrebbe richiedere Visual Studio Build Tools
- Scarica da: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Installa "Desktop development with C++"

### 3. Verifica driver NFC Tool Pro
- Apri **Gestione Dispositivi** (Windows)
- Verifica che il lettore sia visibile sotto "Lettori smartcard" o "USB"
- Se manca, installa driver da sito produttore

## 📱 Uso

### 1. Avvia il bridge
```bash
cd nfc-bridge
python nfc_usb_bridge.py
```

Output atteso:
```
============================================================
🚀 NFC USB Bridge - Avvio
============================================================
✅ Lettori NFC trovati: 1
   1. NFC Tool Pro USB 0
🔍 Avvio monitoraggio tag NFC...
🌐 Server WebSocket: ws://localhost:8765
✅ Bridge attivo - in attesa di connessioni...
------------------------------------------------------------
```

### 2. Apri app web FLUPSY
- L'app si connetterà automaticamente a `localhost:8765`
- Comparirà notifica "Bridge USB NFC connesso"

### 3. Usa lettore NFC
- **Avvicina tag NFC** al lettore
- L'app web riceverà automaticamente l'UID
- Funziona come lettore mobile!

## 🔧 Configurazione

Modifica `nfc_usb_bridge.py` se necessario:

```python
# Porta WebSocket (default: 8765)
WEBSOCKET_PORT = 8765

# Host (default: localhost, usa 0.0.0.0 per rete locale)
WEBSOCKET_HOST = "localhost"
```

## 🐛 Troubleshooting

### Errore: "Nessun lettore NFC trovato"
1. Verifica che il lettore sia collegato via USB
2. Controlla Gestione Dispositivi (Windows)
3. Reinstalla driver del lettore
4. Prova comando: `python -c "from smartcard.System import readers; print(readers())"`

### Errore: "ModuleNotFoundError: No module named 'smartcard'"
```bash
pip install pyscard
```

Su Windows, se fallisce:
1. Installa Visual Studio Build Tools
2. Oppure usa wheel precompilato:
```bash
pip install --upgrade pip setuptools wheel
pip install pyscard
```

### Bridge si connette ma non legge tag
1. Avvicina il tag al lettore (entro 2-5cm)
2. Alcuni tag richiedono contatto fisico
3. Verifica compatibilità tag (ISO 14443A/B, MIFARE, ecc.)

### App web non si connette
1. Verifica che bridge sia in esecuzione (`ws://localhost:8765`)
2. Controlla firewall Windows (deve permettere localhost:8765)
3. Apri console browser (F12) per vedere errori

## 📊 Protocollo WebSocket

### Messaggi dal bridge → web:
```json
{
  "type": "connected",
  "readers": [{"name": "NFC Tool Pro", "index": 0}]
}

{
  "type": "nfc_detected",
  "serialNumber": "04:1a:05:3c:4f:61:80",
  "timestamp": "2025-10-16T10:30:00",
  "reader": "NFC Tool Pro USB 0"
}

{
  "type": "nfc_removed",
  "timestamp": "2025-10-16T10:30:05"
}
```

### Messaggi dal web → bridge:
```json
{
  "type": "write_tag",
  "data": {
    "basketId": 123,
    "flupsyId": 220,
    ...
  }
}

{
  "type": "ping"
}

{
  "type": "get_readers"
}
```

## 🔒 Sicurezza

- Il bridge accetta SOLO connessioni da `localhost`
- Non espone dati su internet
- Nessuna autenticazione necessaria (solo locale)

## 📝 Lettori supportati

Qualsiasi lettore compatibile **PC/SC (Smart Card)**:
- ✅ NFC Tool Pro
- ✅ ACR122U
- ✅ SCL3711
- ✅ Identiv uTrust
- ✅ HID Omnikey
- ✅ Elatec TWN4

## 🆘 Supporto

Per problemi specifici:
1. Controlla log del bridge (console Python)
2. Controlla log browser (F12 → Console)
3. Verifica compatibilità lettore: https://pcsc-lite.apdu.fr/
