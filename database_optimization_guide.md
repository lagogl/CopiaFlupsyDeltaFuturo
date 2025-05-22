# Guida all'ottimizzazione del database PostgreSQL per l'applicazione Flupsy Manager

Questa guida fornisce indicazioni dettagliate su come ottenere prestazioni ottimali dal database PostgreSQL utilizzato dall'applicazione Flupsy Manager. Le ottimizzazioni sono state suddivise in diverse categorie per facilitarne l'implementazione.

## Indice
1. [Ottimizzazioni degli indici](#ottimizzazioni-degli-indici)
2. [Vincoli di chiave esterna](#vincoli-di-chiave-esterna)
3. [Viste materializzate](#viste-materializzate)
4. [Impostazioni di PostgreSQL](#impostazioni-di-postgresql)
5. [Aggiornamento viste materializzate](#aggiornamento-viste-materializzate)
6. [Analisi delle prestazioni](#analisi-delle-prestazioni)
7. [Manutenzione periodica](#manutenzione-periodica)

## Ottimizzazioni degli indici

Gli indici sono fondamentali per migliorare le prestazioni delle query. Abbiamo creato indici ottimizzati per le tabelle più utilizzate nell'applicazione:

- Indici su chiavi primarie (creati automaticamente)
- Indici su chiavi esterne per migliorare le operazioni di join
- Indici su colonne frequentemente utilizzate nelle clausole WHERE, GROUP BY e ORDER BY
- Indici composti per query che filtrano su più colonne contemporaneamente

Per implementare queste ottimizzazioni, eseguire lo script `optimize_database_indexes.sql`.

## Vincoli di chiave esterna

I vincoli di chiave esterna garantiscono l'integrità dei dati e migliorano le prestazioni dei join. Abbiamo aggiunto vincoli tra le seguenti tabelle:

- `baskets` → `flupsys`
- `operations` → `baskets`, `cycles`, `sizes`, `lots`
- `cycles` → `baskets`
- `basket_position_history` → `baskets`, `flupsys`

Per implementare questi vincoli, eseguire lo script `add_foreign_key_constraints.sql`.

## Viste materializzate

Le viste materializzate sono query precompilate che memorizzano i risultati nel database, accelerando notevolmente le query frequenti. Abbiamo creato le seguenti viste materializzate:

1. **mv_active_baskets**: Informazioni complete sui cestelli attivi
2. **mv_active_cycles_stats**: Statistiche sui cicli attivi
3. **mv_current_basket_positions**: Posizioni correnti dei cestelli
4. **mv_active_lots_info**: Informazioni sui lotti attivi

Queste viste accelerano significativamente le operazioni più frequenti nell'applicazione. Per implementarle, eseguire lo script `create_materialized_views.sql`.

## Impostazioni di PostgreSQL

Abbiamo ottimizzato le impostazioni di PostgreSQL per le esigenze specifiche dell'applicazione Flupsy Manager. Le ottimizzazioni includono:

- Configurazioni di memoria per migliorare caching e operazioni complesse
- Impostazioni di checkpoint e WAL per ridurre I/O su disco
- Configurazioni di autovacuum per mantenere il database efficiente
- Impostazioni parallele per sfruttare CPU multi-core
- Configurazioni specifiche per query di join

Per implementare queste ottimizzazioni, eseguire lo script `optimize_postgresql_settings.sql` su un server di produzione. Nota che alcune impostazioni potrebbero richiedere il riavvio del database.

## Aggiornamento viste materializzate

Le viste materializzate vanno aggiornate periodicamente per garantire dati freschi. Abbiamo creato:

1. Una funzione `refresh_all_materialized_views()` per aggiornare tutte le viste
2. Uno script `refresh_materialized_views.js` per l'aggiornamento programmato
3. Istruzioni per configurare job pianificati tramite pg_cron (opzionale)

Il momento ideale per aggiornare le viste materializzate è:
- Dopo operazioni di scrittura significative (creazione di cestelli, operazioni, ecc.)
- Durante periodi di basso utilizzo
- A intervalli regolari (es. ogni ora)

## Analisi delle prestazioni

Per monitorare e ottimizzare ulteriormente le prestazioni, utilizzare lo script `database_performance_analysis.sql` che analizza:

- Dimensioni di tabelle e indici
- Tabelle che necessitano di VACUUM
- Statistiche delle viste materializzate
- Query lente
- Indici non utilizzati o poco utilizzati
- Tabelle senza indici adeguati
- Analisi delle contese tra query

Eseguire questa analisi periodicamente per identificare aree che potrebbero beneficiare di ulteriori ottimizzazioni.

## Manutenzione periodica

Per garantire prestazioni ottimali nel tempo, è consigliabile eseguire regolarmente le seguenti operazioni:

1. **VACUUM ANALYZE** sulle tabelle principali (ogni notte)
2. Aggiornamento delle viste materializzate (ogni ora)
3. Analisi delle prestazioni (settimanale)
4. Verifica di indici non utilizzati (mensile)
5. Aggiornamento delle statistiche (settimanale)

Utilizzare pg_cron o un job scheduler esterno per automatizzare queste operazioni.

---

## Conclusioni

Implementando tutte le ottimizzazioni descritte in questa guida, l'applicazione Flupsy Manager dovrebbe registrare miglioramenti significativi nelle prestazioni, in particolare:

- Caricamento più veloce delle pagine
- Riduzione dei tempi di risposta per le query complesse
- Miglior utilizzo delle risorse hardware
- Maggiore stabilità durante i picchi di utilizzo

Per assistenza nell'implementazione di queste ottimizzazioni, contattare il team di supporto.