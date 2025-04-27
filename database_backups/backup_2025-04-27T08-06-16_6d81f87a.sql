--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

-- Started on 2025-04-27 08:06:16 UTC

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

ALTER TABLE IF EXISTS ONLY public.lot_mortality_records DROP CONSTRAINT IF EXISTS lot_mortality_records_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_inventory_transactions DROP CONSTRAINT IF EXISTS lot_inventory_transactions_operation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_inventory_transactions DROP CONSTRAINT IF EXISTS lot_inventory_transactions_lot_id_fkey;
DROP INDEX IF EXISTS public.idx_lot_mortality_records_lot_id;
DROP INDEX IF EXISTS public.idx_lot_mortality_records_date;
DROP INDEX IF EXISTS public.idx_lot_inventory_transactions_lot_id;
DROP INDEX IF EXISTS public.idx_lot_inventory_transactions_date;
ALTER TABLE IF EXISTS ONLY public.target_size_annotations DROP CONSTRAINT IF EXISTS target_size_annotations_pkey;
ALTER TABLE IF EXISTS ONLY public.sizes DROP CONSTRAINT IF EXISTS sizes_pkey;
ALTER TABLE IF EXISTS ONLY public.sizes DROP CONSTRAINT IF EXISTS sizes_code_unique;
ALTER TABLE IF EXISTS ONLY public.sgr DROP CONSTRAINT IF EXISTS sgr_pkey;
ALTER TABLE IF EXISTS ONLY public.sgr_monthly DROP CONSTRAINT IF EXISTS sgr_monthly_pkey;
ALTER TABLE IF EXISTS ONLY public.sgr_giornalieri DROP CONSTRAINT IF EXISTS sgr_giornalieri_pkey;
ALTER TABLE IF EXISTS ONLY public.selections DROP CONSTRAINT IF EXISTS selections_pkey;
ALTER TABLE IF EXISTS ONLY public.selection_source_baskets DROP CONSTRAINT IF EXISTS selection_source_baskets_pkey;
ALTER TABLE IF EXISTS ONLY public.selection_lot_references DROP CONSTRAINT IF EXISTS selection_lot_references_pkey;
ALTER TABLE IF EXISTS ONLY public.selection_destination_baskets DROP CONSTRAINT IF EXISTS selection_destination_baskets_pkey;
ALTER TABLE IF EXISTS ONLY public.selection_basket_history DROP CONSTRAINT IF EXISTS selection_basket_history_pkey;
ALTER TABLE IF EXISTS ONLY public.screening_source_baskets DROP CONSTRAINT IF EXISTS screening_source_baskets_pkey;
ALTER TABLE IF EXISTS ONLY public.screening_operations DROP CONSTRAINT IF EXISTS screening_operations_pkey;
ALTER TABLE IF EXISTS ONLY public.screening_lot_references DROP CONSTRAINT IF EXISTS screening_lot_references_pkey;
ALTER TABLE IF EXISTS ONLY public.screening_destination_baskets DROP CONSTRAINT IF EXISTS screening_destination_baskets_pkey;
ALTER TABLE IF EXISTS ONLY public.screening_basket_history DROP CONSTRAINT IF EXISTS screening_basket_history_pkey;
ALTER TABLE IF EXISTS ONLY public.operations DROP CONSTRAINT IF EXISTS operations_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.notification_settings DROP CONSTRAINT IF EXISTS notification_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.mortality_rates DROP CONSTRAINT IF EXISTS mortality_rates_pkey;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS lots_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_mortality_records DROP CONSTRAINT IF EXISTS lot_mortality_records_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_inventory_transactions DROP CONSTRAINT IF EXISTS lot_inventory_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.flupsys DROP CONSTRAINT IF EXISTS flupsys_pkey;
ALTER TABLE IF EXISTS ONLY public.email_config DROP CONSTRAINT IF EXISTS email_config_pkey;
ALTER TABLE IF EXISTS ONLY public.email_config DROP CONSTRAINT IF EXISTS email_config_key_key;
ALTER TABLE IF EXISTS ONLY public.cycles DROP CONSTRAINT IF EXISTS cycles_pkey;
ALTER TABLE IF EXISTS ONLY public.baskets DROP CONSTRAINT IF EXISTS baskets_pkey;
ALTER TABLE IF EXISTS ONLY public.basket_position_history DROP CONSTRAINT IF EXISTS basket_position_history_pkey;
ALTER TABLE IF EXISTS public.target_size_annotations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sizes ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sgr_monthly ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sgr_giornalieri ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sgr ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.selections ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.selection_source_baskets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.selection_lot_references ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.selection_destination_baskets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.selection_basket_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.screening_source_baskets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.screening_operations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.screening_lot_references ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.screening_destination_baskets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.screening_basket_history ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.operations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notification_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.mortality_rates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lot_mortality_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lot_inventory_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.flupsys ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.email_config ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.cycles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.baskets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.basket_position_history ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.target_size_annotations_id_seq;
DROP TABLE IF EXISTS public.target_size_annotations;
DROP SEQUENCE IF EXISTS public.sizes_id_seq;
DROP TABLE IF EXISTS public.sizes;
DROP SEQUENCE IF EXISTS public.sgr_monthly_id_seq;
DROP TABLE IF EXISTS public.sgr_monthly;
DROP SEQUENCE IF EXISTS public.sgr_id_seq;
DROP SEQUENCE IF EXISTS public.sgr_giornalieri_id_seq;
DROP TABLE IF EXISTS public.sgr_giornalieri;
DROP TABLE IF EXISTS public.sgr;
DROP SEQUENCE IF EXISTS public.selections_id_seq;
DROP TABLE IF EXISTS public.selections;
DROP SEQUENCE IF EXISTS public.selection_source_baskets_id_seq;
DROP TABLE IF EXISTS public.selection_source_baskets;
DROP SEQUENCE IF EXISTS public.selection_lot_references_id_seq;
DROP TABLE IF EXISTS public.selection_lot_references;
DROP SEQUENCE IF EXISTS public.selection_destination_baskets_id_seq;
DROP TABLE IF EXISTS public.selection_destination_baskets;
DROP SEQUENCE IF EXISTS public.selection_basket_history_id_seq;
DROP TABLE IF EXISTS public.selection_basket_history;
DROP SEQUENCE IF EXISTS public.screening_source_baskets_id_seq;
DROP TABLE IF EXISTS public.screening_source_baskets;
DROP SEQUENCE IF EXISTS public.screening_operations_id_seq;
DROP TABLE IF EXISTS public.screening_operations;
DROP SEQUENCE IF EXISTS public.screening_lot_references_id_seq;
DROP TABLE IF EXISTS public.screening_lot_references;
DROP SEQUENCE IF EXISTS public.screening_destination_baskets_id_seq;
DROP TABLE IF EXISTS public.screening_destination_baskets;
DROP SEQUENCE IF EXISTS public.screening_basket_history_id_seq;
DROP TABLE IF EXISTS public.screening_basket_history;
DROP SEQUENCE IF EXISTS public.operations_id_seq;
DROP TABLE IF EXISTS public.operations;
DROP SEQUENCE IF EXISTS public.notifications_id_seq;
DROP TABLE IF EXISTS public.notifications;
DROP SEQUENCE IF EXISTS public.notification_settings_id_seq;
DROP TABLE IF EXISTS public.notification_settings;
DROP SEQUENCE IF EXISTS public.mortality_rates_id_seq;
DROP TABLE IF EXISTS public.mortality_rates;
DROP SEQUENCE IF EXISTS public.lots_id_seq;
DROP TABLE IF EXISTS public.lots;
DROP SEQUENCE IF EXISTS public.lot_mortality_records_id_seq;
DROP TABLE IF EXISTS public.lot_mortality_records;
DROP SEQUENCE IF EXISTS public.lot_inventory_transactions_id_seq;
DROP TABLE IF EXISTS public.lot_inventory_transactions;
DROP SEQUENCE IF EXISTS public.flupsys_id_seq;
DROP TABLE IF EXISTS public.flupsys;
DROP SEQUENCE IF EXISTS public.email_config_id_seq;
DROP TABLE IF EXISTS public.email_config;
DROP SEQUENCE IF EXISTS public.cycles_id_seq;
DROP TABLE IF EXISTS public.cycles;
DROP SEQUENCE IF EXISTS public.baskets_id_seq;
DROP TABLE IF EXISTS public.baskets;
DROP SEQUENCE IF EXISTS public.basket_position_history_id_seq;
DROP TABLE IF EXISTS public.basket_position_history;
DROP SCHEMA IF EXISTS public;
--
-- TOC entry 7 (class 2615 OID 246165)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


SET default_table_access_method = heap;

--
-- TOC entry 217 (class 1259 OID 246166)
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
-- TOC entry 218 (class 1259 OID 246171)
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
-- TOC entry 3637 (class 0 OID 0)
-- Dependencies: 218
-- Name: basket_position_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.basket_position_history_id_seq OWNED BY public.basket_position_history.id;


--
-- TOC entry 219 (class 1259 OID 246172)
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
-- TOC entry 220 (class 1259 OID 246178)
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
-- TOC entry 3638 (class 0 OID 0)
-- Dependencies: 220
-- Name: baskets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.baskets_id_seq OWNED BY public.baskets.id;


--
-- TOC entry 221 (class 1259 OID 246179)
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
-- TOC entry 222 (class 1259 OID 246185)
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
-- TOC entry 3639 (class 0 OID 0)
-- Dependencies: 222
-- Name: cycles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cycles_id_seq OWNED BY public.cycles.id;


--
-- TOC entry 260 (class 1259 OID 327681)
-- Name: email_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_config (
    id integer NOT NULL,
    key character varying(50) NOT NULL,
    value text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


--
-- TOC entry 259 (class 1259 OID 327680)
-- Name: email_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3640 (class 0 OID 0)
-- Dependencies: 259
-- Name: email_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_config_id_seq OWNED BY public.email_config.id;


--
-- TOC entry 223 (class 1259 OID 246186)
-- Name: flupsys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flupsys (
    id integer NOT NULL,
    name text NOT NULL,
    location text,
    description text,
    active boolean DEFAULT true NOT NULL,
    max_positions integer DEFAULT 10 NOT NULL,
    production_center text
);


--
-- TOC entry 224 (class 1259 OID 246192)
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
-- TOC entry 3641 (class 0 OID 0)
-- Dependencies: 224
-- Name: flupsys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.flupsys_id_seq OWNED BY public.flupsys.id;


--
-- TOC entry 268 (class 1259 OID 368641)
-- Name: lot_inventory_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_inventory_transactions (
    id integer NOT NULL,
    lot_id integer NOT NULL,
    transaction_type character varying(50) NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    animal_count integer NOT NULL,
    notes text,
    operation_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    basket_id integer,
    selection_id integer,
    screening_id integer,
    metadata jsonb,
    created_by integer
);


--
-- TOC entry 267 (class 1259 OID 368640)
-- Name: lot_inventory_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lot_inventory_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3642 (class 0 OID 0)
-- Dependencies: 267
-- Name: lot_inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_inventory_transactions_id_seq OWNED BY public.lot_inventory_transactions.id;


--
-- TOC entry 270 (class 1259 OID 368662)
-- Name: lot_mortality_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_mortality_records (
    id integer NOT NULL,
    lot_id integer NOT NULL,
    calculation_date timestamp with time zone DEFAULT now() NOT NULL,
    initial_count integer NOT NULL,
    current_count integer NOT NULL,
    sold_count integer NOT NULL,
    mortality_count integer NOT NULL,
    mortality_percentage numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 269 (class 1259 OID 368661)
-- Name: lot_mortality_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lot_mortality_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3643 (class 0 OID 0)
-- Dependencies: 269
-- Name: lot_mortality_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_mortality_records_id_seq OWNED BY public.lot_mortality_records.id;


--
-- TOC entry 225 (class 1259 OID 246193)
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
-- TOC entry 226 (class 1259 OID 246199)
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
-- TOC entry 3644 (class 0 OID 0)
-- Dependencies: 226
-- Name: lots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lots_id_seq OWNED BY public.lots.id;


--
-- TOC entry 227 (class 1259 OID 246200)
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
-- TOC entry 228 (class 1259 OID 246205)
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
-- TOC entry 3645 (class 0 OID 0)
-- Dependencies: 228
-- Name: mortality_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mortality_rates_id_seq OWNED BY public.mortality_rates.id;


--
-- TOC entry 264 (class 1259 OID 344065)
-- Name: notification_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_settings (
    id integer NOT NULL,
    notification_type text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


--
-- TOC entry 263 (class 1259 OID 344064)
-- Name: notification_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3646 (class 0 OID 0)
-- Dependencies: 263
-- Name: notification_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_settings_id_seq OWNED BY public.notification_settings.id;


--
-- TOC entry 262 (class 1259 OID 335873)
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    related_entity_type text,
    related_entity_id integer,
    data text
);


--
-- TOC entry 261 (class 1259 OID 335872)
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3647 (class 0 OID 0)
-- Dependencies: 261
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 229 (class 1259 OID 246206)
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
-- TOC entry 230 (class 1259 OID 246211)
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
-- TOC entry 3648 (class 0 OID 0)
-- Dependencies: 230
-- Name: operations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operations_id_seq OWNED BY public.operations.id;


--
-- TOC entry 231 (class 1259 OID 246212)
-- Name: screening_basket_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screening_basket_history (
    id integer NOT NULL,
    screening_id integer NOT NULL,
    source_basket_id integer NOT NULL,
    source_cycle_id integer NOT NULL,
    destination_basket_id integer NOT NULL,
    destination_cycle_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 232 (class 1259 OID 246216)
-- Name: screening_basket_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.screening_basket_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3649 (class 0 OID 0)
-- Dependencies: 232
-- Name: screening_basket_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.screening_basket_history_id_seq OWNED BY public.screening_basket_history.id;


--
-- TOC entry 233 (class 1259 OID 246217)
-- Name: screening_destination_baskets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screening_destination_baskets (
    id integer NOT NULL,
    screening_id integer NOT NULL,
    basket_id integer NOT NULL,
    cycle_id integer,
    category text NOT NULL,
    flupsy_id integer,
    "row" text,
    "position" integer,
    position_assigned boolean DEFAULT false NOT NULL,
    animal_count integer,
    live_animals integer,
    total_weight real,
    animals_per_kg integer,
    dead_count integer,
    mortality_rate real,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


--
-- TOC entry 234 (class 1259 OID 246224)
-- Name: screening_destination_baskets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.screening_destination_baskets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3650 (class 0 OID 0)
-- Dependencies: 234
-- Name: screening_destination_baskets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.screening_destination_baskets_id_seq OWNED BY public.screening_destination_baskets.id;


--
-- TOC entry 235 (class 1259 OID 246225)
-- Name: screening_lot_references; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screening_lot_references (
    id integer NOT NULL,
    screening_id integer NOT NULL,
    destination_basket_id integer NOT NULL,
    destination_cycle_id integer NOT NULL,
    lot_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 236 (class 1259 OID 246229)
-- Name: screening_lot_references_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.screening_lot_references_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3651 (class 0 OID 0)
-- Dependencies: 236
-- Name: screening_lot_references_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.screening_lot_references_id_seq OWNED BY public.screening_lot_references.id;


--
-- TOC entry 237 (class 1259 OID 246230)
-- Name: screening_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screening_operations (
    id integer NOT NULL,
    date date NOT NULL,
    screening_number integer NOT NULL,
    purpose text,
    reference_size_id integer NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone,
    notes text
);


--
-- TOC entry 238 (class 1259 OID 246237)
-- Name: screening_operations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.screening_operations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3652 (class 0 OID 0)
-- Dependencies: 238
-- Name: screening_operations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.screening_operations_id_seq OWNED BY public.screening_operations.id;


--
-- TOC entry 239 (class 1259 OID 246238)
-- Name: screening_source_baskets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screening_source_baskets (
    id integer NOT NULL,
    screening_id integer NOT NULL,
    basket_id integer NOT NULL,
    cycle_id integer NOT NULL,
    dismissed boolean DEFAULT false NOT NULL,
    position_released boolean DEFAULT false NOT NULL,
    animal_count integer,
    total_weight real,
    animals_per_kg integer,
    size_id integer,
    lot_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 240 (class 1259 OID 246244)
-- Name: screening_source_baskets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.screening_source_baskets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3653 (class 0 OID 0)
-- Dependencies: 240
-- Name: screening_source_baskets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.screening_source_baskets_id_seq OWNED BY public.screening_source_baskets.id;


--
-- TOC entry 241 (class 1259 OID 246245)
-- Name: selection_basket_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.selection_basket_history (
    id integer NOT NULL,
    selection_id integer NOT NULL,
    source_basket_id integer NOT NULL,
    source_cycle_id integer NOT NULL,
    destination_basket_id integer NOT NULL,
    destination_cycle_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 242 (class 1259 OID 246249)
-- Name: selection_basket_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.selection_basket_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3654 (class 0 OID 0)
-- Dependencies: 242
-- Name: selection_basket_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.selection_basket_history_id_seq OWNED BY public.selection_basket_history.id;


--
-- TOC entry 243 (class 1259 OID 246250)
-- Name: selection_destination_baskets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.selection_destination_baskets (
    id integer NOT NULL,
    selection_id integer NOT NULL,
    basket_id integer NOT NULL,
    cycle_id integer,
    destination_type text NOT NULL,
    flupsy_id integer,
    "position" text,
    animal_count integer,
    live_animals integer,
    total_weight real,
    animals_per_kg integer,
    size_id integer,
    dead_count integer,
    mortality_rate real,
    sample_weight real,
    sample_count integer,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


--
-- TOC entry 244 (class 1259 OID 246256)
-- Name: selection_destination_baskets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.selection_destination_baskets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3655 (class 0 OID 0)
-- Dependencies: 244
-- Name: selection_destination_baskets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.selection_destination_baskets_id_seq OWNED BY public.selection_destination_baskets.id;


--
-- TOC entry 245 (class 1259 OID 246257)
-- Name: selection_lot_references; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.selection_lot_references (
    id integer NOT NULL,
    selection_id integer NOT NULL,
    destination_basket_id integer NOT NULL,
    destination_cycle_id integer NOT NULL,
    lot_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 246 (class 1259 OID 246261)
-- Name: selection_lot_references_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.selection_lot_references_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3656 (class 0 OID 0)
-- Dependencies: 246
-- Name: selection_lot_references_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.selection_lot_references_id_seq OWNED BY public.selection_lot_references.id;


--
-- TOC entry 247 (class 1259 OID 246262)
-- Name: selection_source_baskets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.selection_source_baskets (
    id integer NOT NULL,
    selection_id integer NOT NULL,
    basket_id integer NOT NULL,
    cycle_id integer NOT NULL,
    animal_count integer,
    total_weight real,
    animals_per_kg integer,
    size_id integer,
    lot_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 248 (class 1259 OID 246266)
-- Name: selection_source_baskets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.selection_source_baskets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3657 (class 0 OID 0)
-- Dependencies: 248
-- Name: selection_source_baskets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.selection_source_baskets_id_seq OWNED BY public.selection_source_baskets.id;


--
-- TOC entry 249 (class 1259 OID 246267)
-- Name: selections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.selections (
    id integer NOT NULL,
    date date NOT NULL,
    selection_number integer NOT NULL,
    purpose text NOT NULL,
    screening_type text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone,
    notes text,
    reference_size_id integer
);


--
-- TOC entry 250 (class 1259 OID 246274)
-- Name: selections_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.selections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3658 (class 0 OID 0)
-- Dependencies: 250
-- Name: selections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.selections_id_seq OWNED BY public.selections.id;


--
-- TOC entry 251 (class 1259 OID 246275)
-- Name: sgr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sgr (
    id integer NOT NULL,
    month text NOT NULL,
    percentage real NOT NULL,
    calculated_from_real boolean DEFAULT false
);


--
-- TOC entry 252 (class 1259 OID 246281)
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
-- TOC entry 253 (class 1259 OID 246286)
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
-- TOC entry 3659 (class 0 OID 0)
-- Dependencies: 253
-- Name: sgr_giornalieri_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sgr_giornalieri_id_seq OWNED BY public.sgr_giornalieri.id;


--
-- TOC entry 254 (class 1259 OID 246287)
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
-- TOC entry 3660 (class 0 OID 0)
-- Dependencies: 254
-- Name: sgr_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sgr_id_seq OWNED BY public.sgr.id;


--
-- TOC entry 266 (class 1259 OID 344076)
-- Name: sgr_monthly; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sgr_monthly (
    id integer NOT NULL,
    month_number integer NOT NULL,
    percentage_value numeric(10,2) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


--
-- TOC entry 265 (class 1259 OID 344075)
-- Name: sgr_monthly_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sgr_monthly_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3661 (class 0 OID 0)
-- Dependencies: 265
-- Name: sgr_monthly_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sgr_monthly_id_seq OWNED BY public.sgr_monthly.id;


--
-- TOC entry 255 (class 1259 OID 246288)
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
    color text
);


--
-- TOC entry 256 (class 1259 OID 246293)
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
-- TOC entry 3662 (class 0 OID 0)
-- Dependencies: 256
-- Name: sizes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sizes_id_seq OWNED BY public.sizes.id;


--
-- TOC entry 257 (class 1259 OID 246294)
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
-- TOC entry 258 (class 1259 OID 246301)
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
-- TOC entry 3663 (class 0 OID 0)
-- Dependencies: 258
-- Name: target_size_annotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.target_size_annotations_id_seq OWNED BY public.target_size_annotations.id;


--
-- TOC entry 3310 (class 2604 OID 246302)
-- Name: basket_position_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.basket_position_history ALTER COLUMN id SET DEFAULT nextval('public.basket_position_history_id_seq'::regclass);


--
-- TOC entry 3311 (class 2604 OID 246303)
-- Name: baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baskets ALTER COLUMN id SET DEFAULT nextval('public.baskets_id_seq'::regclass);


--
-- TOC entry 3313 (class 2604 OID 246304)
-- Name: cycles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycles ALTER COLUMN id SET DEFAULT nextval('public.cycles_id_seq'::regclass);


--
-- TOC entry 3354 (class 2604 OID 327684)
-- Name: email_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_config ALTER COLUMN id SET DEFAULT nextval('public.email_config_id_seq'::regclass);


--
-- TOC entry 3315 (class 2604 OID 246305)
-- Name: flupsys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsys ALTER COLUMN id SET DEFAULT nextval('public.flupsys_id_seq'::regclass);


--
-- TOC entry 3364 (class 2604 OID 368644)
-- Name: lot_inventory_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.lot_inventory_transactions_id_seq'::regclass);


--
-- TOC entry 3367 (class 2604 OID 368665)
-- Name: lot_mortality_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mortality_records ALTER COLUMN id SET DEFAULT nextval('public.lot_mortality_records_id_seq'::regclass);


--
-- TOC entry 3318 (class 2604 OID 246306)
-- Name: lots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots ALTER COLUMN id SET DEFAULT nextval('public.lots_id_seq'::regclass);


--
-- TOC entry 3320 (class 2604 OID 246307)
-- Name: mortality_rates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mortality_rates ALTER COLUMN id SET DEFAULT nextval('public.mortality_rates_id_seq'::regclass);


--
-- TOC entry 3359 (class 2604 OID 344068)
-- Name: notification_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_settings_id_seq'::regclass);


--
-- TOC entry 3356 (class 2604 OID 335876)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 3321 (class 2604 OID 246308)
-- Name: operations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations ALTER COLUMN id SET DEFAULT nextval('public.operations_id_seq'::regclass);


--
-- TOC entry 3322 (class 2604 OID 246309)
-- Name: screening_basket_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_basket_history ALTER COLUMN id SET DEFAULT nextval('public.screening_basket_history_id_seq'::regclass);


--
-- TOC entry 3324 (class 2604 OID 246310)
-- Name: screening_destination_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_destination_baskets ALTER COLUMN id SET DEFAULT nextval('public.screening_destination_baskets_id_seq'::regclass);


--
-- TOC entry 3327 (class 2604 OID 246311)
-- Name: screening_lot_references id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_lot_references ALTER COLUMN id SET DEFAULT nextval('public.screening_lot_references_id_seq'::regclass);


--
-- TOC entry 3329 (class 2604 OID 246312)
-- Name: screening_operations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_operations ALTER COLUMN id SET DEFAULT nextval('public.screening_operations_id_seq'::regclass);


--
-- TOC entry 3332 (class 2604 OID 246313)
-- Name: screening_source_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_source_baskets ALTER COLUMN id SET DEFAULT nextval('public.screening_source_baskets_id_seq'::regclass);


--
-- TOC entry 3336 (class 2604 OID 246314)
-- Name: selection_basket_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_basket_history ALTER COLUMN id SET DEFAULT nextval('public.selection_basket_history_id_seq'::regclass);


--
-- TOC entry 3338 (class 2604 OID 246315)
-- Name: selection_destination_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_destination_baskets ALTER COLUMN id SET DEFAULT nextval('public.selection_destination_baskets_id_seq'::regclass);


--
-- TOC entry 3340 (class 2604 OID 246316)
-- Name: selection_lot_references id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_lot_references ALTER COLUMN id SET DEFAULT nextval('public.selection_lot_references_id_seq'::regclass);


--
-- TOC entry 3342 (class 2604 OID 246317)
-- Name: selection_source_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_source_baskets ALTER COLUMN id SET DEFAULT nextval('public.selection_source_baskets_id_seq'::regclass);


--
-- TOC entry 3344 (class 2604 OID 246318)
-- Name: selections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selections ALTER COLUMN id SET DEFAULT nextval('public.selections_id_seq'::regclass);


--
-- TOC entry 3347 (class 2604 OID 246319)
-- Name: sgr id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr ALTER COLUMN id SET DEFAULT nextval('public.sgr_id_seq'::regclass);


--
-- TOC entry 3349 (class 2604 OID 246320)
-- Name: sgr_giornalieri id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_giornalieri ALTER COLUMN id SET DEFAULT nextval('public.sgr_giornalieri_id_seq'::regclass);


--
-- TOC entry 3362 (class 2604 OID 344079)
-- Name: sgr_monthly id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_monthly ALTER COLUMN id SET DEFAULT nextval('public.sgr_monthly_id_seq'::regclass);


--
-- TOC entry 3350 (class 2604 OID 246321)
-- Name: sizes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes ALTER COLUMN id SET DEFAULT nextval('public.sizes_id_seq'::regclass);


--
-- TOC entry 3351 (class 2604 OID 246322)
-- Name: target_size_annotations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_size_annotations ALTER COLUMN id SET DEFAULT nextval('public.target_size_annotations_id_seq'::regclass);


--
-- TOC entry 3578 (class 0 OID 246166)
-- Dependencies: 217
-- Data for Name: basket_position_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.basket_position_history (id, basket_id, flupsy_id, "row", "position", start_date, end_date, operation_id) FROM stdin;
\.


--
-- TOC entry 3580 (class 0 OID 246172)
-- Dependencies: 219
-- Data for Name: baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.baskets (id, physical_number, state, current_cycle_id, nfc_data, flupsy_id, "row", "position", cycle_code) FROM stdin;
\.


--
-- TOC entry 3582 (class 0 OID 246179)
-- Dependencies: 221
-- Data for Name: cycles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cycles (id, basket_id, start_date, end_date, state) FROM stdin;
\.


--
-- TOC entry 3621 (class 0 OID 327681)
-- Dependencies: 260
-- Data for Name: email_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_config (id, key, value, created_at, updated_at) FROM stdin;
3	email_send_time	20:00	2025-04-25 17:37:57.294053	\N
4	auto_email_enabled	false	2025-04-25 17:37:57.294053	\N
1	email_recipients	lago.gianluigi@gmail.com	2025-04-25 17:37:57.294053	2025-04-26 08:49:28.69
2	email_cc		2025-04-25 17:37:57.294053	2025-04-26 08:49:28.955
\.


--
-- TOC entry 3584 (class 0 OID 246186)
-- Dependencies: 223
-- Data for Name: flupsys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flupsys (id, name, location, description, active, max_positions, production_center) FROM stdin;
618	BINS 5x4	Lungo parete DX		t	20	Ecotapes Italia
582	Raceway 1 CaPisani	Ca Pisani	descrizione a piacere	t	16	Ecotapes Italia
608	Raceway 1 Delta Futuro	La prima 		t	16	Delta Futuro GORO
113	Mega FLupsy Ca Pisani 	Ca Pisani	Ultimo lato uscita	t	20	Ecotapes Italia
13	Fluspy 3 Alluminio	Ca Pisani	Primo da passerella	t	20	Ecotapes Italia
570	Flupsy piccolo 10 ceste	Ca Pisani		t	10	Ecotapes Italia
2	Flupsy 2 (Easytech)	Canale 1 Lato Laguna	Posizionato lato GORO	t	20	Delta Futuro GORO
1	Flupsy 1 (Mondolo)	Canale 1 Lato Laguna	Posizionato lato Gorino	t	20	Delta Futuro GORO
\.


--
-- TOC entry 3629 (class 0 OID 368641)
-- Dependencies: 268
-- Data for Name: lot_inventory_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot_inventory_transactions (id, lot_id, transaction_type, date, animal_count, notes, operation_id, created_at, basket_id, selection_id, screening_id, metadata, created_by) FROM stdin;
1	5	arrivo-lotto	2025-04-26 18:36:25.660497+00	15000000	Registrazione iniziale del lotto	\N	2025-04-26 18:36:25.660497+00	\N	\N	\N	\N	\N
\.


--
-- TOC entry 3631 (class 0 OID 368662)
-- Dependencies: 270
-- Data for Name: lot_mortality_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot_mortality_records (id, lot_id, calculation_date, initial_count, current_count, sold_count, mortality_count, mortality_percentage, notes, created_at) FROM stdin;
1	5	2025-04-26 00:00:00+00	15000000	15000000	0	0	0.00	\N	2025-04-26 18:40:29.162022+00
2	3	2025-04-26 18:45:20.795684+00	18500000	18500000	0	0	0.00	\N	2025-04-26 18:45:20.795684+00
3	3	2025-04-26 18:46:04.95529+00	18500000	18500000	0	0	0.00	\N	2025-04-26 18:46:04.95529+00
4	5	2025-04-26 18:49:58.344472+00	15000000	15000000	0	0	0.00	\N	2025-04-26 18:49:58.344472+00
5	5	2025-04-26 19:01:47.334273+00	15000000	15000000	0	0	0.00	\N	2025-04-26 19:01:47.334273+00
6	5	2025-04-26 19:02:05.487671+00	15000000	15000000	0	0	0.00	\N	2025-04-26 19:02:05.487671+00
7	5	2025-04-27 07:16:32.866391+00	15000000	15000000	0	0	0.00	\N	2025-04-27 07:16:32.866391+00
8	5	2025-04-27 07:28:13.243834+00	15000000	15000000	0	0	0.00	\N	2025-04-27 07:28:13.243834+00
\.


--
-- TOC entry 3586 (class 0 OID 246193)
-- Dependencies: 225
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lots (id, arrival_date, supplier, quality, animal_count, weight, size_id, notes, state) FROM stdin;
5	2025-04-26	Sue Whashington	code	15000000	5000	5	Note di prova	active
3	2025-03-30	Roem	normali	18500000	8500	1	belle e brave	active
2	2025-03-22	Ecotapes Zeeland	teste	5000000	5250	4	tutti omogenei	active
1	2025-03-19	Taylor	code	8500000	\N	1	Non troppo buona	active
6	2025-04-26	Zeeland	teste	15000000	8500	1	\N	active
\.


--
-- TOC entry 3588 (class 0 OID 246200)
-- Dependencies: 227
-- Data for Name: mortality_rates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mortality_rates (id, size_id, month, percentage, notes) FROM stdin;
\.


--
-- TOC entry 3625 (class 0 OID 344065)
-- Dependencies: 264
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_settings (id, notification_type, is_enabled, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3623 (class 0 OID 335873)
-- Dependencies: 262
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, type, title, message, is_read, created_at, related_entity_type, related_entity_id, data) FROM stdin;
\.


--
-- TOC entry 3590 (class 0 OID 246206)
-- Dependencies: 229
-- Data for Name: operations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operations (id, date, type, basket_id, cycle_id, size_id, sgr_id, lot_id, animal_count, total_weight, animals_per_kg, average_weight, notes, dead_count, mortality_rate) FROM stdin;
\.


--
-- TOC entry 3592 (class 0 OID 246212)
-- Dependencies: 231
-- Data for Name: screening_basket_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_basket_history (id, screening_id, source_basket_id, source_cycle_id, destination_basket_id, destination_cycle_id, created_at) FROM stdin;
\.


--
-- TOC entry 3594 (class 0 OID 246217)
-- Dependencies: 233
-- Data for Name: screening_destination_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_destination_baskets (id, screening_id, basket_id, cycle_id, category, flupsy_id, "row", "position", position_assigned, animal_count, live_animals, total_weight, animals_per_kg, dead_count, mortality_rate, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3596 (class 0 OID 246225)
-- Dependencies: 235
-- Data for Name: screening_lot_references; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_lot_references (id, screening_id, destination_basket_id, destination_cycle_id, lot_id, created_at) FROM stdin;
\.


--
-- TOC entry 3598 (class 0 OID 246230)
-- Dependencies: 237
-- Data for Name: screening_operations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_operations (id, date, screening_number, purpose, reference_size_id, status, created_at, updated_at, notes) FROM stdin;
\.


--
-- TOC entry 3600 (class 0 OID 246238)
-- Dependencies: 239
-- Data for Name: screening_source_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_source_baskets (id, screening_id, basket_id, cycle_id, dismissed, position_released, animal_count, total_weight, animals_per_kg, size_id, lot_id, created_at) FROM stdin;
\.


--
-- TOC entry 3602 (class 0 OID 246245)
-- Dependencies: 241
-- Data for Name: selection_basket_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_basket_history (id, selection_id, source_basket_id, source_cycle_id, destination_basket_id, destination_cycle_id, created_at) FROM stdin;
\.


--
-- TOC entry 3604 (class 0 OID 246250)
-- Dependencies: 243
-- Data for Name: selection_destination_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_destination_baskets (id, selection_id, basket_id, cycle_id, destination_type, flupsy_id, "position", animal_count, live_animals, total_weight, animals_per_kg, size_id, dead_count, mortality_rate, sample_weight, sample_count, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3606 (class 0 OID 246257)
-- Dependencies: 245
-- Data for Name: selection_lot_references; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_lot_references (id, selection_id, destination_basket_id, destination_cycle_id, lot_id, created_at) FROM stdin;
\.


--
-- TOC entry 3608 (class 0 OID 246262)
-- Dependencies: 247
-- Data for Name: selection_source_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_source_baskets (id, selection_id, basket_id, cycle_id, animal_count, total_weight, animals_per_kg, size_id, lot_id, created_at) FROM stdin;
\.


--
-- TOC entry 3610 (class 0 OID 246267)
-- Dependencies: 249
-- Data for Name: selections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selections (id, date, selection_number, purpose, screening_type, status, created_at, updated_at, notes, reference_size_id) FROM stdin;
\.


--
-- TOC entry 3612 (class 0 OID 246275)
-- Dependencies: 251
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
-- TOC entry 3613 (class 0 OID 246281)
-- Dependencies: 252
-- Data for Name: sgr_giornalieri; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sgr_giornalieri (id, record_date, temperature, ph, ammonia, oxygen, salinity, notes) FROM stdin;
\.


--
-- TOC entry 3627 (class 0 OID 344076)
-- Dependencies: 266
-- Data for Name: sgr_monthly; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sgr_monthly (id, month_number, percentage_value, notes, created_at, updated_at) FROM stdin;
1	1	10.20	Gennaio	2025-04-26 09:56:19.167203	\N
2	2	11.50	Febbraio	2025-04-26 09:56:19.167203	\N
3	3	13.80	Marzo	2025-04-26 09:56:19.167203	\N
4	4	16.50	Aprile	2025-04-26 09:56:19.167203	\N
5	5	19.20	Maggio	2025-04-26 09:56:19.167203	\N
6	6	22.40	Giugno	2025-04-26 09:56:19.167203	\N
7	7	24.80	Luglio	2025-04-26 09:56:19.167203	\N
8	8	25.20	Agosto	2025-04-26 09:56:19.167203	\N
9	9	22.50	Settembre	2025-04-26 09:56:19.167203	\N
10	10	19.00	Ottobre	2025-04-26 09:56:19.167203	\N
11	11	15.30	Novembre	2025-04-26 09:56:19.167203	\N
12	12	12.10	Dicembre	2025-04-26 09:56:19.167203	\N
\.


--
-- TOC entry 3616 (class 0 OID 246288)
-- Dependencies: 255
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
-- TOC entry 3618 (class 0 OID 246294)
-- Dependencies: 257
-- Data for Name: target_size_annotations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.target_size_annotations (id, basket_id, target_size_id, predicted_date, status, reached_date, notes, created_at, updated_at) FROM stdin;
1	4	19	2025-05-06	unread	\N	Annotazione creata manualmente per test	2025-04-26 10:14:19.537192	\N
\.


--
-- TOC entry 3664 (class 0 OID 0)
-- Dependencies: 218
-- Name: basket_position_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.basket_position_history_id_seq', 1, false);


--
-- TOC entry 3665 (class 0 OID 0)
-- Dependencies: 220
-- Name: baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.baskets_id_seq', 1, false);


--
-- TOC entry 3666 (class 0 OID 0)
-- Dependencies: 222
-- Name: cycles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cycles_id_seq', 1, false);


--
-- TOC entry 3667 (class 0 OID 0)
-- Dependencies: 259
-- Name: email_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_config_id_seq', 4, true);


--
-- TOC entry 3668 (class 0 OID 0)
-- Dependencies: 224
-- Name: flupsys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.flupsys_id_seq', 625, true);


--
-- TOC entry 3669 (class 0 OID 0)
-- Dependencies: 267
-- Name: lot_inventory_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lot_inventory_transactions_id_seq', 1, true);


--
-- TOC entry 3670 (class 0 OID 0)
-- Dependencies: 269
-- Name: lot_mortality_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lot_mortality_records_id_seq', 8, true);


--
-- TOC entry 3671 (class 0 OID 0)
-- Dependencies: 226
-- Name: lots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lots_id_seq', 6, true);


--
-- TOC entry 3672 (class 0 OID 0)
-- Dependencies: 228
-- Name: mortality_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mortality_rates_id_seq', 36, true);


--
-- TOC entry 3673 (class 0 OID 0)
-- Dependencies: 263
-- Name: notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_settings_id_seq', 1, false);


--
-- TOC entry 3674 (class 0 OID 0)
-- Dependencies: 261
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 10, true);


--
-- TOC entry 3675 (class 0 OID 0)
-- Dependencies: 230
-- Name: operations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operations_id_seq', 1, false);


--
-- TOC entry 3676 (class 0 OID 0)
-- Dependencies: 232
-- Name: screening_basket_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_basket_history_id_seq', 1, false);


--
-- TOC entry 3677 (class 0 OID 0)
-- Dependencies: 234
-- Name: screening_destination_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_destination_baskets_id_seq', 1, false);


--
-- TOC entry 3678 (class 0 OID 0)
-- Dependencies: 236
-- Name: screening_lot_references_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_lot_references_id_seq', 1, false);


--
-- TOC entry 3679 (class 0 OID 0)
-- Dependencies: 238
-- Name: screening_operations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_operations_id_seq', 1, false);


--
-- TOC entry 3680 (class 0 OID 0)
-- Dependencies: 240
-- Name: screening_source_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_source_baskets_id_seq', 1, false);


--
-- TOC entry 3681 (class 0 OID 0)
-- Dependencies: 242
-- Name: selection_basket_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_basket_history_id_seq', 1, false);


--
-- TOC entry 3682 (class 0 OID 0)
-- Dependencies: 244
-- Name: selection_destination_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_destination_baskets_id_seq', 1, false);


--
-- TOC entry 3683 (class 0 OID 0)
-- Dependencies: 246
-- Name: selection_lot_references_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_lot_references_id_seq', 1, false);


--
-- TOC entry 3684 (class 0 OID 0)
-- Dependencies: 248
-- Name: selection_source_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_source_baskets_id_seq', 1, false);


--
-- TOC entry 3685 (class 0 OID 0)
-- Dependencies: 250
-- Name: selections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selections_id_seq', 1, false);


--
-- TOC entry 3686 (class 0 OID 0)
-- Dependencies: 253
-- Name: sgr_giornalieri_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sgr_giornalieri_id_seq', 1, false);


--
-- TOC entry 3687 (class 0 OID 0)
-- Dependencies: 254
-- Name: sgr_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sgr_id_seq', 12, true);


--
-- TOC entry 3688 (class 0 OID 0)
-- Dependencies: 265
-- Name: sgr_monthly_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sgr_monthly_id_seq', 12, true);


--
-- TOC entry 3689 (class 0 OID 0)
-- Dependencies: 256
-- Name: sizes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sizes_id_seq', 27, true);


--
-- TOC entry 3690 (class 0 OID 0)
-- Dependencies: 258
-- Name: target_size_annotations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.target_size_annotations_id_seq', 1, true);


--
-- TOC entry 3371 (class 2606 OID 246324)
-- Name: basket_position_history basket_position_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.basket_position_history
    ADD CONSTRAINT basket_position_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3373 (class 2606 OID 246326)
-- Name: baskets baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baskets
    ADD CONSTRAINT baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3375 (class 2606 OID 246328)
-- Name: cycles cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_pkey PRIMARY KEY (id);


--
-- TOC entry 3415 (class 2606 OID 327691)
-- Name: email_config email_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_key_key UNIQUE (key);


--
-- TOC entry 3417 (class 2606 OID 327689)
-- Name: email_config email_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_pkey PRIMARY KEY (id);


--
-- TOC entry 3377 (class 2606 OID 246330)
-- Name: flupsys flupsys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsys
    ADD CONSTRAINT flupsys_pkey PRIMARY KEY (id);


--
-- TOC entry 3427 (class 2606 OID 368650)
-- Name: lot_inventory_transactions lot_inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions
    ADD CONSTRAINT lot_inventory_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 3431 (class 2606 OID 368671)
-- Name: lot_mortality_records lot_mortality_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mortality_records
    ADD CONSTRAINT lot_mortality_records_pkey PRIMARY KEY (id);


--
-- TOC entry 3379 (class 2606 OID 246332)
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- TOC entry 3381 (class 2606 OID 246334)
-- Name: mortality_rates mortality_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mortality_rates
    ADD CONSTRAINT mortality_rates_pkey PRIMARY KEY (id);


--
-- TOC entry 3421 (class 2606 OID 344074)
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3419 (class 2606 OID 335882)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 3383 (class 2606 OID 246336)
-- Name: operations operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_pkey PRIMARY KEY (id);


--
-- TOC entry 3385 (class 2606 OID 246338)
-- Name: screening_basket_history screening_basket_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_basket_history
    ADD CONSTRAINT screening_basket_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3387 (class 2606 OID 246340)
-- Name: screening_destination_baskets screening_destination_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_destination_baskets
    ADD CONSTRAINT screening_destination_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3389 (class 2606 OID 246342)
-- Name: screening_lot_references screening_lot_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_lot_references
    ADD CONSTRAINT screening_lot_references_pkey PRIMARY KEY (id);


--
-- TOC entry 3391 (class 2606 OID 246344)
-- Name: screening_operations screening_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_operations
    ADD CONSTRAINT screening_operations_pkey PRIMARY KEY (id);


--
-- TOC entry 3393 (class 2606 OID 246346)
-- Name: screening_source_baskets screening_source_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_source_baskets
    ADD CONSTRAINT screening_source_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3395 (class 2606 OID 246348)
-- Name: selection_basket_history selection_basket_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_basket_history
    ADD CONSTRAINT selection_basket_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3397 (class 2606 OID 246350)
-- Name: selection_destination_baskets selection_destination_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_destination_baskets
    ADD CONSTRAINT selection_destination_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3399 (class 2606 OID 246352)
-- Name: selection_lot_references selection_lot_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_lot_references
    ADD CONSTRAINT selection_lot_references_pkey PRIMARY KEY (id);


--
-- TOC entry 3401 (class 2606 OID 246354)
-- Name: selection_source_baskets selection_source_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_source_baskets
    ADD CONSTRAINT selection_source_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3403 (class 2606 OID 246356)
-- Name: selections selections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selections
    ADD CONSTRAINT selections_pkey PRIMARY KEY (id);


--
-- TOC entry 3407 (class 2606 OID 246358)
-- Name: sgr_giornalieri sgr_giornalieri_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_giornalieri
    ADD CONSTRAINT sgr_giornalieri_pkey PRIMARY KEY (id);


--
-- TOC entry 3423 (class 2606 OID 344084)
-- Name: sgr_monthly sgr_monthly_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_monthly
    ADD CONSTRAINT sgr_monthly_pkey PRIMARY KEY (id);


--
-- TOC entry 3405 (class 2606 OID 246360)
-- Name: sgr sgr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr
    ADD CONSTRAINT sgr_pkey PRIMARY KEY (id);


--
-- TOC entry 3409 (class 2606 OID 246362)
-- Name: sizes sizes_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_code_unique UNIQUE (code);


--
-- TOC entry 3411 (class 2606 OID 246364)
-- Name: sizes sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_pkey PRIMARY KEY (id);


--
-- TOC entry 3413 (class 2606 OID 246366)
-- Name: target_size_annotations target_size_annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_size_annotations
    ADD CONSTRAINT target_size_annotations_pkey PRIMARY KEY (id);


--
-- TOC entry 3424 (class 1259 OID 368678)
-- Name: idx_lot_inventory_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_inventory_transactions_date ON public.lot_inventory_transactions USING btree (date);


--
-- TOC entry 3425 (class 1259 OID 368677)
-- Name: idx_lot_inventory_transactions_lot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_inventory_transactions_lot_id ON public.lot_inventory_transactions USING btree (lot_id);


--
-- TOC entry 3428 (class 1259 OID 368680)
-- Name: idx_lot_mortality_records_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_mortality_records_date ON public.lot_mortality_records USING btree (calculation_date);


--
-- TOC entry 3429 (class 1259 OID 368679)
-- Name: idx_lot_mortality_records_lot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_mortality_records_lot_id ON public.lot_mortality_records USING btree (lot_id);


--
-- TOC entry 3432 (class 2606 OID 368651)
-- Name: lot_inventory_transactions lot_inventory_transactions_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions
    ADD CONSTRAINT lot_inventory_transactions_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- TOC entry 3433 (class 2606 OID 368656)
-- Name: lot_inventory_transactions lot_inventory_transactions_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions
    ADD CONSTRAINT lot_inventory_transactions_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operations(id) ON DELETE SET NULL;


--
-- TOC entry 3434 (class 2606 OID 368672)
-- Name: lot_mortality_records lot_mortality_records_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mortality_records
    ADD CONSTRAINT lot_mortality_records_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


-- Completed on 2025-04-27 08:06:26 UTC

--
-- PostgreSQL database dump complete
--

