// Script per creare le tabelle del modulo Eco-impact
import { db } from '../server/db';
import { 
  impactCategories, 
  impactFactors,
  operationImpacts,
  flupsyImpacts,
  cycleImpacts,
  sustainabilityGoals,
  sustainabilityReports,
  goalStatusEnum
} from '../shared/eco-impact/schema';

async function createEcoImpactTables() {
  console.log("Iniziando la creazione delle tabelle per il modulo Eco-impact...");

  try {
    // Creiamo l'enum per lo stato degli obiettivi
    await db.execute(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_status') THEN
          CREATE TYPE goal_status AS ENUM ('planned', 'in-progress', 'completed', 'cancelled');
        END IF;
      END $$;
    `);
    console.log("Enum goal_status creato o già esistente");
    
    // Creiamo la tabella delle categorie di impatto
    await db.execute(`
      CREATE TABLE IF NOT EXISTS impact_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        color VARCHAR(20),
        unit VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log("Tabella impact_categories creata");
    
    // Creiamo la tabella dei fattori di impatto
    await db.execute(`
      CREATE TABLE IF NOT EXISTS impact_factors (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL REFERENCES impact_categories(id),
        operation_type VARCHAR(50),
        factor_value DECIMAL(10,4) NOT NULL,
        unit VARCHAR(20) NOT NULL,
        description TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log("Tabella impact_factors creata");
    
    // Creiamo la tabella degli impatti delle operazioni
    await db.execute(`
      CREATE TABLE IF NOT EXISTS operation_impacts (
        id SERIAL PRIMARY KEY,
        operation_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL REFERENCES impact_categories(id),
        impact_value DECIMAL(10,4) NOT NULL,
        baseline_value DECIMAL(10,4),
        improvement_percentage DECIMAL(5,2),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log("Tabella operation_impacts creata");
    
    // Creiamo la tabella degli impatti dei FLUPSY
    await db.execute(`
      CREATE TABLE IF NOT EXISTS flupsy_impacts (
        id SERIAL PRIMARY KEY,
        flupsy_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL REFERENCES impact_categories(id),
        impact_value DECIMAL(10,4) NOT NULL,
        time_period VARCHAR(20) NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log("Tabella flupsy_impacts creata");
    
    // Creiamo la tabella degli impatti dei cicli produttivi
    await db.execute(`
      CREATE TABLE IF NOT EXISTS cycle_impacts (
        id SERIAL PRIMARY KEY,
        cycle_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL REFERENCES impact_categories(id),
        impact_value DECIMAL(10,4) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log("Tabella cycle_impacts creata");
    
    // Creiamo la tabella degli obiettivi di sostenibilità
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sustainability_goals (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        flupsy_id INTEGER,
        category_id INTEGER REFERENCES impact_categories(id),
        target_value DECIMAL(10,4),
        current_value DECIMAL(10,4),
        unit VARCHAR(20),
        status goal_status NOT NULL DEFAULT 'planned',
        target_date TIMESTAMP WITH TIME ZONE,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log("Tabella sustainability_goals creata");
    
    // Creiamo la tabella dei report di sostenibilità
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sustainability_reports (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        report_period VARCHAR(50) NOT NULL,
        start_date TIMESTAMP WITH TIME ZONE NOT NULL,
        end_date TIMESTAMP WITH TIME ZONE NOT NULL,
        summary TEXT,
        highlights JSONB,
        metrics JSONB,
        flupsy_ids INTEGER[],
        file_path VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log("Tabella sustainability_reports creata");
    
    // Inseriamo alcune categorie di impatto di default
    await db.execute(`
      INSERT INTO impact_categories (name, description, icon, color, unit)
      VALUES 
        ('water', 'Consumo di acqua', 'droplet', 'blue', 'm³'),
        ('carbon', 'Emissioni di carbonio', 'cloud', 'gray', 'kg'),
        ('energy', 'Consumo energetico', 'zap', 'yellow', 'kWh'),
        ('waste', 'Produzione di rifiuti', 'trash', 'brown', 'kg'),
        ('biodiversity', 'Impatto sulla biodiversità', 'fish', 'green', 'index')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log("Categorie di impatto di default inserite");
    
    console.log("Creazione delle tabelle per il modulo Eco-impact completata con successo");
  } catch (error) {
    console.error("Errore durante la creazione delle tabelle:", error);
    throw error;
  }
}

// Eseguiamo la funzione
createEcoImpactTables()
  .then(() => {
    console.log("Tabelle Eco-impact create con successo!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Errore nella creazione delle tabelle:", error);
    process.exit(1);
  });