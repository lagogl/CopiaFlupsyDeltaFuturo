# PIANO DI TEST COMPLETO - FLUPSY Manager
## Ipotesi di Lavoro per Test End-to-End

### FASE 1: SETUP INIZIALE
**Obiettivo**: Preparare il sistema con dati di base

#### 1.1 Verifica FLUPSY Esistenti
- ✅ Controllare FLUPSY disponibili nel sistema (attualmente 12 FLUPSY)
- ✅ Verificare che ci siano FLUPSY attivi per i test

#### 1.2 Verifica Taglie Disponibili
- ✅ Controllare che le taglie siano configurate correttamente
- ✅ Verificare presenza taglie critiche: TP-500, TP-1000, TP-2000, TP-3000

### FASE 2: CREAZIONE CESTELLI E AVVIO CICLI
**Obiettivo**: Creare cestelli operativi con cicli attivi

#### 2.1 Creazione Cestelli
- Creare 5 cestelli su FLUPSY diversi:
  - **Cesta 1**: FLUPSY "Flupsy 2 piccolo 10 ceste" - Posizione A1
  - **Cesta 2**: FLUPSY "BINS 5x4" - Posizione B2  
  - **Cesta 3**: FLUPSY "Flupsy 2 piccolo 10 ceste" - Posizione A3
  - **Cesta 4**: FLUPSY "BINS 5x4" - Posizione C1
  - **Cesta 5**: FLUPSY "Flupsy 2 piccolo 10 ceste" - Posizione B1

#### 2.2 Prima Attivazione
- Eseguire operazioni di **prima attivazione** per tutti i cestelli:
  - Data: 11 Agosto 2025
  - Animali: 150.000 per cesta
  - Taglia iniziale: TP-500 (5.000.000 animali/kg)
  - Peso totale: 30g per cesta

### FASE 3: OPERAZIONI DI MONITORAGGIO
**Obiettivo**: Testare le operazioni di routine

#### 3.1 Operazioni di Misura (14 Agosto 2025)
- Eseguire **misure** su tutti i cestelli:
  - Animali: 145.000 (simulando piccola mortalità naturale)
  - Peso medio: 0.003g per animale (crescita naturale)
  - Taglia calcolata: TP-450

#### 3.2 Operazioni di Pulizia (16 Agosto 2025)
- Eseguire **pulizia** sui cestelli 1, 3, 5:
  - Nessuna variazione di animali
  - Registrare l'operazione per tracciabilità

#### 3.3 Prima Vagliatura (18 Agosto 2025)
- Eseguire **vagliatura** sui cestelli 2 e 4:
  - Taglia di riferimento: TP-1000
  - Animali sopravvissuti: 140.000
  - Mortalità: 5.000 animali (3.4%)

### FASE 4: CRESCITA E MONITORAGGIO AVANZATO
**Obiettivo**: Simulare crescita e operazioni periodiche

#### 4.1 Seconda Serie di Misure (22 Agosto 2025)
- **Misure** su tutti i cestelli:
  - Crescita animali: variabile per cesta
  - Peso medio aumentato
  - Alcune ceste raggiungono TP-1000/TP-1500

#### 4.2 Operazioni di Peso (25 Agosto 2025)
- Eseguire **peso** dettagliato:
  - Campionamento accurato
  - Calcolo SGR (Specific Growth Rate)
  - Verifica previsioni AI

#### 4.3 Seconda Vagliatura (28 Agosto 2025)
- **Vagliatura selettiva**:
  - Solo cestelli con taglia ≥ TP-1500
  - Separazione taglie commerciali
  - Registrazione destinazioni

### FASE 5: PREPARAZIONE ALLA VENDITA
**Obiettivo**: Testare selezioni e preparazioni commerciali

#### 5.1 Selezioni per Vendita (1 Settembre 2025)
- Creare **selezioni** per vendita:
  - Raggruppare cestelli per taglia commerciale
  - Target: TP-2000/TP-2500 per mercato
  - Calcolare quantità disponibili

#### 5.2 Controllo Qualità Pre-Vendita
- **Misure finali** sui lotti selezionati:
  - Verifica conformità taglie
  - Calcolo mortalità totale del ciclo
  - Validazione pesi commerciali

### FASE 6: OPERAZIONI DI VENDITA
**Obiettivo**: Testare il flusso di vendita completo

#### 6.1 Vendite Parziali (5 Settembre 2025)
- **Vendita** dal cestello 1:
  - Quantità: 50.000 animali
  - Taglia: TP-2000
  - Cliente: "Cliente Test A"
  - Verificare chiusura automatica ciclo

#### 6.2 Vendite Complete (8 Settembre 2025)  
- **Vendita totale** cestelli 2 e 4:
  - Vendita completa del contenuto
  - Verificare chiusura cicli
  - Controllo disponibilità posizioni

#### 6.3 Cessazioni (10 Settembre 2025)
- **Cessazione** per mortalità su cestello 5:
  - Registrare causa cessazione
  - Verificare chiusura ciclo
  - Liberazione posizione

### FASE 7: ANALISI E REPORTISTICA
**Obiettivo**: Testare funzionalità avanzate del sistema

#### 7.1 Test Sistema AI
- **AI Predittivo**: Analisi crescita rimanenti cestelli
- **AI Analytics**: Performace review del ciclo completato  
- **AI Sostenibilità**: Impatto ambientale delle operazioni

#### 7.2 Reportistica Avanzata
- **Giacenze Range**: Verificare calcoli stock per periodo
- **Registro Operazioni**: Controllo completezza storico
- **Dashboard Performance**: Analisi KPI generali

#### 7.3 Integrazione Sistema
- **WebSocket**: Verificare notifiche real-time
- **Cache**: Controllo prestazioni sistema
- **Database**: Integrità dati post-operazioni

### FASE 8: RIPOPOLAMENTO E NUOVO CICLO
**Obiettivo**: Testare riavvio operazioni

#### 8.1 Ripopolamento Cestelli Vuoti
- **Ripopolamento** posizioni liberate:
  - Nuova prima attivazione
  - Dati differenti dal ciclo precedente
  - Verificare numerazione cicli

#### 8.2 Gestione Mista
- **Operazioni simultane**:
  - Cestelli in crescita (vecchio ciclo)
  - Cestelli in prima attivazione (nuovo ciclo)  
  - Verificare separazione dati

### RISULTATI ATTESI

#### Dati Finali Previsti:
- **Cestelli Attivi**: 2-3 cestelli in crescita
- **Cicli Chiusi**: 3-4 cicli completati
- **Operazioni Totali**: ~25-30 operazioni registrate
- **Vendite Registrate**: 3-4 transazioni
- **Mortalità Media**: 5-8% per ciclo
- **SGR Medio**: 3-5% giornaliero

#### Verifiche Funzionali:
- ✅ Creazione e gestione cestelli
- ✅ Tutte le tipologie di operazioni
- ✅ Calcoli automatici (SGR, mortalità, giacenze)
- ✅ Sistema notifiche real-time
- ✅ Integrità database
- ✅ Prestazioni sistema sotto carico
- ✅ Funzionalità AI complete
- ✅ Reportistica accurata

### NOTE TECNICHE
- **Durata Test**: 2-3 ore per completamento
- **Dati Richiesti**: Nessun dato esterno necessario
- **Rollback**: Checkpoint automatici per recovery
- **Monitor**: Log real-time delle operazioni

---
**PRONTO PER ESECUZIONE** ✅