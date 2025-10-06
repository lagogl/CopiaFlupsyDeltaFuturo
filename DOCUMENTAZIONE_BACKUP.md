# Sistema di Backup Database - FLUPSY Management System

**Versione:** 1.0  
**Data:** 6 Ottobre 2025  
**Sistema:** PostgreSQL 16 + Node.js Express

---

## 📋 Panoramica

Il sistema FLUPSY dispone di un modulo completo per il backup e ripristino del database PostgreSQL. Attualmente i backup sono **solo manuali** tramite interfaccia web. I backup automatici programmati sono implementati ma **non attivi**.

---

## 🔧 Architettura del Sistema di Backup

### Componenti Principali

#### 1. **Backend Service** (`server/database-service.ts`)
Modulo Node.js che gestisce tutte le operazioni di backup/ripristino tramite comandi PostgreSQL (`pg_dump` e `psql`).

#### 2. **API Endpoints** (`server/routes.ts`)
Endpoint REST per creare, ripristinare, scaricare ed eliminare backup.

#### 3. **Frontend UI** (`client/src/pages/BackupPage.tsx`)
Interfaccia utente React per la gestione completa dei backup.

#### 4. **Configurazione** (`server/config.ts`)
Parametri configurabili tramite variabili d'ambiente.

---

## 📁 Directory e File

### Directory di Backup
```
./database_backups/
```
Tutti i backup vengono salvati in questa directory con formato:
```
backup_YYYY-MM-DDTHH-MM-SS_[uuid8].sql
```

**Esempio:**
```
backup_2025-10-06T14-30-00_a1b2c3d4.sql
```

---

## 🛠️ Funzionalità Implementate

### ✅ Funzioni Operative

| Funzione | Stato | Descrizione |
|----------|-------|-------------|
| **Backup Manuale** | ✅ Attivo | Creazione backup completo via interfaccia web |
| **Ripristino da Backup** | ✅ Attivo | Ripristino da backup salvato nel sistema |
| **Download Backup** | ✅ Attivo | Download file SQL sul dispositivo locale |
| **Upload & Ripristino** | ✅ Attivo | Caricamento e ripristino da file SQL esterno |
| **Gestione Backup** | ✅ Attivo | Visualizzazione, eliminazione backup |
| **Backup Automatici** | ❌ Non Attivo | Implementato ma non attivato |
| **Pulizia Automatica** | ❌ Non Attivo | Implementato ma non attivato |

---

## 🔌 API Endpoints

### Creazione Backup
```http
POST /api/database/backup
```
**Risposta:**
```json
{
  "success": true,
  "backupId": "a1b2c3d4",
  "timestamp": "2025-10-06T14:30:00.000Z",
  "size": 2048576
}
```

### Lista Backup Disponibili
```http
GET /api/database/backups
```
**Risposta:**
```json
[
  {
    "id": "a1b2c3d4",
    "filename": "backup_2025-10-06T14-30-00_a1b2c3d4.sql",
    "timestamp": "2025-10-06T14:30:00.000Z",
    "size": 2048576
  }
]
```

### Ripristino da Backup
```http
POST /api/database/restore/:backupId
```
**Parametri:**
- `backupId`: ID del backup da ripristinare

### Download Backup Completo
```http
GET /api/database/download
```
Genera e scarica un dump completo del database corrente.

### Ripristino da File Caricato
```http
POST /api/database/restore-file
Content-Type: application/json

{
  "sqlContent": "base64_encoded_sql_content",
  "fileName": "backup.sql"
}
```

### Eliminazione Backup
```http
DELETE /api/database/backups/:backupId
```

---

## 📝 Formato e Parametri Backup

### Comando pg_dump Utilizzato
```bash
PGPASSWORD="***" pg_dump \
  -h <host> \
  -p <port> \
  -U <user> \
  -d <database> \
  -f "backup.sql" \
  --format=p \
  --no-owner \
  --no-acl \
  --no-privileges \
  -c \
  --if-exists \
  --verbose \
  --no-security-labels \
  --no-tablespaces \
  --no-comments \
  --schema=public \
  --no-publications \
  --no-subscriptions \
  --no-sync
```

### Parametri Chiave
- **`--format=p`**: Formato plain text SQL (leggibile e portabile)
- **`-c --if-exists`**: Include comandi DROP IF EXISTS per pulizia
- **`--schema=public`**: Solo schema pubblico (esclude schemi di sistema)
- **`--no-owner --no-acl`**: Esclude informazioni proprietà/permessi

---

## ⚙️ Configurazione

### Variabili d'Ambiente (`server/config.ts`)

```javascript
// Abilita/disabilita backup automatici (default: true)
AUTO_BACKUP_ENABLED = process.env.AUTO_BACKUP_ENABLED !== 'false'

// Intervallo backup automatici in ore (default: 24)
AUTO_BACKUP_INTERVAL_HOURS = process.env.AUTO_BACKUP_INTERVAL_HOURS || '24'

// Giorni di retention backup (default: 30)
BACKUP_RETENTION_DAYS = process.env.BACKUP_RETENTION_DAYS || '30'
```

### File `.env` (esempio)
```env
AUTO_BACKUP_ENABLED=true
AUTO_BACKUP_INTERVAL_HOURS=24
BACKUP_RETENTION_DAYS=30
```

---

## 🚀 Attivazione Backup Automatici

### ⚠️ IMPORTANTE: Backup Automatici Non Attivi

Il codice per i backup automatici è **implementato ma non attivato**. Per attivarli:

### Modifica Richiesta: `server/index.ts`

**Aggiungere:**
```javascript
import { scheduleAutomaticBackups } from './database-service.js';
import { AUTO_BACKUP_ENABLED, AUTO_BACKUP_INTERVAL_HOURS } from './config.js';

// Dopo l'inizializzazione del server, aggiungere:
if (AUTO_BACKUP_ENABLED) {
  scheduleAutomaticBackups(AUTO_BACKUP_INTERVAL_HOURS);
  console.log(`✅ Backup automatici attivati ogni ${AUTO_BACKUP_INTERVAL_HOURS} ore`);
}
```

### Funzionamento Backup Automatici

Quando attivati, il sistema:
1. **Primo backup**: Eseguito dopo 5 minuti dall'avvio del server
2. **Backup periodici**: Ogni X ore (configurabile)
3. **Pulizia automatica**: Elimina backup più vecchi di Y giorni (configurabile)

---

## 📊 Funzioni Backend Disponibili

### `createDatabaseBackup()`
Crea un nuovo backup del database.

**Ritorna:**
```typescript
{
  id: string,
  filename: string,
  timestamp: string,
  size: number
}
```

### `restoreDatabaseFromBackup(backupFilename: string)`
Ripristina il database da un file di backup salvato.

**Parametri:**
- `backupFilename`: Nome del file nella directory backup

**Ritorna:** `Promise<boolean>`

### `restoreDatabaseFromUploadedFile(filePath: string)`
Ripristina da un file SQL caricato dall'utente.

**Parametri:**
- `filePath`: Percorso completo del file temporaneo

**Ritorna:** `Promise<boolean>`

### `getAvailableBackups()`
Ottiene la lista di tutti i backup disponibili.

**Ritorna:**
```typescript
BackupInfo[] = [
  {
    id: string,
    filename: string,
    timestamp: string,
    size: number
  }
]
```

### `deleteBackup(backupId: string)`
Elimina un backup specifico.

**Parametri:**
- `backupId`: ID univoco del backup

**Ritorna:** `boolean`

### `scheduleAutomaticBackups(intervalHours: number)`
Pianifica backup automatici periodici.

**Parametri:**
- `intervalHours`: Intervallo in ore tra i backup

**Ritorna:** `NodeJS.Timeout`

### `cleanupOldBackups(daysToKeep: number)`
Elimina i backup più vecchi del numero di giorni specificato.

**Parametri:**
- `daysToKeep`: Numero di giorni di retention

---

## 🖥️ Interfaccia Utente

### Accesso
**URL:** `/backup` (dalla sidebar principale)

### Funzionalità UI

#### Tab "Backup Disponibili"
- Lista di tutti i backup con data, ora e dimensione
- Pulsante "Crea nuovo backup"
- Azioni per ogni backup:
  - **Download**: Scarica il file SQL
  - **Ripristina**: Ripristina il database da questo backup
  - **Elimina**: Rimuovi il backup

#### Tab "Ripristino"
- **Carica file SQL**: Upload di un file SQL esterno
- **Ripristina da file**: Applica il backup caricato
- Alert di sicurezza: avvisa che l'operazione sovrascrive i dati correnti

---

## 🔐 Sicurezza

### Avvertenze Importanti

1. **Ripristino Distruttivo**: 
   - Il ripristino da backup **sovrascrive completamente** il database corrente
   - Include comandi `DROP TABLE IF EXISTS`
   - **Non reversibile** senza un backup precedente

2. **Password Database**:
   - Le password sono gestite tramite variabile d'ambiente `DATABASE_URL`
   - Mai hardcodate nel codice
   - Passate ai comandi PostgreSQL tramite `PGPASSWORD`

3. **Permessi File**:
   - La directory `./database_backups/` deve avere permessi di scrittura
   - I file backup sono in formato plain text (leggibili)
   - **Non condividere** backup in ambienti non sicuri

---

## 🐛 Troubleshooting

### Problema: Backup fallisce
**Possibili Cause:**
- `pg_dump` non installato sul sistema
- Credenziali database errate
- Permessi insufficienti sulla directory backup
- Spazio disco insufficiente

**Verifica:**
```bash
# Controlla se pg_dump è disponibile
which pg_dump

# Controlla permessi directory
ls -la ./database_backups/

# Test manuale
PGPASSWORD="password" pg_dump -h host -U user -d db -f test.sql
```

### Problema: Ripristino fallisce
**Possibili Cause:**
- File SQL corrotto o incompatibile
- Versione PostgreSQL non compatibile
- Schema database non corrispondente

**Verifica:**
```bash
# Test ripristino manuale
PGPASSWORD="password" psql -h host -U user -d db -f backup.sql
```

### Problema: Backup automatici non partono
**Causa:** Funzione non chiamata in `server/index.ts`

**Soluzione:** Vedere sezione "Attivazione Backup Automatici"

---

## 📋 Checklist per il Programmatore

### Da Fare per Attivare il Sistema Completo

- [ ] **Verificare `pg_dump` e `psql` installati** sul server
- [ ] **Aggiungere import e chiamata** `scheduleAutomaticBackups()` in `server/index.ts`
- [ ] **Configurare variabili d'ambiente** nel file `.env`:
  - `AUTO_BACKUP_ENABLED=true`
  - `AUTO_BACKUP_INTERVAL_HOURS=24`
  - `BACKUP_RETENTION_DAYS=30`
- [ ] **Verificare permessi directory** `./database_backups/`
- [ ] **Testare creazione backup manuale** dall'interfaccia
- [ ] **Testare ripristino backup** in ambiente di test
- [ ] **Monitorare log** per backup automatici dopo attivazione
- [ ] **Configurare backup esterni** (opzionale: copia su S3, Google Cloud, etc.)

### Test Raccomandati

1. **Test Backup Manuale:**
   - Accedi a `/backup`
   - Clicca "Crea nuovo backup"
   - Verifica che il file appaia nella lista

2. **Test Ripristino:**
   - Crea un backup di test
   - Modifica alcuni dati nel database
   - Ripristina dal backup
   - Verifica che i dati tornino allo stato precedente

3. **Test Download:**
   - Scarica un backup
   - Verifica che il file SQL sia leggibile
   - Controlla la presenza di comandi `DROP` e `CREATE`

4. **Test Upload:**
   - Carica un file SQL esterno
   - Ripristina da esso
   - Verifica l'integrità dei dati

---

## 📞 Supporto Tecnico

### File di Riferimento
- Backend service: `server/database-service.ts`
- API routes: `server/routes.ts` (righe 7369-7631)
- Frontend UI: `client/src/pages/BackupPage.tsx`
- Configurazione: `server/config.ts`

### Log e Debug
I backup producono log dettagliati su console:
```
Avvio backup del database in: ./database_backups/backup_2025-10-06T14-30-00_a1b2c3d4.sql
Backup completato: backup_2025-10-06T14-30-00_a1b2c3d4.sql, Dimensione: 2.45 MB
```

---

## 📈 Miglioramenti Futuri Suggeriti

1. **Backup su Cloud Storage**
   - Integrazione con AWS S3 / Google Cloud Storage
   - Backup incrementali invece che completi

2. **Compressione Backup**
   - Utilizzare `--format=c` (custom compressed)
   - Riduzione spazio disco occupato

3. **Notifiche**
   - Email/Telegram al completamento backup
   - Alert in caso di fallimento

4. **Monitoring**
   - Dashboard con statistiche backup
   - Grafici dimensione/frequenza

5. **Backup Differenziali**
   - Solo le modifiche dall'ultimo backup
   - Riduzione tempo di backup per database grandi

---

## ✅ Stato Attuale del Sistema

| Componente | Stato | Note |
|------------|-------|------|
| Backend Service | ✅ Completo | Tutte le funzioni implementate |
| API Endpoints | ✅ Completo | 6 endpoint operativi |
| Frontend UI | ✅ Completo | Interfaccia completa e funzionale |
| Backup Manuali | ✅ Operativo | Testato e funzionante |
| Ripristino | ✅ Operativo | Da backup e da file |
| Download | ✅ Operativo | Genera dump al volo |
| Backup Automatici | ⚠️ Implementato | **Non attivato** - richiede modifica `server/index.ts` |
| Pulizia Automatica | ⚠️ Implementato | **Non attivato** - si attiva con backup automatici |

---

**Documento preparato il 6 Ottobre 2025**  
**Per: Programmatore FLUPSY Management System**  
**Da: Analisi tecnica del codice esistente**
