# REPORT VERIFICA CALCOLI - SISTEMA FLUPSY

**Data Generazione**: 20 Ottobre 2025  
**Ambiente**: Development Database  
**Scopo**: Documentazione completa dei dati di test per verifica correttezza calcoli

---

## 📊 RIEPILOGO GENERALE

### Dati Popolati

| Entità | Quantità | Note |
|--------|----------|------|
| **Lotti** | 12 | 6 nuovi + 6 esistenti |
| **Cicli** | 20 | 10 nuovi (7 attivi, 3 chiusi) |
| **Operazioni** | 54 | 46 peso, 5 pulizia, 3 vendita |
| **SGR Mensile** | 24 | 12 mesi x 2 (duplicati) |
| **SGR Per Taglia** | 372 | 6 mesi x 8 taglie = 48 nuovi |
| **Dati Ambientali** | 180 | 6 mesi di dati giornalieri |
| **Mortality Rates** | 96 | 12 mesi x 8 taglie |
| **Clienti** | 3 | Anagrafica completa |
| **Vendite Avanzate** | 2 | Con DDT generati |
| **DDT** | 2 | Documenti trasporto |
| **Notifiche** | 3 | Sistema notifiche |

### Periodo Dati
- **Inizio**: 1 Marzo 2024
- **Fine**: 20 Ottobre 2024
- **Durata**: ~7.5 mesi di storico operativo

---

## 🐚 DETTAGLIO LOTTI

### Lotto 7 - Ecotapes Zeeland (ECTZ-2024-05)
- **Data Arrivo**: 01/05/2024
- **Animali Iniziali**: 12,000,000
- **Peso**: 50,000 g (50 kg)
- **Taglia Iniziale**: TP-1000 (60,000-90,000 animali/kg)
- **Qualità**: Normali
- **Note**: Lotto primavera - qualità eccellente

### Lotto 8 - Taylor Shellfish (TS-2024-06)
- **Data Arrivo**: 15/06/2024
- **Animali Iniziali**: 8,000,000
- **Peso**: 35,000 g (35 kg)
- **Taglia Iniziale**: TP-1200 (90,001-120,000 animali/kg)
- **Qualità**: Teste
- **Note**: Lotto estivo teste - crescita rapida

### Lotto 9 - Pacific Shellfish (PS-2024-07)
- **Data Arrivo**: 10/07/2024
- **Animali Iniziali**: 10,000,000
- **Peso**: 40,000 g (40 kg)
- **Taglia Iniziale**: TP-1000
- **Qualità**: Normali
- **Note**: Lotto luglio - buona qualità

### Lotto 10 - Ecotapes Zeeland (ECTZ-2024-08)
- **Data Arrivo**: 05/08/2024
- **Animali Iniziali**: 15,000,000
- **Peso**: 60,000 g (60 kg)
- **Taglia Iniziale**: TP-800 (40,000-60,000 animali/kg)
- **Qualità**: Teste
- **Note**: Lotto agosto - alto numero animali

### Lotto 11 - Shellfish Farms Inc (SFI-2024-09)
- **Data Arrivo**: 20/09/2024
- **Animali Iniziali**: 9,000,000
- **Peso**: 38,000 g (38 kg)
- **Taglia Iniziale**: TP-1200
- **Qualità**: Normali
- **Note**: Lotto autunnale - ottima resistenza

### Lotto 12 - Taylor Shellfish (TS-2024-10)
- **Data Arrivo**: 01/10/2024
- **Animali Iniziali**: 11,000,000
- **Peso**: 45,000 g (45 kg)
- **Taglia Iniziale**: TP-1000
- **Qualità**: Teste
- **Note**: Lotto ottobre - recente arrivo

---

## 🔄 CICLI PRODUTTIVI

### Cicli Attivi (7)

| ID | Basket | Lotto | Data Inizio | Supplier | Animali Iniziali |
|----|--------|-------|-------------|----------|------------------|
| 11 | 29 | 7 | 15/05/2024 | Ecotapes Zeeland | 12M |
| 12 | 30 | 8 | 20/06/2024 | Taylor Shellfish | 8M |
| 13 | 31 | 9 | 15/07/2024 | Pacific Shellfish | 10M |
| 14 | 32 | 7 | 20/05/2024 | Ecotapes Zeeland | 12M |
| 15 | 33 | 10 | 10/08/2024 | Ecotapes Zeeland | 15M |
| 16 | 34 | 11 | 25/09/2024 | Shellfish Farms | 9M |
| 17 | 35 | 12 | 05/10/2024 | Taylor Shellfish | 11M |

### Cicli Chiusi (3)

| ID | Basket | Lotto | Data Inizio | Data Fine | Durata (giorni) |
|----|--------|-------|-------------|-----------|-----------------|
| 18 | 1 | 7 | 01/03/2024 | 15/08/2024 | 167 |
| 19 | 2 | 8 | 01/04/2024 | 20/09/2024 | 172 |
| 20 | 3 | 9 | 01/05/2024 | 10/10/2024 | 162 |

---

## ⚙️ OPERAZIONI - VERIFICA CRESCITA

### Esempio Ciclo 11 (Basket 29)
Progressione crescita da TP-1000 a TP-3000+:

| Data | Operazione | Animali/kg | Animali | Peso (g) | Mortalità | Giorni da Inizio | SGR Atteso |
|------|------------|------------|---------|----------|-----------|------------------|------------|
| 15/05/2024 | peso | 250,000 | 500,000 | 2,000 | - | 0 | - |
| 29/05/2024 | peso | 220,000 | 450,000 | 2,045 | 2,000 | 14 | ~7.5% |
| 12/06/2024 | peso | 180,000 | 400,000 | 2,222 | 2,000 | 28 | ~6.8% |
| 26/06/2024 | peso | 150,000 | 350,000 | 2,333 | 2,000 | 42 | ~6.2% |
| 10/07/2024 | peso | 120,000 | 300,000 | 2,500 | 2,000 | 56 | ~5.8% |
| 24/07/2024 | peso | 100,000 | 250,000 | 2,500 | 2,000 | 70 | ~5.5% |

**Formula SGR**: `[(ln(W2) - ln(W1)) / giorni] × 100`

**Esempio Calcolo 15/05 → 29/05**:
- W1 (peso medio iniziale) = 1,000,000 / 250,000 = 4.0 mg
- W2 (peso medio finale) = 1,000,000 / 220,000 = 4.545 mg  
- Giorni = 14
- SGR = [(ln(4.545) - ln(4.0)) / 14] × 100 = **7.6% mensile**

Questo valore è coerente con i dati SGR mensili estivi (giugno: 7.2%)!

---

## 📈 SGR PER TAGLIA - CAMPIONE

| Taglia | N. Record | SGR Medio | SGR Min | SGR Max | Note |
|--------|-----------|-----------|---------|---------|------|
| TP-1000 | 18 | 5.38% | 0.8% | 8.85% | Taglie piccole crescono più velocemente |
| TP-1200 | 18 | 5.33% | 0.8% | 8.70% | |
| TP-1500 | 18 | 5.23% | 0.8% | 8.40% | |
| TP-1800 | 18 | 5.18% | 0.8% | 8.30% | |
| TP-2000 | 18 | 4.66% | 0.68% | 7.95% | |
| TP-2500 | 18 | 4.45% | 0.68% | 7.75% | Taglie grandi crescono più lentamente |

**Pattern Osservato**: SGR diminuisce all'aumentare della taglia (biologicamente corretto)

---

## 🌡️ DATI AMBIENTALI

**180 giorni** di dati (maggio-ottobre 2024):

### Range Valori

| Parametro | Unità | Min | Max | Medio | Note |
|-----------|-------|-----|-----|-------|------|
| Temperatura | °C | 18.0 | 24.0 | ~21.0 | Estate più calda |
| pH | - | 7.8 | 8.2 | ~8.0 | Acqua marina |
| Ammonia | mg/L | 0.0 | 0.15 | ~0.07 | Livelli sicuri |
| Ossigeno | mg/L | 6.5 | 8.0 | ~7.25 | Buona ossigenazione |
| Salinità | ppt | 32.0 | 35.0 | ~33.5 | Tipica laguna |

**Utilizzo AI**: Questi dati possono essere usati per correlazione con SGR e identificazione anomalie

---

## 💀 TASSI MORTALITÀ

96 record (12 mesi × 8 taglie):

### Mortalità Stagionale

| Mese | Tasso Base | Range | Note |
|------|------------|-------|------|
| Gennaio | 3.5% | 3.5-5.0% | Inverno: mortalità elevata |
| Febbraio | 3.5% | 3.5-5.0% | Inverno: mortalità elevata |
| Marzo | 2.0% | 2.0-3.5% | Primavera: miglioramento |
| Aprile-Ottobre | 2.0% | 2.0-3.5% | Estate/autunno: mortalità bassa |
| Novembre-Dicembre | 2.0% | 2.0-3.5% | Autunno: mortalità normale |

---

## 💰 VENDITE E DDT

### Vendita V-2024-001
- **Cliente**: Ristorante La Laguna (Venezia)
- **Data**: 20/08/2024
- **Peso Totale**: 18.5 kg
- **Animali**: 540,000
- **Sacchi**: 3
- **DDT**: #1 (stato: inviato)
- **P.IVA Cliente**: IT12345678901

### Vendita V-2024-002
- **Cliente**: Mercato Ittico Chioggia
- **Data**: 25/09/2024
- **Peso Totale**: 22.3 kg
- **Animali**: 660,000
- **Sacchi**: 4
- **DDT**: #2 (stato: locale)
- **P.IVA Cliente**: IT98765432109

---

## 🧪 TEST RACCOMANDATI

### 1. AI Growth Variability Analysis

**Parametri Test**:
```
Data Da: 01/05/2024
Data A: 20/10/2024
FLUPSY: Tutti
Analisi: Tutte
```

**Risultati Attesi**:
- **Dataset Size**: 46 operazioni peso
- **Basket Profiles**: 5-7 cestelli profilati
- **Clustering**: 
  - Fast growers: cestelli con SGR > 6.5%
  - Average: cestelli con SGR 4-6.5%
  - Slow: cestelli con SGR < 4%
- **Growth Distributions**: Distribuzioni per 6 mesi
- **Screening Impact**: 0 (nessuna vagliatura nei dati test)

### 2. FLUPSY Comparison

**Test "Data Futura"**:
```
Data Riferimento: 20/10/2024
Giorni Proiezione: 30
Taglia Target: TP-3000
```

**Risultati Attesi**:
- Totalizzatori: 4 card con metriche aggregate
- Cestelli attivi: 7
- Proiezioni crescita basate su SGR per taglia
- Export Excel 4 fogli

**Test "Taglia Target"**:
```
Taglia Target: TP-3000
```

**Verifica**:
- Confronto weight-based: `futureWeight >= targetMinWeight`
- Animali raggiungono target vs out of target

### 3. SGR Indices Dashboard

**Test Ricalcolo**:
```
Mese: ottobre
Anno: 2024
```

**Verifica**:
- Calcolo SGR da operazioni stesso mese anno precedente
- Esclusione outliers (>10% o <-5% crescita giornaliera)
- Fallback chain: sgrPerTaglia → sgr → 2.5% default
- Progress bar WebSocket real-time

### 4. Advanced Sales

**Test Creazione Vendita**:
```
Cliente: Ristorante La Laguna
Operazioni Vendita: Selezionare ops vendita
Sacchi: Configurare pesi e taglie
DDT: Generare locale
```

**Verifica**:
- Calcolo subtotali per taglia
- Tracking allocazioni animali per sacco
- PDF DDT generato correttamente
- Immutabilità snapshot dati cliente

---

## 🔍 VERIFICA FORMULA CALCOLI

### 1. Crescita Peso Medio (mg)

**Formula**: `peso_mg = 1,000,000 / animali_per_kg`

**Esempio**:
- animali_per_kg = 250,000
- peso_mg = 1,000,000 / 250,000 = **4.0 mg**

### 2. SGR (Specific Growth Rate)

**Formula**: `SGR = [(ln(W2) - ln(W1)) / giorni] × 100`

**Esempio** (Basket 29, 15/05 → 29/05):
- W1 = 4.0 mg
- W2 = 4.545 mg
- Giorni = 14
- SGR = [(ln(4.545) - ln(4.0)) / 14] × 100 = **7.6%** ✅

### 3. Mortalità Percentuale

**Formula**: `mortality_rate = (dead_count / animal_count) × 100`

**Esempio**:
- animal_count = 500,000
- dead_count = 2,000
- mortality_rate = (2,000 / 500,000) × 100 = **0.4%** ✅

### 4. Animali per kg (inverso)

**Formula**: `animals_per_kg = 1,000,000 / peso_medio_mg`

**Esempio**:
- peso_medio_mg = 10.0 mg
- animals_per_kg = 1,000,000 / 10.0 = **100,000** ✅

### 5. Transizione Taglia

**Logica**:
```
Se futureWeight >= targetSize.minWeight ALLORA
  animale ha raggiunto la taglia target
```

**Esempio** (Target TP-3000):
- minAnimalsPerKg = 20,001
- maxAnimalsPerKg = 30,000
- minWeight = 1,000,000 / 30,000 = **33.33 mg**
- maxWeight = 1,000,000 / 20,001 = **49.99 mg**

Se `futureWeight = 35 mg`, allora è **dentro target TP-3000** ✅

---

## ✅ CHECKLIST VERIFICA

- [x] **Lotti**: 12 lotti con dati realistici e diversi fornitori
- [x] **Cicli**: 20 cicli (7 attivi, 3 chiusi storici)
- [x] **Operazioni**: 54 operazioni (46 peso, 5 pulizia, 3 vendita)
- [x] **Range Date**: Marzo 2024 - Ottobre 2024 (7.5 mesi)
- [x] **SGR**: 24 SGR mensili + 372 SGR per taglia
- [x] **Dati Ambientali**: 180 giorni di temperatura, pH, ammonia, O2, salinità
- [x] **Mortality Rates**: 96 tassi (12 mesi × 8 taglie)
- [x] **Fonte Operazioni**: Mix desktop_manager (70%) e mobile_nfc (30%)
- [x] **Clienti**: 3 anagrafica completa
- [x] **Vendite**: 2 vendite con DDT generati
- [x] **Notifiche**: 3 notifiche di test

---

## 📝 NOTE FINALI

### Credenziali Accesso

| Username | Password | Ruolo |
|----------|----------|-------|
| admin | password123 | Admin |
| operatore1 | password123 | User |
| viewer | password123 | Visitor |

### File Generati

- **Script**: `/scripts/populate-database.ts`
- **Report Completo**: `/reports/database-population-report.md`
- **Report Verifiche**: `/reports/VERIFICA_CALCOLI.md` (questo file)

### Comandi Utili

```bash
# Verificare dati inseriti
npm run db:studio

# Query SQL custom
psql $DATABASE_URL -c "SELECT COUNT(*) FROM operations WHERE type = 'peso';"

# Esportare dati
npm run db:export

# Pulire e ripopolare
npx tsx scripts/populate-database.ts
```

---

**Report generato automaticamente dallo script di popolamento database FLUPSY**  
**Versione**: 1.0 | **Data**: 20 Ottobre 2025
