--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE ONLY public.target_size_annotations DROP CONSTRAINT target_size_annotations_pkey;
ALTER TABLE ONLY public.sizes DROP CONSTRAINT sizes_pkey;
ALTER TABLE ONLY public.sizes DROP CONSTRAINT sizes_code_unique;
ALTER TABLE ONLY public.sgr DROP CONSTRAINT sgr_pkey;
ALTER TABLE ONLY public.sgr_giornalieri DROP CONSTRAINT sgr_giornalieri_pkey;
ALTER TABLE ONLY public.operations DROP CONSTRAINT operations_pkey;
ALTER TABLE ONLY public.mortality_rates DROP CONSTRAINT mortality_rates_pkey;
ALTER TABLE ONLY public.lots DROP CONSTRAINT lots_pkey;
ALTER TABLE ONLY public.flupsys DROP CONSTRAINT flupsys_pkey;
ALTER TABLE ONLY public.cycles DROP CONSTRAINT cycles_pkey;
ALTER TABLE ONLY public.baskets DROP CONSTRAINT baskets_pkey;
ALTER TABLE ONLY public.basket_position_history DROP CONSTRAINT basket_position_history_pkey;
ALTER TABLE public.target_size_annotations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.sizes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.sgr_giornalieri ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.sgr ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.operations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.mortality_rates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.lots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.flupsys ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.cycles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.baskets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.basket_position_history ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE public.target_size_annotations_id_seq;
DROP TABLE public.target_size_annotations;
DROP SEQUENCE public.sizes_id_seq;
DROP TABLE public.sizes;
DROP SEQUENCE public.sgr_id_seq;
DROP SEQUENCE public.sgr_giornalieri_id_seq;
DROP TABLE public.sgr_giornalieri;
DROP TABLE public.sgr;
DROP SEQUENCE public.operations_id_seq;
DROP TABLE public.operations;
DROP SEQUENCE public.mortality_rates_id_seq;
DROP TABLE public.mortality_rates;
DROP SEQUENCE public.lots_id_seq;
DROP TABLE public.lots;
DROP SEQUENCE public.flupsys_id_seq;
DROP TABLE public.flupsys;
DROP SEQUENCE public.cycles_id_seq;
DROP TABLE public.cycles;
DROP SEQUENCE public.baskets_id_seq;
DROP TABLE public.baskets;
DROP SEQUENCE public.basket_position_history_id_seq;
DROP TABLE public.basket_position_history;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: basket_position_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.basket_position_history (
    id integer NOT NULL,
    basket_id integer NOT NULL,
    flupsy_id integer NOT NULL,
    "row" text NOT NULL,
    "position" integer NOT NULL,
    start_date date NOT NULL,
    end_date date,
    operation_id integer
);


--
-- Name: basket_position_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.basket_position_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: basket_position_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.basket_position_history_id_seq OWNED BY public.basket_position_history.id;


--
-- Name: baskets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.baskets (
    id integer NOT NULL,
    physical_number integer NOT NULL,
    state text DEFAULT 'available'::text NOT NULL,
    current_cycle_id integer,
    nfc_data text,
    flupsy_id integer NOT NULL,
    "row" text,
    "position" integer,
    cycle_code text
);


--
-- Name: baskets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.baskets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: baskets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.baskets_id_seq OWNED BY public.baskets.id;


--
-- Name: cycles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cycles (
    id integer NOT NULL,
    basket_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date,
    state text DEFAULT 'active'::text NOT NULL
);


--
-- Name: cycles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cycles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cycles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cycles_id_seq OWNED BY public.cycles.id;


--
-- Name: flupsys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flupsys (
    id integer NOT NULL,
    name text NOT NULL,
    location text,
    description text,
    active boolean DEFAULT true NOT NULL
);


--
-- Name: flupsys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.flupsys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: flupsys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.flupsys_id_seq OWNED BY public.flupsys.id;


--
-- Name: lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lots (
    id integer NOT NULL,
    arrival_date date NOT NULL,
    supplier text NOT NULL,
    quality text,
    animal_count integer,
    weight real,
    size_id integer,
    notes text,
    state text DEFAULT 'active'::text NOT NULL
);


--
-- Name: lots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lots_id_seq OWNED BY public.lots.id;


--
-- Name: mortality_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mortality_rates (
    id integer NOT NULL,
    size_id integer NOT NULL,
    month text NOT NULL,
    percentage real NOT NULL,
    notes text
);


--
-- Name: mortality_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mortality_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mortality_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mortality_rates_id_seq OWNED BY public.mortality_rates.id;


--
-- Name: operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operations (
    id integer NOT NULL,
    date date NOT NULL,
    type text NOT NULL,
    basket_id integer NOT NULL,
    cycle_id integer NOT NULL,
    size_id integer,
    sgr_id integer,
    lot_id integer,
    animal_count integer,
    total_weight real,
    animals_per_kg integer,
    average_weight real,
    notes text,
    dead_count integer,
    mortality_rate real
);


--
-- Name: operations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: operations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operations_id_seq OWNED BY public.operations.id;


--
-- Name: sgr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sgr (
    id integer NOT NULL,
    month text NOT NULL,
    percentage real NOT NULL,
    calculated_from_real boolean DEFAULT false
);


--
-- Name: sgr_giornalieri; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sgr_giornalieri (
    id integer NOT NULL,
    record_date timestamp without time zone NOT NULL,
    temperature real,
    ph real,
    ammonia real,
    oxygen real,
    salinity real,
    notes text
);


--
-- Name: sgr_giornalieri_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sgr_giornalieri_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sgr_giornalieri_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sgr_giornalieri_id_seq OWNED BY public.sgr_giornalieri.id;


--
-- Name: sgr_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sgr_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sgr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sgr_id_seq OWNED BY public.sgr.id;


--
-- Name: sizes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sizes (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    size_mm real,
    min_animals_per_kg integer,
    max_animals_per_kg integer,
    notes text,
    color character varying(50)
);


--
-- Name: sizes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sizes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sizes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sizes_id_seq OWNED BY public.sizes.id;


--
-- Name: target_size_annotations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_size_annotations (
    id integer NOT NULL,
    basket_id integer NOT NULL,
    target_size_id integer NOT NULL,
    predicted_date date NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reached_date date,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


--
-- Name: target_size_annotations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.target_size_annotations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: target_size_annotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.target_size_annotations_id_seq OWNED BY public.target_size_annotations.id;


--
-- Name: basket_position_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.basket_position_history ALTER COLUMN id SET DEFAULT nextval('public.basket_position_history_id_seq'::regclass);


--
-- Name: baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baskets ALTER COLUMN id SET DEFAULT nextval('public.baskets_id_seq'::regclass);


--
-- Name: cycles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycles ALTER COLUMN id SET DEFAULT nextval('public.cycles_id_seq'::regclass);


--
-- Name: flupsys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsys ALTER COLUMN id SET DEFAULT nextval('public.flupsys_id_seq'::regclass);


--
-- Name: lots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots ALTER COLUMN id SET DEFAULT nextval('public.lots_id_seq'::regclass);


--
-- Name: mortality_rates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mortality_rates ALTER COLUMN id SET DEFAULT nextval('public.mortality_rates_id_seq'::regclass);


--
-- Name: operations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations ALTER COLUMN id SET DEFAULT nextval('public.operations_id_seq'::regclass);


--
-- Name: sgr id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr ALTER COLUMN id SET DEFAULT nextval('public.sgr_id_seq'::regclass);


--
-- Name: sgr_giornalieri id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_giornalieri ALTER COLUMN id SET DEFAULT nextval('public.sgr_giornalieri_id_seq'::regclass);


--
-- Name: sizes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes ALTER COLUMN id SET DEFAULT nextval('public.sizes_id_seq'::regclass);


--
-- Name: target_size_annotations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_size_annotations ALTER COLUMN id SET DEFAULT nextval('public.target_size_annotations_id_seq'::regclass);


--
-- Data for Name: basket_position_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.basket_position_history (id, basket_id, flupsy_id, "row", "position", start_date, end_date, operation_id) FROM stdin;
2	2	1	SX	1	2025-03-26	\N	\N
3	3	2	SX	5	2025-03-26	2025-03-26	\N
1	1	2	DX	2	2025-03-26	2025-03-26	\N
5	1	2	DX	3	2025-03-26	2025-03-26	\N
4	3	2	SX	4	2025-03-26	2025-03-26	\N
6	1	2	SX	3	2025-03-26	2025-03-26	\N
7	3	2	SX	3	2025-03-26	2025-03-26	\N
8	1	2	SX	4	2025-03-26	2025-03-26	\N
9	3	2	SX	7	2025-03-26	2025-03-26	\N
12	4	2	SX	2	2025-03-26	\N	\N
11	3	2	SX	4	2025-03-26	2025-03-27	\N
13	3	2	SX	7	2025-03-27	\N	\N
10	1	2	SX	7	2025-03-26	2025-03-27	\N
14	1	2	SX	4	2025-03-27	2025-03-27	\N
15	1	2	DX	3	2025-03-27	\N	\N
\.


--
-- Data for Name: baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.baskets (id, physical_number, state, current_cycle_id, nfc_data, flupsy_id, "row", "position", cycle_code) FROM stdin;
2	1	available	\N	04:41:43:8a:7a:00:00	1	SX	1	\N
3	2	active	1	04:1d:7d:8a:7a:00:00	2	SX	7	2-2-2503
1	1	active	2	04:83:97:8a:7a:00:00	2	DX	3	1-2-2503
4	3	active	3	\N	2	SX	2	3-2-2503
\.


--
-- Data for Name: cycles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cycles (id, basket_id, start_date, end_date, state) FROM stdin;
1	3	2025-03-26	\N	active
2	1	2025-03-26	\N	active
3	4	2025-03-27	\N	active
\.


--
-- Data for Name: flupsys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flupsys (id, name, location, description, active) FROM stdin;
2	Flupsy 2 (Easytech)	Canale 1 Lato Laguna	Posizionato lato GORO	t
1	Flupsy 1 (Mondolo)	Canale 1 Lato Laguna	Posizionato lato Gorino	t
\.


--
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lots (id, arrival_date, supplier, quality, animal_count, weight, size_id, notes, state) FROM stdin;
2	2025-03-22	Ecotapes Zeeland	buonissima	5000000	5250	4	\N	active
1	2025-03-19	Taylor	buona	8500000	\N	1	Non troppo buona	active
\.


--
-- Data for Name: mortality_rates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mortality_rates (id, size_id, month, percentage, notes) FROM stdin;
1	1	gennaio	2.5	Mortalità più alta in inverno per taglie piccole
2	1	febbraio	2.3	Mortalità ancora elevata ma in diminuzione
3	1	marzo	2	Mortalità in diminuzione con temperature in aumento
4	1	aprile	1.8	Mortalità in diminuzione
5	1	maggio	1.5	Mortalità media
6	1	giugno	1.3	Mortalità in diminuzione in estate
7	1	luglio	1	Mortalità bassa con acque calde
8	1	agosto	1.2	Leggero aumento per temperature troppo alte
9	1	settembre	1.4	Leggero aumento con cambio stagione
10	1	ottobre	1.7	Aumento con temperature in diminuzione
11	1	novembre	2	Aumento con inizio inverno
12	1	dicembre	2.3	Alta mortalità in inverno
13	8	gennaio	1.8	Mortalità media in inverno per taglie medie
14	8	febbraio	1.7	Mortalità media
15	8	marzo	1.5	Mortalità in diminuzione
16	8	aprile	1.3	Mortalità bassa con temperature ottimali
17	8	maggio	1.1	Mortalità bassa
18	8	giugno	1	Mortalità minima in estate
19	8	luglio	0.8	Mortalità molto bassa con acque calde
20	8	agosto	0.9	Leggero aumento per temperature troppo alte
21	8	settembre	1	Mortalità bassa
22	8	ottobre	1.2	Leggero aumento con temperature in diminuzione
23	8	novembre	1.5	Aumento con inizio inverno
24	8	dicembre	1.7	Mortalità media in inverno
25	12	gennaio	1.2	Mortalità bassa in inverno per taglie grandi
26	12	febbraio	1.1	Mortalità bassa
27	12	marzo	1	Mortalità bassa
28	12	aprile	0.9	Mortalità molto bassa
29	12	maggio	0.8	Mortalità molto bassa con temperature ottimali
30	12	giugno	0.7	Mortalità minima in estate
31	12	luglio	0.6	Mortalità minima con acque calde
32	12	agosto	0.7	Leggero aumento per temperature troppo alte
33	12	settembre	0.8	Mortalità molto bassa
34	12	ottobre	0.9	Leggero aumento con temperature in diminuzione
35	12	novembre	1	Mortalità bassa
36	12	dicembre	1.1	Mortalità bassa in inverno
\.


--
-- Data for Name: operations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operations (id, date, type, basket_id, cycle_id, size_id, sgr_id, lot_id, animal_count, total_weight, animals_per_kg, average_weight, notes, dead_count, mortality_rate) FROM stdin;
1	2025-03-26	prima-attivazione	3	1	16	\N	1	250000	3846.1538	65000	15.384615	\N	\N	\N
2	2025-03-26	prima-attivazione	1	2	13	\N	1	650000	5200	125000	8	\N	\N	\N
3	2025-04-06	misura	3	1	17	3	1	250000	5000	50000	20		\N	\N
4	2025-04-10	misura	1	2	15	3	1	650000	8125	80000	12.5		\N	\N
5	2025-03-27	prima-attivazione	4	3	19	\N	1	357000	14280	25000	40	\N	\N	\N
6	2025-04-04	misura	4	3	19	3	1	357000	16604.65	21500	46.511627		\N	\N
\.


--
-- Data for Name: sgr; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sgr (id, month, percentage, calculated_from_real) FROM stdin;
1	gennaio	0.8	f
2	febbraio	1.2	f
3	marzo	3.4	f
4	aprile	3.7	f
5	maggio	5.7	f
6	giugno	7	f
7	luglio	7.9	f
8	agosto	8.3	f
9	settembre	5.7	f
10	ottobre	4.1	f
11	novembre	1.6	f
12	dicembre	0.8	f
\.


--
-- Data for Name: sgr_giornalieri; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sgr_giornalieri (id, record_date, temperature, ph, ammonia, oxygen, salinity, notes) FROM stdin;
\.


--
-- Data for Name: sizes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sizes (id, code, name, size_mm, min_animals_per_kg, max_animals_per_kg, notes, color) FROM stdin;
1	TP-500	TP-500	1	3400001	5000000		#6366f1
2	TP-180	TP-180	\N	42000001	100000000		#a78bfa
3	TP-200	TP-200	10	16000001	42000000	Lunghezza Animale 1.0 mm, PesoGrPer1000 1000	#818cf8
4	TP-315	TP-315	\N	7600001	16000000		#60a5fa
5	TP-450	TP-450	\N	5000001	7600000		#2dd4bf
6	TP-600	TP-600	\N	1800001	3400000		#4ade80
7	TP-700	TP-700	\N	1500001	1800000		#a3e635
8	TP-800	TP-800	20	880001	1500000	Lunghezza Animale 2.0 mm, PesoGrPer1000 2000	#facc15
9	TP-1000	TP-1000	\N	600001	880000		#fb923c
10	TP-1140	TP-1140	\N	350001	600000		#f87171
11	TP-1260	TP-1260	\N	300001	350000		#f472b6
12	TP-1500	TP-1500	30	190001	300000	Lunghezza Animale 3.0 mm, PesoGrPer1000 3000	#e879f9
13	TP-1800	TP-1800	\N	120001	190000		#c084fc
14	TP-1900	TP-1900	\N	97001	120000		#93c5fd
15	TP-2000	TP-2000	\N	70001	97000		#67e8f9
16	TP-2200	TP-2200	\N	60001	70000		#86efac
17	TP-2500	TP-2500	\N	40001	60000		#fde047
18	TP-2800	TP-2800	\N	32001	40000		#fdba74
19	TP-3000	TP-3000	\N	19001	32000		#fca5a5
20	TP-3500	TP-3500	\N	12501	19000		#f9a8d4
21	TP-4000	TP-4000	\N	7501	12500		#d8b4fe
22	TP-5000	TP-5000	\N	3901	7500		#bfdbfe
23	TP-6000	TP-6000	\N	3001	3900		#a5f3fc
24	TP-7000	TP-7000	\N	2301	3000		#bbf7d0
25	TP-8000	TP-8000	\N	1801	2300		#fef08a
26	TP-9000	TP-9000	\N	1201	1800		#fed7aa
27	TP-10000	TP-10000	\N	801	1200		#fecaca
\.


--
-- Data for Name: target_size_annotations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.target_size_annotations (id, basket_id, target_size_id, predicted_date, status, reached_date, notes, created_at, updated_at) FROM stdin;
\.


--
-- Name: basket_position_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.basket_position_history_id_seq', 15, true);


--
-- Name: baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.baskets_id_seq', 4, true);


--
-- Name: cycles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cycles_id_seq', 3, true);


--
-- Name: flupsys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.flupsys_id_seq', 2, true);


--
-- Name: lots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lots_id_seq', 2, true);


--
-- Name: mortality_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mortality_rates_id_seq', 36, true);


--
-- Name: operations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operations_id_seq', 6, true);


--
-- Name: sgr_giornalieri_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sgr_giornalieri_id_seq', 1, false);


--
-- Name: sgr_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sgr_id_seq', 12, true);


--
-- Name: sizes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sizes_id_seq', 27, true);


--
-- Name: target_size_annotations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.target_size_annotations_id_seq', 1, false);


--
-- Name: basket_position_history basket_position_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.basket_position_history
    ADD CONSTRAINT basket_position_history_pkey PRIMARY KEY (id);


--
-- Name: baskets baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baskets
    ADD CONSTRAINT baskets_pkey PRIMARY KEY (id);


--
-- Name: cycles cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_pkey PRIMARY KEY (id);


--
-- Name: flupsys flupsys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsys
    ADD CONSTRAINT flupsys_pkey PRIMARY KEY (id);


--
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- Name: mortality_rates mortality_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mortality_rates
    ADD CONSTRAINT mortality_rates_pkey PRIMARY KEY (id);


--
-- Name: operations operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_pkey PRIMARY KEY (id);


--
-- Name: sgr_giornalieri sgr_giornalieri_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_giornalieri
    ADD CONSTRAINT sgr_giornalieri_pkey PRIMARY KEY (id);


--
-- Name: sgr sgr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr
    ADD CONSTRAINT sgr_pkey PRIMARY KEY (id);


--
-- Name: sizes sizes_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_code_unique UNIQUE (code);


--
-- Name: sizes sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_pkey PRIMARY KEY (id);


--
-- Name: target_size_annotations target_size_annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_size_annotations
    ADD CONSTRAINT target_size_annotations_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

