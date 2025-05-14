--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8
-- Dumped by pg_dump version 16.5

-- Started on 2025-05-14 07:29:38 UTC

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

ALTER TABLE IF EXISTS ONLY public.sustainability_goals DROP CONSTRAINT IF EXISTS sustainability_goals_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.operation_impacts DROP CONSTRAINT IF EXISTS operation_impacts_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_mortality_records DROP CONSTRAINT IF EXISTS lot_mortality_records_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_inventory_transactions DROP CONSTRAINT IF EXISTS lot_inventory_transactions_operation_id_fkey;
ALTER TABLE IF EXISTS ONLY public.lot_inventory_transactions DROP CONSTRAINT IF EXISTS lot_inventory_transactions_lot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.impact_factors DROP CONSTRAINT IF EXISTS impact_factors_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.flupsy_impacts DROP CONSTRAINT IF EXISTS flupsy_impacts_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sales_reports DROP CONSTRAINT IF EXISTS fk_sales_reports_top_size_id;
ALTER TABLE IF EXISTS ONLY public.sales_reports DROP CONSTRAINT IF EXISTS fk_sales_reports_top_lot_id;
ALTER TABLE IF EXISTS ONLY public.sales_reports DROP CONSTRAINT IF EXISTS fk_sales_reports_top_client_id;
ALTER TABLE IF EXISTS ONLY public.sales_reports DROP CONSTRAINT IF EXISTS fk_sales_reports_report_id;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS fk_reports_generated_by;
ALTER TABLE IF EXISTS ONLY public.report_templates DROP CONSTRAINT IF EXISTS fk_report_templates_created_by;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS fk_payments_order_id;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS fk_orders_client_id;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS fk_order_items_size_id;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS fk_order_items_order_id;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS fk_order_items_lot_id;
ALTER TABLE IF EXISTS ONLY public.delivery_reports DROP CONSTRAINT IF EXISTS fk_delivery_reports_report_id;
ALTER TABLE IF EXISTS ONLY public.delivery_reports DROP CONSTRAINT IF EXISTS fk_delivery_reports_order_id;
ALTER TABLE IF EXISTS ONLY public.delivery_reports DROP CONSTRAINT IF EXISTS fk_delivery_reports_client_id;
ALTER TABLE IF EXISTS ONLY public.cycle_impacts DROP CONSTRAINT IF EXISTS cycle_impacts_category_id_fkey;
DROP INDEX IF EXISTS public.idx_sales_reports_report_id;
DROP INDEX IF EXISTS public.idx_reports_type;
DROP INDEX IF EXISTS public.idx_report_templates_type;
DROP INDEX IF EXISTS public.idx_payments_order_id;
DROP INDEX IF EXISTS public.idx_orders_client_id;
DROP INDEX IF EXISTS public.idx_order_items_order_id;
DROP INDEX IF EXISTS public.idx_operation_impact_defaults_operation_type;
DROP INDEX IF EXISTS public.idx_lots_external_id;
DROP INDEX IF EXISTS public.idx_lots_active;
DROP INDEX IF EXISTS public.idx_lot_mortality_records_lot_id;
DROP INDEX IF EXISTS public.idx_lot_mortality_records_date;
DROP INDEX IF EXISTS public.idx_lot_inventory_transactions_lot_id;
DROP INDEX IF EXISTS public.idx_lot_inventory_transactions_date;
DROP INDEX IF EXISTS public.idx_documents_entity;
DROP INDEX IF EXISTS public.idx_delivery_reports_report_id;
DROP INDEX IF EXISTS public.idx_delivery_reports_order_id;
DROP INDEX IF EXISTS public.idx_delivery_reports_client_id;
DROP INDEX IF EXISTS public.idx_baskets_external_id;
DROP INDEX IF EXISTS public.idx_baskets_active;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.target_size_annotations DROP CONSTRAINT IF EXISTS target_size_annotations_pkey;
ALTER TABLE IF EXISTS ONLY public.sustainability_reports DROP CONSTRAINT IF EXISTS sustainability_reports_pkey;
ALTER TABLE IF EXISTS ONLY public.sustainability_goals DROP CONSTRAINT IF EXISTS sustainability_goals_pkey;
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
ALTER TABLE IF EXISTS ONLY public.sales_reports DROP CONSTRAINT IF EXISTS sales_reports_pkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_pkey;
ALTER TABLE IF EXISTS ONLY public.report_templates DROP CONSTRAINT IF EXISTS report_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.operations DROP CONSTRAINT IF EXISTS operations_pkey;
ALTER TABLE IF EXISTS ONLY public.operation_impacts DROP CONSTRAINT IF EXISTS operation_impacts_pkey;
ALTER TABLE IF EXISTS ONLY public.operation_impact_defaults DROP CONSTRAINT IF EXISTS operation_impact_defaults_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.notification_settings DROP CONSTRAINT IF EXISTS notification_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.mortality_rates DROP CONSTRAINT IF EXISTS mortality_rates_pkey;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS lots_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_mortality_records DROP CONSTRAINT IF EXISTS lot_mortality_records_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_inventory_transactions DROP CONSTRAINT IF EXISTS lot_inventory_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.impact_factors DROP CONSTRAINT IF EXISTS impact_factors_pkey;
ALTER TABLE IF EXISTS ONLY public.impact_categories DROP CONSTRAINT IF EXISTS impact_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.flupsys DROP CONSTRAINT IF EXISTS flupsys_pkey;
ALTER TABLE IF EXISTS ONLY public.flupsy_impacts DROP CONSTRAINT IF EXISTS flupsy_impacts_pkey;
ALTER TABLE IF EXISTS ONLY public.email_config DROP CONSTRAINT IF EXISTS email_config_pkey;
ALTER TABLE IF EXISTS ONLY public.email_config DROP CONSTRAINT IF EXISTS email_config_key_key;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_pkey;
ALTER TABLE IF EXISTS ONLY public.delivery_reports DROP CONSTRAINT IF EXISTS delivery_reports_pkey;
ALTER TABLE IF EXISTS ONLY public.cycles DROP CONSTRAINT IF EXISTS cycles_pkey;
ALTER TABLE IF EXISTS ONLY public.cycle_impacts DROP CONSTRAINT IF EXISTS cycle_impacts_pkey;
ALTER TABLE IF EXISTS ONLY public.clients DROP CONSTRAINT IF EXISTS clients_pkey;
ALTER TABLE IF EXISTS ONLY public.baskets DROP CONSTRAINT IF EXISTS baskets_pkey;
ALTER TABLE IF EXISTS ONLY public.basket_position_history DROP CONSTRAINT IF EXISTS basket_position_history_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.target_size_annotations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sustainability_reports ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sustainability_goals ALTER COLUMN id DROP DEFAULT;
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
ALTER TABLE IF EXISTS public.sales_reports ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.reports ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.report_templates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.payments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.orders ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.order_items ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.operations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.operation_impacts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.operation_impact_defaults ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notifications ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.notification_settings ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.mortality_rates ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lot_mortality_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lot_inventory_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.impact_factors ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.impact_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.flupsys ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.flupsy_impacts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.email_config ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.delivery_reports ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.cycles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.cycle_impacts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.clients ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.baskets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.basket_position_history ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.target_size_annotations_id_seq;
DROP TABLE IF EXISTS public.target_size_annotations;
DROP SEQUENCE IF EXISTS public.sustainability_reports_id_seq;
DROP TABLE IF EXISTS public.sustainability_reports;
DROP SEQUENCE IF EXISTS public.sustainability_goals_id_seq;
DROP TABLE IF EXISTS public.sustainability_goals;
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
DROP SEQUENCE IF EXISTS public.sales_reports_id_seq;
DROP TABLE IF EXISTS public.sales_reports;
DROP SEQUENCE IF EXISTS public.reports_id_seq;
DROP TABLE IF EXISTS public.reports;
DROP SEQUENCE IF EXISTS public.report_templates_id_seq;
DROP TABLE IF EXISTS public.report_templates;
DROP SEQUENCE IF EXISTS public.payments_id_seq;
DROP TABLE IF EXISTS public.payments;
DROP SEQUENCE IF EXISTS public.orders_id_seq;
DROP TABLE IF EXISTS public.orders;
DROP SEQUENCE IF EXISTS public.order_items_id_seq;
DROP TABLE IF EXISTS public.order_items;
DROP SEQUENCE IF EXISTS public.operations_id_seq;
DROP TABLE IF EXISTS public.operations;
DROP SEQUENCE IF EXISTS public.operation_impacts_id_seq;
DROP TABLE IF EXISTS public.operation_impacts;
DROP SEQUENCE IF EXISTS public.operation_impact_defaults_id_seq;
DROP TABLE IF EXISTS public.operation_impact_defaults;
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
DROP SEQUENCE IF EXISTS public.impact_factors_id_seq;
DROP TABLE IF EXISTS public.impact_factors;
DROP SEQUENCE IF EXISTS public.impact_categories_id_seq;
DROP TABLE IF EXISTS public.impact_categories;
DROP SEQUENCE IF EXISTS public.flupsys_id_seq;
DROP TABLE IF EXISTS public.flupsys;
DROP SEQUENCE IF EXISTS public.flupsy_impacts_id_seq;
DROP TABLE IF EXISTS public.flupsy_impacts;
DROP SEQUENCE IF EXISTS public.email_config_id_seq;
DROP TABLE IF EXISTS public.email_config;
DROP SEQUENCE IF EXISTS public.documents_id_seq;
DROP TABLE IF EXISTS public.documents;
DROP SEQUENCE IF EXISTS public.delivery_reports_id_seq;
DROP TABLE IF EXISTS public.delivery_reports;
DROP SEQUENCE IF EXISTS public.cycles_id_seq;
DROP TABLE IF EXISTS public.cycles;
DROP SEQUENCE IF EXISTS public.cycle_impacts_id_seq;
DROP TABLE IF EXISTS public.cycle_impacts;
DROP SEQUENCE IF EXISTS public.clients_id_seq;
DROP TABLE IF EXISTS public.clients;
DROP SEQUENCE IF EXISTS public.baskets_id_seq;
DROP TABLE IF EXISTS public.baskets;
DROP SEQUENCE IF EXISTS public.basket_position_history_id_seq;
DROP TABLE IF EXISTS public.basket_position_history;
DROP TYPE IF EXISTS public.operation_type;
DROP TYPE IF EXISTS public.goal_status;
DROP SCHEMA IF EXISTS public;
--
-- TOC entry 7 (class 2615 OID 246165)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- TOC entry 1012 (class 1247 OID 385025)
-- Name: goal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.goal_status AS ENUM (
    'planned',
    'in-progress',
    'completed',
    'cancelled'
);


--
-- TOC entry 1036 (class 1247 OID 393217)
-- Name: operation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.operation_type AS ENUM (
    'prima-attivazione',
    'pulizia',
    'vagliatura',
    'trattamento',
    'misura',
    'vendita',
    'selezione-vendita',
    'cessazione',
    'peso',
    'selezione-origine',
    'trasporto-corto',
    'trasporto-medio',
    'trasporto-lungo',
    'custom'
);


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
-- TOC entry 3904 (class 0 OID 0)
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
    cycle_code text,
    active boolean DEFAULT true NOT NULL,
    external_id text
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
-- TOC entry 3905 (class 0 OID 0)
-- Dependencies: 220
-- Name: baskets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.baskets_id_seq OWNED BY public.baskets.id;


--
-- TOC entry 290 (class 1259 OID 442369)
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    name text NOT NULL,
    tax_id text,
    email text,
    phone text,
    address text,
    city text,
    province text,
    zip_code text,
    country text DEFAULT 'Italia'::text,
    contact_person text,
    client_type text DEFAULT 'business'::text NOT NULL,
    notes text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone
);


--
-- TOC entry 289 (class 1259 OID 442368)
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3906 (class 0 OID 0)
-- Dependencies: 289
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- TOC entry 280 (class 1259 OID 385089)
-- Name: cycle_impacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cycle_impacts (
    id integer NOT NULL,
    cycle_id integer NOT NULL,
    category_id integer NOT NULL,
    impact_value numeric(10,4) NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone
);


--
-- TOC entry 279 (class 1259 OID 385088)
-- Name: cycle_impacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cycle_impacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3907 (class 0 OID 0)
-- Dependencies: 279
-- Name: cycle_impacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cycle_impacts_id_seq OWNED BY public.cycle_impacts.id;


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
-- TOC entry 3908 (class 0 OID 0)
-- Dependencies: 222
-- Name: cycles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cycles_id_seq OWNED BY public.cycles.id;


--
-- TOC entry 302 (class 1259 OID 442476)
-- Name: delivery_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_reports (
    id integer NOT NULL,
    report_id integer NOT NULL,
    order_id integer NOT NULL,
    client_id integer NOT NULL,
    delivery_date date NOT NULL,
    total_items integer NOT NULL,
    total_weight numeric(10,3),
    transport_info text,
    notes text,
    signed_by text,
    signature_image_path text,
    gps_coordinates text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 301 (class 1259 OID 442475)
-- Name: delivery_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3909 (class 0 OID 0)
-- Dependencies: 301
-- Name: delivery_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_reports_id_seq OWNED BY public.delivery_reports.id;


--
-- TOC entry 298 (class 1259 OID 442424)
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id integer NOT NULL,
    file_name text NOT NULL,
    original_name text NOT NULL,
    mime_type text NOT NULL,
    size integer NOT NULL,
    path text NOT NULL,
    entity_type text NOT NULL,
    entity_id integer NOT NULL,
    document_type text NOT NULL,
    upload_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone
);


--
-- TOC entry 297 (class 1259 OID 442423)
-- Name: documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3910 (class 0 OID 0)
-- Dependencies: 297
-- Name: documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.documents_id_seq OWNED BY public.documents.id;


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
-- TOC entry 3911 (class 0 OID 0)
-- Dependencies: 259
-- Name: email_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_config_id_seq OWNED BY public.email_config.id;


--
-- TOC entry 278 (class 1259 OID 385074)
-- Name: flupsy_impacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.flupsy_impacts (
    id integer NOT NULL,
    flupsy_id integer NOT NULL,
    category_id integer NOT NULL,
    impact_value numeric(10,4) NOT NULL,
    time_period character varying(20) NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone
);


--
-- TOC entry 277 (class 1259 OID 385073)
-- Name: flupsy_impacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.flupsy_impacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3912 (class 0 OID 0)
-- Dependencies: 277
-- Name: flupsy_impacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.flupsy_impacts_id_seq OWNED BY public.flupsy_impacts.id;


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
-- TOC entry 3913 (class 0 OID 0)
-- Dependencies: 224
-- Name: flupsys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.flupsys_id_seq OWNED BY public.flupsys.id;


--
-- TOC entry 272 (class 1259 OID 385034)
-- Name: impact_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impact_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    icon character varying(50),
    color character varying(20),
    unit character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone
);


--
-- TOC entry 271 (class 1259 OID 385033)
-- Name: impact_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.impact_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3914 (class 0 OID 0)
-- Dependencies: 271
-- Name: impact_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.impact_categories_id_seq OWNED BY public.impact_categories.id;


--
-- TOC entry 274 (class 1259 OID 385044)
-- Name: impact_factors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impact_factors (
    id integer NOT NULL,
    category_id integer NOT NULL,
    operation_type character varying(50),
    factor_value numeric(10,4) NOT NULL,
    unit character varying(20) NOT NULL,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone
);


--
-- TOC entry 273 (class 1259 OID 385043)
-- Name: impact_factors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.impact_factors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3915 (class 0 OID 0)
-- Dependencies: 273
-- Name: impact_factors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.impact_factors_id_seq OWNED BY public.impact_factors.id;


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
-- TOC entry 3916 (class 0 OID 0)
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
-- TOC entry 3917 (class 0 OID 0)
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
    state text DEFAULT 'active'::text NOT NULL,
    supplier_lot_number text,
    active boolean DEFAULT true NOT NULL,
    external_id text,
    description text,
    origin text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
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
-- TOC entry 3918 (class 0 OID 0)
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
-- TOC entry 3919 (class 0 OID 0)
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
-- TOC entry 3920 (class 0 OID 0)
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
-- TOC entry 3921 (class 0 OID 0)
-- Dependencies: 261
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- TOC entry 286 (class 1259 OID 393238)
-- Name: operation_impact_defaults; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operation_impact_defaults (
    id integer NOT NULL,
    operation_type public.operation_type NOT NULL,
    water real NOT NULL,
    carbon real NOT NULL,
    energy real NOT NULL,
    waste real NOT NULL,
    biodiversity real NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    custom_name text
);


--
-- TOC entry 285 (class 1259 OID 393237)
-- Name: operation_impact_defaults_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operation_impact_defaults_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3922 (class 0 OID 0)
-- Dependencies: 285
-- Name: operation_impact_defaults_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operation_impact_defaults_id_seq OWNED BY public.operation_impact_defaults.id;


--
-- TOC entry 276 (class 1259 OID 385059)
-- Name: operation_impacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operation_impacts (
    id integer NOT NULL,
    operation_id integer NOT NULL,
    category_id integer NOT NULL,
    impact_value numeric(10,4) NOT NULL,
    baseline_value numeric(10,4),
    improvement_percentage numeric(5,2),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone
);


--
-- TOC entry 275 (class 1259 OID 385058)
-- Name: operation_impacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operation_impacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3923 (class 0 OID 0)
-- Dependencies: 275
-- Name: operation_impacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operation_impacts_id_seq OWNED BY public.operation_impacts.id;


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
    mortality_rate real,
    metadata text
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
-- TOC entry 3924 (class 0 OID 0)
-- Dependencies: 230
-- Name: operations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operations_id_seq OWNED BY public.operations.id;


--
-- TOC entry 294 (class 1259 OID 442402)
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    description text NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit text DEFAULT 'kg'::text NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    vat_rate numeric(5,2) DEFAULT 22 NOT NULL,
    lot_id integer,
    size_id integer,
    selection_id integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone
);


--
-- TOC entry 293 (class 1259 OID 442401)
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3925 (class 0 OID 0)
-- Dependencies: 293
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- TOC entry 292 (class 1259 OID 442382)
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_number text NOT NULL,
    client_id integer NOT NULL,
    order_date date NOT NULL,
    requested_delivery_date date,
    actual_delivery_date date,
    status text DEFAULT 'draft'::text NOT NULL,
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    vat_amount numeric(10,2) DEFAULT 0 NOT NULL,
    vat_rate numeric(5,2) DEFAULT 22 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    discount_rate numeric(5,2) DEFAULT 0,
    shipping_amount numeric(10,2) DEFAULT 0,
    payment_type text,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    payment_due_date date,
    invoice_number text,
    invoice_date date,
    notes text,
    internal_notes text,
    shipping_address text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone
);


--
-- TOC entry 291 (class 1259 OID 442381)
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3926 (class 0 OID 0)
-- Dependencies: 291
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- TOC entry 296 (class 1259 OID 442414)
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    order_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_date date NOT NULL,
    payment_type text NOT NULL,
    reference text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone
);


--
-- TOC entry 295 (class 1259 OID 442413)
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3927 (class 0 OID 0)
-- Dependencies: 295
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- TOC entry 306 (class 1259 OID 442496)
-- Name: report_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_templates (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    type text NOT NULL,
    format text DEFAULT 'pdf'::text NOT NULL,
    template text NOT NULL,
    parameters jsonb,
    is_default boolean DEFAULT false,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone,
    active boolean DEFAULT true NOT NULL
);


--
-- TOC entry 305 (class 1259 OID 442495)
-- Name: report_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.report_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3928 (class 0 OID 0)
-- Dependencies: 305
-- Name: report_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.report_templates_id_seq OWNED BY public.report_templates.id;


--
-- TOC entry 300 (class 1259 OID 442464)
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    title text NOT NULL,
    description text,
    type text NOT NULL,
    format text DEFAULT 'pdf'::text NOT NULL,
    parameters jsonb,
    file_path text,
    file_size integer,
    generated_by integer,
    start_date date,
    end_date date,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp with time zone,
    error text,
    metadata jsonb
);


--
-- TOC entry 299 (class 1259 OID 442463)
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3929 (class 0 OID 0)
-- Dependencies: 299
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- TOC entry 304 (class 1259 OID 442486)
-- Name: sales_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_reports (
    id integer NOT NULL,
    report_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_sales numeric(12,2) NOT NULL,
    total_vat numeric(12,2),
    total_orders integer NOT NULL,
    completed_orders integer NOT NULL,
    cancelled_orders integer NOT NULL,
    top_size_id integer,
    top_lot_id integer,
    top_client_id integer,
    total_weight numeric(12,3),
    avg_order_value numeric(10,2),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 303 (class 1259 OID 442485)
-- Name: sales_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3930 (class 0 OID 0)
-- Dependencies: 303
-- Name: sales_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_reports_id_seq OWNED BY public.sales_reports.id;


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
-- TOC entry 3931 (class 0 OID 0)
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
-- TOC entry 3932 (class 0 OID 0)
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
-- TOC entry 3933 (class 0 OID 0)
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
-- TOC entry 3934 (class 0 OID 0)
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
-- TOC entry 3935 (class 0 OID 0)
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
-- TOC entry 3936 (class 0 OID 0)
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
-- TOC entry 3937 (class 0 OID 0)
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
-- TOC entry 3938 (class 0 OID 0)
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
-- TOC entry 3939 (class 0 OID 0)
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
-- TOC entry 3940 (class 0 OID 0)
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
-- TOC entry 3941 (class 0 OID 0)
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
-- TOC entry 3942 (class 0 OID 0)
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
-- TOC entry 3943 (class 0 OID 0)
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
-- TOC entry 3944 (class 0 OID 0)
-- Dependencies: 256
-- Name: sizes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sizes_id_seq OWNED BY public.sizes.id;


--
-- TOC entry 282 (class 1259 OID 385104)
-- Name: sustainability_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sustainability_goals (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    flupsy_id integer,
    category_id integer,
    target_value numeric(10,4),
    current_value numeric(10,4),
    unit character varying(20),
    status public.goal_status DEFAULT 'planned'::public.goal_status NOT NULL,
    target_date timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone
);


--
-- TOC entry 281 (class 1259 OID 385103)
-- Name: sustainability_goals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sustainability_goals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3945 (class 0 OID 0)
-- Dependencies: 281
-- Name: sustainability_goals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sustainability_goals_id_seq OWNED BY public.sustainability_goals.id;


--
-- TOC entry 284 (class 1259 OID 385120)
-- Name: sustainability_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sustainability_reports (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    report_period character varying(50) NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone NOT NULL,
    summary text,
    highlights jsonb,
    metrics jsonb,
    flupsy_ids integer[],
    file_path character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone
);


--
-- TOC entry 283 (class 1259 OID 385119)
-- Name: sustainability_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sustainability_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3946 (class 0 OID 0)
-- Dependencies: 283
-- Name: sustainability_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sustainability_reports_id_seq OWNED BY public.sustainability_reports.id;


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
-- TOC entry 3947 (class 0 OID 0)
-- Dependencies: 258
-- Name: target_size_annotations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.target_size_annotations_id_seq OWNED BY public.target_size_annotations.id;


--
-- TOC entry 288 (class 1259 OID 417793)
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    language text DEFAULT 'it'::text NOT NULL
);


--
-- TOC entry 287 (class 1259 OID 417792)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 3948 (class 0 OID 0)
-- Dependencies: 287
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3406 (class 2604 OID 246302)
-- Name: basket_position_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.basket_position_history ALTER COLUMN id SET DEFAULT nextval('public.basket_position_history_id_seq'::regclass);


--
-- TOC entry 3407 (class 2604 OID 246303)
-- Name: baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baskets ALTER COLUMN id SET DEFAULT nextval('public.baskets_id_seq'::regclass);


--
-- TOC entry 3490 (class 2604 OID 442372)
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- TOC entry 3477 (class 2604 OID 385092)
-- Name: cycle_impacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycle_impacts ALTER COLUMN id SET DEFAULT nextval('public.cycle_impacts_id_seq'::regclass);


--
-- TOC entry 3410 (class 2604 OID 246304)
-- Name: cycles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycles ALTER COLUMN id SET DEFAULT nextval('public.cycles_id_seq'::regclass);


--
-- TOC entry 3518 (class 2604 OID 442479)
-- Name: delivery_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reports ALTER COLUMN id SET DEFAULT nextval('public.delivery_reports_id_seq'::regclass);


--
-- TOC entry 3511 (class 2604 OID 442427)
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- TOC entry 3453 (class 2604 OID 327684)
-- Name: email_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_config ALTER COLUMN id SET DEFAULT nextval('public.email_config_id_seq'::regclass);


--
-- TOC entry 3475 (class 2604 OID 385077)
-- Name: flupsy_impacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsy_impacts ALTER COLUMN id SET DEFAULT nextval('public.flupsy_impacts_id_seq'::regclass);


--
-- TOC entry 3412 (class 2604 OID 246305)
-- Name: flupsys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsys ALTER COLUMN id SET DEFAULT nextval('public.flupsys_id_seq'::regclass);


--
-- TOC entry 3469 (class 2604 OID 385037)
-- Name: impact_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_categories ALTER COLUMN id SET DEFAULT nextval('public.impact_categories_id_seq'::regclass);


--
-- TOC entry 3471 (class 2604 OID 385047)
-- Name: impact_factors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_factors ALTER COLUMN id SET DEFAULT nextval('public.impact_factors_id_seq'::regclass);


--
-- TOC entry 3463 (class 2604 OID 368644)
-- Name: lot_inventory_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.lot_inventory_transactions_id_seq'::regclass);


--
-- TOC entry 3466 (class 2604 OID 368665)
-- Name: lot_mortality_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mortality_records ALTER COLUMN id SET DEFAULT nextval('public.lot_mortality_records_id_seq'::regclass);


--
-- TOC entry 3415 (class 2604 OID 246306)
-- Name: lots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots ALTER COLUMN id SET DEFAULT nextval('public.lots_id_seq'::regclass);


--
-- TOC entry 3419 (class 2604 OID 246307)
-- Name: mortality_rates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mortality_rates ALTER COLUMN id SET DEFAULT nextval('public.mortality_rates_id_seq'::regclass);


--
-- TOC entry 3458 (class 2604 OID 344068)
-- Name: notification_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_settings_id_seq'::regclass);


--
-- TOC entry 3455 (class 2604 OID 335876)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 3484 (class 2604 OID 393241)
-- Name: operation_impact_defaults id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_impact_defaults ALTER COLUMN id SET DEFAULT nextval('public.operation_impact_defaults_id_seq'::regclass);


--
-- TOC entry 3473 (class 2604 OID 385062)
-- Name: operation_impacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_impacts ALTER COLUMN id SET DEFAULT nextval('public.operation_impacts_id_seq'::regclass);


--
-- TOC entry 3420 (class 2604 OID 246308)
-- Name: operations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations ALTER COLUMN id SET DEFAULT nextval('public.operations_id_seq'::regclass);


--
-- TOC entry 3505 (class 2604 OID 442405)
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- TOC entry 3495 (class 2604 OID 442385)
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- TOC entry 3509 (class 2604 OID 442417)
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- TOC entry 3522 (class 2604 OID 442499)
-- Name: report_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates ALTER COLUMN id SET DEFAULT nextval('public.report_templates_id_seq'::regclass);


--
-- TOC entry 3514 (class 2604 OID 442467)
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- TOC entry 3520 (class 2604 OID 442489)
-- Name: sales_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports ALTER COLUMN id SET DEFAULT nextval('public.sales_reports_id_seq'::regclass);


--
-- TOC entry 3421 (class 2604 OID 246309)
-- Name: screening_basket_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_basket_history ALTER COLUMN id SET DEFAULT nextval('public.screening_basket_history_id_seq'::regclass);


--
-- TOC entry 3423 (class 2604 OID 246310)
-- Name: screening_destination_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_destination_baskets ALTER COLUMN id SET DEFAULT nextval('public.screening_destination_baskets_id_seq'::regclass);


--
-- TOC entry 3426 (class 2604 OID 246311)
-- Name: screening_lot_references id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_lot_references ALTER COLUMN id SET DEFAULT nextval('public.screening_lot_references_id_seq'::regclass);


--
-- TOC entry 3428 (class 2604 OID 246312)
-- Name: screening_operations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_operations ALTER COLUMN id SET DEFAULT nextval('public.screening_operations_id_seq'::regclass);


--
-- TOC entry 3431 (class 2604 OID 246313)
-- Name: screening_source_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_source_baskets ALTER COLUMN id SET DEFAULT nextval('public.screening_source_baskets_id_seq'::regclass);


--
-- TOC entry 3435 (class 2604 OID 246314)
-- Name: selection_basket_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_basket_history ALTER COLUMN id SET DEFAULT nextval('public.selection_basket_history_id_seq'::regclass);


--
-- TOC entry 3437 (class 2604 OID 246315)
-- Name: selection_destination_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_destination_baskets ALTER COLUMN id SET DEFAULT nextval('public.selection_destination_baskets_id_seq'::regclass);


--
-- TOC entry 3439 (class 2604 OID 246316)
-- Name: selection_lot_references id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_lot_references ALTER COLUMN id SET DEFAULT nextval('public.selection_lot_references_id_seq'::regclass);


--
-- TOC entry 3441 (class 2604 OID 246317)
-- Name: selection_source_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_source_baskets ALTER COLUMN id SET DEFAULT nextval('public.selection_source_baskets_id_seq'::regclass);


--
-- TOC entry 3443 (class 2604 OID 246318)
-- Name: selections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selections ALTER COLUMN id SET DEFAULT nextval('public.selections_id_seq'::regclass);


--
-- TOC entry 3446 (class 2604 OID 246319)
-- Name: sgr id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr ALTER COLUMN id SET DEFAULT nextval('public.sgr_id_seq'::regclass);


--
-- TOC entry 3448 (class 2604 OID 246320)
-- Name: sgr_giornalieri id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_giornalieri ALTER COLUMN id SET DEFAULT nextval('public.sgr_giornalieri_id_seq'::regclass);


--
-- TOC entry 3461 (class 2604 OID 344079)
-- Name: sgr_monthly id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_monthly ALTER COLUMN id SET DEFAULT nextval('public.sgr_monthly_id_seq'::regclass);


--
-- TOC entry 3449 (class 2604 OID 246321)
-- Name: sizes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes ALTER COLUMN id SET DEFAULT nextval('public.sizes_id_seq'::regclass);


--
-- TOC entry 3479 (class 2604 OID 385107)
-- Name: sustainability_goals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sustainability_goals ALTER COLUMN id SET DEFAULT nextval('public.sustainability_goals_id_seq'::regclass);


--
-- TOC entry 3482 (class 2604 OID 385123)
-- Name: sustainability_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sustainability_reports ALTER COLUMN id SET DEFAULT nextval('public.sustainability_reports_id_seq'::regclass);


--
-- TOC entry 3450 (class 2604 OID 246322)
-- Name: target_size_annotations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_size_annotations ALTER COLUMN id SET DEFAULT nextval('public.target_size_annotations_id_seq'::regclass);


--
-- TOC entry 3486 (class 2604 OID 417796)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3809 (class 0 OID 246166)
-- Dependencies: 217
-- Data for Name: basket_position_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.basket_position_history (id, basket_id, flupsy_id, "row", "position", start_date, end_date, operation_id) FROM stdin;
38	21	608	DX	5	2025-04-27	\N	\N
157	61	13	DX	1	2025-05-09	2025-05-09	\N
161	90	13	SX	1	2025-05-09	2025-05-09	\N
163	89	13	SX	1	2025-05-09	\N	\N
159	61	13	DX	2	2025-05-09	2025-05-09	\N
205	198	570	DX	5	2025-05-14	\N	\N
128	78	618	SX	5	2025-05-09	2025-05-11	\N
50	33	608	DX	2	2025-04-28	\N	\N
51	34	608	DX	4	2025-04-28	\N	\N
53	36	608	DX	8	2025-04-28	\N	\N
59	42	608	SX	6	2025-04-28	\N	\N
60	43	608	SX	8	2025-04-28	\N	\N
61	44	608	SX	7	2025-04-28	\N	\N
108	67	618	DX	5	2025-05-09	2025-05-11	\N
69	52	737	DX	8	2025-04-29	\N	\N
165	67	618	SX	5	2025-05-11	2025-05-11	\N
106	66	618	DX	4	2025-05-09	2025-05-11	\N
73	56	737	SX	3	2025-04-29	2025-05-11	\N
170	66	618	DX	5	2025-05-12	2025-05-12	\N
168	67	618	DX	4	2025-05-11	2025-05-12	\N
173	66	618	DX	4	2025-05-12	\N	\N
118	64	618	DX	2	2025-05-09	2025-05-12	\N
117	68	618	DX	1	2025-05-09	2025-05-13	\N
178	152	113	DX	5	2025-05-13	\N	\N
180	154	113	DX	7	2025-05-13	\N	\N
182	156	113	DX	9	2025-05-13	\N	\N
188	162	113	SX	5	2025-05-13	\N	\N
190	164	113	SX	7	2025-05-13	\N	\N
84	59	737	DX	1	2025-05-05	2025-05-05	\N
85	59	1	SX	1	2025-05-05	2025-05-05	\N
86	59	2	DX	1	2025-05-05	2025-05-05	\N
87	59	113	DX	3	2025-05-05	2025-05-05	\N
191	165	113	SX	9	2025-05-13	2025-05-13	\N
174	148	113	DX	1	2025-05-13	2025-05-13	\N
176	150	113	DX	3	2025-05-13	2025-05-13	\N
186	160	113	SX	3	2025-05-13	2025-05-13	\N
63	46	737	DX	2	2025-04-29	2025-05-13	\N
64	47	737	DX	3	2025-04-29	2025-05-13	\N
65	48	737	DX	4	2025-04-29	2025-05-13	\N
68	51	737	DX	7	2025-04-29	2025-05-13	\N
67	50	737	DX	6	2025-04-29	2025-05-13	\N
74	57	737	SX	4	2025-04-29	2025-05-13	\N
66	49	737	DX	5	2025-04-29	2025-05-13	\N
72	55	737	SX	1	2025-04-29	2025-05-13	\N
75	58	737	SX	5	2025-04-29	2025-05-13	\N
39	22	608	DX	6	2025-04-27	2025-05-13	\N
52	35	608	DX	7	2025-04-28	2025-05-13	\N
54	37	608	SX	1	2025-04-28	2025-05-13	\N
55	38	608	SX	2	2025-04-28	2025-05-13	\N
56	39	608	SX	3	2025-04-28	2025-05-13	\N
57	40	608	SX	4	2025-04-28	2025-05-13	\N
58	41	608	SX	5	2025-04-28	2025-05-13	\N
92	60	737	DX	1	2025-05-05	2025-05-13	\N
195	188	570	DX	1	2025-05-14	\N	\N
197	190	570	DX	3	2025-05-14	\N	\N
201	194	570	SX	2	2025-05-14	\N	\N
203	196	570	SX	4	2025-05-14	\N	\N
36	19	608	DX	3	2025-04-27	\N	\N
88	59	570	DX	1	2025-05-05	2025-05-05	\N
89	59	570	DX	2	2025-05-05	2025-05-05	\N
90	59	608	DX	1	2025-05-05	\N	\N
98	64	618	DX	1	2025-05-09	2025-05-09	\N
102	68	618	DX	6	2025-05-09	2025-05-09	\N
101	67	618	DX	4	2025-05-09	2025-05-09	\N
105	67	618	DX	5	2025-05-09	2025-05-09	\N
100	66	618	DX	3	2025-05-09	2025-05-09	\N
107	67	618	DX	3	2025-05-09	2025-05-09	\N
99	65	618	DX	2	2025-05-09	2025-05-09	\N
109	65	618	DX	3	2025-05-09	2025-05-09	\N
110	65	618	DX	3	2025-05-09	2025-05-09	\N
103	68	618	DX	1	2025-05-09	2025-05-09	\N
112	65	618	DX	1	2025-05-09	2025-05-09	\N
113	65	618	DX	3	2025-05-09	2025-05-09	\N
114	65	618	DX	1	2025-05-09	2025-05-09	\N
115	65	618	DX	1	2025-05-09	2025-05-09	\N
116	65	618	DX	3	2025-05-09	\N	\N
111	68	618	DX	2	2025-05-09	2025-05-09	\N
104	64	618	DX	6	2025-05-09	2025-05-09	\N
119	69	618	DX	6	2025-05-09	\N	\N
120	70	618	DX	7	2025-05-09	\N	\N
121	71	618	DX	8	2025-05-09	\N	\N
122	72	618	DX	9	2025-05-09	\N	\N
123	73	618	DX	10	2025-05-09	\N	\N
124	74	618	SX	1	2025-05-09	\N	\N
125	75	618	SX	2	2025-05-09	\N	\N
127	77	618	SX	4	2025-05-09	\N	\N
129	79	618	SX	6	2025-05-09	\N	\N
130	80	618	SX	7	2025-05-09	\N	\N
131	81	618	SX	8	2025-05-09	\N	\N
132	82	618	SX	9	2025-05-09	\N	\N
133	83	618	SX	10	2025-05-09	\N	\N
134	84	618	SX	3	2025-05-09	\N	\N
93	61	13	DX	1	2025-05-08	2025-05-09	\N
156	61	13	DX	4	2025-05-09	2025-05-09	\N
158	89	13	DX	2	2025-05-09	2025-05-09	\N
160	89	13	DX	1	2025-05-09	2025-05-09	\N
162	90	13	DX	1	2025-05-09	\N	\N
166	78	618	DX	5	2025-05-11	2025-05-12	\N
167	66	618	SX	5	2025-05-11	2025-05-12	\N
171	78	618	SX	5	2025-05-12	\N	\N
172	67	618	DX	5	2025-05-12	\N	\N
175	149	113	DX	2	2025-05-13	\N	\N
177	151	113	DX	4	2025-05-13	\N	\N
179	153	113	DX	6	2025-05-13	\N	\N
155	61	13	DX	1	2025-05-09	2025-05-09	\N
181	155	113	DX	8	2025-05-13	\N	\N
183	157	113	DX	10	2025-05-13	\N	\N
184	158	113	SX	1	2025-05-13	\N	\N
185	159	113	SX	2	2025-05-13	\N	\N
187	161	113	SX	4	2025-05-13	\N	\N
189	163	113	SX	6	2025-05-13	\N	\N
192	165	113	SX	8	2025-05-13	\N	\N
193	166	113	SX	9	2025-05-13	\N	\N
194	167	113	SX	10	2025-05-13	\N	\N
164	61	13	DX	3	2025-05-09	2025-05-13	\N
169	56	737	SX	2	2025-05-11	2025-05-13	\N
196	189	570	DX	2	2025-05-14	\N	\N
198	191	570	DX	4	2025-05-14	\N	\N
200	193	570	SX	1	2025-05-14	\N	\N
202	195	570	SX	3	2025-05-14	\N	\N
204	197	570	SX	5	2025-05-14	\N	\N
\.


--
-- TOC entry 3811 (class 0 OID 246172)
-- Dependencies: 219
-- Data for Name: baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.baskets (id, physical_number, state, current_cycle_id, nfc_data, flupsy_id, "row", "position", cycle_code, active, external_id) FROM stdin;
84	13	available	\N	\N	618	SX	3	\N	t	\N
38	10	available	\N	\N	608	SX	2	10-608-2504	t	\N
65	3	active	50	\N	618	DX	3	3-618-2505	t	\N
69	6	active	53	\N	618	DX	6	6-618-2505	t	\N
70	7	active	54	\N	618	DX	7	7-618-2505	t	\N
21	5	active	12	\N	608	DX	5	5-608-2504	t	\N
68	1	available	\N	\N	618	DX	1	1-618-2505	t	\N
71	8	active	55	\N	618	DX	8	8-618-2505	t	\N
72	9	active	56	\N	618	DX	9	9-618-2505	t	\N
90	3	available	\N	\N	13	DX	1	\N	t	\N
50	6	active	107	\N	737	\N	\N	6-737-2505	t	\N
89	2	available	\N	\N	13	SX	1	\N	t	\N
39	11	available	\N	\N	608	SX	3	11-608-2504	t	\N
91	4	available	\N	\N	13	DX	2	\N	t	\N
92	5	available	\N	\N	13	DX	4	\N	t	\N
93	6	available	\N	\N	13	DX	5	\N	t	\N
94	7	available	\N	\N	13	DX	6	\N	t	\N
95	8	available	\N	\N	13	DX	7	\N	t	\N
96	9	available	\N	\N	13	DX	8	\N	t	\N
97	10	available	\N	\N	13	DX	9	\N	t	\N
98	11	available	\N	\N	13	DX	10	\N	t	\N
99	12	available	\N	\N	13	SX	2	\N	t	\N
100	13	available	\N	\N	13	SX	3	\N	t	\N
101	14	available	\N	\N	13	SX	4	\N	t	\N
102	15	available	\N	\N	13	SX	5	\N	t	\N
103	16	available	\N	\N	13	SX	6	\N	t	\N
104	17	available	\N	\N	13	SX	7	\N	t	\N
105	18	available	\N	\N	13	SX	8	\N	t	\N
106	19	available	\N	\N	13	SX	9	\N	t	\N
107	20	available	\N	\N	13	SX	10	\N	t	\N
57	12	available	\N	\N	737	DX	4	12-737-2504	t	\N
49	5	available	\N	\N	737	SX	5	5-737-2504	t	\N
33	2	active	20	\N	608	DX	2	2-608-2504	t	\N
34	4	active	21	\N	608	DX	4	4-608-2504	t	\N
40	12	available	\N	\N	608	DX	6	12-608-2504	t	\N
55	9	available	\N	\N	737	DX	5	9-737-2504	t	\N
36	8	active	23	\N	608	DX	8	8-608-2504	t	\N
41	13	available	\N	\N	608	SX	4	13-608-2504	t	\N
56	11	available	\N	\N	737	SX	1	11-737-2504	t	\N
60	1	active	102	\N	737	DX	1	1-737-2504	t	\N
46	2	active	103	\N	737	SX	2	2-737-2504	t	\N
47	3	active	104	\N	737	DX	2	3-737-2505	t	\N
42	14	active	29	\N	608	SX	6	14-608-2504	t	\N
78	15	available	\N	\N	618	SX	5	\N	t	\N
67	5	active	52	\N	618	DX	5	5-618-2505	t	\N
66	4	active	51	\N	618	DX	4	4-618-2505	t	\N
43	15	active	30	\N	608	SX	8	15-608-2504	t	\N
44	16	active	31	\N	608	SX	7	16-608-2504	t	\N
58	13	available	\N	\N	737	SX	6	13-737-2504	t	\N
22	6	available	\N	\N	608	DX	7	6-608-2504	t	\N
48	4	available	\N	\N	737	SX	3	4-737-2504	t	\N
35	7	available	\N	\N	608	SX	5	7-608-2504	t	\N
52	8	sold	39	\N	737	DX	8	8-737-2504	t	\N
59	1	active	45	\N	608	DX	1	1-737-2505	t	\N
51	7	available	\N	\N	737	DX	3	7-737-2504	t	\N
19	3	active	10	04:83:97:8a:7a:00:00	608	DX	3	3-608-2504	t	\N
61	1	available	\N	\N	13	DX	3	1-13-2505	t	\N
73	10	available	\N	\N	618	DX	10	\N	t	\N
129	2	active	59	\N	1	DX	2	2-1-2505	t	\N
130	3	active	60	\N	1	DX	3	3-1-2505	t	\N
131	4	active	61	\N	1	DX	4	4-1-2505	t	\N
74	11	available	\N	\N	618	SX	1	\N	t	\N
75	12	available	\N	\N	618	SX	2	\N	t	\N
77	14	available	\N	\N	618	SX	4	\N	t	\N
79	16	available	\N	\N	618	SX	6	\N	t	\N
80	17	available	\N	\N	618	SX	7	\N	t	\N
81	18	available	\N	\N	618	SX	8	\N	t	\N
82	19	available	\N	\N	618	SX	9	\N	t	\N
83	20	available	\N	\N	618	SX	10	\N	t	\N
132	5	active	62	\N	1	DX	5	5-1-2505	t	\N
133	6	active	63	\N	1	DX	6	6-1-2505	t	\N
134	7	active	64	\N	1	DX	7	7-1-2505	t	\N
136	9	active	66	\N	1	DX	9	9-1-2505	t	\N
137	10	active	67	\N	1	DX	10	10-1-2505	t	\N
64	2	active	57	\N	618	DX	2	2-618-2505	t	\N
37	9	available	\N	\N	608	SX	1	9-608-2504	t	\N
138	11	active	68	\N	1	SX	1	11-1-2505	t	\N
140	13	active	70	\N	1	SX	3	13-1-2505	t	\N
142	15	active	72	\N	1	SX	5	15-1-2505	t	\N
144	17	active	74	\N	1	SX	7	17-1-2505	t	\N
146	19	active	75	\N	1	SX	9	19-1-2505	t	\N
147	20	available	\N	\N	1	SX	10	\N	t	\N
128	1	active	58	\N	1	DX	1	1-1-2505	t	\N
135	8	active	65	\N	1	DX	8	8-1-2505	t	\N
139	12	active	69	\N	1	SX	2	12-1-2505	t	\N
141	14	active	71	\N	1	SX	4	14-1-2505	t	\N
143	16	active	73	\N	1	SX	6	16-1-2505	t	\N
145	18	active	76	\N	1	SX	8	18-1-2505	t	\N
189	2	active	109	\N	570	DX	2	2-570-2505	t	\N
190	3	active	110	\N	570	DX	3	3-570-2505	t	\N
149	2	active	78	\N	113	DX	2	2-113-2505	t	\N
191	4	active	111	\N	570	DX	4	4-570-2505	t	\N
193	6	active	113	\N	570	SX	1	6-570-2505	t	\N
151	4	active	82	\N	113	DX	4	4-113-2505	t	\N
152	5	active	83	\N	113	DX	5	5-113-2505	t	\N
153	6	active	84	\N	113	DX	6	6-113-2505	t	\N
154	7	active	85	\N	113	DX	7	7-113-2505	t	\N
155	8	active	86	\N	113	DX	8	8-113-2505	t	\N
156	9	active	87	\N	113	DX	9	9-113-2505	t	\N
157	10	active	88	\N	113	DX	10	10-113-2505	t	\N
158	11	active	89	\N	113	SX	1	11-113-2505	t	\N
159	12	active	90	\N	113	SX	2	12-113-2504	t	\N
194	7	active	115	\N	570	SX	2	7-570-2505	t	\N
161	14	active	93	\N	113	SX	4	14-113-2505	t	\N
162	15	active	94	\N	113	SX	5	15-113-2505	t	\N
163	16	active	95	\N	113	SX	6	16-113-2505	t	\N
164	17	active	96	\N	113	SX	7	17-113-2505	t	\N
165	18	active	97	\N	113	SX	8	18-113-2505	t	\N
166	19	active	98	\N	113	SX	9	19-113-2505	t	\N
167	20	active	99	\N	113	SX	10	20-113-2505	t	\N
170	3	available	\N	\N	1486	DX	3	\N	t	\N
171	4	available	\N	\N	1486	DX	4	\N	t	\N
172	5	available	\N	\N	1486	DX	5	\N	t	\N
173	6	available	\N	\N	1486	DX	6	\N	t	\N
174	7	available	\N	\N	1486	DX	7	\N	t	\N
175	8	available	\N	\N	1486	DX	8	\N	t	\N
176	9	available	\N	\N	1486	DX	9	\N	t	\N
177	10	available	\N	\N	1486	DX	10	\N	t	\N
178	11	available	\N	\N	1486	SX	1	\N	t	\N
179	12	available	\N	\N	1486	SX	2	\N	t	\N
180	13	available	\N	\N	1486	SX	3	\N	t	\N
181	14	available	\N	\N	1486	SX	4	\N	t	\N
182	15	available	\N	\N	1486	SX	5	\N	t	\N
183	16	available	\N	\N	1486	SX	6	\N	t	\N
184	17	available	\N	\N	1486	SX	7	\N	t	\N
185	18	available	\N	\N	1486	SX	8	\N	t	\N
186	19	available	\N	\N	1486	SX	9	\N	t	\N
187	20	available	\N	\N	1486	SX	10	\N	t	\N
168	1	active	100	\N	1486	DX	1	1-1486-2505	t	\N
169	2	active	101	\N	1486	DX	2	2-1486-2505	t	\N
148	1	active	80	\N	113	DX	1	1-113-2505	t	\N
150	3	active	81	\N	113	DX	3	3-113-2505	t	\N
160	13	active	92	\N	113	SX	3	13-113-2505	t	\N
188	1	active	108	\N	570	DX	1	1-570-2505	t	\N
198	5	active	116	\N	570	DX	5	5-570-2505	t	\N
195	8	active	117	\N	570	SX	3	8-570-2505	t	\N
196	9	active	118	\N	570	SX	4	9-570-2505	t	\N
197	10	active	119	\N	570	SX	5	10-570-2505	t	\N
\.


--
-- TOC entry 3882 (class 0 OID 442369)
-- Dependencies: 290
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, name, tax_id, email, phone, address, city, province, zip_code, country, contact_person, client_type, notes, active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3872 (class 0 OID 385089)
-- Dependencies: 280
-- Data for Name: cycle_impacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cycle_impacts (id, cycle_id, category_id, impact_value, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3813 (class 0 OID 246179)
-- Dependencies: 221
-- Data for Name: cycles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cycles (id, basket_id, start_date, end_date, state) FROM stdin;
20	33	2025-04-28	\N	active
21	34	2025-04-28	\N	active
23	36	2025-04-28	\N	active
29	42	2025-04-28	\N	active
30	43	2025-04-28	\N	active
31	44	2025-04-28	\N	active
39	52	2025-04-29	2025-05-04	completed
45	59	2025-05-05	\N	active
50	65	2025-05-09	\N	active
51	66	2025-05-09	\N	active
52	67	2025-05-09	\N	active
53	69	2025-05-09	\N	active
54	70	2025-05-09	\N	active
55	71	2025-05-09	\N	active
56	72	2025-05-12	\N	active
57	64	2025-05-09	\N	active
58	128	2025-05-12	\N	active
59	129	2025-05-12	\N	active
60	130	2025-05-12	\N	active
61	131	2025-05-12	\N	active
62	132	2025-05-12	\N	active
63	133	2025-05-12	\N	active
64	134	2025-05-12	\N	active
65	135	2025-05-12	\N	active
66	136	2025-05-12	\N	active
67	137	2025-05-12	\N	active
68	138	2025-05-12	\N	active
10	19	2025-04-27	\N	active
12	21	2025-04-27	\N	active
69	139	2025-05-12	\N	active
70	140	2025-05-12	\N	active
71	141	2025-05-12	\N	active
72	142	2025-05-12	\N	active
73	143	2025-05-12	\N	active
74	144	2025-05-12	\N	active
75	146	2025-05-12	\N	active
76	145	2025-05-13	\N	active
78	149	2025-05-13	\N	active
80	148	2025-05-01	\N	active
81	150	2025-05-02	\N	active
82	151	2025-05-12	\N	active
83	152	2025-05-09	\N	active
84	153	2025-05-09	\N	active
85	154	2025-05-13	\N	active
86	155	2025-05-12	\N	active
87	156	2025-05-02	\N	active
88	157	2025-05-13	\N	active
89	158	2025-05-12	\N	active
90	159	2025-04-29	\N	active
92	160	2025-05-05	\N	active
93	161	2025-05-12	\N	active
94	162	2025-05-05	\N	active
95	163	2025-05-13	\N	active
96	164	2025-05-09	\N	active
97	165	2025-05-02	\N	active
98	166	2025-05-02	\N	active
99	167	2025-05-12	\N	active
100	168	2025-05-13	\N	active
101	169	2025-05-13	\N	active
102	60	2025-04-23	\N	active
103	46	2025-04-23	\N	active
104	47	2025-05-13	\N	active
107	50	2025-05-13	\N	active
108	188	2025-05-12	\N	active
109	189	2025-05-12	\N	active
110	190	2025-05-12	\N	active
111	191	2025-05-12	\N	active
113	193	2025-05-12	\N	active
115	194	2025-05-12	\N	active
116	198	2025-05-12	\N	active
117	195	2025-05-12	\N	active
118	196	2025-05-14	\N	active
119	197	2025-05-14	\N	active
\.


--
-- TOC entry 3894 (class 0 OID 442476)
-- Dependencies: 302
-- Data for Name: delivery_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.delivery_reports (id, report_id, order_id, client_id, delivery_date, total_items, total_weight, transport_info, notes, signed_by, signature_image_path, gps_coordinates, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 3890 (class 0 OID 442424)
-- Dependencies: 298
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, file_name, original_name, mime_type, size, path, entity_type, entity_id, document_type, upload_date, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3852 (class 0 OID 327681)
-- Dependencies: 260
-- Data for Name: email_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_config (id, key, value, created_at, updated_at) FROM stdin;
1	email_recipients	lago.gianluigi@gmail.com	2025-04-25 17:37:57.294053	2025-05-05 09:09:18.644
2	email_cc	paola.landri@gmail.com	2025-04-25 17:37:57.294053	2025-05-05 09:09:18.902
3	email_send_time	18:00	2025-04-25 17:37:57.294053	2025-05-05 09:09:19.159
4	auto_email_enabled	true	2025-04-25 17:37:57.294053	2025-05-05 09:09:19.416
5	whatsapp_recipients		2025-05-05 09:44:02.045109	2025-05-05 09:44:02.045109
6	auto_whatsapp_enabled	false	2025-05-05 09:44:02.045109	2025-05-05 09:44:02.045109
7	whatsapp_send_time	18:00	2025-05-05 09:44:02.045109	2025-05-05 09:44:02.045109
8	telegram_chat_ids	@DeltaFuturo_bot	2025-05-05 09:46:24.434447	2025-05-05 12:59:07.043
10	telegram_send_time	20:00	2025-05-05 09:46:24.434447	2025-05-05 12:59:07.043
9	auto_telegram_enabled	false	2025-05-05 09:46:24.434447	2025-05-05 12:59:07.043
\.


--
-- TOC entry 3870 (class 0 OID 385074)
-- Dependencies: 278
-- Data for Name: flupsy_impacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flupsy_impacts (id, flupsy_id, category_id, impact_value, time_period, start_date, end_date, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3815 (class 0 OID 246186)
-- Dependencies: 223
-- Data for Name: flupsys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flupsys (id, name, location, description, active, max_positions, production_center) FROM stdin;
570	Flupsy 2 piccolo 10 ceste	Ca Pisani		t	10	Ecotapes Italia
618	BINS 5x4	Lungo parete DX		t	20	Ecotapes Italia
582	Raceway 1 CaPisani	Ca Pisani	descrizione a piacere	t	16	Ecotapes Italia
608	Raceway 1 Delta Futuro	La prima 		t	16	Delta Futuro GORO
113	Flupsy 1 Alluminio	Ca Pisani	Ultimo lato uscita	t	20	Ecotapes Italia
1	Flupsy 1 (Mondolo)	Canale 1 Lato Laguna	Posizionato lato Gorino	t	20	Delta Futuro GORO
13	Fluspy 3 MegaFlupsy	Ca Pisani	Primo da passerella	t	20	Ecotapes Italia
1486	Raceway 4 Delta Futuro	terza dall'entrata riga dx, attaccata al lab		t	20	
737	Raceway 2 Delta Futuro	seconda dall'entrata riga sx	16 cestelli 	t	16	Delta Futuro GORO
\.


--
-- TOC entry 3864 (class 0 OID 385034)
-- Dependencies: 272
-- Data for Name: impact_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.impact_categories (id, name, description, icon, color, unit, created_at, updated_at) FROM stdin;
1	water	Consumo di acqua	droplet	blue	m³	2025-04-27 08:34:36.698872+00	\N
2	carbon	Emissioni di carbonio	cloud	gray	kg	2025-04-27 08:34:36.698872+00	\N
3	energy	Consumo energetico	zap	yellow	kWh	2025-04-27 08:34:36.698872+00	\N
4	waste	Produzione di rifiuti	trash	brown	kg	2025-04-27 08:34:36.698872+00	\N
5	biodiversity	Impatto sulla biodiversità	fish	green	index	2025-04-27 08:34:36.698872+00	\N
\.


--
-- TOC entry 3866 (class 0 OID 385044)
-- Dependencies: 274
-- Data for Name: impact_factors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.impact_factors (id, category_id, operation_type, factor_value, unit, description, metadata, created_at, updated_at) FROM stdin;
1	1	pulizia	1.5000	m³	Consumo acqua per operazione di pulizia	\N	2025-04-27 08:35:32.888099+00	\N
2	2	pulizia	0.8000	kg	Emissioni CO2 per operazione di pulizia	\N	2025-04-27 08:35:32.888099+00	\N
3	3	pulizia	1.2000	kWh	Consumo energetico per pulizia	\N	2025-04-27 08:35:32.888099+00	\N
4	1	vagliatura	2.3000	m³	Consumo acqua per operazione di vagliatura	\N	2025-04-27 08:35:32.888099+00	\N
5	2	vagliatura	1.2000	kg	Emissioni CO2 per operazione di vagliatura	\N	2025-04-27 08:35:32.888099+00	\N
6	3	vagliatura	2.5000	kWh	Consumo energetico per vagliatura	\N	2025-04-27 08:35:32.888099+00	\N
7	1	pulizia	1.5000	m³	Consumo acqua per operazione di pulizia	\N	2025-04-27 08:36:57.868469+00	\N
8	2	pulizia	0.8000	kg	Emissioni CO2 per operazione di pulizia	\N	2025-04-27 08:36:57.868469+00	\N
9	3	pulizia	1.2000	kWh	Consumo energetico per pulizia	\N	2025-04-27 08:36:57.868469+00	\N
10	1	vagliatura	2.3000	m³	Consumo acqua per operazione di vagliatura	\N	2025-04-27 08:36:57.868469+00	\N
11	2	vagliatura	1.2000	kg	Emissioni CO2 per operazione di vagliatura	\N	2025-04-27 08:36:57.868469+00	\N
12	3	vagliatura	2.5000	kWh	Consumo energetico per vagliatura	\N	2025-04-27 08:36:57.868469+00	\N
\.


--
-- TOC entry 3860 (class 0 OID 368641)
-- Dependencies: 268
-- Data for Name: lot_inventory_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot_inventory_transactions (id, lot_id, transaction_type, date, animal_count, notes, operation_id, created_at, basket_id, selection_id, screening_id, metadata, created_by) FROM stdin;
\.


--
-- TOC entry 3862 (class 0 OID 368662)
-- Dependencies: 270
-- Data for Name: lot_mortality_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot_mortality_records (id, lot_id, calculation_date, initial_count, current_count, sold_count, mortality_count, mortality_percentage, notes, created_at) FROM stdin;
\.


--
-- TOC entry 3817 (class 0 OID 246193)
-- Dependencies: 225
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lots (id, arrival_date, supplier, quality, animal_count, weight, size_id, notes, state, supplier_lot_number, active, external_id, description, origin, created_at) FROM stdin;
31	2025-04-10	Zeeland	teste	6633660	450	5	200 Appsheet Ca Pisani	active	4	t	\N	\N	\N	2025-05-02 04:39:53.482755
32	2025-04-23	Zeeland	normali	2291590	500	1	201 Appsheet Ca Pisani	active	4	t	\N	\N	\N	2025-05-02 04:39:53.482755
34	2025-04-23	Zeeland	code	2301925	115	4	201 Appsheet Ca Pisani	active	4	t	\N	\N	\N	2025-05-02 04:39:53.482755
33	2025-04-23	Zeeland	code	1679057	210	5	201 Appsheet Ca Pisani	active	4	t	\N	\N	\N	2025-05-02 04:39:53.482755
15	2025-02-27	Zeeland	code	794233	60	5	195 Appsheet Ca Pisani	active	2024/22	t	\N	\N	\N	2025-05-02 04:39:53.482755
1	2025-01-07	Zeeland 	code	1875693	200	3	191- APPsheet ca Pisani	active	2024/17 	t	\N	\N	\N	2025-05-02 04:39:53.482755
2	2025-01-07	Zeeland  	normali	1269332	350	4	191- Appsheet ca Pisani	active	2024/19	t	\N	\N	\N	2025-05-02 04:39:53.482755
4	2025-01-29	Zeeland	teste	505323	200	7	192-Appsheet Ca Pisani	active	2024/20	t	\N	\N	\N	2025-05-02 04:39:53.482755
5	2025-01-29	Zeeland	normali	1742441	300	1	192-Appsheet Ca Pisani	active	2024/20	t	\N	\N	\N	2025-05-02 04:39:53.482755
7	2025-02-11	Roem 	teste	82225	135	9	193- Appsheet Ca Pisani	active	Rp51	t	\N	\N	\N	2025-05-02 04:39:53.482755
12	2025-02-13	Zeeland	teste	2824089	550	1	194 Appsheet Ca Pisani	active	2024/22	t	\N	\N	\N	2025-05-02 04:39:53.482755
11	2025-02-13	Zeeland	code	805056	90	5	194-AppSheet Ca Pisani	active	2024/20	t	\N	\N	\N	2025-05-02 04:39:53.482755
6	2025-01-29	Zeeland	normali	2474162	175	5	192-Appsheet Ca Pisani	active	2024/20	t	\N	\N	\N	2025-05-02 04:39:53.482755
8	2025-02-11	Roem 	normali	430325	337	7	193-Appsheet Ca Pisani	active	Rp51	t	\N	\N	\N	2025-05-02 04:39:53.482755
9	2025-02-11	Roem 	teste	1296650	468	1	193-Appsheet Ca Pisani	active	Rp51	t	\N	\N	\N	2025-05-02 04:39:53.482755
10	2025-02-11	Roem 	code	253333	38	4	193-Appsheet Ca Pisani	active	Rp51	t	\N	\N	\N	2025-05-02 04:39:53.482755
3	2025-01-07	Zeeland	code	375139	40	5	191- Appsheet Ca Pisani	active	2024/19	t	\N	\N	\N	2025-05-02 04:39:53.482755
13	2025-02-13	Zeeland	normali	2305446	160	5	194 Appsheet Ca Pisani	active	2024/22	t	\N	\N	\N	2025-05-02 04:39:53.482755
14	2025-02-27	Zeeland	normali	2290766	200	1	195-Appsheet Ca Pisani	active	2024/22	t	\N	\N	\N	2025-05-02 04:39:53.482755
16	2025-04-27	Zeeland	code	739459	50	4	195 Appsheet Ca Pisani	active	2024/22	t	\N	\N	\N	2025-05-02 04:39:53.482755
18	2025-04-27	Zeeland	teste	5294888	400	5	195 Appsheet Ca Pisani	active	1	t	\N	\N	\N	2025-05-02 04:39:53.482755
17	2025-02-27	Zeeland	teste	2581532	400	1	195 Appsheet Ca Pisani	active	1	t	\N	\N	\N	2025-05-02 04:39:53.482755
19	2025-03-04	Roem 	normali	6202634	1413	1	196 Appsheet Ca Pisani	active	3	t	\N	\N	\N	2025-05-02 04:39:53.482755
20	2025-03-04	Roem 	normali	10450000	1024	4	196 Appsheet Ca Pisani	active	3	t	\N	\N	\N	2025-05-02 04:39:53.482755
21	2025-03-12	Zeeland	normali	4178697	500	1	197 Appsheet Ca Pisani	active	1	t	\N	\N	\N	2025-05-02 04:39:53.482755
22	2025-03-12	Zeeland	normali	3278655	250	5	197 Appsheet Ca Pisani	active	1	t	\N	\N	\N	2025-05-02 04:39:53.482755
23	2025-03-12	Zeeland	code	1327133	100	4	197 Appsheet Ca Pisani	active	1	t	\N	\N	\N	2025-05-02 04:39:53.482755
24	2025-03-18	Roem 	normali	947631	156	1	198 Appsheet Ca Pisani	active	3	t	\N	\N	\N	2025-05-02 04:39:53.482755
25	2025-03-18	Roem 	code	1787782	185	4	198 Appsheet Ca Pisani	active	3	t	\N	\N	\N	2025-05-02 04:39:53.482755
26	2025-04-02	Zeeland	teste	1395000	650	7	199 Appsheet Ca Pisani	active	2	t	\N	\N	\N	2025-05-02 04:39:53.482755
27	2025-04-02	Zeeland	normali	2384666	450	1	199 Appsheet Ca Pisani	active	2	t	\N	\N	\N	2025-05-02 04:39:53.482755
28	2025-04-02	Zeeland	teste	1311516	90	5	199 Appsheet Ca Pisani	active	3	t	\N	\N	\N	2025-05-02 04:39:53.482755
29	2025-04-02	Zeeland	normali	1249756	55	4	199 Appsheet Ca Pisani	active	3	t	\N	\N	\N	2025-05-02 04:39:53.482755
30	2025-04-10	Zeeland	teste	4920600	650	1	200 Appsheet Ca Pisani	active	4	t	\N	\N	\N	2025-05-02 04:39:53.482755
36	2025-04-23	Ecotapes Zeeland	teste	2291588	428	1	5 cestelli fisici	active	40	t	\N	\N	\N	2025-05-08 13:58:07.028198
38	2025-05-12	Ecotapes Zeeland	normali	15608918	\N	15	Lotto creato per flupsy deltafuturo 12/05/2025	active	\N	t	\N	\N	\N	2025-05-12 14:43:41.685417
39	2025-05-13	FLUPSY 1 CA PISANI 	teste	27149049	241540	\N	TUTTI GLI ANIMALI DEL FLUPSY PER SPOSTAMENTO DATI 	active	\N	t	\N	\N	\N	2025-05-13 11:25:15.150061
40	2025-05-13	Ecotapes Zeeland	teste	6016000	940	1	6.400.000 pz/kg arrivo del 13/05/25	active	t0.5	t	\N	\N	\N	2025-05-13 14:25:16.29052
41	2025-05-13	Ecotapes Zeeland	normali	9875000	790	5	T0.4 12.500.000 pzkg arrivo del 13/05/25	active	t0.4	t	\N	\N	\N	2025-05-13 14:26:12.669723
42	2025-05-12	FLUPSY 2 CA PISANI 	teste	22447613	100000	\N	TUTTI GLI ANIMALI DEL FLUPSY 2 	active	\N	t	\N	\N	\N	2025-05-14 07:09:34.751304
\.


--
-- TOC entry 3819 (class 0 OID 246200)
-- Dependencies: 227
-- Data for Name: mortality_rates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mortality_rates (id, size_id, month, percentage, notes) FROM stdin;
\.


--
-- TOC entry 3856 (class 0 OID 344065)
-- Dependencies: 264
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_settings (id, notification_type, is_enabled, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3854 (class 0 OID 335873)
-- Dependencies: 262
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, type, title, message, is_read, created_at, related_entity_type, related_entity_id, data) FROM stdin;
\.


--
-- TOC entry 3878 (class 0 OID 393238)
-- Dependencies: 286
-- Data for Name: operation_impact_defaults; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operation_impact_defaults (id, operation_type, water, carbon, energy, waste, biodiversity, created_at, updated_at, custom_name) FROM stdin;
1	pulizia	7.5	3.2	2	5	1.1	2025-04-27 09:31:44.480754+00	\N	\N
3	misura	1	1.5	2	0.8	0.3	2025-04-27 09:31:44.480754+00	\N	\N
4	prima-attivazione	8.5	7	9.2	4.5	2	2025-04-27 09:31:44.480754+00	\N	\N
5	trattamento	4.5	3.7	5.2	2.1	1.4	2025-04-27 09:34:36.943727+00	\N	\N
2	vagliatura	3.5	3	4.8	2.5	1	2025-04-27 09:31:44.480754+00	2025-04-27 09:34:43.455+00	\N
7	trasporto-medio	1.5	6.3	4.8	1.1	0.8	2025-04-27 09:45:39.59603+00	2025-04-27 09:53:26.084+00	\N
9	selezione-vendita	2.2	4	6	1.1	1	2025-04-27 09:54:42.148256+00	2025-04-27 09:54:57.377+00	\N
6	trasporto-corto	1	2	3	4	5	2025-04-27 09:45:28.517792+00	2025-04-27 10:01:47.085+00	\N
11	custom	2.5	3.5	4.5	5.5	6.5	2025-04-27 10:10:48.967094+00	\N	test-aggiornamento
\.


--
-- TOC entry 3868 (class 0 OID 385059)
-- Dependencies: 276
-- Data for Name: operation_impacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operation_impacts (id, operation_id, category_id, impact_value, baseline_value, improvement_percentage, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3821 (class 0 OID 246206)
-- Dependencies: 229
-- Data for Name: operations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operations (id, date, type, basket_id, cycle_id, size_id, sgr_id, lot_id, animal_count, total_weight, animals_per_kg, average_weight, notes, dead_count, mortality_rate, metadata) FROM stdin;
23	2025-04-28	prima-attivazione	33	20	4	\N	23	446054	36.399982	12254237	0.08160443	3736 Appsheet Ca Pisani (Delta futuro)	\N	\N	\N
24	2025-04-28	prima-attivazione	34	21	4	\N	22	614884	56.29997	10921569	0.091561936	3738 Appsheet Ca Pisani - Delta Futuro	\N	\N	\N
12	2025-04-27	prima-attivazione	19	10	4	\N	23	382332	31.199984	12254237	0.08160443	3737 Appsheet Ca Pisani 11-3-2025 (posizione Delta Futuro)	\N	\N	\N
15	2025-04-27	prima-attivazione	21	12	4	\N	22	626898	57.399994	10921569	0.091561936	3739 Appsheet Ca Pisani 11-3-25 (Delta futuro)	\N	\N	\N
57	2025-05-09	prima-attivazione	65	50	4	\N	31	1664234	143	11638000	0.085925415	EX 3887 ANIMALI TRASFERITI DA DF A CAP 	\N	\N	\N
26	2025-04-28	prima-attivazione	36	23	4	\N	22	631267	57.80003	10921569	0.091561936	3742 Appsheet Ca Pisani (Delta futuro)	\N	\N	\N
32	2025-04-28	prima-attivazione	42	29	4	\N	31	1687510	145	11638000	0.085925415	3888 Appsheet Ca Pisani 	\N	\N	\N
33	2025-04-28	prima-attivazione	43	30	1	\N	30	761720	152.344	5000000	0.2	3889 Appsheet Ca Pisani (Delta futuro)	\N	\N	\N
34	2025-04-28	prima-attivazione	44	31	1	\N	30	934640	186.928	5000000	0.2	3890 Appsheet Ca Pisani (Delta futuro)	\N	\N	\N
42	2025-04-29	prima-attivazione	52	39	5	\N	33	460460	79.389656	5800000	0.1724138	3943 Appsheet Ca Pisani (Delta futuro)	\N	\N	\N
52	2025-05-05	prima-attivazione	59	45	4	\N	23	498747	40.714043	12250000	0.08163265	3735 Appsheet Ca Pisani (Delta Futuro)	\N	\N	\N
58	2025-05-09	prima-attivazione	66	51	4	\N	31	1687510	145	11638000	0.085925415	EX 3888 ANIMALI TRASFERITI DA DF A CAP 	\N	\N	\N
59	2025-05-09	prima-attivazione	67	52	5	\N	30	761720	137	5560000	0.17985612	EX 3889 ANIMALI TRASFERITI DA DF A CAP 	\N	\N	\N
60	2025-05-09	prima-attivazione	69	53	5	\N	30	939640	169	5560000	0.17985612	ex 3890 ANIMALI TRASFERITI DA DF A CAP	\N	\N	\N
61	2025-05-09	prima-attivazione	70	54	5	\N	30	1162040	209	5560000	0.17985612	EX 3891 ANIMALI TRASFERITI DA DF A CAP	\N	\N	\N
62	2025-05-09	prima-attivazione	71	55	5	\N	30	961880	173	5560000	0.17985612	EX 3892 ANIMALI TRASFERITI DA DF A CAP	\N	\N	\N
63	2025-05-12	prima-attivazione	72	56	5	\N	30	1095320	197	5560000	0.17985612	EX 3893 ANIMALI TRASFERITI DA DF A CAP	\N	\N	\N
67	2025-05-12	prima-attivazione	129	59	18	\N	38	420000	11499.918	36522	27.380756	-3 del 6 maggio	\N	\N	\N
65	2025-05-09	prima-attivazione	64	57	4	\N	31	1617682	139	11638000	0.085925415	ex 3886 ANIMALI SPOSTATI DA DF A CAP 	\N	\N	\N
66	2025-05-12	prima-attivazione	128	58	17	\N	38	480000	9000.057	53333	18.750116	-3 piccolo del 6 maggio	\N	\N	\N
68	2025-05-12	prima-attivazione	130	60	15	\N	38	600000	7500	80000	12.5	code -2 sottovagliatura prodotto da 15 milioni di animali 2 maggio	\N	\N	\N
69	2025-05-12	prima-attivazione	131	61	17	\N	38	540000	12000	45000	22.222221	sotto 3 del 6 maggio	\N	\N	\N
70	2025-05-12	prima-attivazione	132	62	17	\N	38	824000	19488.2	42282	23.650726	-3 del 6 maggio	\N	\N	\N
71	2025-05-12	prima-attivazione	133	63	15	\N	38	1815120	21500.047	84424	11.844973	sotto 2 arrivo da ca pisani del 22/04	\N	\N	\N
72	2025-05-12	prima-attivazione	134	64	15	\N	38	1813730	21000.023	86368	11.578362	sotto 2 arivo da capisani del 22 aprile	\N	\N	\N
73	2025-05-12	prima-attivazione	135	65	17	\N	38	1432000	25166.959	56900	17.574692	sotto 3 del 12 maggio	\N	\N	\N
74	2025-05-12	prima-attivazione	136	66	15	\N	38	1313813	15500.023	84762	11.79774	arrivo del 7/5	\N	\N	\N
75	2025-05-12	prima-attivazione	137	67	19	\N	38	427950	13500	31700	31.545742	vagliatura +3 12/05/2025	\N	\N	\N
76	2025-05-12	prima-attivazione	138	68	17	\N	38	1043000	23438.203	44500	22.47191	-3 del 12/5	\N	\N	\N
77	2025-05-12	prima-attivazione	139	69	19	\N	38	376740	13800	27300	36.630035	+3 (5) del 12/5	\N	\N	\N
78	2025-05-12	prima-attivazione	140	70	18	\N	38	736000	22500.076	32711	30.570757	+3 del 6 maggio	\N	\N	\N
79	2025-05-12	prima-attivazione	141	71	19	\N	38	522000	25499.486	20471	48.84959	+3 del 6/5	\N	\N	\N
80	2025-05-12	prima-attivazione	142	72	19	\N	38	440004	14800	29730	33.63606	+3 (4) 12 maggio	\N	\N	\N
81	2025-05-12	prima-attivazione	143	73	19	\N	38	413980	14000	29570	33.818058	+3 (3) del 12 maggio	\N	\N	\N
82	2025-05-12	prima-attivazione	144	74	19	\N	38	433550	14500	29900	33.444817	+3 (1) del 12 maggio	\N	\N	\N
83	2025-05-12	prima-attivazione	146	75	19	\N	38	459750	15000	30650	32.626427	+3 (2) del 12 maggio	\N	\N	\N
84	2025-05-13	prima-attivazione	145	76	17	\N	38	1516781	25999.88	58338	17.141485	3925 arrivo del 2/5	\N	\N	\N
88	2025-05-13	prima-attivazione	149	78	15	\N	39	1366365	16633.574	82145	12.173595	ex 4001 (-2.5) CODE DI VAGLIATURA MA ANIMALI BELLISSIMI\n	\N	\N	\N
92	2025-05-01	prima-attivazione	148	80	11	\N	39	1339624	4000	334906	2.9859126	ex 3961 (-1500) medi di vagliatura animali bellissimi\n	\N	\N	\N
93	2025-05-02	prima-attivazione	150	81	13	\N	39	1415631	8456.021	167411	5.9733233	ex 3975 (+1500) teste di vagliatura animali bellissimi\n	\N	\N	\N
94	2025-05-12	prima-attivazione	151	82	15	\N	39	1091404	11312.23	96480	10.364842	ex 4004 (+1500) TESTE DI VAGLIATURA BELLISSIME\n	\N	\N	\N
95	2025-05-09	prima-attivazione	152	83	12	\N	39	1554928	8000	194366	5.1449327	ex 4020 (+1500) TESTE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
96	2025-05-09	prima-attivazione	153	84	13	\N	39	1698630	10000	169863	5.8870974	ex 4013 (+1500) TESTE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
97	2025-05-13	prima-attivazione	154	85	15	\N	39	966570	12498.319	77336	12.930589	ex 4002 (-2.5) MEDI DI VAGLIATURA MA ANIMALI BELLISSIMI\n	\N	\N	\N
98	2025-05-12	prima-attivazione	155	86	15	\N	39	1625179	19784.271	82145	12.173595	ex 3997 (-2.5) CODE DI VAGLIATURA ANIMALI MOLTO BELLI\n	\N	\N	\N
99	2025-05-02	prima-attivazione	156	87	13	\N	39	1397961	8500	164466	6.080284	ex 3978 (+1500) TESTE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
100	2025-05-13	prima-attivazione	157	88	15	\N	39	816031	10551.761	77336	12.930589	ex 3994 (-2.5) MEDI DI VAGLIATURA, ANIMALI BELLISSIMI\n	\N	\N	\N
101	2025-05-12	prima-attivazione	158	89	19	\N	39	679744	22801.785	29811	33.544666	ex 3988 (+2.5) animali bellissimi \n	\N	\N	\N
102	2025-04-29	prima-attivazione	159	90	12	\N	39	1908032	8350.213	228501	4.3763485	ex 3962 (+1500) TESTE DI VAGLIATRUA BELLISSIME\n	\N	\N	\N
104	2025-05-05	prima-attivazione	160	92	13	\N	39	1572019	9599.999	163752	6.106796	ex 3985 (+1500) teste di vagliatura animali bellissimi\n	\N	\N	\N
105	2025-05-12	prima-attivazione	161	93	19	\N	39	711984	23883.264	29811	33.544666	ex 3987 (+2.5) animali bellissimi\n	\N	\N	\N
106	2025-05-05	prima-attivazione	162	94	13	\N	39	2313498	15900.002	145503	6.8727107	ex 3984 (+1500) teste di vagliatura bellissimi\n	\N	\N	\N
107	2025-05-13	prima-attivazione	163	95	15	\N	39	816031	10551.761	77336	12.930589	ex 3995 (-2.5) MEDI DI VAGLIATURA, ANIMALI BELLISSIMI\n	\N	\N	\N
108	2025-05-09	prima-attivazione	164	96	12	\N	39	1554928	8000	194366	5.1449327	ex 4019 (+1500) TESTE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
109	2025-05-02	prima-attivazione	165	97	12	\N	39	1279680	6200	206400	4.844961	ex 3981 (+1500) TESTE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
110	2025-05-02	prima-attivazione	166	98	13	\N	39	1415631	8456.021	167411	5.9733233	ex 3976 (+1500) teste di vagliatura animali bellissimi\n	\N	\N	\N
111	2025-05-12	prima-attivazione	167	99	15	\N	39	1625179	19784.271	82145	12.173595	ex 3998 (-2.5) CODE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
112	2025-05-13	prima-attivazione	168	100	5	\N	40	6016000	940	6400000	0.15625	7 cestelli	\N	\N	\N
113	2025-05-13	prima-attivazione	169	101	4	\N	41	9875000	790	12500000	0.08	7 cestelli	\N	\N	\N
114	2025-04-23	prima-attivazione	60	102	5	\N	36	2291588	427.99997	5354178	0.18677004	arrivo 23/4	\N	\N	\N
115	2025-04-23	prima-attivazione	46	103	4	\N	33	1679057	172.99998	9705533	0.10303401	23/04 arrivo	\N	\N	\N
116	2025-05-13	prima-attivazione	47	104	3	\N	34	2301925	135.00005	17051290	0.05864659	arrivo 23/04	\N	\N	\N
125	2025-05-13	prima-attivazione	50	107	14	\N	41	1500000	15000	100000	10	\N	\N	\N	\N
129	2025-05-13	misura	50	107	14	\N	41	1500000	5000	100000	10		0	0	\N
130	2025-05-12	prima-attivazione	188	108	10	\N	42	4675276	9999.991	467528	2.1389093	ex4008 (-1500) CODE DI VAGLIATURA ANIMALI MEDIO BELLI\n	\N	\N	\N
131	2025-05-12	prima-attivazione	189	109	14	\N	42	787500	7500	105000	9.523809	ex4014 (+1500) TESTE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
132	2025-05-12	prima-attivazione	190	110	19	\N	42	247040	10499.83	23528	42.502552	ex4012 (-3) SCARTO DI VAGLIATURA ANIMALI ARRIVATI A FINE CICLO PRODUTTIVO, MOLTO BRUTTI\n	\N	\N	\N
133	2025-05-12	prima-attivazione	191	111	15	\N	42	787500	8199.965	96037	10.412654	ex4015 (+1500) TESTE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
135	2025-05-12	prima-attivazione	193	113	12	\N	42	1300819	5400.0093	240892	4.151238	ex4021 (-1500) MEDI DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
137	2025-05-12	prima-attivazione	194	115	12	\N	42	1773026	8399.981	211075	4.7376523	ex4016 (-1500) MEDI DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
138	2025-05-12	prima-attivazione	198	116	15	\N	42	861538	11500.054	74916	13.348284	ex 4006 (+1500)TESTE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
139	2025-05-12	prima-attivazione	195	117	10	\N	42	5576688	13999.995	398335	2.5104496	ex 4018 DA DIVIDERE APPENA CI SONO CESTE LIBERE!!! (-1500) CODE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
140	2025-05-14	prima-attivazione	196	118	15	\N	42	861538	10999.949	78322	12.767805	EX4005 (+1500) TESTE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
141	2025-05-14	prima-attivazione	197	119	10	\N	42	5576688	13500	413088	2.4207916	ex 4017 DA DIVIDERE APPENA CI SONO CESTE LIBERE!!! (-1500) CODE DI VAGLIATURA ANIMALI BELLISSIMI\n	\N	\N	\N
\.


--
-- TOC entry 3886 (class 0 OID 442402)
-- Dependencies: 294
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, description, quantity, unit, unit_price, total_price, vat_rate, lot_id, size_id, selection_id, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3884 (class 0 OID 442382)
-- Dependencies: 292
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_number, client_id, order_date, requested_delivery_date, actual_delivery_date, status, total_amount, vat_amount, vat_rate, discount_amount, discount_rate, shipping_amount, payment_type, payment_status, payment_due_date, invoice_number, invoice_date, notes, internal_notes, shipping_address, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3888 (class 0 OID 442414)
-- Dependencies: 296
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, order_id, amount, payment_date, payment_type, reference, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3898 (class 0 OID 442496)
-- Dependencies: 306
-- Data for Name: report_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.report_templates (id, name, description, type, format, template, parameters, is_default, created_by, created_at, updated_at, active) FROM stdin;
\.


--
-- TOC entry 3892 (class 0 OID 442464)
-- Dependencies: 300
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (id, title, description, type, format, parameters, file_path, file_size, generated_by, start_date, end_date, status, created_at, completed_at, error, metadata) FROM stdin;
\.


--
-- TOC entry 3896 (class 0 OID 442486)
-- Dependencies: 304
-- Data for Name: sales_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales_reports (id, report_id, start_date, end_date, total_sales, total_vat, total_orders, completed_orders, cancelled_orders, top_size_id, top_lot_id, top_client_id, total_weight, avg_order_value, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 3823 (class 0 OID 246212)
-- Dependencies: 231
-- Data for Name: screening_basket_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_basket_history (id, screening_id, source_basket_id, source_cycle_id, destination_basket_id, destination_cycle_id, created_at) FROM stdin;
\.


--
-- TOC entry 3825 (class 0 OID 246217)
-- Dependencies: 233
-- Data for Name: screening_destination_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_destination_baskets (id, screening_id, basket_id, cycle_id, category, flupsy_id, "row", "position", position_assigned, animal_count, live_animals, total_weight, animals_per_kg, dead_count, mortality_rate, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3827 (class 0 OID 246225)
-- Dependencies: 235
-- Data for Name: screening_lot_references; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_lot_references (id, screening_id, destination_basket_id, destination_cycle_id, lot_id, created_at) FROM stdin;
\.


--
-- TOC entry 3829 (class 0 OID 246230)
-- Dependencies: 237
-- Data for Name: screening_operations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_operations (id, date, screening_number, purpose, reference_size_id, status, created_at, updated_at, notes) FROM stdin;
\.


--
-- TOC entry 3831 (class 0 OID 246238)
-- Dependencies: 239
-- Data for Name: screening_source_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_source_baskets (id, screening_id, basket_id, cycle_id, dismissed, position_released, animal_count, total_weight, animals_per_kg, size_id, lot_id, created_at) FROM stdin;
\.


--
-- TOC entry 3833 (class 0 OID 246245)
-- Dependencies: 241
-- Data for Name: selection_basket_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_basket_history (id, selection_id, source_basket_id, source_cycle_id, destination_basket_id, destination_cycle_id, created_at) FROM stdin;
\.


--
-- TOC entry 3835 (class 0 OID 246250)
-- Dependencies: 243
-- Data for Name: selection_destination_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_destination_baskets (id, selection_id, basket_id, cycle_id, destination_type, flupsy_id, "position", animal_count, live_animals, total_weight, animals_per_kg, size_id, dead_count, mortality_rate, sample_weight, sample_count, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 3837 (class 0 OID 246257)
-- Dependencies: 245
-- Data for Name: selection_lot_references; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_lot_references (id, selection_id, destination_basket_id, destination_cycle_id, lot_id, created_at) FROM stdin;
\.


--
-- TOC entry 3839 (class 0 OID 246262)
-- Dependencies: 247
-- Data for Name: selection_source_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_source_baskets (id, selection_id, basket_id, cycle_id, animal_count, total_weight, animals_per_kg, size_id, lot_id, created_at) FROM stdin;
\.


--
-- TOC entry 3841 (class 0 OID 246267)
-- Dependencies: 249
-- Data for Name: selections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selections (id, date, selection_number, purpose, screening_type, status, created_at, updated_at, notes, reference_size_id) FROM stdin;
\.


--
-- TOC entry 3843 (class 0 OID 246275)
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
-- TOC entry 3844 (class 0 OID 246281)
-- Dependencies: 252
-- Data for Name: sgr_giornalieri; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sgr_giornalieri (id, record_date, temperature, ph, ammonia, oxygen, salinity, notes) FROM stdin;
\.


--
-- TOC entry 3858 (class 0 OID 344076)
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
-- TOC entry 3847 (class 0 OID 246288)
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
-- TOC entry 3874 (class 0 OID 385104)
-- Dependencies: 282
-- Data for Name: sustainability_goals; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sustainability_goals (id, title, description, flupsy_id, category_id, target_value, current_value, unit, status, target_date, metadata, created_at, updated_at) FROM stdin;
1	Riduzione consumo acqua BINS 5x4	Obiettivo di riduzione del consumo di acqua per il FLUPSY BINS 5x4 attraverso l'ottimizzazione dei processi di pulizia	618	1	63.0000	5.0000	m³	planned	2025-07-26 08:35:33.912+00	\N	2025-04-27 08:35:33.947409+00	\N
2	Riduzione emissioni CO2 BINS 5x4	Obiettivo di riduzione delle emissioni di CO2 per il FLUPSY BINS 5x4 attraverso l'uso di energie rinnovabili	618	2	103.0000	33.0000	kg	in-progress	2025-10-24 08:35:33.979+00	\N	2025-04-27 08:35:34.013858+00	\N
3	Riduzione consumo acqua Raceway 1 CaPisani	Obiettivo di riduzione del consumo di acqua per il FLUPSY Raceway 1 CaPisani attraverso l'ottimizzazione dei processi di pulizia	582	1	72.0000	48.0000	m³	completed	2025-07-26 08:35:34.044+00	\N	2025-04-27 08:35:34.079223+00	\N
4	Riduzione emissioni CO2 Raceway 1 CaPisani	Obiettivo di riduzione delle emissioni di CO2 per il FLUPSY Raceway 1 CaPisani attraverso l'uso di energie rinnovabili	582	2	115.0000	30.0000	kg	in-progress	2025-10-24 08:35:34.109+00	\N	2025-04-27 08:35:34.145819+00	\N
5	Riduzione consumo acqua Raceway 1 Delta Futuro	Obiettivo di riduzione del consumo di acqua per il FLUPSY Raceway 1 Delta Futuro attraverso l'ottimizzazione dei processi di pulizia	608	1	89.0000	63.0000	m³	in-progress	2025-07-26 08:35:34.176+00	\N	2025-04-27 08:35:34.21119+00	\N
6	Riduzione emissioni CO2 Raceway 1 Delta Futuro	Obiettivo di riduzione delle emissioni di CO2 per il FLUPSY Raceway 1 Delta Futuro attraverso l'uso di energie rinnovabili	608	2	149.0000	37.0000	kg	in-progress	2025-10-24 08:35:34.256+00	\N	2025-04-27 08:35:34.29169+00	\N
7	Riduzione consumo acqua Flupsy piccolo 8 ceste	Obiettivo di riduzione del consumo di acqua per il FLUPSY Flupsy piccolo 8 ceste attraverso l'ottimizzazione dei processi di pulizia	570	1	96.0000	52.0000	m³	planned	2025-07-26 08:35:34.321+00	\N	2025-04-27 08:35:34.356624+00	\N
8	Riduzione emissioni CO2 Flupsy piccolo 8 ceste	Obiettivo di riduzione delle emissioni di CO2 per il FLUPSY Flupsy piccolo 8 ceste attraverso l'uso di energie rinnovabili	570	2	138.0000	30.0000	kg	planned	2025-10-24 08:35:34.387+00	\N	2025-04-27 08:35:34.421772+00	\N
9	Riduzione consumo acqua Flupsy 1 Alluminio	Obiettivo di riduzione del consumo di acqua per il FLUPSY Flupsy 1 Alluminio attraverso l'ottimizzazione dei processi di pulizia	113	1	119.0000	66.0000	m³	in-progress	2025-07-26 08:35:34.451+00	\N	2025-04-27 08:35:34.486666+00	\N
10	Riduzione emissioni CO2 Flupsy 1 Alluminio	Obiettivo di riduzione delle emissioni di CO2 per il FLUPSY Flupsy 1 Alluminio attraverso l'uso di energie rinnovabili	113	2	125.0000	7.0000	kg	planned	2025-10-24 08:35:34.517+00	\N	2025-04-27 08:35:34.551698+00	\N
11	Riduzione consumo acqua BINS 5x4	Obiettivo di riduzione del consumo di acqua per il FLUPSY BINS 5x4 attraverso l'ottimizzazione dei processi di pulizia	618	1	104.0000	78.0000	m³	completed	2025-07-26 08:36:58.875+00	\N	2025-04-27 08:36:58.910158+00	\N
12	Riduzione emissioni CO2 BINS 5x4	Obiettivo di riduzione delle emissioni di CO2 per il FLUPSY BINS 5x4 attraverso l'uso di energie rinnovabili	618	2	113.0000	49.0000	kg	planned	2025-10-24 08:36:58.941+00	\N	2025-04-27 08:36:58.975738+00	\N
13	Riduzione consumo acqua Raceway 1 CaPisani	Obiettivo di riduzione del consumo di acqua per il FLUPSY Raceway 1 CaPisani attraverso l'ottimizzazione dei processi di pulizia	582	1	86.0000	60.0000	m³	in-progress	2025-07-26 08:36:59.005+00	\N	2025-04-27 08:36:59.040689+00	\N
14	Riduzione emissioni CO2 Raceway 1 CaPisani	Obiettivo di riduzione delle emissioni di CO2 per il FLUPSY Raceway 1 CaPisani attraverso l'uso di energie rinnovabili	582	2	147.0000	47.0000	kg	completed	2025-10-24 08:36:59.07+00	\N	2025-04-27 08:36:59.105376+00	\N
15	Riduzione consumo acqua Raceway 1 Delta Futuro	Obiettivo di riduzione del consumo di acqua per il FLUPSY Raceway 1 Delta Futuro attraverso l'ottimizzazione dei processi di pulizia	608	1	58.0000	21.0000	m³	completed	2025-07-26 08:36:59.136+00	\N	2025-04-27 08:36:59.171021+00	\N
16	Riduzione emissioni CO2 Raceway 1 Delta Futuro	Obiettivo di riduzione delle emissioni di CO2 per il FLUPSY Raceway 1 Delta Futuro attraverso l'uso di energie rinnovabili	608	2	148.0000	35.0000	kg	planned	2025-10-24 08:36:59.2+00	\N	2025-04-27 08:36:59.235632+00	\N
17	Riduzione consumo acqua Flupsy 2 piccolo 8 ceste	Obiettivo di riduzione del consumo di acqua per il FLUPSY Flupsy 2 piccolo 8 ceste attraverso l'ottimizzazione dei processi di pulizia	570	1	110.0000	71.0000	m³	planned	2025-07-26 08:36:59.266+00	\N	2025-04-27 08:36:59.300402+00	\N
18	Riduzione emissioni CO2 Flupsy 2 piccolo 8 ceste	Obiettivo di riduzione delle emissioni di CO2 per il FLUPSY Flupsy 2 piccolo 8 ceste attraverso l'uso di energie rinnovabili	570	2	106.0000	41.0000	kg	planned	2025-10-24 08:36:59.33+00	\N	2025-04-27 08:36:59.365368+00	\N
19	Riduzione consumo acqua Flupsy 1 Alluminio	Obiettivo di riduzione del consumo di acqua per il FLUPSY Flupsy 1 Alluminio attraverso l'ottimizzazione dei processi di pulizia	113	1	86.0000	64.0000	m³	completed	2025-07-26 08:36:59.395+00	\N	2025-04-27 08:36:59.429449+00	\N
20	Riduzione emissioni CO2 Flupsy 1 Alluminio	Obiettivo di riduzione delle emissioni di CO2 per il FLUPSY Flupsy 1 Alluminio attraverso l'uso di energie rinnovabili	113	2	108.0000	39.0000	kg	planned	2025-10-24 08:36:59.459+00	\N	2025-04-27 08:36:59.493629+00	\N
\.


--
-- TOC entry 3876 (class 0 OID 385120)
-- Dependencies: 284
-- Data for Name: sustainability_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sustainability_reports (id, title, report_period, start_date, end_date, summary, highlights, metrics, flupsy_ids, file_path, created_at, updated_at) FROM stdin;
1	Report Trimestrale Q1 2025	Q1 2025	2025-01-01 00:00:00+00	2025-03-31 00:00:00+00	Analisi della sostenibilità per il primo trimestre del 2025. Osservato un miglioramento del 12% rispetto al trimestre precedente.	{"points": ["Riduzione del 15% nel consumo di acqua", "Aumento efficienza energetica del 8%", "Implementazione di nuovi protocolli di sostenibilità"]}	{"water": 245.3, "carbon": 132.8, "energy": 456.2}	{618,582,608,570,113}	\N	2025-04-27 08:36:59.557987+00	\N
2	Report Annuale 2024	Anno 2024	2024-01-01 00:00:00+00	2024-12-31 00:00:00+00	Report annuale completo sulla sostenibilità per anno 2024. Analisi dettagliata di tutte le metriche con confronto rispetto agli anni precedenti.	{"points": ["Riduzione complessiva del 22% nelle emissioni di CO2", "Implementazione sistema di monitoraggio in tempo reale", "Certificazione ambientale ottenuta per 3 siti produttivi"]}	{"waste": 345.6, "water": 1245.3, "carbon": 832.8, "energy": 2456.2, "biodiversity": 78.3}	{618,582,608,570,113}	\N	2025-04-27 08:36:59.557987+00	\N
\.


--
-- TOC entry 3849 (class 0 OID 246294)
-- Dependencies: 257
-- Data for Name: target_size_annotations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.target_size_annotations (id, basket_id, target_size_id, predicted_date, status, reached_date, notes, created_at, updated_at) FROM stdin;
1	4	19	2025-05-06	unread	\N	Annotazione creata manualmente per test	2025-04-26 10:14:19.537192	\N
\.


--
-- TOC entry 3880 (class 0 OID 417793)
-- Dependencies: 288
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password, role, last_login, created_at, language) FROM stdin;
1	Visitor	Visitor	visitor	2025-04-28 15:55:40.468	2025-04-28 14:47:09.200978	it
5	Gianluigi	admin	admin	2025-05-10 03:04:38.185	2025-04-28 16:35:10.767757	it
2	User	AppFlupsy1204	user	2025-05-14 06:43:16.035	2025-04-28 14:47:09.200978	it
\.


--
-- TOC entry 3949 (class 0 OID 0)
-- Dependencies: 218
-- Name: basket_position_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.basket_position_history_id_seq', 205, true);


--
-- TOC entry 3950 (class 0 OID 0)
-- Dependencies: 220
-- Name: baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.baskets_id_seq', 198, true);


--
-- TOC entry 3951 (class 0 OID 0)
-- Dependencies: 289
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clients_id_seq', 1, false);


--
-- TOC entry 3952 (class 0 OID 0)
-- Dependencies: 279
-- Name: cycle_impacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cycle_impacts_id_seq', 1, false);


--
-- TOC entry 3953 (class 0 OID 0)
-- Dependencies: 222
-- Name: cycles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cycles_id_seq', 119, true);


--
-- TOC entry 3954 (class 0 OID 0)
-- Dependencies: 301
-- Name: delivery_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.delivery_reports_id_seq', 1, false);


--
-- TOC entry 3955 (class 0 OID 0)
-- Dependencies: 297
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.documents_id_seq', 1, false);


--
-- TOC entry 3956 (class 0 OID 0)
-- Dependencies: 259
-- Name: email_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_config_id_seq', 10, true);


--
-- TOC entry 3957 (class 0 OID 0)
-- Dependencies: 277
-- Name: flupsy_impacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.flupsy_impacts_id_seq', 30, true);


--
-- TOC entry 3958 (class 0 OID 0)
-- Dependencies: 224
-- Name: flupsys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.flupsys_id_seq', 1559, true);


--
-- TOC entry 3959 (class 0 OID 0)
-- Dependencies: 271
-- Name: impact_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.impact_categories_id_seq', 5, true);


--
-- TOC entry 3960 (class 0 OID 0)
-- Dependencies: 273
-- Name: impact_factors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.impact_factors_id_seq', 12, true);


--
-- TOC entry 3961 (class 0 OID 0)
-- Dependencies: 267
-- Name: lot_inventory_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lot_inventory_transactions_id_seq', 1, true);


--
-- TOC entry 3962 (class 0 OID 0)
-- Dependencies: 269
-- Name: lot_mortality_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lot_mortality_records_id_seq', 8, true);


--
-- TOC entry 3963 (class 0 OID 0)
-- Dependencies: 226
-- Name: lots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lots_id_seq', 42, true);


--
-- TOC entry 3964 (class 0 OID 0)
-- Dependencies: 228
-- Name: mortality_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mortality_rates_id_seq', 36, true);


--
-- TOC entry 3965 (class 0 OID 0)
-- Dependencies: 263
-- Name: notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_settings_id_seq', 1, false);


--
-- TOC entry 3966 (class 0 OID 0)
-- Dependencies: 261
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 10, true);


--
-- TOC entry 3967 (class 0 OID 0)
-- Dependencies: 285
-- Name: operation_impact_defaults_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operation_impact_defaults_id_seq', 11, true);


--
-- TOC entry 3968 (class 0 OID 0)
-- Dependencies: 275
-- Name: operation_impacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operation_impacts_id_seq', 1, false);


--
-- TOC entry 3969 (class 0 OID 0)
-- Dependencies: 230
-- Name: operations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operations_id_seq', 141, true);


--
-- TOC entry 3970 (class 0 OID 0)
-- Dependencies: 293
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- TOC entry 3971 (class 0 OID 0)
-- Dependencies: 291
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- TOC entry 3972 (class 0 OID 0)
-- Dependencies: 295
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- TOC entry 3973 (class 0 OID 0)
-- Dependencies: 305
-- Name: report_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.report_templates_id_seq', 1, false);


--
-- TOC entry 3974 (class 0 OID 0)
-- Dependencies: 299
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reports_id_seq', 1, false);


--
-- TOC entry 3975 (class 0 OID 0)
-- Dependencies: 303
-- Name: sales_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sales_reports_id_seq', 1, false);


--
-- TOC entry 3976 (class 0 OID 0)
-- Dependencies: 232
-- Name: screening_basket_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_basket_history_id_seq', 1, false);


--
-- TOC entry 3977 (class 0 OID 0)
-- Dependencies: 234
-- Name: screening_destination_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_destination_baskets_id_seq', 1, false);


--
-- TOC entry 3978 (class 0 OID 0)
-- Dependencies: 236
-- Name: screening_lot_references_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_lot_references_id_seq', 1, false);


--
-- TOC entry 3979 (class 0 OID 0)
-- Dependencies: 238
-- Name: screening_operations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_operations_id_seq', 1, false);


--
-- TOC entry 3980 (class 0 OID 0)
-- Dependencies: 240
-- Name: screening_source_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_source_baskets_id_seq', 1, false);


--
-- TOC entry 3981 (class 0 OID 0)
-- Dependencies: 242
-- Name: selection_basket_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_basket_history_id_seq', 1, false);


--
-- TOC entry 3982 (class 0 OID 0)
-- Dependencies: 244
-- Name: selection_destination_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_destination_baskets_id_seq', 1, false);


--
-- TOC entry 3983 (class 0 OID 0)
-- Dependencies: 246
-- Name: selection_lot_references_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_lot_references_id_seq', 1, false);


--
-- TOC entry 3984 (class 0 OID 0)
-- Dependencies: 248
-- Name: selection_source_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_source_baskets_id_seq', 1, false);


--
-- TOC entry 3985 (class 0 OID 0)
-- Dependencies: 250
-- Name: selections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selections_id_seq', 1, false);


--
-- TOC entry 3986 (class 0 OID 0)
-- Dependencies: 253
-- Name: sgr_giornalieri_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sgr_giornalieri_id_seq', 1, false);


--
-- TOC entry 3987 (class 0 OID 0)
-- Dependencies: 254
-- Name: sgr_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sgr_id_seq', 12, true);


--
-- TOC entry 3988 (class 0 OID 0)
-- Dependencies: 265
-- Name: sgr_monthly_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sgr_monthly_id_seq', 12, true);


--
-- TOC entry 3989 (class 0 OID 0)
-- Dependencies: 256
-- Name: sizes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sizes_id_seq', 27, true);


--
-- TOC entry 3990 (class 0 OID 0)
-- Dependencies: 281
-- Name: sustainability_goals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sustainability_goals_id_seq', 20, true);


--
-- TOC entry 3991 (class 0 OID 0)
-- Dependencies: 283
-- Name: sustainability_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sustainability_reports_id_seq', 2, true);


--
-- TOC entry 3992 (class 0 OID 0)
-- Dependencies: 258
-- Name: target_size_annotations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.target_size_annotations_id_seq', 1, true);


--
-- TOC entry 3993 (class 0 OID 0)
-- Dependencies: 287
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- TOC entry 3528 (class 2606 OID 246324)
-- Name: basket_position_history basket_position_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.basket_position_history
    ADD CONSTRAINT basket_position_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3530 (class 2606 OID 246326)
-- Name: baskets baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baskets
    ADD CONSTRAINT baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3615 (class 2606 OID 442380)
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- TOC entry 3602 (class 2606 OID 385097)
-- Name: cycle_impacts cycle_impacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycle_impacts
    ADD CONSTRAINT cycle_impacts_pkey PRIMARY KEY (id);


--
-- TOC entry 3534 (class 2606 OID 246328)
-- Name: cycles cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_pkey PRIMARY KEY (id);


--
-- TOC entry 3634 (class 2606 OID 442484)
-- Name: delivery_reports delivery_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reports
    ADD CONSTRAINT delivery_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3628 (class 2606 OID 442433)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 3576 (class 2606 OID 327691)
-- Name: email_config email_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_key_key UNIQUE (key);


--
-- TOC entry 3578 (class 2606 OID 327689)
-- Name: email_config email_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_pkey PRIMARY KEY (id);


--
-- TOC entry 3600 (class 2606 OID 385082)
-- Name: flupsy_impacts flupsy_impacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsy_impacts
    ADD CONSTRAINT flupsy_impacts_pkey PRIMARY KEY (id);


--
-- TOC entry 3536 (class 2606 OID 246330)
-- Name: flupsys flupsys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsys
    ADD CONSTRAINT flupsys_pkey PRIMARY KEY (id);


--
-- TOC entry 3594 (class 2606 OID 385042)
-- Name: impact_categories impact_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_categories
    ADD CONSTRAINT impact_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 3596 (class 2606 OID 385052)
-- Name: impact_factors impact_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_factors
    ADD CONSTRAINT impact_factors_pkey PRIMARY KEY (id);


--
-- TOC entry 3588 (class 2606 OID 368650)
-- Name: lot_inventory_transactions lot_inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions
    ADD CONSTRAINT lot_inventory_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 3592 (class 2606 OID 368671)
-- Name: lot_mortality_records lot_mortality_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mortality_records
    ADD CONSTRAINT lot_mortality_records_pkey PRIMARY KEY (id);


--
-- TOC entry 3540 (class 2606 OID 246332)
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- TOC entry 3542 (class 2606 OID 246334)
-- Name: mortality_rates mortality_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mortality_rates
    ADD CONSTRAINT mortality_rates_pkey PRIMARY KEY (id);


--
-- TOC entry 3582 (class 2606 OID 344074)
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3580 (class 2606 OID 335882)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 3609 (class 2606 OID 393244)
-- Name: operation_impact_defaults operation_impact_defaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_impact_defaults
    ADD CONSTRAINT operation_impact_defaults_pkey PRIMARY KEY (id);


--
-- TOC entry 3598 (class 2606 OID 385067)
-- Name: operation_impacts operation_impacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_impacts
    ADD CONSTRAINT operation_impacts_pkey PRIMARY KEY (id);


--
-- TOC entry 3544 (class 2606 OID 246336)
-- Name: operations operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_pkey PRIMARY KEY (id);


--
-- TOC entry 3623 (class 2606 OID 442412)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3618 (class 2606 OID 442400)
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 3620 (class 2606 OID 442398)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 3626 (class 2606 OID 442422)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 3643 (class 2606 OID 442507)
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 3632 (class 2606 OID 442474)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3640 (class 2606 OID 442494)
-- Name: sales_reports sales_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT sales_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3546 (class 2606 OID 246338)
-- Name: screening_basket_history screening_basket_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_basket_history
    ADD CONSTRAINT screening_basket_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3548 (class 2606 OID 246340)
-- Name: screening_destination_baskets screening_destination_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_destination_baskets
    ADD CONSTRAINT screening_destination_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3550 (class 2606 OID 246342)
-- Name: screening_lot_references screening_lot_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_lot_references
    ADD CONSTRAINT screening_lot_references_pkey PRIMARY KEY (id);


--
-- TOC entry 3552 (class 2606 OID 246344)
-- Name: screening_operations screening_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_operations
    ADD CONSTRAINT screening_operations_pkey PRIMARY KEY (id);


--
-- TOC entry 3554 (class 2606 OID 246346)
-- Name: screening_source_baskets screening_source_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_source_baskets
    ADD CONSTRAINT screening_source_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3556 (class 2606 OID 246348)
-- Name: selection_basket_history selection_basket_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_basket_history
    ADD CONSTRAINT selection_basket_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3558 (class 2606 OID 246350)
-- Name: selection_destination_baskets selection_destination_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_destination_baskets
    ADD CONSTRAINT selection_destination_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3560 (class 2606 OID 246352)
-- Name: selection_lot_references selection_lot_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_lot_references
    ADD CONSTRAINT selection_lot_references_pkey PRIMARY KEY (id);


--
-- TOC entry 3562 (class 2606 OID 246354)
-- Name: selection_source_baskets selection_source_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_source_baskets
    ADD CONSTRAINT selection_source_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3564 (class 2606 OID 246356)
-- Name: selections selections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selections
    ADD CONSTRAINT selections_pkey PRIMARY KEY (id);


--
-- TOC entry 3568 (class 2606 OID 246358)
-- Name: sgr_giornalieri sgr_giornalieri_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_giornalieri
    ADD CONSTRAINT sgr_giornalieri_pkey PRIMARY KEY (id);


--
-- TOC entry 3584 (class 2606 OID 344084)
-- Name: sgr_monthly sgr_monthly_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_monthly
    ADD CONSTRAINT sgr_monthly_pkey PRIMARY KEY (id);


--
-- TOC entry 3566 (class 2606 OID 246360)
-- Name: sgr sgr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr
    ADD CONSTRAINT sgr_pkey PRIMARY KEY (id);


--
-- TOC entry 3570 (class 2606 OID 246362)
-- Name: sizes sizes_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_code_unique UNIQUE (code);


--
-- TOC entry 3572 (class 2606 OID 246364)
-- Name: sizes sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_pkey PRIMARY KEY (id);


--
-- TOC entry 3604 (class 2606 OID 385113)
-- Name: sustainability_goals sustainability_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sustainability_goals
    ADD CONSTRAINT sustainability_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 3606 (class 2606 OID 385128)
-- Name: sustainability_reports sustainability_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sustainability_reports
    ADD CONSTRAINT sustainability_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3574 (class 2606 OID 246366)
-- Name: target_size_annotations target_size_annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_size_annotations
    ADD CONSTRAINT target_size_annotations_pkey PRIMARY KEY (id);


--
-- TOC entry 3611 (class 2606 OID 417802)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3613 (class 2606 OID 417804)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 3531 (class 1259 OID 434179)
-- Name: idx_baskets_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_active ON public.baskets USING btree (active);


--
-- TOC entry 3532 (class 1259 OID 434181)
-- Name: idx_baskets_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_external_id ON public.baskets USING btree (external_id);


--
-- TOC entry 3635 (class 1259 OID 442511)
-- Name: idx_delivery_reports_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_reports_client_id ON public.delivery_reports USING btree (client_id);


--
-- TOC entry 3636 (class 1259 OID 442510)
-- Name: idx_delivery_reports_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_reports_order_id ON public.delivery_reports USING btree (order_id);


--
-- TOC entry 3637 (class 1259 OID 442509)
-- Name: idx_delivery_reports_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_reports_report_id ON public.delivery_reports USING btree (report_id);


--
-- TOC entry 3629 (class 1259 OID 442437)
-- Name: idx_documents_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_entity ON public.documents USING btree (entity_type, entity_id);


--
-- TOC entry 3585 (class 1259 OID 368678)
-- Name: idx_lot_inventory_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_inventory_transactions_date ON public.lot_inventory_transactions USING btree (date);


--
-- TOC entry 3586 (class 1259 OID 368677)
-- Name: idx_lot_inventory_transactions_lot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_inventory_transactions_lot_id ON public.lot_inventory_transactions USING btree (lot_id);


--
-- TOC entry 3589 (class 1259 OID 368680)
-- Name: idx_lot_mortality_records_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_mortality_records_date ON public.lot_mortality_records USING btree (calculation_date);


--
-- TOC entry 3590 (class 1259 OID 368679)
-- Name: idx_lot_mortality_records_lot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_mortality_records_lot_id ON public.lot_mortality_records USING btree (lot_id);


--
-- TOC entry 3537 (class 1259 OID 434180)
-- Name: idx_lots_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_active ON public.lots USING btree (active);


--
-- TOC entry 3538 (class 1259 OID 434182)
-- Name: idx_lots_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_external_id ON public.lots USING btree (external_id);


--
-- TOC entry 3607 (class 1259 OID 393245)
-- Name: idx_operation_impact_defaults_operation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_impact_defaults_operation_type ON public.operation_impact_defaults USING btree (operation_type);


--
-- TOC entry 3621 (class 1259 OID 442435)
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- TOC entry 3616 (class 1259 OID 442434)
-- Name: idx_orders_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_client_id ON public.orders USING btree (client_id);


--
-- TOC entry 3624 (class 1259 OID 442436)
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- TOC entry 3641 (class 1259 OID 442513)
-- Name: idx_report_templates_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_templates_type ON public.report_templates USING btree (type);


--
-- TOC entry 3630 (class 1259 OID 442508)
-- Name: idx_reports_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_type ON public.reports USING btree (type);


--
-- TOC entry 3638 (class 1259 OID 442512)
-- Name: idx_sales_reports_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_reports_report_id ON public.sales_reports USING btree (report_id);


--
-- TOC entry 3650 (class 2606 OID 385098)
-- Name: cycle_impacts cycle_impacts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycle_impacts
    ADD CONSTRAINT cycle_impacts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.impact_categories(id);


--
-- TOC entry 3658 (class 2606 OID 442524)
-- Name: delivery_reports fk_delivery_reports_client_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reports
    ADD CONSTRAINT fk_delivery_reports_client_id FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- TOC entry 3659 (class 2606 OID 442519)
-- Name: delivery_reports fk_delivery_reports_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reports
    ADD CONSTRAINT fk_delivery_reports_order_id FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 3660 (class 2606 OID 442514)
-- Name: delivery_reports fk_delivery_reports_report_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reports
    ADD CONSTRAINT fk_delivery_reports_report_id FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- TOC entry 3653 (class 2606 OID 442453)
-- Name: order_items fk_order_items_lot_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_lot_id FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;


--
-- TOC entry 3654 (class 2606 OID 442443)
-- Name: order_items fk_order_items_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 3655 (class 2606 OID 442458)
-- Name: order_items fk_order_items_size_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_size_id FOREIGN KEY (size_id) REFERENCES public.sizes(id) ON DELETE SET NULL;


--
-- TOC entry 3652 (class 2606 OID 442438)
-- Name: orders fk_orders_client_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_client_id FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- TOC entry 3656 (class 2606 OID 442448)
-- Name: payments fk_payments_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_payments_order_id FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 3665 (class 2606 OID 442554)
-- Name: report_templates fk_report_templates_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT fk_report_templates_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3657 (class 2606 OID 442549)
-- Name: reports fk_reports_generated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fk_reports_generated_by FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3661 (class 2606 OID 442529)
-- Name: sales_reports fk_sales_reports_report_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT fk_sales_reports_report_id FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- TOC entry 3662 (class 2606 OID 442534)
-- Name: sales_reports fk_sales_reports_top_client_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT fk_sales_reports_top_client_id FOREIGN KEY (top_client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- TOC entry 3663 (class 2606 OID 442544)
-- Name: sales_reports fk_sales_reports_top_lot_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT fk_sales_reports_top_lot_id FOREIGN KEY (top_lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;


--
-- TOC entry 3664 (class 2606 OID 442539)
-- Name: sales_reports fk_sales_reports_top_size_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT fk_sales_reports_top_size_id FOREIGN KEY (top_size_id) REFERENCES public.sizes(id) ON DELETE SET NULL;


--
-- TOC entry 3649 (class 2606 OID 385083)
-- Name: flupsy_impacts flupsy_impacts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsy_impacts
    ADD CONSTRAINT flupsy_impacts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.impact_categories(id);


--
-- TOC entry 3647 (class 2606 OID 385053)
-- Name: impact_factors impact_factors_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_factors
    ADD CONSTRAINT impact_factors_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.impact_categories(id);


--
-- TOC entry 3644 (class 2606 OID 368651)
-- Name: lot_inventory_transactions lot_inventory_transactions_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions
    ADD CONSTRAINT lot_inventory_transactions_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- TOC entry 3645 (class 2606 OID 368656)
-- Name: lot_inventory_transactions lot_inventory_transactions_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions
    ADD CONSTRAINT lot_inventory_transactions_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operations(id) ON DELETE SET NULL;


--
-- TOC entry 3646 (class 2606 OID 368672)
-- Name: lot_mortality_records lot_mortality_records_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mortality_records
    ADD CONSTRAINT lot_mortality_records_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- TOC entry 3648 (class 2606 OID 385068)
-- Name: operation_impacts operation_impacts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_impacts
    ADD CONSTRAINT operation_impacts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.impact_categories(id);


--
-- TOC entry 3651 (class 2606 OID 385114)
-- Name: sustainability_goals sustainability_goals_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sustainability_goals
    ADD CONSTRAINT sustainability_goals_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.impact_categories(id);


-- Completed on 2025-05-14 07:29:52 UTC

--
-- PostgreSQL database dump complete
--

