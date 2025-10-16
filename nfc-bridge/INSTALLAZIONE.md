# 🔌 Installazione Bridge USB NFC per Windows

Guida rapida per collegare il tuo **NFC Tool Pro USB** all'app FLUPSY.

## 📋 Cosa ti serve

- ✅ PC Windows con lettore **NFC Tool Pro USB** collegato
- ✅ Python 3.7 o superiore
- ✅ Driver del lettore installati (già fatto se funziona in Windows)

## 🚀 Installazione Rapida

### 1️⃣ Installa Python (se non ce l'hai)

1. Scarica Python da: **https://www.python.org/downloads/**
2. Durante l'installazione, **SPUNTA "Add Python to PATH"** ✓
3. Clicca "Install Now"

### 2️⃣ Installa le dipendenze

Apri **Prompt dei comandi** (cmd) e digita:

```bash
pip install websockets pyscard
```

**Se ottieni errore su pyscard:**
1. Installa **Visual Studio Build Tools**: https://visualstudio.microsoft.com/visual-cpp-build-tools/
2. Seleziona "Desktop development with C++"
3. Riprova: `pip install pyscard`

### 3️⃣ Scarica il bridge

1. Scarica questi file dal progetto Replit:
   - `nfc-bridge/nfc_usb_bridge.py`
   - `nfc-bridge/README.md`

2. Salvali in una cartella sul tuo PC (es. `C:\nfc-bridge\`)

### 4️⃣ Verifica il lettore

1. Collega il lettore **NFC Tool Pro USB**
2. Apri **Gestione Dispositivi** (tasto Windows + X)
3. Controlla che compaia sotto "Lettori smartcard" o "USB"

### 5️⃣ Avvia il bridge

1. Apri **Prompt dei comandi** nella cartella del bridge:
   ```bash
   cd C:\nfc-bridge
   python nfc_usb_bridge.py
   ```

2. Dovresti vedere:
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

### 6️⃣ Usa l'app web

1. Apri l'app FLUPSY nel browser
2. Comparirà notifica: **"🔌 Bridge USB NFC connesso"**
3. Vai su **"Tag NFC"** → programma cestelli come sempre!
4. Il sistema userà automaticamente il lettore USB

## ✅ Test rapido

1. Apri pagina **"Tag NFC"**
2. Clicca su cestello → **"Programma Tag"**
3. Dovresti vedere: **"🔌 Lettore USB connesso - NFC Tool Pro pronto"**
4. Avvicina tag NFC al lettore
5. Tag programmato! ✨

## 🐛 Problemi comuni

### "Nessun lettore NFC trovato"
- ✅ Verifica in Gestione Dispositivi che il lettore sia visibile
- ✅ Reinstalla driver del lettore
- ✅ Prova: `python -c "from smartcard.System import readers; print(readers())"`

### "ModuleNotFoundError: websockets"
```bash
pip install websockets pyscard
```

### Bridge si avvia ma app web non si connette
- ✅ Verifica che il bridge sia in esecuzione (deve dire "Bridge attivo")
- ✅ Controlla firewall Windows (deve permettere localhost:8765)
- ✅ Apri Console browser (F12) per vedere errori

### Tag non viene letto
- ✅ Avvicina il tag al lettore (2-5cm massimo)
- ✅ Alcuni tag richiedono contatto fisico
- ✅ Verifica compatibilità tag (MIFARE, ISO 14443A/B)

## 💡 Suggerimenti

- **Lascia il bridge sempre aperto** mentre usi l'app
- Il bridge si riconnette automaticamente all'app web
- Funziona anche con smartphone in parallelo (auto-switch)
- Per chiudere: Ctrl+C nel prompt dei comandi

## 📱 Smartphone vs USB

**L'app supporta ENTRAMBI automaticamente:**

- 📱 **Smartphone Android** → Web NFC API nativa
- 💻 **PC + USB Reader** → Bridge locale

Il sistema sceglie automaticamente il metodo disponibile!

## 🆘 Serve aiuto?

1. Controlla log del bridge (console Python)
2. Controlla log browser (F12 → Console)
3. Verifica compatibilità lettore: https://pcsc-lite.apdu.fr/
