-- Add missing columns to baskets table
ALTER TABLE baskets ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE baskets ADD COLUMN IF NOT EXISTS external_id text;

-- Add missing columns to lots table 
ALTER TABLE lots ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS origin text;
ALTER TABLE lots ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_baskets_active ON baskets(active);
CREATE INDEX IF NOT EXISTS idx_lots_active ON lots(active);
CREATE INDEX IF NOT EXISTS idx_baskets_external_id ON baskets(external_id);
CREATE INDEX IF NOT EXISTS idx_lots_external_id ON lots(external_id);