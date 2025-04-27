-- Aggiorna l'enum operation_type per includere i nuovi tipi
ALTER TYPE operation_type ADD VALUE IF NOT EXISTS 'trasporto-corto';
ALTER TYPE operation_type ADD VALUE IF NOT EXISTS 'trasporto-medio';
ALTER TYPE operation_type ADD VALUE IF NOT EXISTS 'trasporto-lungo';
ALTER TYPE operation_type ADD VALUE IF NOT EXISTS 'custom';