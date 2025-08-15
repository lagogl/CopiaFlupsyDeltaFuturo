# FLUPSY Mobile Operators - Setup Guide

## File di Setup per Nuova App Mobile

Questi file sono pronti per creare una nuova app mobile per operatori FLUPSY.

### File Preparati:
- `shared/schema.ts` - Schema database ottimizzato per app mobile
- `drizzle.config.ts` - Configurazione Drizzle
- `.env` - Variabili ambiente con DATABASE_URL
- `package.json` - Dipendenze minime per app mobile
- `README-SETUP.md` - Questa guida

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

### Prossimo: Sviluppo Interfaccia
Una volta completato il setup, si procede con:
1. Server API minimale
2. Frontend mobile ottimizzato
3. Autenticazione operatori
4. Form peso/misura touch-friendly
5. Testing su dispositivi mobile