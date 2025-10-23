import { db } from "../../db";
import { sql } from "drizzle-orm";
import NodeCache from "node-cache";

// Cache per schema (TTL: 1 ora, aggiornato automaticamente)
const schemaCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const CACHE_KEY = 'database_schema_v2';

interface ColumnInfo {
  tableName: string;
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault: string | null;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  referencedTable?: string;
  referencedColumn?: string;
}

interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  foreignKeys: Array<{
    column: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
  description?: string;
}

interface DatabaseSchema {
  tables: TableInfo[];
  relationships: string[];
  commonJoins: string[];
  enumTypes: Record<string, string[]>;
  schemaText: string;
  lastUpdate: Date;
}

/**
 * Genera schema database dinamico interrogando information_schema
 */
export async function getDatabaseSchema(forceRefresh = false): Promise<DatabaseSchema> {
  // Controlla cache
  if (!forceRefresh) {
    const cached = schemaCache.get<DatabaseSchema>(CACHE_KEY);
    if (cached) {
      console.log('📋 Schema database recuperato dalla cache');
      return cached;
    }
  }

  console.log('🔍 Generazione schema database dinamico...');

  try {
    // 1. Ottieni tutte le colonne con info sui constraint
    const columnsQuery = await db.execute(sql`
      SELECT 
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
        fk.foreign_table_name as referenced_table,
        fk.foreign_column_name as referenced_column
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.table_name, ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku 
          ON tc.constraint_name = ku.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND ku.table_schema = 'public'
      ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
      LEFT JOIN (
        SELECT
          kcu.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
      WHERE c.table_schema = 'public'
        AND c.table_name NOT LIKE 'pg_%'
        AND c.table_name NOT LIKE 'sql_%'
        AND c.table_name != 'drizzle__migrations'
      ORDER BY c.table_name, c.ordinal_position
    `);

    const columns = columnsQuery.rows as any[];

    // 2. Raggruppa per tabella
    const tablesMap = new Map<string, TableInfo>();
    
    for (const col of columns) {
      if (!tablesMap.has(col.table_name)) {
        tablesMap.set(col.table_name, {
          name: col.table_name,
          columns: [],
          primaryKeys: [],
          foreignKeys: []
        });
      }

      const table = tablesMap.get(col.table_name)!;
      
      table.columns.push({
        tableName: col.table_name,
        columnName: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === 'YES',
        columnDefault: col.column_default,
        isPrimaryKey: col.is_primary_key,
        isForeignKey: col.is_foreign_key,
        referencedTable: col.referenced_table,
        referencedColumn: col.referenced_column
      });

      if (col.is_primary_key) {
        table.primaryKeys.push(col.column_name);
      }

      if (col.is_foreign_key && col.referenced_table) {
        table.foreignKeys.push({
          column: col.column_name,
          referencedTable: col.referenced_table,
          referencedColumn: col.referenced_column
        });
      }
    }

    const tables = Array.from(tablesMap.values());

    // 3. Genera relazioni e join comuni
    const relationships: string[] = [];
    const commonJoins: string[] = [];

    for (const table of tables) {
      for (const fk of table.foreignKeys) {
        relationships.push(
          `${table.name}.${fk.column} → ${fk.referencedTable}.${fk.referencedColumn}`
        );
        commonJoins.push(
          `${table.name} JOIN ${fk.referencedTable} ON ${table.name}.${fk.column} = ${fk.referencedTable}.${fk.referencedColumn}`
        );
      }
    }

    // FALLBACK: Se non ci sono FK nel database, usa relazioni curate manualmente
    if (relationships.length === 0) {
      console.log('⚠️ Nessuna FK rilevata nel database, uso relazioni curate');
      
      // Relazioni curate dalle tabelle principali del sistema FLUPSY
      const curatedRelationships = [
        'operations.basket_id → baskets.id',
        'operations.cycle_id → cycles.id',
        'operations.lot_id → lots.id',
        'operations.size_id → sizes.id',
        'operations.sgr_id → sgr.id',
        'baskets.flupsy_id → flupsys.id',
        'baskets.current_cycle_id → cycles.id',
        'cycles.basket_id → baskets.id',
        'cycles.lot_id → lots.id',
        'lots.size_id → sizes.id',
        'basket_lot_composition.basket_id → baskets.id',
        'basket_lot_composition.cycle_id → cycles.id',
        'basket_lot_composition.lot_id → lots.id',
        'advanced_sales.id → sale_bags.sale_id',
        'sale_bags.id → sale_allocations.bag_id',
        'sale_bags.size_id → sizes.id',
        'sale_allocations.basket_id → baskets.id',
        'sale_allocations.cycle_id → cycles.id'
      ];

      const curatedJoins = [
        'operations JOIN baskets ON operations.basket_id = baskets.id',
        'operations JOIN flupsys ON baskets.flupsy_id = flupsys.id',
        'operations JOIN cycles ON operations.cycle_id = cycles.id',
        'operations JOIN lots ON operations.lot_id = lots.id',
        'operations JOIN sizes ON operations.size_id = sizes.id',
        'baskets JOIN flupsys ON baskets.flupsy_id = flupsys.id',
        'baskets JOIN cycles ON baskets.current_cycle_id = cycles.id',
        'cycles JOIN baskets ON cycles.basket_id = baskets.id',
        'cycles JOIN lots ON cycles.lot_id = lots.id',
        'basket_lot_composition JOIN baskets ON basket_lot_composition.basket_id = baskets.id',
        'basket_lot_composition JOIN cycles ON basket_lot_composition.cycle_id = cycles.id',
        'basket_lot_composition JOIN lots ON basket_lot_composition.lot_id = lots.id',
        'advanced_sales JOIN sale_bags ON advanced_sales.id = sale_bags.sale_id',
        'sale_bags JOIN sizes ON sale_bags.size_id = sizes.id',
        'sale_bags JOIN sale_allocations ON sale_bags.id = sale_allocations.bag_id',
        'sale_allocations JOIN baskets ON sale_allocations.basket_id = baskets.id'
      ];

      relationships.push(...curatedRelationships);
      commonJoins.push(...curatedJoins);
    }

    // 4. Ottieni enum types (per operation types, states, etc)
    const enumsQuery = await db.execute(sql`
      SELECT 
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname
    `);

    const enumTypes: Record<string, string[]> = {};
    for (const row of (enumsQuery.rows as any[])) {
      enumTypes[row.enum_name] = row.enum_values;
    }

    // 5. Genera testo schema formattato per AI
    const schemaText = generateSchemaText(tables, relationships, commonJoins, enumTypes);

    const schema: DatabaseSchema = {
      tables,
      relationships,
      commonJoins,
      enumTypes,
      schemaText,
      lastUpdate: new Date()
    };

    // Salva in cache
    schemaCache.set(CACHE_KEY, schema);
    console.log(`✅ Schema generato: ${tables.length} tabelle, ${relationships.length} relazioni`);

    return schema;

  } catch (error) {
    console.error('❌ Errore generazione schema:', error);
    throw error;
  }
}

/**
 * Genera testo schema formattato per prompt AI
 */
function generateSchemaText(
  tables: TableInfo[],
  relationships: string[],
  commonJoins: string[],
  enumTypes: Record<string, string[]>
): string {
  let text = '=== SCHEMA DATABASE POSTGRESQL ===\n\n';

  // Tabelle principali
  text += 'TABELLE:\n';
  for (const table of tables) {
    text += `\n${table.name}:\n`;
    for (const col of table.columns) {
      const nullable = col.isNullable ? 'NULL' : 'NOT NULL';
      const pk = col.isPrimaryKey ? ' [PK]' : '';
      const fk = col.isForeignKey ? ` [FK → ${col.referencedTable}]` : '';
      text += `  - ${col.columnName}: ${col.dataType} ${nullable}${pk}${fk}\n`;
    }
  }

  // Enum types
  if (Object.keys(enumTypes).length > 0) {
    text += '\nTIPI ENUM:\n';
    for (const [name, values] of Object.entries(enumTypes)) {
      text += `  ${name}: ${values.join(', ')}\n`;
    }
  }

  // Relazioni
  text += '\nRELAZIONI:\n';
  for (const rel of relationships) {
    text += `  - ${rel}\n`;
  }

  // Join comuni
  text += '\nJOIN COMUNI:\n';
  for (const join of commonJoins) {
    text += `  - ${join}\n`;
  }

  // Note importanti
  text += '\nNOTE IMPORTANTI:\n';
  text += '  - Usa sempre alias chiari per le colonne nelle SELECT\n';
  text += '  - Preferisci LEFT JOIN a INNER JOIN per evitare perdita dati\n';
  text += '  - Per date usa TO_CHAR(date_column, \'DD/MM/YYYY\') per formato italiano\n';
  text += '  - Limita risultati a max 10000 righe per performance\n';
  text += '  - Per taglie (sizes), valori più bassi in min_animals_per_kg = animali più grandi\n';

  return text;
}

/**
 * Invalida cache schema (chiamare dopo modifiche DDL)
 */
export function invalidateSchemaCache(): void {
  schemaCache.del(CACHE_KEY);
  console.log('🗑️ Cache schema invalidata');
}

/**
 * Ottieni statistiche tabelle (conteggio righe)
 */
export async function getTableStats(): Promise<Record<string, number>> {
  const schema = await getDatabaseSchema();
  const stats: Record<string, number> = {};

  for (const table of schema.tables) {
    try {
      const result = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table.name}`));
      stats[table.name] = parseInt((result.rows[0] as any).count);
    } catch (error) {
      stats[table.name] = 0;
    }
  }

  return stats;
}
