# 🧪 STRATEGIA DI TEST COMPLETA - MODULO VAGLIATURA CON MAPPA

## 📋 PANORAMICA
Il modulo vagliatura gestisce la separazione e riorganizzazione dei molluschi nei cestelli FLUPSY in base alle dimensioni. Include una mappa visuale interattiva per l'assegnazione delle posizioni.

## 🎯 CASISTICHE DA TESTARE

### 1️⃣ **CREAZIONE NUOVA VAGLIATURA**
**Scenario**: Creare una nuova operazione di vagliatura
**Passi di Test**:
1. Accedi alla sezione Vagliature
2. Clicca su "Nuova Vagliatura"
3. Inserisci dati:
   - Data vagliatura
   - Scopo (es: "Selezione per vendita")
   - Taglia di riferimento (es: T3)
   - Note opzionali
4. **Verifica**: Il sistema assegna automaticamente il numero progressivo di vagliatura

---

### 2️⃣ **SELEZIONE CESTELLI ORIGINE**
**Scenario**: Selezionare i cestelli da vagliare
**Passi di Test**:
1. Nella sezione "Cestelli Origine", clicca "Aggiungi Cestello"
2. Seleziona cestelli con diversi stati:
   - Cestello attivo normale
   - Cestello con mortalità registrata
   - Cestello già venduto parzialmente
3. Per ogni cestello, inserisci:
   - Numero animali attuali
   - Peso totale (kg)
   - Calcolo automatico animali/kg
4. **Verifica**: 
   - I cestelli selezionati mostrano FLUPSY di provenienza
   - Il totale animali origine si aggiorna automaticamente

---

### 3️⃣ **CONFIGURAZIONE CESTELLI DESTINAZIONE**
**Scenario**: Definire dove vanno i molluschi vagliati
**Passi di Test**:

#### A) Cestelli Riposizionati
1. Clicca "Aggiungi Cestello Destinazione"
2. Seleziona categoria: "Riposizionata"
3. Inserisci:
   - Nuovo ID cestello o usa esistente
   - Numero animali
   - Peso totale
   - Taglia assegnata (T1, T2, T3, ecc.)
4. **Verifica**: Il cestello è pronto per l'assegnazione posizione

#### B) Cestelli Venduti
1. Clicca "Aggiungi Cestello Destinazione"
2. Seleziona categoria: "Venduta"
3. Inserisci:
   - ID cestello venduto
   - Numero animali venduti
   - Peso venduto
4. **Verifica**: 
   - Il cestello NON richiede posizione
   - Viene conteggiato nei totalizzatori vendite

---

### 4️⃣ **MAPPA FLUPSY - ASSEGNAZIONE POSIZIONI**
**Scenario**: Usare la mappa interattiva per posizionare i cestelli
**Passi di Test**:
1. Apri la "Mappa FLUPSY"
2. Seleziona un FLUPSY dal menu dropdown
3. La griglia mostra:
   - Posizioni libere (verdi)
   - Posizioni occupate (grigie)
   - Cestelli da posizionare (lista a destra)
4. Drag & Drop o click per assegnare posizioni
5. **Verifica**:
   - Le posizioni si aggiornano in tempo reale
   - Non è possibile sovrapporre cestelli
   - I cestelli venduti NON appaiono nella lista

---

### 5️⃣ **CESTELLI DOPPIO RUOLO (ORIGINE + DESTINAZIONE)**
**Scenario**: Un cestello che è sia origine che destinazione
**Caso d'uso**: Vagliatura parziale dove parte rimane nello stesso cestello

**Passi di Test**:
1. Aggiungi Cestello ID 100 come ORIGINE con 10.000 animali
2. Aggiungi stesso Cestello ID 100 come DESTINAZIONE con 7.000 animali
3. I 3.000 animali restanti vanno in altri cestelli
4. **Verifica**:
   - Il sistema gestisce correttamente il doppio ruolo
   - La posizione del cestello può rimanere invariata o essere modificata
   - I calcoli di mortalità sono corretti

---

### 6️⃣ **GESTIONE POSIZIONI DINAMICHE**
**Scenario**: Gestire posizioni non standard o NULL
**Passi di Test**:
1. Testa cestelli con posizioni:
   - Standard: "A1", "B5", "C10"
   - Dinamiche: parsing da stringa posizione
   - NULL: cestelli senza posizione assegnata
2. **Verifica**:
   - Il sistema NON usa hardcoded position=1
   - Gestisce correttamente valori NULL
   - Parsing dinamico delle posizioni

---

### 7️⃣ **CALCOLO MORTALITÀ**
**Scenario**: Verificare i calcoli di mortalità
**Formula**: `Mortalità = Animali Origine - Animali Destinazione`
**Passi di Test**:
1. Origine: 10.000 animali totali
2. Destinazione: 9.500 animali totali
3. **Verifica**:
   - Mortalità = 500 animali
   - Percentuale = 5%
   - Dashboard mostra correttamente i dati

---

### 8️⃣ **TOTALIZZATORI PER TAGLIA**
**Scenario**: Verificare i raggruppamenti per taglia
**Passi di Test**:
1. Crea destinazioni con diverse taglie:
   - T1: 2000 animali (1500 venduti, 500 riposizionati)
   - T2: 3000 animali (tutti riposizionati)
   - T3: 4500 animali (3000 venduti, 1500 riposizionati)
2. **Verifica** nella sezione Totalizzatori:
   - T1: Totale 2000, Venduti 1500, Ripos. 500
   - T2: Totale 3000, Venduti 0, Ripos. 3000
   - T3: Totale 4500, Venduti 3000, Ripos. 1500

---

### 9️⃣ **DISMISSIONE CESTELLI ORIGINE**
**Scenario**: Marcare cestelli origine come dismessi
**Passi di Test**:
1. Dopo completare la vagliatura
2. Seleziona cestelli origine da dismettere
3. Clicca "Dismetti Cestello"
4. **Verifica**:
   - Il cestello è marcato come "dismissed"
   - Non appare più nelle liste attive
   - Rimane visibile nello storico

---

### 🔟 **COMPLETAMENTO E REPORT**
**Scenario**: Finalizzare la vagliatura e generare report
**Passi di Test**:
1. Verifica tutti i dati inseriti
2. Clicca "Completa Vagliatura"
3. Genera Report PDF
4. **Verifica Report PDF**:
   - Header con numero vagliatura e data
   - Tabella cestelli origine
   - Tabella cestelli destinazione
   - Totalizzatori per taglia
   - Riepilogo mortalità

---

## 🐛 CASI LIMITE DA TESTARE

### 1. **Vagliatura Vuota**
- Crea vagliatura senza cestelli
- Verifica che il sistema gestisca correttamente

### 2. **Mortalità 100%**
- Tutti gli animali origine morti
- Nessun cestello destinazione

### 3. **Posizioni Sovrapposte**
- Tenta di assegnare 2 cestelli alla stessa posizione
- Verifica che il sistema blocchi l'operazione

### 4. **Cestelli Orfani**
- Cestelli destinazione senza origine corrispondente
- Verifica validazione

### 5. **Modifica Vagliatura Completata**
- Tenta di modificare una vagliatura già completata
- Verifica che sia in sola lettura

---

## 📊 METRICHE DI SUCCESSO

✅ **Test Superato se**:
- Tutti i calcoli sono corretti (mortalità, totalizzatori)
- La mappa FLUPSY funziona correttamente
- I cestelli doppio ruolo sono gestiti
- Le posizioni dinamiche/NULL sono gestite
- Il report PDF è generato correttamente
- I dati sono persistenti dopo refresh

❌ **Test Fallito se**:
- Errori nei calcoli
- Posizioni hardcoded (position=1)
- Cestelli venduti richiedono posizione
- Mappa non si aggiorna
- Perdita dati dopo refresh
- Report PDF incompleto o errato

---

## 🔄 PROCEDURA DI TEST COMPLETO

### **Setup Iniziale**
1. Login come admin (Gianluigi/Gianluigi)
2. Verifica database pulito o con dati di test

### **Esecuzione Test**
1. Esegui ogni scenario nell'ordine
2. Documenta risultati per ogni caso
3. Cattura screenshot di errori
4. Verifica logs per errori nascosti

### **Test di Regressione**
1. Ripeti test dopo ogni modifica al codice
2. Verifica che fix non rompano altre funzionalità
3. Test su diversi browser (Chrome, Firefox, Safari)

---

## 📝 CHECKLIST FINALE

- [ ] Creazione vagliatura funziona
- [ ] Selezione cestelli origine OK
- [ ] Cestelli destinazione configurabili
- [ ] Mappa FLUPSY interattiva funziona
- [ ] Cestelli venduti gestiti correttamente
- [ ] Cestelli doppio ruolo supportati
- [ ] Posizioni dinamiche/NULL gestite
- [ ] Calcoli mortalità corretti
- [ ] Totalizzatori per taglia accurati
- [ ] Report PDF generato
- [ ] Persistenza dati verificata
- [ ] Performance accettabile (<3s per operazione)
- [ ] Nessun errore in console
- [ ] UI responsive su mobile

---

## 🚀 COMANDI UTILI PER TEST

### Test Manuale Rapido
```bash
# Verifica endpoint vagliatura
curl -s http://localhost:5000/api/screenings

# Crea nuova vagliatura di test
curl -X POST http://localhost:5000/api/screening/operations \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-10-10","purpose":"Test","status":"draft"}'

# Verifica mappa FLUPSY
curl -s http://localhost:5000/api/flupsys
```

### Verifica Database
```sql
-- Conta vagliature
SELECT COUNT(*) FROM screening_operations;

-- Verifica cestelli doppio ruolo
SELECT * FROM screening_source_baskets 
WHERE basket_id IN (
  SELECT basket_id FROM screening_destination_baskets
);

-- Controlla posizioni NULL
SELECT * FROM screening_destination_baskets 
WHERE position IS NULL AND category = 'Riposizionata';
```

---

## 📞 CONTATTI PER SUPPORTO

In caso di problemi durante i test:
1. Controlla i log del server
2. Verifica la console del browser
3. Consulta la documentazione tecnica
4. Segnala bug con screenshot e passi per riprodurre

---

**NOTA IMPORTANTE**: Questa strategia di test copre TUTTE le casistiche del modulo vagliatura. Eseguire tutti i test garantisce che il modulo funzioni correttamente in produzione.