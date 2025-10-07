# Documentazione Sistema Vagliature Storiche

## Indice
1. [Panoramica](#panoramica)
2. [Architettura del Sistema](#architettura-del-sistema)
3. [Schema Database](#schema-database)
4. [Backend - API Routes](#backend-api-routes)
5. [Frontend - Lista Vagliature](#frontend-lista-vagliature)
6. [Frontend - Dettaglio Vagliatura](#frontend-dettaglio-vagliatura)
7. [Logica di Business](#logica-di-business)
8. [Flusso Dati](#flusso-dati)

---

## 1. Panoramica

Il sistema delle **Vagliature Storiche** permette di visualizzare, filtrare e analizzare tutte le operazioni di vagliatura completate nel sistema FLUPSY. Include:

- 📋 **Lista paginata** delle vagliature con filtri avanzati
- 🔍 **Dettaglio completo** di ogni vagliatura con cestelli origine/destinazione
- 📊 **Statistiche aggregate** per taglia e mortalità
- 📄 **Generazione PDF** dei report (endpoint predisposto)

**Stack tecnologico:**
- Backend: Node.js + Express + Drizzle ORM
- Frontend: React + TypeScript + TanStack Query
- Database: PostgreSQL

---

## 2. Architettura del Sistema

### 2.1 Componenti Principali

```
┌─────────────────────────────────────────────┐
│          FRONTEND (React)                   │
│                                             │
│  ┌──────────────┐    ┌──────────────────┐  │
│  │ScreeningsList│───▶│ ScreeningDetail  │  │
│  │   (Lista)    │    │   (Dettaglio)    │  │
│  └──────────────┘    └──────────────────┘  │
│         │                      │            │
└─────────┼──────────────────────┼────────────┘
          │                      │
          ▼                      ▼
┌─────────────────────────────────────────────┐
│          API ROUTES (Express)               │
│                                             │
│  GET /api/screenings                        │
│  GET /api/screenings/:id                    │
│  GET /api/screenings/:id/report.pdf         │
│                                             │
└─────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────┐
│          DATABASE (PostgreSQL)              │
│                                             │
│  - selections                               │
│  - selectionSourceBaskets                   │
│  - selectionDestinationBaskets              │
│  - baskets                                  │
│  - sizes                                    │
│  - flupsys                                  │
│                                             │
└─────────────────────────────────────────────┘
```

### 2.2 Relazione tra Tabelle

**Modello dati:**
- Una **Vagliatura** (selection) ha molti **Cestelli Origine** (selectionSourceBaskets)
- Una **Vagliatura** (selection) ha molti **Cestelli Destinazione** (selectionDestinationBaskets)
- Ogni cestello di destinazione ha una **categoria** (`sold` o `placed`)
- Ogni cestello di destinazione può avere una **posizione FLUPSY** assegnata

---

## 3. Schema Database

### 3.1 Tabella `selections`

Tabella principale che rappresenta una vagliatura completata.

```typescript
export const selections = pgTable("selections", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(), // Data operazione
  selectionNumber: integer("selection_number").notNull(), // Numero progressivo
  purpose: text("purpose", { enum: ["vendita", "vagliatura", "altro"] }).notNull(),
  screeningType: text("screening_type", { enum: ["sopra_vaglio", "sotto_vaglio"] }),
  referenceSizeId: integer("reference_size_id"), // Taglia di riferimento
  status: text("status", { enum: ["draft", "completed", "cancelled"] })
    .notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  notes: text("notes") // Note aggiuntive
});
```

**Campi chiave:**
- `selectionNumber`: Numero univoco progressivo della vagliatura
- `status`: `completed` per vagliature completate (quelle visualizzate nello storico)
- `referenceSizeId`: Riferimento alla taglia principale della vagliatura

### 3.2 Tabella `selectionSourceBaskets`

Cestelli di origine utilizzati nella vagliatura.

```typescript
export const selectionSourceBaskets = pgTable("selection_source_baskets", {
  id: serial("id").primaryKey(),
  selectionId: integer("selection_id").notNull(), // FK a selections
  basketId: integer("basket_id").notNull(), // FK a baskets
  cycleId: integer("cycle_id").notNull(), // FK a cycles
  
  // Snapshot dati al momento della vagliatura
  animalCount: integer("animal_count"), // Numero animali
  totalWeight: real("total_weight"), // Peso in grammi
  animalsPerKg: integer("animals_per_kg"),
  sizeId: integer("size_id"),
  lotId: integer("lot_id"),
  
  createdAt: timestamp("created_at").notNull().defaultNow()
});
```

**Caratteristiche:**
- **Snapshot immutabile**: Salva i dati del cestello al momento della vagliatura
- **Tracciabilità**: Riferimenti a basket, cycle e lot

### 3.3 Tabella `selectionDestinationBaskets`

Nuovi cestelli creati dalla vagliatura.

```typescript
export const selectionDestinationBaskets = pgTable("selection_destination_baskets", {
  id: serial("id").primaryKey(),
  selectionId: integer("selection_id").notNull(), // FK a selections
  basketId: integer("basket_id").notNull(), // FK a baskets
  cycleId: integer("cycle_id"), // FK a cycles
  
  // Tipo di destinazione
  destinationType: text("destination_type", { enum: ["sold", "placed"] }).notNull(),
  
  // Posizionamento (se placed)
  flupsyId: integer("flupsy_id"),
  position: text("position"),
  
  // Dati cestello
  animalCount: integer("animal_count"),
  liveAnimals: integer("live_animals"),
  totalWeight: real("total_weight"),
  animalsPerKg: integer("animals_per_kg"),
  sizeId: integer("size_id"),
  deadCount: integer("dead_count"),
  mortalityRate: real("mortality_rate"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
});
```

**Campi chiave:**
- `destinationType`: `sold` (venduto) o `placed` (riposizionato)
- `flupsyId`, `position`: Posizione nel FLUPSY se riposizionato
- `mortalityRate`: Percentuale di mortalità del cestello

---

## 4. Backend - API Routes

### 4.1 Endpoint: `GET /api/screenings`

**Scopo:** Restituisce lista paginata di vagliature con filtri.

**File:** `server/routes.ts` (righe 7862-7948)

**Query Parameters:**
- `status`: Stato vagliature (default: `completed`)
- `page`: Numero pagina (default: `1`)
- `pageSize`: Elementi per pagina (default: `20`)
- `screeningNumber`: Filtra per numero vagliatura
- `dateFrom`: Data inizio range
- `dateTo`: Data fine range

**Implementazione:**

```typescript
app.get("/api/screenings", async (req, res) => {
  try {
    const status = (req.query.status as string) || 'completed';
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const screeningNumber = req.query.screeningNumber as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    
    // Costruisci condizioni di filtro
    const conditions = [eq(selections.status, status)];
    
    if (screeningNumber) {
      conditions.push(eq(selections.selectionNumber, parseInt(screeningNumber)));
    }
    if (dateFrom) {
      conditions.push(sql`${selections.date} >= ${dateFrom}`);
    }
    if (dateTo) {
      conditions.push(sql`${selections.date} <= ${dateTo}`);
    }
    
    // Conta totale per paginazione
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(selections)
      .where(and(...conditions));
    
    const totalCount = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(totalCount / pageSize);
    const offset = (page - 1) * pageSize;
    
    // Query principale con filtri e paginazione
    const screenings = await db.select().from(selections)
      .where(and(...conditions))
      .orderBy(desc(selections.date))
      .limit(pageSize)
      .offset(offset);
    
    // Arricchisci con conteggi e informazioni aggregate
    const enrichedScreenings = await Promise.all(screenings.map(async (screening) => {
      const sourceBaskets = await db.select().from(selectionSourceBaskets)
        .where(eq(selectionSourceBaskets.selectionId, screening.id));
      
      const destBaskets = await db.select().from(selectionDestinationBaskets)
        .where(eq(selectionDestinationBaskets.selectionId, screening.id));
      
      const referenceSize = screening.referenceSizeId 
        ? await storage.getSize(screening.referenceSizeId)
        : null;
      
      const totalSourceAnimals = sourceBaskets.reduce((sum, b) => sum + (b.animalCount || 0), 0);
      const totalDestAnimals = destBaskets.reduce((sum, b) => sum + (b.animalCount || 0), 0);
      
      return {
        ...screening,
        referenceSize,
        sourceCount: sourceBaskets.length,
        destinationCount: destBaskets.length,
        totalSourceAnimals,
        totalDestAnimals,
        mortalityAnimals: totalSourceAnimals - totalDestAnimals
      };
    }));
    
    res.json({
      screenings: enrichedScreenings,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    console.error("Error fetching screenings:", error);
    res.status(500).json({ error: "Failed to fetch screenings" });
  }
});
```

**Risposta JSON:**
```json
{
  "screenings": [
    {
      "id": 1,
      "screeningNumber": 1,
      "date": "2025-10-07",
      "purpose": "vagliatura",
      "status": "completed",
      "referenceSize": { "code": "M", "name": "Media" },
      "sourceCount": 3,
      "destinationCount": 5,
      "totalSourceAnimals": 15000,
      "totalDestAnimals": 14500,
      "mortalityAnimals": 500
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### 4.2 Endpoint: `GET /api/screenings/:id`

**Scopo:** Restituisce dettaglio completo di una vagliatura.

**File:** `server/routes.ts` (righe 7951-8057)

**Implementazione:**

```typescript
app.get("/api/screenings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }
    
    // 1. Recupera vagliatura principale
    const screeningResult = await db.select().from(selections)
      .where(eq(selections.id, id))
      .limit(1);
    
    if (!screeningResult || screeningResult.length === 0) {
      return res.status(404).json({ error: "Screening not found" });
    }
    
    const screening = screeningResult[0];
    
    // 2. Recupera taglia di riferimento
    const referenceSize = screening.referenceSizeId
      ? await storage.getSize(screening.referenceSizeId)
      : null;
    
    // 3. Recupera cestelli origine
    const sourceBaskets = await db.select().from(selectionSourceBaskets)
      .where(eq(selectionSourceBaskets.selectionId, id));
    
    // Arricchisci cestelli origine con info FLUPSY
    const mappedSourceBaskets = await Promise.all(sourceBaskets.map(async (sb) => {
      const basket = await storage.getBasket(sb.basketId);
      const flupsyName = basket?.flupsyId 
        ? (await storage.getFlupsy(basket.flupsyId))?.name || null
        : null;
      
      return {
        ...sb,
        flupsyName,
        dismissed: !basket?.currentCycleId // Cestello liberato se non ha ciclo attivo
      };
    }));
    
    // 4. Recupera cestelli destinazione
    const destBaskets = await db.select().from(selectionDestinationBaskets)
      .where(eq(selectionDestinationBaskets.selectionId, id));
    
    // Arricchisci cestelli destinazione
    const mappedDestBaskets = await Promise.all(destBaskets.map(async (db_basket) => {
      const basket = await storage.getBasket(db_basket.basketId);
      const flupsyName = db_basket.flupsyId
        ? (await storage.getFlupsy(db_basket.flupsyId))?.name || null
        : null;
      const size = db_basket.sizeId
        ? await storage.getSize(db_basket.sizeId)
        : null;
      
      // Determina categoria in italiano
      const category = db_basket.destinationType === 'sold' 
        ? 'Venduta' 
        : 'Riposizionata';
      
      // Determina posizione
      const row = basket?.row || null;
      const position = basket?.position || null;
      const positionAssigned = !!(row && position);
      
      return {
        ...db_basket,
        flupsyName,
        category,
        row,
        position,
        positionAssigned,
        size
      };
    }));
    
    // 5. Risposta completa
    res.json({
      ...screening,
      referenceSize,
      sourceBaskets: mappedSourceBaskets,
      destinationBaskets: mappedDestBaskets
    });
  } catch (error) {
    console.error("Error fetching screening detail:", error);
    res.status(500).json({ error: "Failed to fetch screening detail" });
  }
});
```

**Risposta JSON:**
```json
{
  "id": 1,
  "screeningNumber": 1,
  "date": "2025-10-07",
  "purpose": "vagliatura",
  "status": "completed",
  "notes": "Vagliatura di routine",
  "referenceSize": { "code": "M", "name": "Media" },
  "sourceBaskets": [
    {
      "id": 1,
      "basketId": 10,
      "cycleId": 5,
      "animalCount": 5000,
      "totalWeight": 250000,
      "animalsPerKg": 20,
      "flupsyName": "FLUPSY 1",
      "dismissed": true
    }
  ],
  "destinationBaskets": [
    {
      "id": 1,
      "basketId": 15,
      "cycleId": 5,
      "category": "Riposizionata",
      "animalCount": 4800,
      "totalWeight": 240000,
      "animalsPerKg": 20,
      "flupsyId": 2,
      "flupsyName": "FLUPSY 2",
      "row": "DX",
      "position": 3,
      "positionAssigned": true,
      "size": { "id": 2, "code": "M", "name": "Media" }
    }
  ]
}
```

### 4.3 Endpoint: `GET /api/screenings/:id/report.pdf`

**Scopo:** Genera PDF della vagliatura (funzionalità in sviluppo).

**File:** `server/routes.ts` (righe 8060+)

**Stato attuale:** Endpoint predisposto ma non completamente implementato.

---

## 5. Frontend - Lista Vagliature

### 5.1 File: `client/src/pages/ScreeningsList.tsx`

**Componente principale:** `ScreeningsList`

**Funzionalità:**
- ✅ Lista paginata vagliature
- ✅ Filtri per numero, data inizio, data fine
- ✅ Visualizzazione statistiche (cestelli, animali, mortalità)
- ✅ Link dettaglio vagliatura
- ✅ Download PDF (pulsante predisposto)

### 5.2 State Management

```typescript
const [page, setPage] = useState(1);
const [pageSize] = useState(20);
const [screeningNumber, setScreeningNumber] = useState("");
const [dateFrom, setDateFrom] = useState("");
const [dateTo, setDateTo] = useState("");
const [showFilters, setShowFilters] = useState(false);
```

### 5.3 Query con TanStack Query

```typescript
const queryParams = new URLSearchParams();
queryParams.set('page', page.toString());
queryParams.set('pageSize', pageSize.toString());
if (screeningNumber) queryParams.set('screeningNumber', screeningNumber);
if (dateFrom) queryParams.set('dateFrom', dateFrom);
if (dateTo) queryParams.set('dateTo', dateTo);

const { data: response, isLoading } = useQuery<ScreeningsResponse>({
  queryKey: ['/api/screenings', page, pageSize, screeningNumber, dateFrom, dateTo],
  queryFn: async () => {
    const res = await fetch(`/api/screenings?${queryParams.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch screenings');
    return res.json();
  },
});
```

**Caratteristiche:**
- **Invalidazione cache automatica**: Cambio filtri ricarica dati
- **Dipendenze queryKey**: Ricarica quando cambiano filtri o pagina
- **Gestione errori**: Try/catch nella queryFn

### 5.4 Componente Filtri

```typescript
{showFilters && (
  <div className="mb-6 p-4 border rounded-lg bg-muted/50 space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="filter-number">Numero Vagliatura</Label>
        <Input
          id="filter-number"
          type="number"
          placeholder="Es. 1"
          value={screeningNumber}
          onChange={(e) => {
            setScreeningNumber(e.target.value);
            setPage(1); // Reset pagina quando cambia filtro
          }}
          data-testid="input-filter-number"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-date-from">Data Da</Label>
        <Input
          id="filter-date-from"
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          data-testid="input-filter-date-from"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-date-to">Data A</Label>
        <Input
          id="filter-date-to"
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          data-testid="input-filter-date-to"
        />
      </div>
    </div>
  </div>
)}
```

**Reset filtri:**
```typescript
const clearFilters = () => {
  setScreeningNumber("");
  setDateFrom("");
  setDateTo("");
  setPage(1);
};

const hasActiveFilters = screeningNumber || dateFrom || dateTo;
```

### 5.5 Tabella Vagliature

```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Numero</TableHead>
      <TableHead>Data</TableHead>
      <TableHead>Scopo</TableHead>
      <TableHead>Taglia Rif.</TableHead>
      <TableHead className="text-right">Cest. Origine</TableHead>
      <TableHead className="text-right">Cest. Dest.</TableHead>
      <TableHead className="text-right">Anim. Origine</TableHead>
      <TableHead className="text-right">Anim. Dest.</TableHead>
      <TableHead className="text-right">Mortalità</TableHead>
      <TableHead className="text-center">Azioni</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {screenings.map((screening) => {
      const mortalityPercent = screening.totalSourceAnimals > 0
        ? ((screening.mortalityAnimals / screening.totalSourceAnimals) * 100).toFixed(2)
        : 0;

      return (
        <TableRow key={screening.id}>
          <TableCell className="font-medium">#{screening.screeningNumber}</TableCell>
          <TableCell>{formatDate(screening.date)}</TableCell>
          <TableCell>{screening.purpose || '-'}</TableCell>
          <TableCell>{screening.referenceSize?.code || '-'}</TableCell>
          <TableCell className="text-right">{screening.sourceCount}</TableCell>
          <TableCell className="text-right">{screening.destinationCount}</TableCell>
          <TableCell className="text-right">{formatNumber(screening.totalSourceAnimals)}</TableCell>
          <TableCell className="text-right">{formatNumber(screening.totalDestAnimals)}</TableCell>
          <TableCell className="text-right">
            <Badge variant={Number(mortalityPercent) > 10 ? "destructive" : "secondary"}>
              {formatNumber(screening.mortalityAnimals)} ({mortalityPercent}%)
            </Badge>
          </TableCell>
          <TableCell className="text-center">
            <div className="flex gap-2 justify-center">
              <Link href={`/screenings/${screening.id}`}>
                <Button variant="outline" size="sm">
                  <FileText className="h-4 w-4 mr-1" />
                  Dettagli
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/api/screenings/${screening.id}/report.pdf`, '_blank')}
              >
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    })}
  </TableBody>
</Table>
```

### 5.6 Paginazione

```typescript
{pagination && pagination.totalPages > 1 && (
  <div className="flex items-center justify-between mt-4 pt-4 border-t">
    <div className="text-sm text-muted-foreground">
      Pagina {pagination.page} di {pagination.totalPages} ({pagination.totalCount} risultati totali)
    </div>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(page - 1)}
        disabled={!pagination.hasPreviousPage}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Precedente
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(page + 1)}
        disabled={!pagination.hasNextPage}
      >
        Successiva
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  </div>
)}
```

---

## 6. Frontend - Dettaglio Vagliatura

### 6.1 File: `client/src/pages/ScreeningDetail.tsx`

**Componente principale:** `ScreeningDetail`

**Funzionalità:**
- ✅ Visualizzazione completa vagliatura
- ✅ Informazioni generali (data, scopo, taglia, stato)
- ✅ Riepilogo numerico (cestelli, animali, mortalità)
- ✅ Totalizzatori per taglia
- ✅ Tabella cestelli origine
- ✅ Tabella cestelli destinazione
- ✅ Navigazione back alla lista
- ✅ Download PDF (pulsante predisposto)

### 6.2 Query Dettaglio

```typescript
const { id } = useParams<{ id: string }>();

const { data: screening, isLoading } = useQuery<ScreeningDetail>({
  queryKey: [`/api/screenings/${id}`],
  enabled: !!id
});
```

**Gestione loading e errori:**
```typescript
if (isLoading) {
  return (
    <div className="container mx-auto p-4 flex justify-center py-20">
      <Spinner className="h-12 w-12" />
    </div>
  );
}

if (!screening) {
  return (
    <div className="container mx-auto p-4">
      <div className="text-center py-20">
        <p className="text-muted-foreground">Vagliatura non trovata</p>
        <Button onClick={() => navigate('/screenings')} className="mt-4">
          Torna all'elenco
        </Button>
      </div>
    </div>
  );
}
```

### 6.3 Calcoli Aggregati

```typescript
// Totali animali
const totalSourceAnimals = (screening.sourceBaskets || [])
  .reduce((sum, b) => sum + (b.animalCount || 0), 0);
const totalDestAnimals = (screening.destinationBaskets || [])
  .reduce((sum, b) => sum + (b.animalCount || 0), 0);

// Mortalità
const mortalityAnimals = totalSourceAnimals - totalDestAnimals;
const mortalityPercent = totalSourceAnimals > 0
  ? ((mortalityAnimals / totalSourceAnimals) * 100).toFixed(2)
  : 0;

// Statistiche per taglia
const sizeStats = (screening.destinationBaskets || []).reduce((acc, basket) => {
  const sizeCode = basket.size?.code;
  if (sizeCode && basket.animalCount) {
    if (!acc[sizeCode]) {
      acc[sizeCode] = { total: 0, sold: 0, repositioned: 0 };
    }
    acc[sizeCode].total += basket.animalCount;
    
    if (basket.category === 'Venduta') {
      acc[sizeCode].sold += basket.animalCount;
    } else if (basket.category === 'Riposizionata') {
      acc[sizeCode].repositioned += basket.animalCount;
    }
  }
  return acc;
}, {} as Record<string, { total: number; sold: number; repositioned: number }>);
```

### 6.4 Card Informazioni Generali

```typescript
<Card>
  <CardHeader>
    <CardTitle>Informazioni Generali</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <div className="text-sm text-muted-foreground">Data</div>
        <div className="font-medium">{formatDate(screening.date)}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Scopo</div>
        <div className="font-medium">{screening.purpose || 'Non specificato'}</div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Taglia di Riferimento</div>
        <div className="font-medium">
          {screening.referenceSize?.code || 'N/D'}
        </div>
      </div>
      <div>
        <div className="text-sm text-muted-foreground">Stato</div>
        <Badge variant={screening.status === 'completed' ? 'default' : 'secondary'}>
          {screening.status === 'completed' ? 'Completata' : screening.status}
        </Badge>
      </div>
    </div>
    
    {screening.notes && (
      <div className="mt-4 p-3 bg-muted rounded-md">
        <div className="text-sm font-medium mb-1">Note</div>
        <div className="text-sm">{screening.notes}</div>
      </div>
    )}
  </CardContent>
</Card>
```

### 6.5 Totalizzatori per Taglia

```typescript
{sortedSizes.length > 0 && (
  <div className="mt-6">
    <div className="text-sm font-semibold mb-3 text-muted-foreground">
      Totalizzatori per Taglia
    </div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {sortedSizes.map(([sizeCode, stats]) => (
        <div key={sizeCode} className="p-3 border rounded-lg bg-card">
          <div className="font-semibold text-sm mb-2">{sizeCode}</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Totale:</span>
              <span className="font-medium">{formatNumber(stats.total)}</span>
            </div>
            {stats.sold > 0 && (
              <div className="flex justify-between text-orange-600 dark:text-orange-400">
                <span>Venduti:</span>
                <span className="font-medium">{formatNumber(stats.sold)}</span>
              </div>
            )}
            {stats.repositioned > 0 && (
              <div className="flex justify-between text-blue-600 dark:text-blue-400">
                <span>Ripos.:</span>
                <span className="font-medium">{formatNumber(stats.repositioned)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

### 6.6 Card Riepilogo

```typescript
<Card>
  <CardHeader>
    <CardTitle>Riepilogo</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <div className="text-sm text-blue-600 dark:text-blue-400">Cestelli Origine</div>
        <div className="text-2xl font-bold mt-1">
          {(screening.sourceBaskets || []).length}
        </div>
        <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
          Animali: {formatNumber(totalSourceAnimals)}
        </div>
      </div>
      <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
        <div className="text-sm text-green-600 dark:text-green-400">Cestelli Destinazione</div>
        <div className="text-2xl font-bold mt-1">
          {(screening.destinationBaskets || []).length}
        </div>
        <div className="text-sm text-green-600 dark:text-green-400 mt-1">
          Animali: {formatNumber(totalDestAnimals)}
        </div>
      </div>
      <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
        <div className="text-sm text-red-600 dark:text-red-400">Mortalità</div>
        <div className="text-2xl font-bold mt-1">{formatNumber(mortalityAnimals)}</div>
        <div className="text-sm text-red-600 dark:text-red-400 mt-1">
          {mortalityPercent}%
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

### 6.7 Tabella Cestelli Destinazione

```typescript
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Cestello ID</TableHead>
      <TableHead>Ciclo ID</TableHead>
      <TableHead>Categoria</TableHead>
      <TableHead>FLUPSY</TableHead>
      <TableHead className="text-right">Animali</TableHead>
      <TableHead className="text-right">Peso (kg)</TableHead>
      <TableHead className="text-right">Animali/kg</TableHead>
      <TableHead>Posizione</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {(screening.destinationBaskets || []).map((basket) => (
      <TableRow key={basket.id}>
        <TableCell>{basket.basketId}</TableCell>
        <TableCell>{basket.cycleId}</TableCell>
        <TableCell>{basket.category || '-'}</TableCell>
        <TableCell>{basket.flupsyName || '-'}</TableCell>
        <TableCell className="text-right">{formatNumber(basket.animalCount)}</TableCell>
        <TableCell className="text-right">{formatNumber(basket.totalWeight)}</TableCell>
        <TableCell className="text-right">{formatNumber(basket.animalsPerKg)}</TableCell>
        <TableCell>
          {basket.positionAssigned ? (
            <Badge variant="outline">
              {basket.row}{basket.position}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">Non assegnata</span>
          )}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 7. Logica di Business

### 7.1 Calcolo Mortalità

**Formula:**
```
Animali Mortalità = Animali Origine - Animali Destinazione
Percentuale Mortalità = (Animali Mortalità / Animali Origine) * 100
```

**Codice:**
```typescript
const mortalityAnimals = totalSourceAnimals - totalDestAnimals;
const mortalityPercent = totalSourceAnimals > 0
  ? ((mortalityAnimals / totalSourceAnimals) * 100).toFixed(2)
  : 0;
```

**Badge colorato:**
```typescript
<Badge variant={Number(mortalityPercent) > 10 ? "destructive" : "secondary"}>
  {formatNumber(screening.mortalityAnimals)} ({mortalityPercent}%)
</Badge>
```

### 7.2 Categorizzazione Destinazioni

**Mapping destinationType → Categoria:**
```typescript
const category = db_basket.destinationType === 'sold' 
  ? 'Venduta' 
  : 'Riposizionata';
```

**Tipi:**
- `sold`: Cestello venduto (nessuna posizione FLUPSY)
- `placed`: Cestello riposizionato in FLUPSY

### 7.3 Determinazione Posizione

```typescript
const row = basket?.row || null;
const position = basket?.position || null;
const positionAssigned = !!(row && position);
```

**Visualizzazione:**
```typescript
{basket.positionAssigned ? (
  <Badge variant="outline">{basket.row}{basket.position}</Badge>
) : (
  <span className="text-muted-foreground text-sm">Non assegnata</span>
)}
```

### 7.4 Statistiche per Taglia

**Aggregazione:**
```typescript
const sizeStats = destinationBaskets.reduce((acc, basket) => {
  const sizeCode = basket.size?.code;
  if (sizeCode && basket.animalCount) {
    if (!acc[sizeCode]) {
      acc[sizeCode] = { total: 0, sold: 0, repositioned: 0 };
    }
    acc[sizeCode].total += basket.animalCount;
    
    if (basket.category === 'Venduta') {
      acc[sizeCode].sold += basket.animalCount;
    } else if (basket.category === 'Riposizionata') {
      acc[sizeCode].repositioned += basket.animalCount;
    }
  }
  return acc;
}, {} as Record<string, { total: number; sold: number; repositioned: number }>);
```

**Ordinamento:**
```typescript
const sortedSizes = Object.entries(sizeStats).sort((a, b) => a[0].localeCompare(b[0]));
```

---

## 8. Flusso Dati

### 8.1 Flusso Completo - Lista Vagliature

```
1. User apre /screenings
   ↓
2. ScreeningsList component mount
   ↓
3. useQuery effettua GET /api/screenings?page=1&pageSize=20&status=completed
   ↓
4. Backend: Query su selections con status=completed
   ↓
5. Backend: Per ogni screening, query su:
   - selectionSourceBaskets (conteggio cestelli origine)
   - selectionDestinationBaskets (conteggio cestelli destinazione)
   - sizes (taglia riferimento)
   ↓
6. Backend: Calcola aggregati (totali animali, mortalità)
   ↓
7. Backend: Restituisce JSON con screenings e pagination
   ↓
8. Frontend: Riceve dati e li visualizza in tabella
   ↓
9. User applica filtri (es. data)
   ↓
10. useQuery ricarica con nuovi query params
    ↓
11. Backend: Applica filtri SQL (WHERE conditions)
    ↓
12. Frontend: Aggiorna visualizzazione
```

### 8.2 Flusso Completo - Dettaglio Vagliatura

```
1. User clicca "Dettagli" su vagliatura
   ↓
2. Navigate to /screenings/:id
   ↓
3. ScreeningDetail component mount con id da URL params
   ↓
4. useQuery effettua GET /api/screenings/:id
   ↓
5. Backend: Query su selections WHERE id = :id
   ↓
6. Backend: Query su selectionSourceBaskets WHERE selectionId = :id
   ↓
7. Backend: Per ogni source basket:
   - Query su baskets per info FLUPSY
   - Query su flupsys per nome FLUPSY
   ↓
8. Backend: Query su selectionDestinationBaskets WHERE selectionId = :id
   ↓
9. Backend: Per ogni destination basket:
   - Query su baskets per posizione
   - Query su flupsys per nome FLUPSY
   - Query su sizes per taglia
   ↓
10. Backend: Mappa dati e arricchisce con:
    - category (sold/placed → Venduta/Riposizionata)
    - positionAssigned (se ha row e position)
    - dismissed (se cestello origine liberato)
    ↓
11. Backend: Restituisce JSON completo
    ↓
12. Frontend: Riceve dati
    ↓
13. Frontend: Calcola aggregati (totali, mortalità, statistiche per taglia)
    ↓
14. Frontend: Renderizza UI completa con:
    - Card informazioni generali
    - Card riepilogo
    - Totalizzatori per taglia
    - Tabelle cestelli origine/destinazione
```

### 8.3 Invalidazione Cache

**Eventi che invalidano la cache:**
- Nuova vagliatura completata (webhook)
- Modifica vagliatura esistente
- Cambio filtri/paginazione

**Implementazione:**
```typescript
// Lista vagliature
queryKey: ['/api/screenings', page, pageSize, screeningNumber, dateFrom, dateTo]

// Dettaglio vagliatura
queryKey: [`/api/screenings/${id}`]
```

**Refetch automatico:**
- Cambio queryKey → Nuovo fetch
- Window focus → Refetch dati (configurabile)

---

## 9. Note Implementative

### 9.1 Performance

**Ottimizzazioni applicate:**
- ✅ Paginazione server-side (riduce dati trasferiti)
- ✅ Eager loading (dati arricchiti in un'unica risposta)
- ✅ Indici database su colonne filtrate (selectionNumber, date, status)
- ✅ Lazy loading immagini/PDF (non caricati fino a click)

**Possibili miglioramenti futuri:**
- 🔄 Caching server-side (Redis)
- 🔄 Virtual scrolling per liste molto lunghe
- 🔄 Prefetch dettaglio al hover sulla lista

### 9.2 Sicurezza

**Validazioni:**
- ✅ Input sanitization su backend (parseInt, SQL injection prevention)
- ✅ Validazione ID nella route (isNaN check)
- ✅ Error handling completo (try/catch)

**Autorizzazioni:**
- ⚠️ Non implementato controllo ruoli utente (tutti possono vedere tutte le vagliature)
- 🔄 Da aggiungere: filtro per utente creatore/FLUPSY assegnato

### 9.3 Test Coverage

**Data-testid presenti:**
```typescript
// Lista
data-testid="button-toggle-filters"
data-testid="input-filter-number"
data-testid="input-filter-date-from"
data-testid="input-filter-date-to"
data-testid="button-clear-filters"
data-testid={`row-screening-${screening.id}`}
data-testid={`button-view-${screening.id}`}
data-testid={`button-pdf-${screening.id}`}

// Dettaglio
data-testid="button-back"
data-testid="button-print-pdf"
data-testid="text-date"
data-testid="text-purpose"
data-testid="text-reference-size"
data-testid="badge-status"
data-testid={`row-source-${basket.id}`}
data-testid={`row-dest-${basket.id}`}
```

**Test suggeriti:**
- Unit test calcolo mortalità
- Unit test aggregazione per taglia
- Integration test API endpoints
- E2E test flusso completo (lista → dettaglio → PDF)

---

## 10. Riepilogo Architettura

**Database:**
```
selections (vagliatura principale)
├── selectionSourceBaskets (cestelli origine)
│   └── baskets → flupsys (info FLUPSY)
└── selectionDestinationBaskets (cestelli destinazione)
    ├── baskets → flupsys (posizione)
    └── sizes (taglia)
```

**Backend API:**
```
GET /api/screenings              → Lista paginata con filtri
GET /api/screenings/:id          → Dettaglio completo
GET /api/screenings/:id/report.pdf → PDF (in sviluppo)
```

**Frontend:**
```
/screenings              → ScreeningsList component
/screenings/:id          → ScreeningDetail component
```

**Tecnologie chiave:**
- TanStack Query (gestione stato server)
- Drizzle ORM (query database type-safe)
- shadcn/ui (componenti UI)
- Wouter (routing)

---

**Documento compilato il:** 2025-10-07
