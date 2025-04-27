-- Creazione enum operation_type se non esiste
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'operation_type') THEN
    CREATE TYPE operation_type AS ENUM (
      'prima-attivazione', 'pulizia', 'vagliatura', 'trattamento', 'misura', 
      'vendita', 'selezione-vendita', 'cessazione', 'peso', 'selezione-origine'
    );
  END IF;
END $$;

-- Creazione tabella dei valori predefiniti di impatto delle operazioni
CREATE TABLE IF NOT EXISTS operation_impact_defaults (
  id SERIAL PRIMARY KEY,
  operation_type operation_type NOT NULL,
  water REAL NOT NULL,
  carbon REAL NOT NULL,
  energy REAL NOT NULL,
  waste REAL NOT NULL,
  biodiversity REAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Indice per velocizzare le ricerche per tipo di operazione
CREATE INDEX IF NOT EXISTS idx_operation_impact_defaults_operation_type
ON operation_impact_defaults (operation_type);

-- Commento alla tabella
COMMENT ON TABLE operation_impact_defaults IS 'Valori predefiniti di impatto ambientale per tipo di operazione';