-- Inserisci flupsys se non esistono già
INSERT INTO flupsys (name, location, description, active)
SELECT 'FLUPSY 1', 'Posizione Test 1', 'FLUPSY di Test 1', true
WHERE NOT EXISTS (SELECT 1 FROM flupsys WHERE id = 1);

INSERT INTO flupsys (name, location, description, active)
SELECT 'FLUPSY 2', 'Posizione Test 2', 'FLUPSY di Test 2', true
WHERE NOT EXISTS (SELECT 1 FROM flupsys WHERE id = 2);

-- Inserisci cestelli di test
INSERT INTO baskets (physical_number, flupsy_id, cycle_code, state, current_cycle_id, nfc_data, row, position)
VALUES 
(1, 1, NULL, 'active', NULL, NULL, 'DX', 1),
(2, 1, NULL, 'active', NULL, NULL, 'DX', 2),
(3, 2, NULL, 'active', NULL, NULL, 'DX', 1),
(4, 2, NULL, 'active', NULL, NULL, 'DX', 2);

-- Inserisci sizes se non esistono già
INSERT INTO sizes (code, name, size_mm, min_animals_per_kg, max_animals_per_kg)
SELECT 'TP-1140', 'TP-1140', 0.9, 350001, 600000
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE code = 'TP-1140');

INSERT INTO sizes (code, name, size_mm, min_animals_per_kg, max_animals_per_kg)
SELECT 'TP-2500', 'TP-2500', 1.2, 40001, 60000
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE code = 'TP-2500');

INSERT INTO sizes (code, name, size_mm, min_animals_per_kg, max_animals_per_kg)
SELECT 'TP-3000', 'TP-3000', 2.5, 19001, 32000
WHERE NOT EXISTS (SELECT 1 FROM sizes WHERE code = 'TP-3000');
