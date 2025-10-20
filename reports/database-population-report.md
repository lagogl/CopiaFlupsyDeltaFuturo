🌱 INIZIO POPOLAMENTO DATABASE FLUPSY
============================================================

📋 1. POPOLAMENTO UTENTI...
⚠️  Utenti già esistenti - skip

📦 2. POPOLAMENTO LOTTI...
✅ 6 lotti creati

🔄 3. POPOLAMENTO CICLI...
✅ 10 cicli creati

⚙️ 4. POPOLAMENTO OPERAZIONI...
✅ 51 operazioni create

📈 5. POPOLAMENTO DATI SGR...
✅ 12 dati SGR mensili creati

📊 6. POPOLAMENTO SGR PER TAGLIA...
✅ 48 dati SGR per taglia creati

🌡️ 7. POPOLAMENTO DATI AMBIENTALI...
✅ 180 record ambientali creati

💀 8. POPOLAMENTO TASSI MORTALITÀ...
✅ 96 tassi mortalità creati

👥 9. POPOLAMENTO CLIENTI...
✅ 3 clienti creati

💰 10. POPOLAMENTO VENDITE E DDT...
✅ 3 operazioni vendita create
✅ 2 vendite avanzate create
✅ 2 DDT creati

🔔 11. POPOLAMENTO NOTIFICHE...
✅ 3 notifiche create

============================================================
✅ POPOLAMENTO DATABASE COMPLETATO CON SUCCESSO!
============================================================

📊 RIEPILOGO DATI INSERITI:
{
  "users": 3,
  "lots": 6,
  "cycles": 10,
  "operations": 51,
  "sgrMensile": 12,
  "sgrPerTaglia": 48,
  "datiAmbientali": 180,
  "mortalityRates": 96,
  "clienti": 3,
  "vendite": 2,
  "ddt": 2,
  "notifications": 3
}

📄 Report salvato - utilizzare per verifiche
# REPORT POPOLAMENTO DATABASE FLUPSY
Data: 2025-10-20T17:03:01.216Z

## RIEPILOGO TOTALE
{
  "users": 3,
  "lots": 6,
  "cycles": 10,
  "operations": 51,
  "sgrMensile": 12,
  "sgrPerTaglia": 48,
  "datiAmbientali": 180,
  "mortalityRates": 96,
  "clienti": 3,
  "vendite": 2,
  "ddt": 2,
  "notifications": 3
}


## UTENTI
Total: 3 records
[
  {
    "id": 1,
    "username": "utente",
    "role": "user"
  },
  {
    "id": 2,
    "username": "Gianluigi",
    "role": "admin"
  },
  {
    "id": 3,
    "username": "admin",
    "role": "admin"
  }
]

## LOTTI
Total: 6 records
[
  {
    "id": 7,
    "arrivalDate": "2024-05-01",
    "supplier": "Ecotapes Zeeland",
    "supplierLotNumber": "ECTZ-2024-05",
    "quality": "normali",
    "animalCount": 12000000,
    "weight": 50000,
    "sizeId": 9,
    "notes": "Lotto primavera - qualità eccellente",
    "state": "active",
    "active": true,
    "externalId": null,
    "description": null,
    "origin": null,
    "totalMortality": 0,
    "lastMortalityDate": null,
    "mortalityNotes": null,
    "createdAt": "2025-10-20T17:02:56.214Z"
  },
  {
    "id": 8,
    "arrivalDate": "2024-06-15",
    "supplier": "Taylor Shellfish",
    "supplierLotNumber": "TS-2024-06",
    "quality": "teste",
    "animalCount": 8000000,
    "weight": 35000,
    "sizeId": 10,
    "notes": "Lotto estivo teste - crescita rapida",
    "state": "active",
    "active": true,
    "externalId": null,
    "description": null,
    "origin": null,
    "totalMortality": 0,
    "lastMortalityDate": null,
    "mortalityNotes": null,
    "createdAt": "2025-10-20T17:02:56.214Z"
  },
  {
    "id": 9,
    "arrivalDate": "2024-07-10",
    "supplier": "Pacific Shellfish",
    "supplierLotNumber": "PS-2024-07",
    "quality": "normali",
    "animalCount": 10000000,
    "weight": 40000,
    "sizeId": 9,
    "notes": "Lotto luglio - buona qualità",
    "state": "active",
    "active": true,
    "externalId": null,
    "description": null,
    "origin": null,
    "totalMortality": 0,
    "lastMortalityDate": null,
    "mortalityNotes": null,
    "createdAt": "2025-10-20T17:02:56.214Z"
  },
  {
    "id": 10,
    "arrivalDate": "2024-08-05",
    "supplier": "Ecotapes Zeeland",
    "supplierLotNumber": "ECTZ-2024-08",
    "quality": "teste",
    "animalCount": 15000000,
    "weight": 60000,
    "sizeId": 8,
    "notes": "Lotto agosto - alto numero animali",
    "state": "active",
    "active": true,
    "externalId": null,
    "description": null,
    "origin": null,
    "totalMortality": 0,
    "lastMortalityDate": null,
    "mortalityNotes": null,
    "createdAt": "2025-10-20T17:02:56.214Z"
  },
  {
    "id": 11,
    "arrivalDate": "2024-09-20",
    "supplier": "Shellfish Farms Inc",
    "supplierLotNumber": "SFI-2024-09",
    "quality": "normali",
    "animalCount": 9000000,
    "weight": 38000,
    "sizeId": 10,
    "notes": "Lotto autunnale - ottima resistenza",
    "state": "active",
    "active": true,
    "externalId": null,
    "description": null,
    "origin": null,
    "totalMortality": 0,
    "lastMortalityDate": null,
    "mortalityNotes": null,
    "createdAt": "2025-10-20T17:02:56.214Z"
  },
  {
    "id": 12,
    "arrivalDate": "2024-10-01",
    "supplier": "Taylor Shellfish",
    "supplierLotNumber": "TS-2024-10",
    "quality": "teste",
    "animalCount": 11000000,
    "weight": 45000,
    "sizeId": 9,
    "notes": "Lotto ottobre - recente arrivo",
    "state": "active",
    "active": true,
    "externalId": null,
    "description": null,
    "origin": null,
    "totalMortality": 0,
    "lastMortalityDate": null,
    "mortalityNotes": null,
    "createdAt": "2025-10-20T17:02:56.214Z"
  }
]

## CICLI
Total: 10 records
[
  {
    "id": 11,
    "basketId": 29,
    "lotId": 7,
    "startDate": "2024-05-15",
    "endDate": null,
    "state": "active"
  },
  {
    "id": 12,
    "basketId": 30,
    "lotId": 8,
    "startDate": "2024-06-20",
    "endDate": null,
    "state": "active"
  },
  {
    "id": 13,
    "basketId": 31,
    "lotId": 9,
    "startDate": "2024-07-15",
    "endDate": null,
    "state": "active"
  },
  {
    "id": 14,
    "basketId": 32,
    "lotId": 7,
    "startDate": "2024-05-20",
    "endDate": null,
    "state": "active"
  },
  {
    "id": 15,
    "basketId": 33,
    "lotId": 10,
    "startDate": "2024-08-10",
    "endDate": null,
    "state": "active"
  },
  {
    "id": 16,
    "basketId": 34,
    "lotId": 11,
    "startDate": "2024-09-25",
    "endDate": null,
    "state": "active"
  },
  {
    "id": 17,
    "basketId": 35,
    "lotId": 12,
    "startDate": "2024-10-05",
    "endDate": null,
    "state": "active"
  },
  {
    "id": 18,
    "basketId": 1,
    "lotId": 7,
    "startDate": "2024-03-01",
    "endDate": "2024-08-15",
    "state": "closed"
  },
  {
    "id": 19,
    "basketId": 2,
    "lotId": 8,
    "startDate": "2024-04-01",
    "endDate": "2024-09-20",
    "state": "closed"
  },
  {
    "id": 20,
    "basketId": 3,
    "lotId": 9,
    "startDate": "2024-05-01",
    "endDate": "2024-10-10",
    "state": "closed"
  }
]

## OPERATIONS
Total: 10 records
[
  {
    "id": 1,
    "date": "2024-05-15",
    "type": "peso",
    "basketId": 29,
    "cycleId": 11,
    "sizeId": 16,
    "sgrId": null,
    "lotId": 7,
    "animalCount": 500000,
    "totalWeight": 2000,
    "animalsPerKg": 250000,
    "averageWeight": null,
    "deadCount": 0,
    "mortalityRate": null,
    "notes": "Pesatura 1 - crescita regolare",
    "metadata": null,
    "source": "mobile_nfc"
  },
  {
    "id": 2,
    "date": "2024-05-29",
    "type": "peso",
    "basketId": 29,
    "cycleId": 11,
    "sizeId": 15,
    "sgrId": null,
    "lotId": 7,
    "animalCount": 450000,
    "totalWeight": 2045.4546,
    "animalsPerKg": 220000,
    "averageWeight": null,
    "deadCount": 4082,
    "mortalityRate": null,
    "notes": "Pesatura 2 - crescita regolare",
    "metadata": null,
    "source": "desktop_manager"
  },
  {
    "id": 3,
    "date": "2024-06-12",
    "type": "peso",
    "basketId": 29,
    "cycleId": 11,
    "sizeId": 14,
    "sgrId": null,
    "lotId": 7,
    "animalCount": 400000,
    "totalWeight": 2222.2222,
    "animalsPerKg": 180000,
    "averageWeight": null,
    "deadCount": 1749,
    "mortalityRate": null,
    "notes": "Pesatura 3 - crescita regolare",
    "metadata": null,
    "source": "desktop_manager"
  },
  {
    "id": 4,
    "date": "2024-06-26",
    "type": "peso",
    "basketId": 29,
    "cycleId": 11,
    "sizeId": 13,
    "sgrId": null,
    "lotId": 7,
    "animalCount": 350000,
    "totalWeight": 2333.3333,
    "animalsPerKg": 150000,
    "averageWeight": null,
    "deadCount": 5646,
    "mortalityRate": null,
    "notes": "Pesatura 4 - crescita regolare",
    "metadata": null,
    "source": "mobile_nfc"
  },
  {
    "id": 5,
    "date": "2024-07-10",
    "type": "peso",
    "basketId": 29,
    "cycleId": 11,
    "sizeId": 12,
    "sgrId": null,
    "lotId": 7,
    "animalCount": 300000,
    "totalWeight": 2500,
    "animalsPerKg": 120000,
    "averageWeight": null,
    "deadCount": 1667,
    "mortalityRate": null,
    "notes": "Pesatura 5 - crescita regolare",
    "metadata": null,
    "source": "desktop_manager"
  },
  {
    "id": 6,
    "date": "2024-07-24",
    "type": "peso",
    "basketId": 29,
    "cycleId": 11,
    "sizeId": 11,
    "sgrId": null,
    "lotId": 7,
    "animalCount": 250000,
    "totalWeight": 2500,
    "animalsPerKg": 100000,
    "averageWeight": null,
    "deadCount": 2332,
    "mortalityRate": null,
    "notes": "Pesatura 6 - crescita regolare",
    "metadata": null,
    "source": "desktop_manager"
  },
  {
    "id": 7,
    "date": "2024-06-20",
    "type": "peso",
    "basketId": 30,
    "cycleId": 12,
    "sizeId": 16,
    "sgrId": null,
    "lotId": 8,
    "animalCount": 500000,
    "totalWeight": 2083.3333,
    "animalsPerKg": 240000,
    "averageWeight": null,
    "deadCount": 0,
    "mortalityRate": null,
    "notes": "Pesatura 1 - crescita regolare",
    "metadata": null,
    "source": "mobile_nfc"
  },
  {
    "id": 8,
    "date": "2024-07-04",
    "type": "peso",
    "basketId": 30,
    "cycleId": 12,
    "sizeId": 15,
    "sgrId": null,
    "lotId": 8,
    "animalCount": 450000,
    "totalWeight": 2250,
    "animalsPerKg": 200000,
    "averageWeight": null,
    "deadCount": 5347,
    "mortalityRate": null,
    "notes": "Pesatura 2 - crescita regolare",
    "metadata": null,
    "source": "desktop_manager"
  },
  {
    "id": 9,
    "date": "2024-07-18",
    "type": "peso",
    "basketId": 30,
    "cycleId": 12,
    "sizeId": 14,
    "sgrId": null,
    "lotId": 8,
    "animalCount": 400000,
    "totalWeight": 2500,
    "animalsPerKg": 160000,
    "averageWeight": null,
    "deadCount": 4982,
    "mortalityRate": null,
    "notes": "Pesatura 3 - crescita regolare",
    "metadata": null,
    "source": "desktop_manager"
  },
  {
    "id": 10,
    "date": "2024-08-01",
    "type": "peso",
    "basketId": 30,
    "cycleId": 12,
    "sizeId": 13,
    "sgrId": null,
    "lotId": 8,
    "animalCount": 350000,
    "totalWeight": 2692.3076,
    "animalsPerKg": 130000,
    "averageWeight": null,
    "deadCount": 1816,
    "mortalityRate": null,
    "notes": "Pesatura 4 - crescita regolare",
    "metadata": null,
    "source": "mobile_nfc"
  }
]

## SGR MENSILE
Total: 12 records
[
  {
    "id": 13,
    "month": "gennaio",
    "percentage": 2.8,
    "calculatedFromReal": true
  },
  {
    "id": 14,
    "month": "febbraio",
    "percentage": 3.2,
    "calculatedFromReal": true
  },
  {
    "id": 15,
    "month": "marzo",
    "percentage": 4.1,
    "calculatedFromReal": true
  },
  {
    "id": 16,
    "month": "aprile",
    "percentage": 5.5,
    "calculatedFromReal": true
  },
  {
    "id": 17,
    "month": "maggio",
    "percentage": 6.8,
    "calculatedFromReal": true
  },
  {
    "id": 18,
    "month": "giugno",
    "percentage": 7.2,
    "calculatedFromReal": true
  },
  {
    "id": 19,
    "month": "luglio",
    "percentage": 6.9,
    "calculatedFromReal": true
  },
  {
    "id": 20,
    "month": "agosto",
    "percentage": 6.5,
    "calculatedFromReal": true
  },
  {
    "id": 21,
    "month": "settembre",
    "percentage": 5.1,
    "calculatedFromReal": true
  },
  {
    "id": 22,
    "month": "ottobre",
    "percentage": 4.2,
    "calculatedFromReal": true
  },
  {
    "id": 23,
    "month": "novembre",
    "percentage": 3.5,
    "calculatedFromReal": true
  },
  {
    "id": 24,
    "month": "dicembre",
    "percentage": 2.9,
    "calculatedFromReal": true
  }
]

## SGR PER TAGLIA
Total: 10 records
[
  {
    "id": 325,
    "month": "maggio",
    "sizeId": 9,
    "calculatedSgr": 8.45,
    "sampleCount": 5,
    "lastCalculated": "2025-10-20T17:02:59.260Z",
    "notes": null
  },
  {
    "id": 326,
    "month": "maggio",
    "sizeId": 10,
    "calculatedSgr": 8.3,
    "sampleCount": 12,
    "lastCalculated": "2025-10-20T17:02:59.260Z",
    "notes": null
  },
  {
    "id": 327,
    "month": "maggio",
    "sizeId": 11,
    "calculatedSgr": 8.15,
    "sampleCount": 5,
    "lastCalculated": "2025-10-20T17:02:59.260Z",
    "notes": null
  },
  {
    "id": 328,
    "month": "maggio",
    "sizeId": 12,
    "calculatedSgr": 8,
    "sampleCount": 10,
    "lastCalculated": "2025-10-20T17:02:59.260Z",
    "notes": null
  },
  {
    "id": 329,
    "month": "maggio",
    "sizeId": 13,
    "calculatedSgr": 7.85,
    "sampleCount": 10,
    "lastCalculated": "2025-10-20T17:02:59.260Z",
    "notes": null
  },
  {
    "id": 330,
    "month": "maggio",
    "sizeId": 14,
    "calculatedSgr": 7.7,
    "sampleCount": 15,
    "lastCalculated": "2025-10-20T17:02:59.260Z",
    "notes": null
  },
  {
    "id": 331,
    "month": "maggio",
    "sizeId": 15,
    "calculatedSgr": 7.55,
    "sampleCount": 15,
    "lastCalculated": "2025-10-20T17:02:59.260Z",
    "notes": null
  },
  {
    "id": 332,
    "month": "maggio",
    "sizeId": 16,
    "calculatedSgr": 7.4,
    "sampleCount": 9,
    "lastCalculated": "2025-10-20T17:02:59.260Z",
    "notes": null
  },
  {
    "id": 333,
    "month": "giugno",
    "sizeId": 9,
    "calculatedSgr": 8.85,
    "sampleCount": 16,
    "lastCalculated": "2025-10-20T17:02:59.260Z",
    "notes": null
  },
  {
    "id": 334,
    "month": "giugno",
    "sizeId": 10,
    "calculatedSgr": 8.7,
    "sampleCount": 10,
    "lastCalculated": "2025-10-20T17:02:59.260Z",
    "notes": null
  }
]

## DATI AMBIENTALI
Total: 5 records
[
  {
    "id": 1,
    "recordDate": "2024-05-01T12:00:00.000Z",
    "temperature": 21.9,
    "pH": 8.03,
    "ammonia": 0.122,
    "oxygen": 6.6,
    "salinity": 33.4,
    "notes": null
  },
  {
    "id": 2,
    "recordDate": "2024-05-02T12:00:00.000Z",
    "temperature": 21.8,
    "pH": 7.95,
    "ammonia": 0.126,
    "oxygen": 7.3,
    "salinity": 32,
    "notes": null
  },
  {
    "id": 3,
    "recordDate": "2024-05-03T12:00:00.000Z",
    "temperature": 20,
    "pH": 7.9,
    "ammonia": 0.077,
    "oxygen": 6.9,
    "salinity": 33,
    "notes": null
  },
  {
    "id": 4,
    "recordDate": "2024-05-04T12:00:00.000Z",
    "temperature": 21.6,
    "pH": 7.96,
    "ammonia": 0.05,
    "oxygen": 7.2,
    "salinity": 32.1,
    "notes": null
  },
  {
    "id": 5,
    "recordDate": "2024-05-05T12:00:00.000Z",
    "temperature": 22.5,
    "pH": 8.15,
    "ammonia": 0.001,
    "oxygen": 6.9,
    "salinity": 32.7,
    "notes": null
  }
]

## MORTALITY RATES
Total: 10 records
[
  {
    "id": 1,
    "sizeId": 9,
    "month": "gennaio",
    "percentage": 4.65,
    "notes": null
  },
  {
    "id": 2,
    "sizeId": 10,
    "month": "gennaio",
    "percentage": 4.76,
    "notes": null
  },
  {
    "id": 3,
    "sizeId": 11,
    "month": "gennaio",
    "percentage": 4.39,
    "notes": null
  },
  {
    "id": 4,
    "sizeId": 12,
    "month": "gennaio",
    "percentage": 3.84,
    "notes": null
  },
  {
    "id": 5,
    "sizeId": 13,
    "month": "gennaio",
    "percentage": 4.34,
    "notes": null
  },
  {
    "id": 6,
    "sizeId": 14,
    "month": "gennaio",
    "percentage": 3.79,
    "notes": null
  },
  {
    "id": 7,
    "sizeId": 15,
    "month": "gennaio",
    "percentage": 4.59,
    "notes": null
  },
  {
    "id": 8,
    "sizeId": 16,
    "month": "gennaio",
    "percentage": 3.78,
    "notes": null
  },
  {
    "id": 9,
    "sizeId": 9,
    "month": "febbraio",
    "percentage": 3.88,
    "notes": null
  },
  {
    "id": 10,
    "sizeId": 10,
    "month": "febbraio",
    "percentage": 4.93,
    "notes": null
  }
]

## CLIENTI
Total: 3 records
[
  {
    "id": 1,
    "denominazione": "Ristorante La Laguna",
    "indirizzo": "Via Canal Grande, 125",
    "comune": "Venezia",
    "cap": "30100",
    "provincia": "VE",
    "paese": "Italia",
    "email": "info@lalaguna.it",
    "telefono": "+39 041 5234567",
    "piva": "IT12345678901",
    "codiceFiscale": "RSSMRA70A01L736D",
    "fattureInCloudId": null,
    "attivo": true,
    "createdAt": "2025-10-20T17:03:00.066Z",
    "updatedAt": null
  },
  {
    "id": 2,
    "denominazione": "Mercato Ittico Chioggia",
    "indirizzo": "Corso del Popolo, 45",
    "comune": "Chioggia",
    "cap": "30015",
    "provincia": "VE",
    "paese": "Italia",
    "email": "ordini@mercatoittico.it",
    "telefono": "+39 041 4005678",
    "piva": "IT98765432109",
    "codiceFiscale": "MRCGNN65M10L736P",
    "fattureInCloudId": null,
    "attivo": true,
    "createdAt": "2025-10-20T17:03:00.066Z",
    "updatedAt": null
  },
  {
    "id": 3,
    "denominazione": "Seafood Export SRL",
    "indirizzo": "Via Industriale, 78",
    "comune": "Goro",
    "cap": "44020",
    "provincia": "FE",
    "paese": "Italia",
    "email": "export@seafood.it",
    "telefono": "+39 0533 567890",
    "piva": "IT11223344556",
    "codiceFiscale": "SFXPRT85T20D548M",
    "fattureInCloudId": null,
    "attivo": true,
    "createdAt": "2025-10-20T17:03:00.066Z",
    "updatedAt": null
  }
]

## ADVANCED SALES
Total: 2 records
[
  {
    "id": 1,
    "saleNumber": "V-2024-001",
    "customerId": 1,
    "customerName": "Ristorante La Laguna",
    "customerDetails": {
      "city": "Venezia",
      "piva": "IT12345678901",
      "address": "Via Canal Grande, 125"
    },
    "saleDate": "2024-08-20",
    "status": "completed",
    "totalWeight": 18.5,
    "totalAnimals": 540000,
    "totalBags": 3,
    "notes": "Prima vendita stagione 2024",
    "pdfPath": null,
    "ddtId": null,
    "ddtStatus": "inviato",
    "companyId": null,
    "createdAt": "2025-10-20T17:03:00.573Z",
    "updatedAt": null
  },
  {
    "id": 2,
    "saleNumber": "V-2024-002",
    "customerId": 2,
    "customerName": "Mercato Ittico Chioggia",
    "customerDetails": {
      "city": "Chioggia",
      "piva": "IT98765432109",
      "address": "Corso del Popolo, 45"
    },
    "saleDate": "2024-09-25",
    "status": "completed",
    "totalWeight": 22.3,
    "totalAnimals": 660000,
    "totalBags": 4,
    "notes": "Vendita mercato ittico",
    "pdfPath": null,
    "ddtId": null,
    "ddtStatus": "locale",
    "companyId": null,
    "createdAt": "2025-10-20T17:03:00.573Z",
    "updatedAt": null
  }
]

## DDT
Total: 2 records
[
  {
    "id": 1,
    "numero": 1,
    "data": "2024-08-20",
    "clienteId": 1,
    "clienteNome": "Ristorante La Laguna",
    "clienteIndirizzo": "Via Canal Grande, 125",
    "clienteCitta": "Venezia",
    "clienteCap": "30100",
    "clienteProvincia": "VE",
    "clientePiva": "IT12345678901",
    "clienteCodiceFiscale": null,
    "clientePaese": "Italia",
    "companyId": null,
    "mittenteRagioneSociale": null,
    "mittenteIndirizzo": null,
    "mittenteCap": null,
    "mittenteCitta": null,
    "mittenteProvincia": null,
    "mittentePartitaIva": null,
    "mittenteCodiceFiscale": null,
    "mittenteTelefono": null,
    "mittenteEmail": null,
    "mittenteLogoPath": null,
    "totaleColli": 3,
    "pesoTotale": "18.50",
    "note": null,
    "ddtStato": "inviato",
    "fattureInCloudId": null,
    "fattureInCloudNumero": null,
    "createdAt": "2025-10-20T17:03:00.830Z",
    "updatedAt": null
  },
  {
    "id": 2,
    "numero": 2,
    "data": "2024-09-25",
    "clienteId": 2,
    "clienteNome": "Mercato Ittico Chioggia",
    "clienteIndirizzo": "Corso del Popolo, 45",
    "clienteCitta": "Chioggia",
    "clienteCap": "30015",
    "clienteProvincia": "VE",
    "clientePiva": "IT98765432109",
    "clienteCodiceFiscale": null,
    "clientePaese": "Italia",
    "companyId": null,
    "mittenteRagioneSociale": null,
    "mittenteIndirizzo": null,
    "mittenteCap": null,
    "mittenteCitta": null,
    "mittenteProvincia": null,
    "mittentePartitaIva": null,
    "mittenteCodiceFiscale": null,
    "mittenteTelefono": null,
    "mittenteEmail": null,
    "mittenteLogoPath": null,
    "totaleColli": 4,
    "pesoTotale": "22.30",
    "note": null,
    "ddtStato": "locale",
    "fattureInCloudId": null,
    "fattureInCloudNumero": null,
    "createdAt": "2025-10-20T17:03:00.830Z",
    "updatedAt": null
  }
]

## NOTIFICATIONS
Total: 3 records
[
  {
    "id": 1,
    "type": "vendita",
    "title": "Vendita completata",
    "message": "Vendita V-2024-001 completata con successo - 18.5kg venduti",
    "isRead": false,
    "createdAt": "2025-10-20T17:03:01.084Z",
    "relatedEntityType": "operation",
    "relatedEntityId": 52,
    "data": null
  },
  {
    "id": 2,
    "type": "warning",
    "title": "Mortalità elevata rilevata",
    "message": "Cestello #29 ha superato la soglia di mortalità normale (3.2%)",
    "isRead": false,
    "createdAt": "2025-10-20T17:03:01.084Z",
    "relatedEntityType": "basket",
    "relatedEntityId": 29,
    "data": null
  },
  {
    "id": 3,
    "type": "system",
    "title": "Sistema aggiornato",
    "message": "Database popolato con dati di test - sistema pronto per l'uso",
    "isRead": true,
    "createdAt": "2025-10-20T17:03:01.084Z",
    "relatedEntityType": null,
    "relatedEntityId": null,
    "data": null
  }
]

## NOTE IMPORTANTI

### CREDENZIALI UTENTI
- **Admin**: username: `admin`, password: `password123`
- **Operatore**: username: `operatore1`, password: `password123`
- **Visitor**: username: `viewer`, password: `password123`

### LOTTI CREATI
6 lotti con fornitori diversi (Ecotapes Zeeland, Taylor Shellfish, Pacific Shellfish, Shellfish Farms Inc)
- Lotti con date arrivo da maggio a ottobre 2024
- Taglie iniziali variabili (TP-800 a TP-1200)
- Conteggi animali: 8M - 15M per lotto

### CICLI E OPERAZIONI
- 10 cicli totali (7 attivi, 3 chiusi)
- 51 operazioni totali
  - Operazioni peso: ogni 2 settimane per 6+ mesi
  - Operazioni pulizia: mensili
  - Operazioni vendita: per cicli chiusi
- Fonte operazioni: mix desktop_manager e mobile_nfc

### DATI AI GROWTH VARIABILITY
- 6 mesi di operazioni peso con progressione taglie realistica
- Variazione animalsPerKg: 280000 → 75000 (crescita completa)
- Mortalità simulata realisticamente
- Dati ambientali giornalieri (temperatura, pH, ammonia, ossigeno, salinità)

### SGR DATA
- 12 mesi di SGR mensile (2.8% - 7.2%)
- 48 records SGR per taglia
- Variazione SGR per dimensione: taglie piccole crescono più velocemente

### CLIENTI E VENDITE
- 3 clienti attivi (Ristorante, Mercato Ittico, Export)
- 2 vendite completate con DDT
- Vendite con taglie finali TP-3000 (30000 animali/kg)

### VERIFICA CALCOLI
Per verificare la correttezza dei calcoli:

1. **SGR Growth Rate**:
   - Formula: [(ln(W2) - ln(W1)) / giorni] × 100
   - Basket #29: da 250000 a 100000 animali/kg in ~150 giorni
   - SGR atteso: ~6% mensile (estate)

2. **Mortalità**:
   - Basket #29: mortalità cumulativa visibile nelle operazioni
   - Tassi invernali (3.5%) vs estivi (2.0%)

3. **Inventory**:
   - Lotto 1: 12M animali iniziali
   - Distribuito su cicli multipli
   - Tracking mortalità e vendite

## TESTING RACCOMANDATO

1. **Dashboard AI Variabilità Crescita**:
   - Eseguire analisi su periodo maggio-ottobre 2024
   - Verificare clustering cestelli (fast/average/slow)
   - Controllare distribuzione crescita

2. **FlupsyComparison**:
   - Confrontare performance FLUPSY 220, 221, 222
   - Verificare proiezioni futuro
   - Testare export Excel

3. **Advanced Sales**:
   - Verificare vendite V-2024-001 e V-2024-002
   - Controllare DDT generati
   - Validare totali e subtotali

4. **SGR Indices**:
   - Verificare SGR per taglia dashboard
   - Testare ricalcolo manuale
   - Controllare fallback chain (sgrPerTaglia → sgr → default)

