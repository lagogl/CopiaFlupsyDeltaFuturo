# FLUPSY Mobile Operators - Setup Guide

## File di Setup per Nuova App Mobile

Questi file sono pronti per creare una nuova app mobile per operatori FLUPSY.

### File Preparati:
- `shared/schema.ts` - Schema database COMPLETO con campi per calcoli automatici
- `server/mobile-operations.ts` - Logica calcoli automatici operazioni peso
- `drizzle.config.ts` - Configurazione Drizzle
- `.env` - Variabili ambiente con DATABASE_URL
- `package.json` - Dipendenze per app mobile
- `README-SETUP.md` - Questa guida

### 🔧 CAMPI CRITICI AGGIUNTI:
- `animalsPerKg` in operations - Per calcolo automatico averageWeight e sizeId
- `minAnimalsPerKg`/`maxAnimalsPerKg` in sizes - Per determinazione automatica taglia
- `sizeId`, `sgrId` in operations - Per compatibilità completa
- Logica MobileOperationsHandler - Per calcoli automatici peso

### Prossimi Passi:

1. **Crea nuovo Repl su Replit**
   - Nome: "flupsy-mobile-operators" 
   - Template: Node.js o React

2. **Copia i file**
   - Copia tutti i file di questa cartella nel nuovo Repl
   - Mantieni la struttura directory

3. **Installa dipendenze**
   ```bash
   npm install
   ```

4. **Verifica connessione database**
   ```bash
   npm run db:push
   ```

### Caratteristiche App Mobile:

**Funzionalità Core:**
- Login operatore semplificato
- Lista cestelli attivi 
- Form peso e misura ottimizzato touch
- Validazioni automatiche
- Storico operazioni

**Design Mobile-First:**
- Interfaccia verticale (smartphone)
- Bottoni grandi per touch
- Input numerico ottimizzato
- Conferma operazioni rapida
- PWA (funziona come app nativa)

**Sicurezza:**
- Accesso limitato (solo peso/misura)
- Validazioni rigide sui dati
- Session timeout automatico
- Log audit completo

### Database Access:
- **Lettura:** baskets, cycles, flupsys, lots, sizes
- **Scrittura:** operations (solo tipo "peso" e "misura")
- Stesso database del sistema principale FLUPSY

### 🚀 CALCOLI AUTOMATICI OPERAZIONI PESO:

**Input Operatore:**
- Peso totale (grammi)
- Numero animali
- ID cestello/ciclo

**Calcoli Automatici:**
- `animalsPerKg = numero_animali / (peso_totale_kg)`
- `averageWeight = 1,000,000 / animalsPerKg` (milligrammi)
- `sizeId` = taglia basata su range minAnimalsPerKg/maxAnimalsPerKg

**Utilizzo:**
```typescript
import { mobileOpsHandler } from './server/mobile-operations';

const operation = await mobileOpsHandler.createWeightOperation({
  basketId: 1,
  cycleId: 1, 
  date: '2025-08-15',
  totalWeight: 2500, // grammi
  animalCount: 150,
  operatorName: 'Mario Rossi'
});
// Ritorna operazione completa con tutti i campi calcolati
```

### Prossimo: Sviluppo Interfaccia
1. Server API con MobileOperationsHandler
2. Frontend mobile ottimizzato
3. Autenticazione operatori
4. Form peso touch-friendly con calcoli automatici
5. Testing calcoli su dispositivi mobile