--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (63f4182)
-- Dumped by pg_dump version 16.9

-- Started on 2025-10-06 14:25:31 UTC

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
ALTER TABLE IF EXISTS ONLY public.operations DROP CONSTRAINT IF EXISTS fk_operations_size_id;
ALTER TABLE IF EXISTS ONLY public.operations DROP CONSTRAINT IF EXISTS fk_operations_lot_id;
ALTER TABLE IF EXISTS ONLY public.operations DROP CONSTRAINT IF EXISTS fk_operations_cycle_id;
ALTER TABLE IF EXISTS ONLY public.operations DROP CONSTRAINT IF EXISTS fk_operations_basket_id;
ALTER TABLE IF EXISTS ONLY public.delivery_reports DROP CONSTRAINT IF EXISTS fk_delivery_reports_report_id;
ALTER TABLE IF EXISTS ONLY public.delivery_reports DROP CONSTRAINT IF EXISTS fk_delivery_reports_order_id;
ALTER TABLE IF EXISTS ONLY public.delivery_reports DROP CONSTRAINT IF EXISTS fk_delivery_reports_client_id;
ALTER TABLE IF EXISTS ONLY public.cycles DROP CONSTRAINT IF EXISTS fk_cycles_basket_id;
ALTER TABLE IF EXISTS ONLY public.baskets DROP CONSTRAINT IF EXISTS fk_baskets_flupsy_id;
ALTER TABLE IF EXISTS ONLY public.ddt DROP CONSTRAINT IF EXISTS ddt_cliente_id_fkey;
ALTER TABLE IF EXISTS ONLY public.cycle_impacts DROP CONSTRAINT IF EXISTS cycle_impacts_category_id_fkey;
ALTER TABLE IF EXISTS ONLY public.advanced_sales DROP CONSTRAINT IF EXISTS advanced_sales_ddt_id_fkey;
DROP INDEX IF EXISTS public.idx_target_size_annotations_target_size_id;
DROP INDEX IF EXISTS public.idx_target_size_annotations_status;
DROP INDEX IF EXISTS public.idx_target_size_annotations_predicted_date;
DROP INDEX IF EXISTS public.idx_target_size_annotations_basket_id;
DROP INDEX IF EXISTS public.idx_sync_log_tipo_operazione;
DROP INDEX IF EXISTS public.idx_sync_log_entita;
DROP INDEX IF EXISTS public.idx_sync_log_created_at;
DROP INDEX IF EXISTS public.idx_sgr_month;
DROP INDEX IF EXISTS public.idx_sgr_giornalieri_record_date;
DROP INDEX IF EXISTS public.idx_selections_status;
DROP INDEX IF EXISTS public.idx_selections_date;
DROP INDEX IF EXISTS public.idx_selection_source_baskets_selection_id;
DROP INDEX IF EXISTS public.idx_selection_destination_baskets_selection_id;
DROP INDEX IF EXISTS public.idx_screening_operations_status;
DROP INDEX IF EXISTS public.idx_screening_operations_date;
DROP INDEX IF EXISTS public.idx_sales_reports_report_id;
DROP INDEX IF EXISTS public.idx_sale_operations_ref_sale_id;
DROP INDEX IF EXISTS public.idx_sale_operations_ref_operation_id;
DROP INDEX IF EXISTS public.idx_sale_bags_sale_id;
DROP INDEX IF EXISTS public.idx_reports_type;
DROP INDEX IF EXISTS public.idx_report_templates_type;
DROP INDEX IF EXISTS public.idx_payments_order_id;
DROP INDEX IF EXISTS public.idx_orders_client_id;
DROP INDEX IF EXISTS public.idx_order_items_order_id;
DROP INDEX IF EXISTS public.idx_operations_weight_date;
DROP INDEX IF EXISTS public.idx_operations_type_date;
DROP INDEX IF EXISTS public.idx_operations_type;
DROP INDEX IF EXISTS public.idx_operations_size_id;
DROP INDEX IF EXISTS public.idx_operations_lot_id;
DROP INDEX IF EXISTS public.idx_operations_date_type_basket;
DROP INDEX IF EXISTS public.idx_operations_date_type;
DROP INDEX IF EXISTS public.idx_operations_date_id;
DROP INDEX IF EXISTS public.idx_operations_date;
DROP INDEX IF EXISTS public.idx_operations_cycle_id;
DROP INDEX IF EXISTS public.idx_operations_basket_latest;
DROP INDEX IF EXISTS public.idx_operations_basket_id_id;
DROP INDEX IF EXISTS public.idx_operations_basket_id_date;
DROP INDEX IF EXISTS public.idx_operations_basket_id;
DROP INDEX IF EXISTS public.idx_operation_impact_defaults_operation_type;
DROP INDEX IF EXISTS public.idx_notifications_unread;
DROP INDEX IF EXISTS public.idx_notifications_type;
DROP INDEX IF EXISTS public.idx_notifications_related_entity;
DROP INDEX IF EXISTS public.idx_notifications_is_read;
DROP INDEX IF EXISTS public.idx_notifications_created_at;
DROP INDEX IF EXISTS public.idx_mv_active_cycles_stats_flupsy_id;
DROP INDEX IF EXISTS public.idx_mv_active_cycles_stats_cycle_id;
DROP INDEX IF EXISTS public.idx_mv_active_cycles_stats_basket_id;
DROP INDEX IF EXISTS public.idx_mv_active_baskets_size_id;
DROP INDEX IF EXISTS public.idx_mv_active_baskets_flupsy_id;
DROP INDEX IF EXISTS public.idx_mv_active_baskets_basket_id;
DROP INDEX IF EXISTS public.idx_lots_supplier;
DROP INDEX IF EXISTS public.idx_lots_state;
DROP INDEX IF EXISTS public.idx_lots_size_id;
DROP INDEX IF EXISTS public.idx_lots_quality_date;
DROP INDEX IF EXISTS public.idx_lots_quality;
DROP INDEX IF EXISTS public.idx_lots_external_id;
DROP INDEX IF EXISTS public.idx_lots_arrival_date;
DROP INDEX IF EXISTS public.idx_lots_animal_count;
DROP INDEX IF EXISTS public.idx_lots_active;
DROP INDEX IF EXISTS public.idx_lot_mortality_records_lot_id;
DROP INDEX IF EXISTS public.idx_lot_mortality_records_date;
DROP INDEX IF EXISTS public.idx_lot_inventory_transactions_lot_id;
DROP INDEX IF EXISTS public.idx_lot_inventory_transactions_date;
DROP INDEX IF EXISTS public.idx_flupsys_active;
DROP INDEX IF EXISTS public.idx_documents_entity;
DROP INDEX IF EXISTS public.idx_delivery_reports_report_id;
DROP INDEX IF EXISTS public.idx_delivery_reports_order_id;
DROP INDEX IF EXISTS public.idx_delivery_reports_client_id;
DROP INDEX IF EXISTS public.idx_ddt_numero;
DROP INDEX IF EXISTS public.idx_ddt_fatture_in_cloud_id;
DROP INDEX IF EXISTS public.idx_ddt_data;
DROP INDEX IF EXISTS public.idx_cycles_state_startdate;
DROP INDEX IF EXISTS public.idx_cycles_state;
DROP INDEX IF EXISTS public.idx_cycles_startdate;
DROP INDEX IF EXISTS public.idx_cycles_basket_id_end_date;
DROP INDEX IF EXISTS public.idx_cycles_basket_id;
DROP INDEX IF EXISTS public.idx_cycles_active_end_null;
DROP INDEX IF EXISTS public.idx_cycles_active_basket;
DROP INDEX IF EXISTS public.idx_configurazione_chiave;
DROP INDEX IF EXISTS public.idx_clienti_piva;
DROP INDEX IF EXISTS public.idx_clienti_fatture_in_cloud_id;
DROP INDEX IF EXISTS public.idx_clienti_denominazione;
DROP INDEX IF EXISTS public.idx_baskets_state;
DROP INDEX IF EXISTS public.idx_baskets_row_position;
DROP INDEX IF EXISTS public.idx_baskets_position_not_null;
DROP INDEX IF EXISTS public.idx_baskets_physical_number;
DROP INDEX IF EXISTS public.idx_baskets_flupsy_state_cycle;
DROP INDEX IF EXISTS public.idx_baskets_flupsy_position;
DROP INDEX IF EXISTS public.idx_baskets_flupsy_id;
DROP INDEX IF EXISTS public.idx_baskets_external_id;
DROP INDEX IF EXISTS public.idx_baskets_cycle_code;
DROP INDEX IF EXISTS public.idx_baskets_current_cycle_id;
DROP INDEX IF EXISTS public.idx_baskets_active_flupsy;
DROP INDEX IF EXISTS public.idx_baskets_active;
DROP INDEX IF EXISTS public.idx_bag_allocations_bag_id;
DROP INDEX IF EXISTS public.idx_advanced_sales_status;
DROP INDEX IF EXISTS public.idx_advanced_sales_date;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_username_key;
ALTER TABLE IF EXISTS ONLY public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY public.target_size_annotations DROP CONSTRAINT IF EXISTS target_size_annotations_pkey;
ALTER TABLE IF EXISTS ONLY public.sync_status DROP CONSTRAINT IF EXISTS sync_status_table_name_key;
ALTER TABLE IF EXISTS ONLY public.sync_status DROP CONSTRAINT IF EXISTS sync_status_pkey;
ALTER TABLE IF EXISTS ONLY public.sync_log_fatture_in_cloud DROP CONSTRAINT IF EXISTS sync_log_fatture_in_cloud_pkey;
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
ALTER TABLE IF EXISTS ONLY public.sale_operations_ref DROP CONSTRAINT IF EXISTS sale_operations_ref_pkey;
ALTER TABLE IF EXISTS ONLY public.sale_bags DROP CONSTRAINT IF EXISTS sale_bags_pkey;
ALTER TABLE IF EXISTS ONLY public.reports DROP CONSTRAINT IF EXISTS reports_pkey;
ALTER TABLE IF EXISTS ONLY public.report_templates DROP CONSTRAINT IF EXISTS report_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_pkey;
ALTER TABLE IF EXISTS ONLY public.orders DROP CONSTRAINT IF EXISTS orders_order_number_key;
ALTER TABLE IF EXISTS ONLY public.order_items DROP CONSTRAINT IF EXISTS order_items_pkey;
ALTER TABLE IF EXISTS ONLY public.operators DROP CONSTRAINT IF EXISTS operators_pkey;
ALTER TABLE IF EXISTS ONLY public.operators DROP CONSTRAINT IF EXISTS operators_operator_id_key;
ALTER TABLE IF EXISTS ONLY public.operations DROP CONSTRAINT IF EXISTS operations_pkey;
ALTER TABLE IF EXISTS ONLY public.operation_impacts DROP CONSTRAINT IF EXISTS operation_impacts_pkey;
ALTER TABLE IF EXISTS ONLY public.operation_impact_defaults DROP CONSTRAINT IF EXISTS operation_impact_defaults_pkey;
ALTER TABLE IF EXISTS ONLY public.notifications DROP CONSTRAINT IF EXISTS notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.notification_settings DROP CONSTRAINT IF EXISTS notification_settings_pkey;
ALTER TABLE IF EXISTS ONLY public.mortality_rates DROP CONSTRAINT IF EXISTS mortality_rates_pkey;
ALTER TABLE IF EXISTS ONLY public.measurements DROP CONSTRAINT IF EXISTS measurements_pkey;
ALTER TABLE IF EXISTS ONLY public.lots DROP CONSTRAINT IF EXISTS lots_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_mortality_records DROP CONSTRAINT IF EXISTS lot_mortality_records_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_ledger DROP CONSTRAINT IF EXISTS lot_ledger_pkey;
ALTER TABLE IF EXISTS ONLY public.lot_ledger DROP CONSTRAINT IF EXISTS lot_ledger_idempotency_key_key;
ALTER TABLE IF EXISTS ONLY public.lot_inventory_transactions DROP CONSTRAINT IF EXISTS lot_inventory_transactions_pkey;
ALTER TABLE IF EXISTS ONLY public.impact_factors DROP CONSTRAINT IF EXISTS impact_factors_pkey;
ALTER TABLE IF EXISTS ONLY public.impact_categories DROP CONSTRAINT IF EXISTS impact_categories_pkey;
ALTER TABLE IF EXISTS ONLY public.flupsys DROP CONSTRAINT IF EXISTS flupsys_pkey;
ALTER TABLE IF EXISTS ONLY public.flupsy_impacts DROP CONSTRAINT IF EXISTS flupsy_impacts_pkey;
ALTER TABLE IF EXISTS ONLY public.fatture_in_cloud_config DROP CONSTRAINT IF EXISTS fatture_in_cloud_config_pkey;
ALTER TABLE IF EXISTS ONLY public.external_sales_sync DROP CONSTRAINT IF EXISTS external_sales_sync_pkey;
ALTER TABLE IF EXISTS ONLY public.external_sales_sync DROP CONSTRAINT IF EXISTS external_sales_sync_external_id_key;
ALTER TABLE IF EXISTS ONLY public.external_delivery_details_sync DROP CONSTRAINT IF EXISTS external_delivery_details_sync_pkey;
ALTER TABLE IF EXISTS ONLY public.external_delivery_details_sync DROP CONSTRAINT IF EXISTS external_delivery_details_sync_external_id_key;
ALTER TABLE IF EXISTS ONLY public.external_deliveries_sync DROP CONSTRAINT IF EXISTS external_deliveries_sync_pkey;
ALTER TABLE IF EXISTS ONLY public.external_deliveries_sync DROP CONSTRAINT IF EXISTS external_deliveries_sync_external_id_key;
ALTER TABLE IF EXISTS ONLY public.external_customers_sync DROP CONSTRAINT IF EXISTS external_customers_sync_pkey;
ALTER TABLE IF EXISTS ONLY public.external_customers_sync DROP CONSTRAINT IF EXISTS external_customers_sync_external_id_key;
ALTER TABLE IF EXISTS ONLY public.email_config DROP CONSTRAINT IF EXISTS email_config_pkey;
ALTER TABLE IF EXISTS ONLY public.email_config DROP CONSTRAINT IF EXISTS email_config_key_key;
ALTER TABLE IF EXISTS ONLY public.documents DROP CONSTRAINT IF EXISTS documents_pkey;
ALTER TABLE IF EXISTS ONLY public.delivery_reports DROP CONSTRAINT IF EXISTS delivery_reports_pkey;
ALTER TABLE IF EXISTS ONLY public.ddt_righe DROP CONSTRAINT IF EXISTS ddt_righe_pkey;
ALTER TABLE IF EXISTS ONLY public.ddt DROP CONSTRAINT IF EXISTS ddt_pkey;
ALTER TABLE IF EXISTS ONLY public.cycles DROP CONSTRAINT IF EXISTS cycles_pkey;
ALTER TABLE IF EXISTS ONLY public.cycle_impacts DROP CONSTRAINT IF EXISTS cycle_impacts_pkey;
ALTER TABLE IF EXISTS ONLY public.configurazione DROP CONSTRAINT IF EXISTS configurazione_pkey;
ALTER TABLE IF EXISTS ONLY public.configurazione DROP CONSTRAINT IF EXISTS configurazione_chiave_key;
ALTER TABLE IF EXISTS ONLY public.clients DROP CONSTRAINT IF EXISTS clients_pkey;
ALTER TABLE IF EXISTS ONLY public.clienti DROP CONSTRAINT IF EXISTS clienti_pkey;
ALTER TABLE IF EXISTS ONLY public.baskets DROP CONSTRAINT IF EXISTS baskets_pkey;
ALTER TABLE IF EXISTS ONLY public.basket_lot_composition DROP CONSTRAINT IF EXISTS basket_lot_composition_pkey;
ALTER TABLE IF EXISTS ONLY public.bag_allocations DROP CONSTRAINT IF EXISTS bag_allocations_pkey;
ALTER TABLE IF EXISTS ONLY public.advanced_sales DROP CONSTRAINT IF EXISTS advanced_sales_sale_number_key;
ALTER TABLE IF EXISTS ONLY public.advanced_sales DROP CONSTRAINT IF EXISTS advanced_sales_pkey;
ALTER TABLE IF EXISTS public.users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.target_size_annotations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sync_status ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sync_log_fatture_in_cloud ALTER COLUMN id DROP DEFAULT;
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
ALTER TABLE IF EXISTS public.sale_operations_ref ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.sale_bags ALTER COLUMN id DROP DEFAULT;
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
ALTER TABLE IF EXISTS public.measurements ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lots ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lot_mortality_records ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lot_ledger ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.lot_inventory_transactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.impact_factors ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.impact_categories ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.flupsys ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.flupsy_impacts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.fatture_in_cloud_config ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.external_sales_sync ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.external_delivery_details_sync ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.external_deliveries_sync ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.external_customers_sync ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.email_config ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.documents ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.delivery_reports ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.ddt_righe ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.ddt ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.cycles ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.cycle_impacts ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.configurazione ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.clients ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.clienti ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.baskets ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.basket_lot_composition ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.bag_allocations ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public.advanced_sales ALTER COLUMN id DROP DEFAULT;
DROP SEQUENCE IF EXISTS public.users_id_seq;
DROP TABLE IF EXISTS public.users;
DROP SEQUENCE IF EXISTS public.target_size_annotations_id_seq;
DROP TABLE IF EXISTS public.target_size_annotations;
DROP SEQUENCE IF EXISTS public.sync_status_id_seq;
DROP TABLE IF EXISTS public.sync_status;
DROP SEQUENCE IF EXISTS public.sync_log_fatture_in_cloud_id_seq;
DROP TABLE IF EXISTS public.sync_log_fatture_in_cloud;
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
DROP SEQUENCE IF EXISTS public.sale_operations_ref_id_seq;
DROP TABLE IF EXISTS public.sale_operations_ref;
DROP SEQUENCE IF EXISTS public.sale_bags_id_seq;
DROP TABLE IF EXISTS public.sale_bags;
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
DROP TABLE IF EXISTS public.operators;
DROP SEQUENCE IF EXISTS public.operations_id_seq;
DROP SEQUENCE IF EXISTS public.operation_impacts_id_seq;
DROP TABLE IF EXISTS public.operation_impacts;
DROP SEQUENCE IF EXISTS public.operation_impact_defaults_id_seq;
DROP TABLE IF EXISTS public.operation_impact_defaults;
DROP SEQUENCE IF EXISTS public.notifications_id_seq;
DROP TABLE IF EXISTS public.notifications;
DROP SEQUENCE IF EXISTS public.notification_settings_id_seq;
DROP TABLE IF EXISTS public.notification_settings;
DROP MATERIALIZED VIEW IF EXISTS public.mv_active_cycles_stats;
DROP MATERIALIZED VIEW IF EXISTS public.mv_active_baskets;
DROP TABLE IF EXISTS public.operations;
DROP SEQUENCE IF EXISTS public.mortality_rates_id_seq;
DROP TABLE IF EXISTS public.mortality_rates;
DROP SEQUENCE IF EXISTS public.measurements_id_seq;
DROP TABLE IF EXISTS public.measurements;
DROP SEQUENCE IF EXISTS public.lots_id_seq;
DROP TABLE IF EXISTS public.lots;
DROP SEQUENCE IF EXISTS public.lot_mortality_records_id_seq;
DROP TABLE IF EXISTS public.lot_mortality_records;
DROP SEQUENCE IF EXISTS public.lot_ledger_id_seq;
DROP TABLE IF EXISTS public.lot_ledger;
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
DROP SEQUENCE IF EXISTS public.fatture_in_cloud_config_id_seq;
DROP TABLE IF EXISTS public.fatture_in_cloud_config;
DROP SEQUENCE IF EXISTS public.external_sales_sync_id_seq;
DROP TABLE IF EXISTS public.external_sales_sync;
DROP SEQUENCE IF EXISTS public.external_delivery_details_sync_id_seq;
DROP TABLE IF EXISTS public.external_delivery_details_sync;
DROP SEQUENCE IF EXISTS public.external_deliveries_sync_id_seq;
DROP TABLE IF EXISTS public.external_deliveries_sync;
DROP SEQUENCE IF EXISTS public.external_customers_sync_id_seq;
DROP TABLE IF EXISTS public.external_customers_sync;
DROP SEQUENCE IF EXISTS public.email_config_id_seq;
DROP TABLE IF EXISTS public.email_config;
DROP SEQUENCE IF EXISTS public.documents_id_seq;
DROP TABLE IF EXISTS public.documents;
DROP SEQUENCE IF EXISTS public.delivery_reports_id_seq;
DROP TABLE IF EXISTS public.delivery_reports;
DROP SEQUENCE IF EXISTS public.ddt_righe_id_seq;
DROP TABLE IF EXISTS public.ddt_righe;
DROP SEQUENCE IF EXISTS public.ddt_id_seq;
DROP TABLE IF EXISTS public.ddt;
DROP SEQUENCE IF EXISTS public.cycles_id_seq;
DROP TABLE IF EXISTS public.cycles;
DROP SEQUENCE IF EXISTS public.cycle_impacts_id_seq;
DROP TABLE IF EXISTS public.cycle_impacts;
DROP SEQUENCE IF EXISTS public.configurazione_id_seq;
DROP TABLE IF EXISTS public.configurazione;
DROP SEQUENCE IF EXISTS public.clients_id_seq;
DROP TABLE IF EXISTS public.clients;
DROP SEQUENCE IF EXISTS public.clienti_id_seq;
DROP TABLE IF EXISTS public.clienti;
DROP SEQUENCE IF EXISTS public.baskets_id_seq;
DROP TABLE IF EXISTS public.baskets;
DROP SEQUENCE IF EXISTS public.basket_lot_composition_id_seq;
DROP TABLE IF EXISTS public.basket_lot_composition;
DROP SEQUENCE IF EXISTS public.bag_allocations_id_seq;
DROP TABLE IF EXISTS public.bag_allocations;
DROP SEQUENCE IF EXISTS public.advanced_sales_id_seq;
DROP TABLE IF EXISTS public.advanced_sales;
DROP FUNCTION IF EXISTS public.refresh_all_materialized_views();
DROP TYPE IF EXISTS public.operation_type;
DROP TYPE IF EXISTS public.goal_status;
DROP SCHEMA IF EXISTS public;
--
-- TOC entry 7 (class 2615 OID 246165)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- TOC entry 1049 (class 1247 OID 385025)
-- Name: goal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.goal_status AS ENUM (
    'planned',
    'in-progress',
    'completed',
    'cancelled'
);


--
-- TOC entry 1073 (class 1247 OID 393217)
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


--
-- TOC entry 357 (class 1255 OID 499829)
-- Name: refresh_all_materialized_views(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_all_materialized_views() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_active_baskets;
    REFRESH MATERIALIZED VIEW mv_active_cycles_stats;
    REFRESH MATERIALIZED VIEW mv_current_basket_positions;
END;
$$;


SET default_table_access_method = heap;

--
-- TOC entry 322 (class 1259 OID 720897)
-- Name: advanced_sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.advanced_sales (
    id integer NOT NULL,
    sale_number text NOT NULL,
    customer_id integer,
    customer_name text,
    customer_details jsonb,
    sale_date date NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    total_weight real,
    total_animals integer,
    total_bags integer,
    notes text,
    pdf_path text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone,
    ddt_id integer,
    ddt_status character varying(20) DEFAULT 'nessuno'::character varying
);


--
-- TOC entry 321 (class 1259 OID 720896)
-- Name: advanced_sales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.advanced_sales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4263 (class 0 OID 0)
-- Dependencies: 321
-- Name: advanced_sales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.advanced_sales_id_seq OWNED BY public.advanced_sales.id;


--
-- TOC entry 326 (class 1259 OID 720921)
-- Name: bag_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bag_allocations (
    id integer NOT NULL,
    sale_bag_id integer NOT NULL,
    source_operation_id integer NOT NULL,
    source_basket_id integer NOT NULL,
    allocated_animals integer NOT NULL,
    allocated_weight real NOT NULL,
    source_animals_per_kg real,
    source_size_code text
);


--
-- TOC entry 325 (class 1259 OID 720920)
-- Name: bag_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bag_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4264 (class 0 OID 0)
-- Dependencies: 325
-- Name: bag_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bag_allocations_id_seq OWNED BY public.bag_allocations.id;


--
-- TOC entry 339 (class 1259 OID 958465)
-- Name: basket_lot_composition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.basket_lot_composition (
    id integer NOT NULL,
    basket_id integer NOT NULL,
    cycle_id integer NOT NULL,
    lot_id integer NOT NULL,
    animal_count integer NOT NULL,
    percentage real NOT NULL,
    source_selection_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text
);


--
-- TOC entry 338 (class 1259 OID 958464)
-- Name: basket_lot_composition_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.basket_lot_composition_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4265 (class 0 OID 0)
-- Dependencies: 338
-- Name: basket_lot_composition_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.basket_lot_composition_id_seq OWNED BY public.basket_lot_composition.id;


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
-- TOC entry 4266 (class 0 OID 0)
-- Dependencies: 220
-- Name: baskets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.baskets_id_seq OWNED BY public.baskets.id;


--
-- TOC entry 334 (class 1259 OID 786458)
-- Name: clienti; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clienti (
    id integer NOT NULL,
    denominazione character varying(255) NOT NULL,
    piva character varying(20),
    email character varying(255),
    telefono character varying(20),
    fatture_in_cloud_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    indirizzo text,
    comune text,
    cap text,
    provincia text,
    paese text DEFAULT 'Italia'::text,
    codice_fiscale text,
    attivo boolean DEFAULT true
);


--
-- TOC entry 333 (class 1259 OID 786457)
-- Name: clienti_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clienti_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4267 (class 0 OID 0)
-- Dependencies: 333
-- Name: clienti_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clienti_id_seq OWNED BY public.clienti.id;


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
-- TOC entry 4268 (class 0 OID 0)
-- Dependencies: 289
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- TOC entry 330 (class 1259 OID 786433)
-- Name: configurazione; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configurazione (
    id integer NOT NULL,
    chiave character varying(255) NOT NULL,
    valore text,
    descrizione text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 329 (class 1259 OID 786432)
-- Name: configurazione_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.configurazione_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4269 (class 0 OID 0)
-- Dependencies: 329
-- Name: configurazione_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.configurazione_id_seq OWNED BY public.configurazione.id;


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
-- TOC entry 4270 (class 0 OID 0)
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
    state text DEFAULT 'active'::text NOT NULL,
    lot_id integer
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
-- TOC entry 4271 (class 0 OID 0)
-- Dependencies: 222
-- Name: cycles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cycles_id_seq OWNED BY public.cycles.id;


--
-- TOC entry 332 (class 1259 OID 786446)
-- Name: ddt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ddt (
    id integer NOT NULL,
    numero integer NOT NULL,
    data date NOT NULL,
    totale_colli integer DEFAULT 0,
    peso_totale numeric(10,2) DEFAULT 0,
    ddt_stato character varying(50) DEFAULT 'nessuno'::character varying,
    fatture_in_cloud_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cliente_id integer,
    note text,
    cliente_nome character varying(255),
    cliente_indirizzo character varying(500),
    cliente_citta character varying(255),
    cliente_cap character varying(20),
    cliente_provincia character varying(10),
    cliente_piva character varying(50),
    cliente_codice_fiscale character varying(50),
    cliente_paese character varying(100) DEFAULT 'Italia'::character varying,
    fatture_in_cloud_numero text,
    company_id integer,
    mittente_ragione_sociale text,
    mittente_indirizzo text,
    mittente_cap text,
    mittente_citta text,
    mittente_provincia text,
    mittente_partita_iva text,
    mittente_codice_fiscale text,
    mittente_telefono text,
    mittente_email text,
    mittente_logo_path text
);


--
-- TOC entry 331 (class 1259 OID 786445)
-- Name: ddt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ddt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4272 (class 0 OID 0)
-- Dependencies: 331
-- Name: ddt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ddt_id_seq OWNED BY public.ddt.id;


--
-- TOC entry 345 (class 1259 OID 1212424)
-- Name: ddt_righe; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ddt_righe (
    id integer NOT NULL,
    ddt_id integer NOT NULL,
    descrizione text NOT NULL,
    quantita numeric(10,2) NOT NULL,
    unita_misura text DEFAULT 'NR'::text NOT NULL,
    prezzo_unitario numeric(10,2) DEFAULT 0 NOT NULL,
    advanced_sale_id integer,
    sale_bag_id integer,
    basket_id integer,
    size_code character varying(50),
    flupsy_name character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    report_dettaglio_id integer
);


--
-- TOC entry 344 (class 1259 OID 1212423)
-- Name: ddt_righe_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ddt_righe_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4273 (class 0 OID 0)
-- Dependencies: 344
-- Name: ddt_righe_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ddt_righe_id_seq OWNED BY public.ddt_righe.id;


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
-- TOC entry 4274 (class 0 OID 0)
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
-- TOC entry 4275 (class 0 OID 0)
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
-- TOC entry 4276 (class 0 OID 0)
-- Dependencies: 259
-- Name: email_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_config_id_seq OWNED BY public.email_config.id;


--
-- TOC entry 314 (class 1259 OID 704529)
-- Name: external_customers_sync; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_customers_sync (
    id integer NOT NULL,
    external_id integer NOT NULL,
    customer_code text NOT NULL,
    customer_name text NOT NULL,
    customer_type text,
    vat_number text,
    tax_code text,
    address text,
    city text,
    province text,
    postal_code text,
    country text DEFAULT 'IT'::text,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    notes text,
    synced_at timestamp without time zone DEFAULT now() NOT NULL,
    last_modified_external timestamp without time zone
);


--
-- TOC entry 313 (class 1259 OID 704528)
-- Name: external_customers_sync_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_customers_sync_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4277 (class 0 OID 0)
-- Dependencies: 313
-- Name: external_customers_sync_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_customers_sync_id_seq OWNED BY public.external_customers_sync.id;


--
-- TOC entry 318 (class 1259 OID 712705)
-- Name: external_deliveries_sync; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_deliveries_sync (
    id integer NOT NULL,
    external_id integer NOT NULL,
    data_creazione timestamp without time zone NOT NULL,
    cliente_id integer,
    ordine_id integer,
    data_consegna date NOT NULL,
    stato character varying(50) NOT NULL,
    numero_totale_ceste integer NOT NULL,
    peso_totale_kg character varying(20) NOT NULL,
    totale_animali integer NOT NULL,
    taglia_media character varying(20),
    qrcode_url text,
    note text,
    numero_progressivo integer,
    synced_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_modified_external timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 317 (class 1259 OID 712704)
-- Name: external_deliveries_sync_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_deliveries_sync_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4278 (class 0 OID 0)
-- Dependencies: 317
-- Name: external_deliveries_sync_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_deliveries_sync_id_seq OWNED BY public.external_deliveries_sync.id;


--
-- TOC entry 320 (class 1259 OID 712718)
-- Name: external_delivery_details_sync; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_delivery_details_sync (
    id integer NOT NULL,
    external_id integer NOT NULL,
    report_id integer NOT NULL,
    misurazione_id integer,
    vasca_id integer NOT NULL,
    codice_sezione character varying(50) NOT NULL,
    numero_ceste integer NOT NULL,
    peso_ceste_kg character varying(20) NOT NULL,
    taglia character varying(20),
    animali_per_kg character varying(20),
    percentuale_guscio character varying(20),
    percentuale_mortalita character varying(20),
    numero_animali integer NOT NULL,
    note text,
    synced_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_modified_external timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 319 (class 1259 OID 712717)
-- Name: external_delivery_details_sync_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_delivery_details_sync_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4279 (class 0 OID 0)
-- Dependencies: 319
-- Name: external_delivery_details_sync_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_delivery_details_sync_id_seq OWNED BY public.external_delivery_details_sync.id;


--
-- TOC entry 316 (class 1259 OID 704543)
-- Name: external_sales_sync; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_sales_sync (
    id integer NOT NULL,
    external_id integer NOT NULL,
    sale_number text NOT NULL,
    sale_date date NOT NULL,
    customer_id integer,
    customer_name text,
    product_code text,
    product_name text NOT NULL,
    product_category text,
    quantity numeric(12,3) NOT NULL,
    unit_of_measure text DEFAULT 'kg'::text,
    unit_price numeric(10,4),
    total_amount numeric(12,2) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    discount_amount numeric(10,2) DEFAULT 0,
    net_amount numeric(12,2) NOT NULL,
    vat_percent numeric(5,2) DEFAULT 22,
    vat_amount numeric(10,2) DEFAULT 0,
    total_with_vat numeric(12,2) NOT NULL,
    payment_method text,
    delivery_date date,
    origin text,
    lot_reference text,
    sales_person text,
    notes text,
    status text DEFAULT 'completed'::text,
    synced_at timestamp without time zone DEFAULT now() NOT NULL,
    last_modified_external timestamp without time zone
);


--
-- TOC entry 315 (class 1259 OID 704542)
-- Name: external_sales_sync_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.external_sales_sync_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4280 (class 0 OID 0)
-- Dependencies: 315
-- Name: external_sales_sync_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.external_sales_sync_id_seq OWNED BY public.external_sales_sync.id;


--
-- TOC entry 343 (class 1259 OID 1114113)
-- Name: fatture_in_cloud_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fatture_in_cloud_config (
    id integer NOT NULL,
    api_key text,
    api_uid text,
    company_id integer,
    access_token text,
    refresh_token text,
    expires_at timestamp without time zone,
    token_type text DEFAULT 'Bearer'::text,
    default_payment_method text,
    default_causale_trasporto text DEFAULT 'Vendita'::text,
    default_aspetto_beni text DEFAULT 'Colli'::text,
    default_porto text DEFAULT 'Franco'::text,
    numerazione_automatica boolean DEFAULT true,
    prefisso_numero text,
    invio_email_automatico boolean DEFAULT false,
    email_mittente text,
    email_oggetto_template text,
    email_corpo_template text,
    attivo boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    ragione_sociale text,
    indirizzo text,
    cap text,
    citta text,
    provincia text,
    partita_iva text,
    codice_fiscale text,
    telefono text,
    email text,
    logo_path text
);


--
-- TOC entry 342 (class 1259 OID 1114112)
-- Name: fatture_in_cloud_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fatture_in_cloud_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4281 (class 0 OID 0)
-- Dependencies: 342
-- Name: fatture_in_cloud_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fatture_in_cloud_config_id_seq OWNED BY public.fatture_in_cloud_config.id;


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
-- TOC entry 4282 (class 0 OID 0)
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
-- TOC entry 4283 (class 0 OID 0)
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
-- TOC entry 4284 (class 0 OID 0)
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
-- TOC entry 4285 (class 0 OID 0)
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
-- TOC entry 4286 (class 0 OID 0)
-- Dependencies: 267
-- Name: lot_inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_inventory_transactions_id_seq OWNED BY public.lot_inventory_transactions.id;


--
-- TOC entry 341 (class 1259 OID 1073153)
-- Name: lot_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lot_ledger (
    id integer NOT NULL,
    date date NOT NULL,
    lot_id integer NOT NULL,
    type text NOT NULL,
    quantity numeric(18,3) NOT NULL,
    source_cycle_id integer,
    dest_cycle_id integer,
    selection_id integer,
    operation_id integer,
    basket_id integer,
    allocation_method text DEFAULT 'proportional'::text NOT NULL,
    allocation_basis jsonb,
    idempotency_key text,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT lot_ledger_allocation_method_check CHECK ((allocation_method = ANY (ARRAY['proportional'::text, 'measured'::text]))),
    CONSTRAINT lot_ledger_type_check CHECK ((type = ANY (ARRAY['in'::text, 'transfer_out'::text, 'transfer_in'::text, 'sale'::text, 'mortality'::text])))
);


--
-- TOC entry 340 (class 1259 OID 1073152)
-- Name: lot_ledger_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lot_ledger_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4287 (class 0 OID 0)
-- Dependencies: 340
-- Name: lot_ledger_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lot_ledger_id_seq OWNED BY public.lot_ledger.id;


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
-- TOC entry 4288 (class 0 OID 0)
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
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    total_mortality integer DEFAULT 0,
    last_mortality_date date,
    mortality_notes text
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
-- TOC entry 4289 (class 0 OID 0)
-- Dependencies: 226
-- Name: lots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lots_id_seq OWNED BY public.lots.id;


--
-- TOC entry 308 (class 1259 OID 491521)
-- Name: measurements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.measurements (
    id integer NOT NULL,
    operation_id integer NOT NULL,
    basket_id integer NOT NULL,
    weight real,
    animal_count integer,
    animals_per_kg real,
    temperature real,
    salinity real,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone
);


--
-- TOC entry 307 (class 1259 OID 491520)
-- Name: measurements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.measurements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4290 (class 0 OID 0)
-- Dependencies: 307
-- Name: measurements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.measurements_id_seq OWNED BY public.measurements.id;


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
-- TOC entry 4291 (class 0 OID 0)
-- Dependencies: 228
-- Name: mortality_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mortality_rates_id_seq OWNED BY public.mortality_rates.id;


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
    metadata text,
    operator_id text,
    operator_name text
);


--
-- TOC entry 310 (class 1259 OID 507904)
-- Name: mv_active_baskets; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_active_baskets AS
 SELECT b.id AS basket_id,
    b.physical_number,
    b.flupsy_id,
    f.name AS flupsy_name,
    b."row",
    b."position",
    b.current_cycle_id,
    c.start_date AS cycle_start_date,
    c.state AS cycle_state,
    ( SELECT o.id
           FROM public.operations o
          WHERE (o.basket_id = b.id)
          ORDER BY o.date DESC, o.id DESC
         LIMIT 1) AS last_operation_id,
    ( SELECT o.type
           FROM public.operations o
          WHERE (o.basket_id = b.id)
          ORDER BY o.date DESC, o.id DESC
         LIMIT 1) AS last_operation_type,
    ( SELECT o.date
           FROM public.operations o
          WHERE (o.basket_id = b.id)
          ORDER BY o.date DESC, o.id DESC
         LIMIT 1) AS last_operation_date,
    ( SELECT o.animal_count
           FROM public.operations o
          WHERE (o.basket_id = b.id)
          ORDER BY o.date DESC, o.id DESC
         LIMIT 1) AS animal_count,
    ( SELECT o.average_weight
           FROM public.operations o
          WHERE ((o.basket_id = b.id) AND (o.type = 'peso'::text))
          ORDER BY o.date DESC, o.id DESC
         LIMIT 1) AS last_weight_average,
    ( SELECT o.size_id
           FROM public.operations o
          WHERE ((o.basket_id = b.id) AND (o.size_id IS NOT NULL))
          ORDER BY o.date DESC, o.id DESC
         LIMIT 1) AS size_id
   FROM ((public.baskets b
     JOIN public.flupsys f ON ((b.flupsy_id = f.id)))
     LEFT JOIN public.cycles c ON ((b.current_cycle_id = c.id)))
  WHERE (b.state = 'active'::text)
  WITH NO DATA;


--
-- TOC entry 309 (class 1259 OID 499810)
-- Name: mv_active_cycles_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_active_cycles_stats AS
 SELECT c.id AS cycle_id,
    c.basket_id,
    b.physical_number AS basket_number,
    b.flupsy_id,
    f.name AS flupsy_name,
    c.start_date,
    (CURRENT_DATE - c.start_date) AS days_active,
    ( SELECT count(*) AS count
           FROM public.operations o
          WHERE (o.cycle_id = c.id)) AS operation_count,
    ( SELECT o.animal_count
           FROM public.operations o
          WHERE (o.cycle_id = c.id)
          ORDER BY o.date DESC, o.id DESC
         LIMIT 1) AS current_animal_count,
    ( SELECT max(o.average_weight) AS max
           FROM public.operations o
          WHERE ((o.cycle_id = c.id) AND (o.type = 'peso'::text))) AS max_average_weight,
    ( SELECT o.date
           FROM public.operations o
          WHERE ((o.cycle_id = c.id) AND (o.type = 'peso'::text))
          ORDER BY o.date DESC
         LIMIT 1) AS last_weight_date
   FROM ((public.cycles c
     JOIN public.baskets b ON ((c.basket_id = b.id)))
     JOIN public.flupsys f ON ((b.flupsy_id = f.id)))
  WHERE (c.state = 'active'::text)
  WITH NO DATA;


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
-- TOC entry 4292 (class 0 OID 0)
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
-- TOC entry 4293 (class 0 OID 0)
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
-- TOC entry 4294 (class 0 OID 0)
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
-- TOC entry 4295 (class 0 OID 0)
-- Dependencies: 275
-- Name: operation_impacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operation_impacts_id_seq OWNED BY public.operation_impacts.id;


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
-- TOC entry 4296 (class 0 OID 0)
-- Dependencies: 230
-- Name: operations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operations_id_seq OWNED BY public.operations.id;


--
-- TOC entry 337 (class 1259 OID 884736)
-- Name: operators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operators (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    operator_id character varying NOT NULL,
    name character varying NOT NULL,
    password character varying NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


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
-- TOC entry 4297 (class 0 OID 0)
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
-- TOC entry 4298 (class 0 OID 0)
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
-- TOC entry 4299 (class 0 OID 0)
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
-- TOC entry 4300 (class 0 OID 0)
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
-- TOC entry 4301 (class 0 OID 0)
-- Dependencies: 299
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- TOC entry 324 (class 1259 OID 720910)
-- Name: sale_bags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_bags (
    id integer NOT NULL,
    advanced_sale_id integer NOT NULL,
    bag_number integer NOT NULL,
    size_code text NOT NULL,
    total_weight real NOT NULL,
    original_weight real NOT NULL,
    weight_loss real DEFAULT 0,
    animal_count integer NOT NULL,
    animals_per_kg real NOT NULL,
    original_animals_per_kg real NOT NULL,
    waste_percentage real DEFAULT 0,
    notes text
);


--
-- TOC entry 323 (class 1259 OID 720909)
-- Name: sale_bags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_bags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4302 (class 0 OID 0)
-- Dependencies: 323
-- Name: sale_bags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_bags_id_seq OWNED BY public.sale_bags.id;


--
-- TOC entry 328 (class 1259 OID 720930)
-- Name: sale_operations_ref; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_operations_ref (
    id integer NOT NULL,
    advanced_sale_id integer NOT NULL,
    operation_id integer NOT NULL,
    basket_id integer NOT NULL,
    original_animals integer,
    original_weight real,
    original_animals_per_kg real,
    included_in_sale boolean DEFAULT true
);


--
-- TOC entry 327 (class 1259 OID 720929)
-- Name: sale_operations_ref_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_operations_ref_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4303 (class 0 OID 0)
-- Dependencies: 327
-- Name: sale_operations_ref_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_operations_ref_id_seq OWNED BY public.sale_operations_ref.id;


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
-- TOC entry 4304 (class 0 OID 0)
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
-- TOC entry 4305 (class 0 OID 0)
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
-- TOC entry 4306 (class 0 OID 0)
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
-- TOC entry 4307 (class 0 OID 0)
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
-- TOC entry 4308 (class 0 OID 0)
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
-- TOC entry 4309 (class 0 OID 0)
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
-- TOC entry 4310 (class 0 OID 0)
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
-- TOC entry 4311 (class 0 OID 0)
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
-- TOC entry 4312 (class 0 OID 0)
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
-- TOC entry 4313 (class 0 OID 0)
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
-- TOC entry 4314 (class 0 OID 0)
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
-- TOC entry 4315 (class 0 OID 0)
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
-- TOC entry 4316 (class 0 OID 0)
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
-- TOC entry 4317 (class 0 OID 0)
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
-- TOC entry 4318 (class 0 OID 0)
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
-- TOC entry 4319 (class 0 OID 0)
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
-- TOC entry 4320 (class 0 OID 0)
-- Dependencies: 283
-- Name: sustainability_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sustainability_reports_id_seq OWNED BY public.sustainability_reports.id;


--
-- TOC entry 336 (class 1259 OID 786469)
-- Name: sync_log_fatture_in_cloud; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_log_fatture_in_cloud (
    id integer NOT NULL,
    tipo_operazione character varying(100) NOT NULL,
    entita character varying(100) NOT NULL,
    entita_id integer,
    fatture_in_cloud_id integer,
    stato character varying(50) NOT NULL,
    messaggio text,
    dati_richiesta text,
    dati_risposta text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 335 (class 1259 OID 786468)
-- Name: sync_log_fatture_in_cloud_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sync_log_fatture_in_cloud_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4321 (class 0 OID 0)
-- Dependencies: 335
-- Name: sync_log_fatture_in_cloud_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sync_log_fatture_in_cloud_id_seq OWNED BY public.sync_log_fatture_in_cloud.id;


--
-- TOC entry 312 (class 1259 OID 704513)
-- Name: sync_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_status (
    id integer NOT NULL,
    table_name text NOT NULL,
    last_sync_at timestamp without time zone,
    last_sync_success boolean DEFAULT true,
    sync_in_progress boolean DEFAULT false,
    record_count integer DEFAULT 0,
    error_message text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 311 (class 1259 OID 704512)
-- Name: sync_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sync_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4322 (class 0 OID 0)
-- Dependencies: 311
-- Name: sync_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sync_status_id_seq OWNED BY public.sync_status.id;


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
-- TOC entry 4323 (class 0 OID 0)
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
-- TOC entry 4324 (class 0 OID 0)
-- Dependencies: 287
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3655 (class 2604 OID 720900)
-- Name: advanced_sales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advanced_sales ALTER COLUMN id SET DEFAULT nextval('public.advanced_sales_id_seq'::regclass);


--
-- TOC entry 3662 (class 2604 OID 720924)
-- Name: bag_allocations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bag_allocations ALTER COLUMN id SET DEFAULT nextval('public.bag_allocations_id_seq'::regclass);


--
-- TOC entry 3686 (class 2604 OID 958468)
-- Name: basket_lot_composition id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.basket_lot_composition ALTER COLUMN id SET DEFAULT nextval('public.basket_lot_composition_id_seq'::regclass);


--
-- TOC entry 3508 (class 2604 OID 246303)
-- Name: baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baskets ALTER COLUMN id SET DEFAULT nextval('public.baskets_id_seq'::regclass);


--
-- TOC entry 3675 (class 2604 OID 786461)
-- Name: clienti id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clienti ALTER COLUMN id SET DEFAULT nextval('public.clienti_id_seq'::regclass);


--
-- TOC entry 3592 (class 2604 OID 442372)
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- TOC entry 3665 (class 2604 OID 786436)
-- Name: configurazione id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configurazione ALTER COLUMN id SET DEFAULT nextval('public.configurazione_id_seq'::regclass);


--
-- TOC entry 3579 (class 2604 OID 385092)
-- Name: cycle_impacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycle_impacts ALTER COLUMN id SET DEFAULT nextval('public.cycle_impacts_id_seq'::regclass);


--
-- TOC entry 3511 (class 2604 OID 246304)
-- Name: cycles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycles ALTER COLUMN id SET DEFAULT nextval('public.cycles_id_seq'::regclass);


--
-- TOC entry 3668 (class 2604 OID 786449)
-- Name: ddt id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ddt ALTER COLUMN id SET DEFAULT nextval('public.ddt_id_seq'::regclass);


--
-- TOC entry 3701 (class 2604 OID 1212427)
-- Name: ddt_righe id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ddt_righe ALTER COLUMN id SET DEFAULT nextval('public.ddt_righe_id_seq'::regclass);


--
-- TOC entry 3620 (class 2604 OID 442479)
-- Name: delivery_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reports ALTER COLUMN id SET DEFAULT nextval('public.delivery_reports_id_seq'::regclass);


--
-- TOC entry 3613 (class 2604 OID 442427)
-- Name: documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents ALTER COLUMN id SET DEFAULT nextval('public.documents_id_seq'::regclass);


--
-- TOC entry 3555 (class 2604 OID 327684)
-- Name: email_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_config ALTER COLUMN id SET DEFAULT nextval('public.email_config_id_seq'::regclass);


--
-- TOC entry 3637 (class 2604 OID 704532)
-- Name: external_customers_sync id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_customers_sync ALTER COLUMN id SET DEFAULT nextval('public.external_customers_sync_id_seq'::regclass);


--
-- TOC entry 3649 (class 2604 OID 712708)
-- Name: external_deliveries_sync id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_deliveries_sync ALTER COLUMN id SET DEFAULT nextval('public.external_deliveries_sync_id_seq'::regclass);


--
-- TOC entry 3652 (class 2604 OID 712721)
-- Name: external_delivery_details_sync id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_delivery_details_sync ALTER COLUMN id SET DEFAULT nextval('public.external_delivery_details_sync_id_seq'::regclass);


--
-- TOC entry 3641 (class 2604 OID 704546)
-- Name: external_sales_sync id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_sales_sync ALTER COLUMN id SET DEFAULT nextval('public.external_sales_sync_id_seq'::regclass);


--
-- TOC entry 3691 (class 2604 OID 1114116)
-- Name: fatture_in_cloud_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fatture_in_cloud_config ALTER COLUMN id SET DEFAULT nextval('public.fatture_in_cloud_config_id_seq'::regclass);


--
-- TOC entry 3577 (class 2604 OID 385077)
-- Name: flupsy_impacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsy_impacts ALTER COLUMN id SET DEFAULT nextval('public.flupsy_impacts_id_seq'::regclass);


--
-- TOC entry 3513 (class 2604 OID 246305)
-- Name: flupsys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsys ALTER COLUMN id SET DEFAULT nextval('public.flupsys_id_seq'::regclass);


--
-- TOC entry 3571 (class 2604 OID 385037)
-- Name: impact_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_categories ALTER COLUMN id SET DEFAULT nextval('public.impact_categories_id_seq'::regclass);


--
-- TOC entry 3573 (class 2604 OID 385047)
-- Name: impact_factors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_factors ALTER COLUMN id SET DEFAULT nextval('public.impact_factors_id_seq'::regclass);


--
-- TOC entry 3565 (class 2604 OID 368644)
-- Name: lot_inventory_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.lot_inventory_transactions_id_seq'::regclass);


--
-- TOC entry 3688 (class 2604 OID 1073156)
-- Name: lot_ledger id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_ledger ALTER COLUMN id SET DEFAULT nextval('public.lot_ledger_id_seq'::regclass);


--
-- TOC entry 3568 (class 2604 OID 368665)
-- Name: lot_mortality_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mortality_records ALTER COLUMN id SET DEFAULT nextval('public.lot_mortality_records_id_seq'::regclass);


--
-- TOC entry 3516 (class 2604 OID 246306)
-- Name: lots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots ALTER COLUMN id SET DEFAULT nextval('public.lots_id_seq'::regclass);


--
-- TOC entry 3629 (class 2604 OID 491524)
-- Name: measurements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurements ALTER COLUMN id SET DEFAULT nextval('public.measurements_id_seq'::regclass);


--
-- TOC entry 3521 (class 2604 OID 246307)
-- Name: mortality_rates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mortality_rates ALTER COLUMN id SET DEFAULT nextval('public.mortality_rates_id_seq'::regclass);


--
-- TOC entry 3560 (class 2604 OID 344068)
-- Name: notification_settings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings ALTER COLUMN id SET DEFAULT nextval('public.notification_settings_id_seq'::regclass);


--
-- TOC entry 3557 (class 2604 OID 335876)
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- TOC entry 3586 (class 2604 OID 393241)
-- Name: operation_impact_defaults id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_impact_defaults ALTER COLUMN id SET DEFAULT nextval('public.operation_impact_defaults_id_seq'::regclass);


--
-- TOC entry 3575 (class 2604 OID 385062)
-- Name: operation_impacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_impacts ALTER COLUMN id SET DEFAULT nextval('public.operation_impacts_id_seq'::regclass);


--
-- TOC entry 3522 (class 2604 OID 246308)
-- Name: operations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations ALTER COLUMN id SET DEFAULT nextval('public.operations_id_seq'::regclass);


--
-- TOC entry 3607 (class 2604 OID 442405)
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- TOC entry 3597 (class 2604 OID 442385)
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- TOC entry 3611 (class 2604 OID 442417)
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- TOC entry 3624 (class 2604 OID 442499)
-- Name: report_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates ALTER COLUMN id SET DEFAULT nextval('public.report_templates_id_seq'::regclass);


--
-- TOC entry 3616 (class 2604 OID 442467)
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- TOC entry 3659 (class 2604 OID 720913)
-- Name: sale_bags id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_bags ALTER COLUMN id SET DEFAULT nextval('public.sale_bags_id_seq'::regclass);


--
-- TOC entry 3663 (class 2604 OID 720933)
-- Name: sale_operations_ref id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_operations_ref ALTER COLUMN id SET DEFAULT nextval('public.sale_operations_ref_id_seq'::regclass);


--
-- TOC entry 3622 (class 2604 OID 442489)
-- Name: sales_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports ALTER COLUMN id SET DEFAULT nextval('public.sales_reports_id_seq'::regclass);


--
-- TOC entry 3523 (class 2604 OID 246309)
-- Name: screening_basket_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_basket_history ALTER COLUMN id SET DEFAULT nextval('public.screening_basket_history_id_seq'::regclass);


--
-- TOC entry 3525 (class 2604 OID 246310)
-- Name: screening_destination_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_destination_baskets ALTER COLUMN id SET DEFAULT nextval('public.screening_destination_baskets_id_seq'::regclass);


--
-- TOC entry 3528 (class 2604 OID 246311)
-- Name: screening_lot_references id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_lot_references ALTER COLUMN id SET DEFAULT nextval('public.screening_lot_references_id_seq'::regclass);


--
-- TOC entry 3530 (class 2604 OID 246312)
-- Name: screening_operations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_operations ALTER COLUMN id SET DEFAULT nextval('public.screening_operations_id_seq'::regclass);


--
-- TOC entry 3533 (class 2604 OID 246313)
-- Name: screening_source_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_source_baskets ALTER COLUMN id SET DEFAULT nextval('public.screening_source_baskets_id_seq'::regclass);


--
-- TOC entry 3537 (class 2604 OID 246314)
-- Name: selection_basket_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_basket_history ALTER COLUMN id SET DEFAULT nextval('public.selection_basket_history_id_seq'::regclass);


--
-- TOC entry 3539 (class 2604 OID 246315)
-- Name: selection_destination_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_destination_baskets ALTER COLUMN id SET DEFAULT nextval('public.selection_destination_baskets_id_seq'::regclass);


--
-- TOC entry 3541 (class 2604 OID 246316)
-- Name: selection_lot_references id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_lot_references ALTER COLUMN id SET DEFAULT nextval('public.selection_lot_references_id_seq'::regclass);


--
-- TOC entry 3543 (class 2604 OID 246317)
-- Name: selection_source_baskets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_source_baskets ALTER COLUMN id SET DEFAULT nextval('public.selection_source_baskets_id_seq'::regclass);


--
-- TOC entry 3545 (class 2604 OID 246318)
-- Name: selections id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selections ALTER COLUMN id SET DEFAULT nextval('public.selections_id_seq'::regclass);


--
-- TOC entry 3548 (class 2604 OID 246319)
-- Name: sgr id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr ALTER COLUMN id SET DEFAULT nextval('public.sgr_id_seq'::regclass);


--
-- TOC entry 3550 (class 2604 OID 246320)
-- Name: sgr_giornalieri id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_giornalieri ALTER COLUMN id SET DEFAULT nextval('public.sgr_giornalieri_id_seq'::regclass);


--
-- TOC entry 3563 (class 2604 OID 344079)
-- Name: sgr_monthly id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_monthly ALTER COLUMN id SET DEFAULT nextval('public.sgr_monthly_id_seq'::regclass);


--
-- TOC entry 3551 (class 2604 OID 246321)
-- Name: sizes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes ALTER COLUMN id SET DEFAULT nextval('public.sizes_id_seq'::regclass);


--
-- TOC entry 3581 (class 2604 OID 385107)
-- Name: sustainability_goals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sustainability_goals ALTER COLUMN id SET DEFAULT nextval('public.sustainability_goals_id_seq'::regclass);


--
-- TOC entry 3584 (class 2604 OID 385123)
-- Name: sustainability_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sustainability_reports ALTER COLUMN id SET DEFAULT nextval('public.sustainability_reports_id_seq'::regclass);


--
-- TOC entry 3680 (class 2604 OID 786472)
-- Name: sync_log_fatture_in_cloud id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_log_fatture_in_cloud ALTER COLUMN id SET DEFAULT nextval('public.sync_log_fatture_in_cloud_id_seq'::regclass);


--
-- TOC entry 3631 (class 2604 OID 704516)
-- Name: sync_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_status ALTER COLUMN id SET DEFAULT nextval('public.sync_status_id_seq'::regclass);


--
-- TOC entry 3552 (class 2604 OID 246322)
-- Name: target_size_annotations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_size_annotations ALTER COLUMN id SET DEFAULT nextval('public.target_size_annotations_id_seq'::regclass);


--
-- TOC entry 3588 (class 2604 OID 417796)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4234 (class 0 OID 720897)
-- Dependencies: 322
-- Data for Name: advanced_sales; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.advanced_sales (id, sale_number, customer_id, customer_name, customer_details, sale_date, status, total_weight, total_animals, total_bags, notes, pdf_path, created_at, updated_at, ddt_id, ddt_status) FROM stdin;
\.


--
-- TOC entry 4238 (class 0 OID 720921)
-- Dependencies: 326
-- Data for Name: bag_allocations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bag_allocations (id, sale_bag_id, source_operation_id, source_basket_id, allocated_animals, allocated_weight, source_animals_per_kg, source_size_code) FROM stdin;
\.


--
-- TOC entry 4251 (class 0 OID 958465)
-- Dependencies: 339
-- Data for Name: basket_lot_composition; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.basket_lot_composition (id, basket_id, cycle_id, lot_id, animal_count, percentage, source_selection_id, created_at, notes) FROM stdin;
1	1	6	2	13568	0.45226666	1	2025-10-06 06:50:48.41414	Da vagliatura #1 del 2025-10-06
2	1	6	1	16432	0.5477333	1	2025-10-06 06:50:48.41414	Da vagliatura #1 del 2025-10-06
3	2	7	2	27136	0.45226666	1	2025-10-06 06:50:48.41414	Da vagliatura #1 del 2025-10-06
4	2	7	1	32864	0.5477333	1	2025-10-06 06:50:48.41414	Da vagliatura #1 del 2025-10-06
5	3	8	2	25960	0.45226482	1	2025-10-06 06:50:48.41414	Da vagliatura #1 del 2025-10-06
6	3	8	1	31440	0.5477352	1	2025-10-06 06:50:48.41414	Da vagliatura #1 del 2025-10-06
7	4	9	2	29669	0.45227134	1	2025-10-06 06:50:48.41414	Da vagliatura #1 del 2025-10-06
8	4	9	1	35931	0.54772866	1	2025-10-06 06:50:48.41414	Da vagliatura #1 del 2025-10-06
\.


--
-- TOC entry 4131 (class 0 OID 246172)
-- Dependencies: 219
-- Data for Name: baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.baskets (id, physical_number, state, current_cycle_id, nfc_data, flupsy_id, "row", "position", cycle_code, active, external_id) FROM stdin;
5	5	available	\N	\N	570	DX	5	\N	t	\N
6	6	available	\N	\N	570	SX	1	\N	t	\N
7	7	available	\N	\N	570	SX	2	\N	t	\N
8	8	available	\N	\N	570	SX	3	\N	t	\N
9	9	available	\N	\N	570	SX	4	\N	t	\N
10	10	available	\N	\N	570	SX	5	\N	t	\N
1	1	available	\N	\N	570	DX	1	1-570-2510	t	\N
2	2	active	7	\N	570	DX	2	2-570-2510	t	\N
3	3	available	\N	\N	570	DX	3	\N	t	\N
4	4	active	9	\N	570	DX	4	\N	t	\N
\.


--
-- TOC entry 4246 (class 0 OID 786458)
-- Dependencies: 334
-- Data for Name: clienti; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clienti (id, denominazione, piva, email, telefono, fatture_in_cloud_id, created_at, updated_at, indirizzo, comune, cap, provincia, paese, codice_fiscale, attivo) FROM stdin;
\.


--
-- TOC entry 4202 (class 0 OID 442369)
-- Dependencies: 290
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, name, tax_id, email, phone, address, city, province, zip_code, country, contact_person, client_type, notes, active, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4242 (class 0 OID 786433)
-- Dependencies: 330
-- Data for Name: configurazione; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.configurazione (id, chiave, valore, descrizione, created_at, updated_at) FROM stdin;
1	fatture_in_cloud_client_secret	IM2MAowBFUm2zFDhlpt1DfELJvaR55xO8QqFrW21P0aEPxmRObUPxobikCYCRkCJ	Client Secret OAuth2 Fatture in Cloud	2025-07-28 07:52:55.92965	2025-07-28 08:37:01.332
21	fatture_in_cloud_access_token	a/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyZWYiOiJ3UmpyekdkVTZWVktwUEExMTNpTjY0M2o0M0ZNMW91MCIsImV4cCI6MTc1OTczNjQwNn0.Te3HCGamv_NpHurW-ZmStTnA0HmWb4iZU0U7li3bNXE	\N	2025-07-28 08:17:19.134381	2025-10-05 07:40:06.318
22	fatture_in_cloud_refresh_token	r/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyZWYiOiJiSm5nVXdqZm9CNkJMam1SQ1hycmRXQUs4SGhNcnB4RSJ9.j9Ero46uycNnkVBAWhWbzJ0geL_8-tCfnFrRLLPHeqs	\N	2025-07-28 08:17:19.607808	2025-10-05 07:40:06.729
23	fatture_in_cloud_token_expires_at	2025-10-06T07:40:07.137Z	\N	2025-07-28 08:17:20.046269	2025-10-05 07:40:07.137
3	fatture_in_cloud_company_id	1017299	ID Azienda selezionata in Fatture in Cloud	2025-07-28 07:54:59.140629	2025-10-05 08:27:17.738
2	fatture_in_cloud_client_id	NaZcLbgnbNh1sSWV5BCb7E50UqkQe5v4	Client ID OAuth2 Fatture in Cloud	2025-07-28 07:52:55.928908	2025-07-28 08:37:01.331
\.


--
-- TOC entry 4192 (class 0 OID 385089)
-- Dependencies: 280
-- Data for Name: cycle_impacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cycle_impacts (id, cycle_id, category_id, impact_value, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4133 (class 0 OID 246179)
-- Dependencies: 221
-- Data for Name: cycles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cycles (id, basket_id, start_date, end_date, state, lot_id) FROM stdin;
3	1	2025-10-01	2025-10-06	closed	2
4	2	2025-10-01	2025-10-06	closed	1
6	1	2025-10-06	2025-10-06	closed	1
7	2	2025-10-06	\N	active	1
8	3	2025-10-06	2025-10-06	closed	1
9	4	2025-10-06	\N	active	1
\.


--
-- TOC entry 4244 (class 0 OID 786446)
-- Dependencies: 332
-- Data for Name: ddt; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ddt (id, numero, data, totale_colli, peso_totale, ddt_stato, fatture_in_cloud_id, created_at, updated_at, cliente_id, note, cliente_nome, cliente_indirizzo, cliente_citta, cliente_cap, cliente_provincia, cliente_piva, cliente_codice_fiscale, cliente_paese, fatture_in_cloud_numero, company_id, mittente_ragione_sociale, mittente_indirizzo, mittente_cap, mittente_citta, mittente_provincia, mittente_partita_iva, mittente_codice_fiscale, mittente_telefono, mittente_email, mittente_logo_path) FROM stdin;
\.


--
-- TOC entry 4257 (class 0 OID 1212424)
-- Dependencies: 345
-- Data for Name: ddt_righe; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ddt_righe (id, ddt_id, descrizione, quantita, unita_misura, prezzo_unitario, advanced_sale_id, sale_bag_id, basket_id, size_code, flupsy_name, created_at, report_dettaglio_id) FROM stdin;
1	5	Sacco #1 - Cestelli: 2 | 30.000 animali | 45000 kg | 23.750 anim/kg	30000.00	NR	0.00	2	3	2	TP-3000	\N	2025-10-03 10:21:44.70048	\N
2	5	Sacco #2 - Cestelli: 2 | 7500 animali | 12000 kg | 23.750 anim/kg	7500.00	NR	0.00	2	4	2	TP-3000	\N	2025-10-03 10:21:45.106445	\N
3	5	SUBTOTALE TP-3000	37500.00	NR	0.00	2	\N	\N	TP-3000	\N	2025-10-03 10:21:45.510659	\N
4	6	Sacco #1 - Cestelli: 2 | 30.000 animali | 45000 kg | 23.750 anim/kg	30000.00	NR	0.00	2	3	2	TP-3000	\N	2025-10-03 10:21:58.688247	\N
5	6	Sacco #2 - Cestelli: 2 | 7500 animali | 12000 kg | 23.750 anim/kg	7500.00	NR	0.00	2	4	2	TP-3000	\N	2025-10-03 10:21:59.094845	\N
6	6	SUBTOTALE TP-3000	37500.00	NR	0.00	2	\N	\N	TP-3000	\N	2025-10-03 10:21:59.497957	\N
7	7	Sacco #1 - Cestelli: 2 | 30.000 animali | 45000 kg | 23.750 anim/kg	30000.00	NR	0.00	2	3	2	TP-3000	\N	2025-10-03 10:27:17.441982	\N
8	7	Sacco #2 - Cestelli: 2 | 7500 animali | 12000 kg | 23.750 anim/kg	7500.00	NR	0.00	2	4	2	TP-3000	\N	2025-10-03 10:27:17.852021	\N
9	7	SUBTOTALE TP-3000	37500.00	NR	0.00	2	\N	\N	TP-3000	\N	2025-10-03 10:27:18.259349	\N
10	8	Sacco #1 - Cestelli: 5 | 7500 animali | 10000 kg | 14.250 anim/kg	7500.00	NR	0.00	3	7	5		\N	2025-10-03 14:15:23.678994	\N
11	8	SUBTOTALE 	7500.00	NR	0.00	3	\N	\N		\N	2025-10-03 14:15:24.08762	\N
\.


--
-- TOC entry 4214 (class 0 OID 442476)
-- Dependencies: 302
-- Data for Name: delivery_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.delivery_reports (id, report_id, order_id, client_id, delivery_date, total_items, total_weight, transport_info, notes, signed_by, signature_image_path, gps_coordinates, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 4210 (class 0 OID 442424)
-- Dependencies: 298
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, file_name, original_name, mime_type, size, path, entity_type, entity_id, document_type, upload_date, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4172 (class 0 OID 327681)
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
-- TOC entry 4226 (class 0 OID 704529)
-- Dependencies: 314
-- Data for Name: external_customers_sync; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_customers_sync (id, external_id, customer_code, customer_name, customer_type, vat_number, tax_code, address, city, province, postal_code, country, phone, email, is_active, notes, synced_at, last_modified_external) FROM stdin;
\.


--
-- TOC entry 4230 (class 0 OID 712705)
-- Dependencies: 318
-- Data for Name: external_deliveries_sync; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_deliveries_sync (id, external_id, data_creazione, cliente_id, ordine_id, data_consegna, stato, numero_totale_ceste, peso_totale_kg, totale_animali, taglia_media, qrcode_url, note, numero_progressivo, synced_at, last_modified_external) FROM stdin;
\.


--
-- TOC entry 4232 (class 0 OID 712718)
-- Dependencies: 320
-- Data for Name: external_delivery_details_sync; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_delivery_details_sync (id, external_id, report_id, misurazione_id, vasca_id, codice_sezione, numero_ceste, peso_ceste_kg, taglia, animali_per_kg, percentuale_guscio, percentuale_mortalita, numero_animali, note, synced_at, last_modified_external) FROM stdin;
\.


--
-- TOC entry 4228 (class 0 OID 704543)
-- Dependencies: 316
-- Data for Name: external_sales_sync; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.external_sales_sync (id, external_id, sale_number, sale_date, customer_id, customer_name, product_code, product_name, product_category, quantity, unit_of_measure, unit_price, total_amount, discount_percent, discount_amount, net_amount, vat_percent, vat_amount, total_with_vat, payment_method, delivery_date, origin, lot_reference, sales_person, notes, status, synced_at, last_modified_external) FROM stdin;
\.


--
-- TOC entry 4255 (class 0 OID 1114113)
-- Dependencies: 343
-- Data for Name: fatture_in_cloud_config; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fatture_in_cloud_config (id, api_key, api_uid, company_id, access_token, refresh_token, expires_at, token_type, default_payment_method, default_causale_trasporto, default_aspetto_beni, default_porto, numerazione_automatica, prefisso_numero, invio_email_automatico, email_mittente, email_oggetto_template, email_corpo_template, attivo, created_at, updated_at, ragione_sociale, indirizzo, cap, citta, provincia, partita_iva, codice_fiscale, telefono, email, logo_path) FROM stdin;
1	\N	\N	1052922	\N	\N	\N	Bearer	\N	Vendita	Colli	Franco	t	\N	f	\N	\N	\N	t	2025-10-03 13:41:12.683461	2025-10-03 13:41:12.683461	Delta Futuro soc agr srl	Via Emilia 47	44020	Goro	FE	02057710382	02057710382	+393484105353	lago.gianluigi@gmail.com	/assets/logos/delta-futuro.png
2	\N	\N	1017299	\N	\N	\N	Bearer	\N	Vendita	Colli	Franco	t	\N	f	\N	\N	\N	t	2025-10-03 13:48:10.883964	2025-10-03 13:48:10.883964	Soc.Agr.Ecotapes	Via Canal di Valle, 5	30015	Chioggia	VE	04621060278	04621060278	+393484105353	ecotapes.2020@gmail.com	/assets/logos/ecotapes.png
\.


--
-- TOC entry 4190 (class 0 OID 385074)
-- Dependencies: 278
-- Data for Name: flupsy_impacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flupsy_impacts (id, flupsy_id, category_id, impact_value, time_period, start_date, end_date, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4135 (class 0 OID 246186)
-- Dependencies: 223
-- Data for Name: flupsys; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.flupsys (id, name, location, description, active, max_positions, production_center) FROM stdin;
570	Flupsy 2 piccolo 10 ceste	Ca Pisani		t	10	Ecotapes Italia
582	Raceway 1 CaPisani	Ca Pisani	descrizione a piacere	f	16	Ecotapes Italia
618	BINS 5x4	Lungo parete DX		t	20	Ecotapes Italia
608	Raceway 1 Delta Futuro	La prima 		t	16	Delta Futuro GORO
113	Flupsy 1 Alluminio	Ca Pisani	Ultimo lato uscita	t	20	Ecotapes Italia
1	Flupsy 1 (Mondolo)	Canale 1 Lato Laguna	Posizionato lato Gorino	t	20	Delta Futuro GORO
13	Fluspy 3 MegaFlupsy	Ca Pisani	Primo da passerella	t	20	Ecotapes Italia
1486	Raceway 4 Delta Futuro	terza dall'entrata riga dx, attaccata al lab		t	20	
2516	Flupsy 1 Bianco	Canale Laguna Lato goro		t	20	Delta Futuro GORO
737	Raceway 2 Delta Futuro	seconda dall'entrata riga sx	16 cestelli 	t	16	Delta Futuro GORO
\.


--
-- TOC entry 4184 (class 0 OID 385034)
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
-- TOC entry 4186 (class 0 OID 385044)
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
-- TOC entry 4180 (class 0 OID 368641)
-- Dependencies: 268
-- Data for Name: lot_inventory_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot_inventory_transactions (id, lot_id, transaction_type, date, animal_count, notes, operation_id, created_at, basket_id, selection_id, screening_id, metadata, created_by) FROM stdin;
\.


--
-- TOC entry 4253 (class 0 OID 1073153)
-- Dependencies: 341
-- Data for Name: lot_ledger; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot_ledger (id, date, lot_id, type, quantity, source_cycle_id, dest_cycle_id, selection_id, operation_id, basket_id, allocation_method, allocation_basis, idempotency_key, notes, created_at) FROM stdin;
3	2025-10-01	2	in	125000.000	3	\N	\N	5	1	measured	\N	\N	Auto-generato da operazione prima-attivazione	2025-10-05 15:18:47.074446
4	2025-10-01	1	in	112500.000	4	\N	\N	6	2	measured	\N	\N	Auto-generato da operazione prima-attivazione	2025-10-05 15:19:16.849968
5	2025-10-03	1	mortality	-25.000	4	\N	\N	7	2	measured	\N	\N	Auto-generato da operazione misura	2025-10-05 15:21:05.124924
6	2025-10-04	2	mortality	-45.000	3	\N	\N	9	1	measured	\N	\N	Auto-generato da operazione misura	2025-10-05 15:23:06.845912
1	2025-10-05	2	in	125000.000	\N	\N	\N	1	1	measured	\N	\N	Auto-generato da operazione prima-attivazione	2025-10-05 15:05:37.613462
2	2025-10-05	1	in	212500.000	\N	\N	\N	2	2	measured	\N	\N	Auto-generato da operazione prima-attivazione	2025-10-05 15:06:08.972956
7	2025-10-05	1	in	162500.000	\N	\N	\N	10	3	measured	\N	\N	Auto-generato da operazione prima-attivazione	2025-10-05 15:23:49.583393
8	2025-10-06	1	sale	16432.000	\N	\N	1	15	1	proportional	{"selectionId": 1, "totalAnimals": 30000, "lotDistributions": [{"lotId": 1, "animals": 16432, "percentage": 0.548}, {"lotId": 2, "animals": 13568, "percentage": 0.452}]}	sale-operation-15-lot-1-fix	Vendita da vagliatura #1 (sync fix)	2025-10-06 07:17:21.751165
9	2025-10-06	2	sale	13568.000	\N	\N	1	15	1	proportional	{"selectionId": 1, "totalAnimals": 30000, "lotDistributions": [{"lotId": 1, "animals": 16432, "percentage": 0.548}, {"lotId": 2, "animals": 13568, "percentage": 0.452}]}	sale-operation-15-lot-2-fix	Vendita da vagliatura #1 (sync fix)	2025-10-06 07:17:39.947062
10	2025-10-06	1	sale	31440.000	\N	\N	1	18	3	proportional	{"selectionId": 1, "totalAnimals": 57400, "lotDistributions": [{"lotId": 1, "animals": 31440, "percentage": 0.548}, {"lotId": 2, "animals": 25960, "percentage": 0.452}]}	sale-operation-18-lot-1-fix	Vendita da vagliatura #1 (sync fix)	2025-10-06 07:17:39.947062
11	2025-10-06	2	sale	25960.000	\N	\N	1	18	3	proportional	{"selectionId": 1, "totalAnimals": 57400, "lotDistributions": [{"lotId": 1, "animals": 31440, "percentage": 0.548}, {"lotId": 2, "animals": 25960, "percentage": 0.452}]}	sale-operation-18-lot-2-fix	Vendita da vagliatura #1 (sync fix)	2025-10-06 07:17:39.947062
\.


--
-- TOC entry 4182 (class 0 OID 368662)
-- Dependencies: 270
-- Data for Name: lot_mortality_records; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lot_mortality_records (id, lot_id, calculation_date, initial_count, current_count, sold_count, mortality_count, mortality_percentage, notes, created_at) FROM stdin;
1	2	2025-10-06 07:07:50.659364+00	5400000	5400045	0	45	0.00	\N	2025-10-06 07:07:50.659364+00
\.


--
-- TOC entry 4137 (class 0 OID 246193)
-- Dependencies: 225
-- Data for Name: lots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lots (id, arrival_date, supplier, quality, animal_count, weight, size_id, notes, state, supplier_lot_number, active, external_id, description, origin, created_at, total_mortality, last_mortality_date, mortality_notes) FROM stdin;
2	2025-10-05	Zeeland	normali	5400000	1200	1	\N	active	1222	t	\N	\N	\N	2025-10-05 15:04:55.004401	47	2025-10-04	Aggiornato automaticamente da 3 operazioni. Mortalità: 0.00%
1	2025-10-05	Taylor	teste	4250000	500	4	\N	active	1	t	\N	\N	\N	2025-10-05 15:03:52.014757	-53199	2025-10-06	Aggiornato automaticamente da 4 operazioni. Mortalità: 0.00%Vagliatura #1: -53250 animali. 
\.


--
-- TOC entry 4220 (class 0 OID 491521)
-- Dependencies: 308
-- Data for Name: measurements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.measurements (id, operation_id, basket_id, weight, animal_count, animals_per_kg, temperature, salinity, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4139 (class 0 OID 246200)
-- Dependencies: 227
-- Data for Name: mortality_rates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mortality_rates (id, size_id, month, percentage, notes) FROM stdin;
\.


--
-- TOC entry 4176 (class 0 OID 344065)
-- Dependencies: 264
-- Data for Name: notification_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_settings (id, notification_type, is_enabled, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4174 (class 0 OID 335873)
-- Dependencies: 262
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, type, title, message, is_read, created_at, related_entity_type, related_entity_id, data) FROM stdin;
\.


--
-- TOC entry 4198 (class 0 OID 393238)
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
-- TOC entry 4188 (class 0 OID 385059)
-- Dependencies: 276
-- Data for Name: operation_impacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operation_impacts (id, operation_id, category_id, impact_value, baseline_value, improvement_percentage, metadata, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4141 (class 0 OID 246206)
-- Dependencies: 229
-- Data for Name: operations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operations (id, date, type, basket_id, cycle_id, size_id, sgr_id, lot_id, animal_count, total_weight, animals_per_kg, average_weight, notes, dead_count, mortality_rate, metadata, operator_id, operator_name) FROM stdin;
5	2025-10-01	prima-attivazione	1	3	19	\N	2	125000	5000	25000	40	ggdgg	2	0.7936508	\N	\N	\N
6	2025-10-01	prima-attivazione	2	4	17	\N	1	112500	2500	45000	22.222221	fff	25	5.263158	\N	\N	\N
7	2025-10-03	misura	2	4	19	\N	1	87500	3500	25000	40	altre note	25	9.090909	\N	\N	\N
8	2025-10-03	peso	1	3	19	\N	2	125000	4500	27778	35.999714	ggdgg	0	\N	\N	\N	\N
9	2025-10-04	misura	1	3	21	\N	2	72250	8500	8500	117.64706	note nuova	45	34.615383	\N	\N	\N
12	2025-10-06	chiusura-ciclo-vagliatura	1	3	\N	\N	\N	72250	\N	\N	\N	Chiusura per vagliatura #1 del 2025-10-06. Animali distribuiti: 213000. Mortalità: -53250	\N	\N	\N	\N	\N
13	2025-10-06	chiusura-ciclo-vagliatura	2	4	\N	\N	\N	87500	\N	\N	\N	Chiusura per vagliatura #1 del 2025-10-06. Animali distribuiti: 213000. Mortalità: -53250	\N	\N	\N	\N	\N
14	2025-10-06	prima-attivazione	1	6	20	\N	1	30000	2	15000	0	Da vagliatura #1 del 2025-10-06 (cestello riutilizzato) - LOTTO MISTO: Lotto 2 (45.2%, 13.568 pz), Lotto 1 (54.8%, 16.432 pz)	8	0	{"isMixed":true,"sourceSelection":1,"dominantLot":1,"lotCount":2}	\N	\N
15	2025-10-06	vendita	1	6	20	\N	1	30000	2	15000	0	Vendita diretta da vagliatura #1 - LOTTO MISTO: Lotto 2 (45.2%, 13.568 pz), Lotto 1 (54.8%, 16.432 pz)	8	0	{"isMixed":true,"sourceSelection":1,"dominantLot":1,"lotCount":2}	\N	\N
16	2025-10-06	prima-attivazione	2	7	19	\N	1	60000	3	20000	0	Da vagliatura #1 del 2025-10-06 (cestello riutilizzato) - LOTTO MISTO: Lotto 2 (45.2%, 27.136 pz), Lotto 1 (54.8%, 32.864 pz)	5	0	{"isMixed":true,"sourceSelection":1,"dominantLot":1,"lotCount":2}	\N	\N
17	2025-10-06	prima-attivazione	3	8	19	\N	1	57400	2.8	20500	0	Da vagliatura #1 del 2025-10-06 - LOTTO MISTO: Lotto 2 (45.2%, 25.960 pz), Lotto 1 (54.8%, 31.440 pz)	5	0	{"isMixed":true,"sourceSelection":1,"dominantLot":1,"lotCount":2}	\N	\N
18	2025-10-06	vendita	3	8	19	\N	1	57400	2.8	20500	0	Vendita diretta da vagliatura #1 - LOTTO MISTO: Lotto 2 (45.2%, 25.960 pz), Lotto 1 (54.8%, 31.440 pz)	5	0	{"isMixed":true,"sourceSelection":1,"dominantLot":1,"lotCount":2}	\N	\N
19	2025-10-06	prima-attivazione	4	9	19	\N	1	65600	3.2	20500	0	Da vagliatura #1 del 2025-10-06 - LOTTO MISTO: Lotto 2 (45.2%, 29.669 pz), Lotto 1 (54.8%, 35.931 pz)	8	0	{"isMixed":true,"sourceSelection":1,"dominantLot":1,"lotCount":2}	\N	\N
\.


--
-- TOC entry 4249 (class 0 OID 884736)
-- Dependencies: 337
-- Data for Name: operators; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.operators (id, operator_id, name, password, is_active, created_at, updated_at) FROM stdin;
023ca2f5-f227-4661-896c-467be4d948d3	OP001	Mario Rossi	test123	t	2025-08-15 08:18:16.803279	2025-08-15 08:18:16.803279
52e27be7-8590-41ba-832e-a030c7979914	OP002	Giulia Bianchi	pass456	t	2025-08-15 09:09:04.066203	2025-08-15 09:09:04.066203
fd68dbd4-9290-4296-91b9-fa49fd7e2de3	OP003	Marco Verdi	pwd789	t	2025-08-15 09:09:04.066203	2025-08-15 09:09:04.066203
8706b4d4-d3f6-4d6f-ac63-3d2472173479	OP004	Anna Neri	key012	t	2025-08-15 09:09:04.066203	2025-08-15 09:09:04.066203
231822ad-4bbb-4522-b64c-776be6fa22f7	OP005	Luca Gialli	code345	t	2025-08-15 09:09:04.066203	2025-08-15 09:09:04.066203
2d60a853-0ca0-4b91-993c-c1a8f72b3b6c	Davide	Davide	dav2025!	t	2025-08-15 11:21:30.598588	2025-08-15 11:21:30.598588
96912f7f-e1fb-44f2-ac27-aa54a8d61ecc	Andrea	Andrea	and789$	t	2025-08-15 11:21:31.776781	2025-08-15 11:21:31.776781
025c0657-755d-4aee-b16d-4c4bf773f6f6	Mauro	Mauro	mau456#	t	2025-08-15 11:21:33.168715	2025-08-15 11:21:33.168715
c4f0f687-b16d-482c-9027-ad33ab49bd9f	Diego	Diego	die321@	t	2025-08-15 11:21:34.554755	2025-08-15 11:21:34.554755
2c938b08-5765-4e1a-8dfa-480ec87c2d20	Francesco	Francesco	fra987%	t	2025-08-15 11:21:40.891428	2025-08-15 11:21:40.891428
8d7422f2-f6cb-4a11-94eb-236ec84553da	Luca	Luca	luc654&	t	2025-08-15 11:21:42.370955	2025-08-15 11:21:42.370955
3ea702d1-82a0-41e4-b842-a138c516f735	Ever	Ever	eve123*	t	2025-08-15 11:21:43.783143	2025-08-15 11:21:43.783143
\.


--
-- TOC entry 4206 (class 0 OID 442402)
-- Dependencies: 294
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, description, quantity, unit, unit_price, total_price, vat_rate, lot_id, size_id, selection_id, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4204 (class 0 OID 442382)
-- Dependencies: 292
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_number, client_id, order_date, requested_delivery_date, actual_delivery_date, status, total_amount, vat_amount, vat_rate, discount_amount, discount_rate, shipping_amount, payment_type, payment_status, payment_due_date, invoice_number, invoice_date, notes, internal_notes, shipping_address, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4208 (class 0 OID 442414)
-- Dependencies: 296
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, order_id, amount, payment_date, payment_type, reference, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4218 (class 0 OID 442496)
-- Dependencies: 306
-- Data for Name: report_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.report_templates (id, name, description, type, format, template, parameters, is_default, created_by, created_at, updated_at, active) FROM stdin;
\.


--
-- TOC entry 4212 (class 0 OID 442464)
-- Dependencies: 300
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reports (id, title, description, type, format, parameters, file_path, file_size, generated_by, start_date, end_date, status, created_at, completed_at, error, metadata) FROM stdin;
\.


--
-- TOC entry 4236 (class 0 OID 720910)
-- Dependencies: 324
-- Data for Name: sale_bags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sale_bags (id, advanced_sale_id, bag_number, size_code, total_weight, original_weight, weight_loss, animal_count, animals_per_kg, original_animals_per_kg, waste_percentage, notes) FROM stdin;
\.


--
-- TOC entry 4240 (class 0 OID 720930)
-- Dependencies: 328
-- Data for Name: sale_operations_ref; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sale_operations_ref (id, advanced_sale_id, operation_id, basket_id, original_animals, original_weight, original_animals_per_kg, included_in_sale) FROM stdin;
\.


--
-- TOC entry 4216 (class 0 OID 442486)
-- Dependencies: 304
-- Data for Name: sales_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sales_reports (id, report_id, start_date, end_date, total_sales, total_vat, total_orders, completed_orders, cancelled_orders, top_size_id, top_lot_id, top_client_id, total_weight, avg_order_value, metadata, created_at) FROM stdin;
\.


--
-- TOC entry 4143 (class 0 OID 246212)
-- Dependencies: 231
-- Data for Name: screening_basket_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_basket_history (id, screening_id, source_basket_id, source_cycle_id, destination_basket_id, destination_cycle_id, created_at) FROM stdin;
\.


--
-- TOC entry 4145 (class 0 OID 246217)
-- Dependencies: 233
-- Data for Name: screening_destination_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_destination_baskets (id, screening_id, basket_id, cycle_id, category, flupsy_id, "row", "position", position_assigned, animal_count, live_animals, total_weight, animals_per_kg, dead_count, mortality_rate, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4147 (class 0 OID 246225)
-- Dependencies: 235
-- Data for Name: screening_lot_references; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_lot_references (id, screening_id, destination_basket_id, destination_cycle_id, lot_id, created_at) FROM stdin;
\.


--
-- TOC entry 4149 (class 0 OID 246230)
-- Dependencies: 237
-- Data for Name: screening_operations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_operations (id, date, screening_number, purpose, reference_size_id, status, created_at, updated_at, notes) FROM stdin;
\.


--
-- TOC entry 4151 (class 0 OID 246238)
-- Dependencies: 239
-- Data for Name: screening_source_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.screening_source_baskets (id, screening_id, basket_id, cycle_id, dismissed, position_released, animal_count, total_weight, animals_per_kg, size_id, lot_id, created_at) FROM stdin;
\.


--
-- TOC entry 4153 (class 0 OID 246245)
-- Dependencies: 241
-- Data for Name: selection_basket_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_basket_history (id, selection_id, source_basket_id, source_cycle_id, destination_basket_id, destination_cycle_id, created_at) FROM stdin;
1	1	1	3	1	0	2025-10-06 06:50:48.41414
2	1	1	3	2	0	2025-10-06 06:50:48.41414
3	1	1	3	3	0	2025-10-06 06:50:48.41414
4	1	1	3	4	0	2025-10-06 06:50:48.41414
5	1	2	4	1	0	2025-10-06 06:50:48.41414
6	1	2	4	2	0	2025-10-06 06:50:48.41414
7	1	2	4	3	0	2025-10-06 06:50:48.41414
8	1	2	4	4	0	2025-10-06 06:50:48.41414
\.


--
-- TOC entry 4155 (class 0 OID 246250)
-- Dependencies: 243
-- Data for Name: selection_destination_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_destination_baskets (id, selection_id, basket_id, cycle_id, destination_type, flupsy_id, "position", animal_count, live_animals, total_weight, animals_per_kg, size_id, dead_count, mortality_rate, sample_weight, sample_count, notes, created_at, updated_at) FROM stdin;
1	1	1	6	sold	570	DX1	30000	30000	2	15000	20	8	0	10	150	\N	2025-10-06 06:50:45.445913	\N
2	1	2	7	placed	570	DX2	60000	60000	3	20000	19	5	0	10	200	\N	2025-10-06 06:50:45.85387	\N
3	1	3	8	sold	570	DX3	57400	57400	2.8	20500	19	5	0	10	205	\N	2025-10-06 06:50:46.253544	\N
4	1	4	9	placed	570	DX4	65600	65600	3.2	20500	19	8	0	10	205	\N	2025-10-06 06:50:46.652968	\N
\.


--
-- TOC entry 4157 (class 0 OID 246257)
-- Dependencies: 245
-- Data for Name: selection_lot_references; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_lot_references (id, selection_id, destination_basket_id, destination_cycle_id, lot_id, created_at) FROM stdin;
\.


--
-- TOC entry 4159 (class 0 OID 246262)
-- Dependencies: 247
-- Data for Name: selection_source_baskets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selection_source_baskets (id, selection_id, basket_id, cycle_id, animal_count, total_weight, animals_per_kg, size_id, lot_id, created_at) FROM stdin;
1	1	1	3	72250	8500	8500	\N	\N	2025-10-06 06:50:43.670846
2	1	2	4	87500	3500	25000	\N	\N	2025-10-06 06:50:44.877467
\.


--
-- TOC entry 4161 (class 0 OID 246267)
-- Dependencies: 249
-- Data for Name: selections; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selections (id, date, selection_number, purpose, screening_type, status, created_at, updated_at, notes, reference_size_id) FROM stdin;
1	2025-10-06	1	vagliatura	\N	completed	2025-10-06 06:50:41.769	2025-10-06 06:51:07.732		\N
\.


--
-- TOC entry 4163 (class 0 OID 246275)
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
-- TOC entry 4164 (class 0 OID 246281)
-- Dependencies: 252
-- Data for Name: sgr_giornalieri; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sgr_giornalieri (id, record_date, temperature, ph, ammonia, oxygen, salinity, notes) FROM stdin;
\.


--
-- TOC entry 4178 (class 0 OID 344076)
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
-- TOC entry 4167 (class 0 OID 246288)
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
-- TOC entry 4194 (class 0 OID 385104)
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
-- TOC entry 4196 (class 0 OID 385120)
-- Dependencies: 284
-- Data for Name: sustainability_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sustainability_reports (id, title, report_period, start_date, end_date, summary, highlights, metrics, flupsy_ids, file_path, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4248 (class 0 OID 786469)
-- Dependencies: 336
-- Data for Name: sync_log_fatture_in_cloud; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sync_log_fatture_in_cloud (id, tipo_operazione, entita, entita_id, fatture_in_cloud_id, stato, messaggio, dati_richiesta, dati_risposta, created_at) FROM stdin;
\.


--
-- TOC entry 4224 (class 0 OID 704513)
-- Dependencies: 312
-- Data for Name: sync_status; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.sync_status (id, table_name, last_sync_at, last_sync_success, sync_in_progress, record_count, error_message, created_at, updated_at) FROM stdin;
119	external_delivery_details_sync	\N	t	f	0	\N	2025-06-21 08:44:27.031989	2025-06-24 17:07:44.726952
112	external_deliveries_sync	\N	t	f	0	\N	2025-06-21 08:42:22.980963	2025-08-10 16:56:33.752536
1	external_customers_sync	\N	f	f	0	column d.percentuale_guscio does not exist	2025-06-17 11:20:39.93404	2025-08-10 16:56:34.423237
2	external_sales_sync	\N	f	f	0	column d.percentuale_guscio does not exist	2025-06-17 11:20:42.43553	2025-08-10 16:56:34.855661
\.


--
-- TOC entry 4169 (class 0 OID 246294)
-- Dependencies: 257
-- Data for Name: target_size_annotations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.target_size_annotations (id, basket_id, target_size_id, predicted_date, status, reached_date, notes, created_at, updated_at) FROM stdin;
\.


--
-- TOC entry 4200 (class 0 OID 417793)
-- Dependencies: 288
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, password, role, last_login, created_at, language) FROM stdin;
1	Visitor	$2b$12$ApWsEzh5WlwZuN7OBybCp.5WnpyNsUeM5Z9R42OP8p3DpUZzjn9ni	visitor	2025-09-19 15:18:47.958	2025-04-28 14:47:09.200978	it
2	User	$2b$12$h/ib8Fk.diHpYuX/x7ovKu1vfLbzKbKtw.3k6nu/KrzPuXerDH6yu	user	2025-10-02 05:32:41.458	2025-04-28 14:47:09.200978	it
5	Gianluigi	$2b$12$bdYVMClHKLCh0QRtzmMKq.FS5Z1XfvElD2r7JUcoBRGrgdoHzp6uG	admin	2025-10-05 11:41:41.324	2025-04-28 16:35:10.767757	it
\.


--
-- TOC entry 4325 (class 0 OID 0)
-- Dependencies: 321
-- Name: advanced_sales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.advanced_sales_id_seq', 1, false);


--
-- TOC entry 4326 (class 0 OID 0)
-- Dependencies: 325
-- Name: bag_allocations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.bag_allocations_id_seq', 1, false);


--
-- TOC entry 4327 (class 0 OID 0)
-- Dependencies: 338
-- Name: basket_lot_composition_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.basket_lot_composition_id_seq', 8, true);


--
-- TOC entry 4328 (class 0 OID 0)
-- Dependencies: 220
-- Name: baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.baskets_id_seq', 10, true);


--
-- TOC entry 4329 (class 0 OID 0)
-- Dependencies: 333
-- Name: clienti_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clienti_id_seq', 1, false);


--
-- TOC entry 4330 (class 0 OID 0)
-- Dependencies: 289
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clients_id_seq', 1, false);


--
-- TOC entry 4331 (class 0 OID 0)
-- Dependencies: 329
-- Name: configurazione_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.configurazione_id_seq', 68, true);


--
-- TOC entry 4332 (class 0 OID 0)
-- Dependencies: 279
-- Name: cycle_impacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cycle_impacts_id_seq', 1, false);


--
-- TOC entry 4333 (class 0 OID 0)
-- Dependencies: 222
-- Name: cycles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.cycles_id_seq', 9, true);


--
-- TOC entry 4334 (class 0 OID 0)
-- Dependencies: 331
-- Name: ddt_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ddt_id_seq', 1, false);


--
-- TOC entry 4335 (class 0 OID 0)
-- Dependencies: 344
-- Name: ddt_righe_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.ddt_righe_id_seq', 11, true);


--
-- TOC entry 4336 (class 0 OID 0)
-- Dependencies: 301
-- Name: delivery_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.delivery_reports_id_seq', 1, false);


--
-- TOC entry 4337 (class 0 OID 0)
-- Dependencies: 297
-- Name: documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.documents_id_seq', 1, false);


--
-- TOC entry 4338 (class 0 OID 0)
-- Dependencies: 259
-- Name: email_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.email_config_id_seq', 10, true);


--
-- TOC entry 4339 (class 0 OID 0)
-- Dependencies: 313
-- Name: external_customers_sync_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.external_customers_sync_id_seq', 1, false);


--
-- TOC entry 4340 (class 0 OID 0)
-- Dependencies: 317
-- Name: external_deliveries_sync_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.external_deliveries_sync_id_seq', 1, false);


--
-- TOC entry 4341 (class 0 OID 0)
-- Dependencies: 319
-- Name: external_delivery_details_sync_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.external_delivery_details_sync_id_seq', 1, false);


--
-- TOC entry 4342 (class 0 OID 0)
-- Dependencies: 315
-- Name: external_sales_sync_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.external_sales_sync_id_seq', 1, false);


--
-- TOC entry 4343 (class 0 OID 0)
-- Dependencies: 342
-- Name: fatture_in_cloud_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fatture_in_cloud_config_id_seq', 2, true);


--
-- TOC entry 4344 (class 0 OID 0)
-- Dependencies: 277
-- Name: flupsy_impacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.flupsy_impacts_id_seq', 1, false);


--
-- TOC entry 4345 (class 0 OID 0)
-- Dependencies: 224
-- Name: flupsys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.flupsys_id_seq', 4213, true);


--
-- TOC entry 4346 (class 0 OID 0)
-- Dependencies: 271
-- Name: impact_categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.impact_categories_id_seq', 5, true);


--
-- TOC entry 4347 (class 0 OID 0)
-- Dependencies: 273
-- Name: impact_factors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.impact_factors_id_seq', 12, true);


--
-- TOC entry 4348 (class 0 OID 0)
-- Dependencies: 267
-- Name: lot_inventory_transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lot_inventory_transactions_id_seq', 1, false);


--
-- TOC entry 4349 (class 0 OID 0)
-- Dependencies: 340
-- Name: lot_ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lot_ledger_id_seq', 11, true);


--
-- TOC entry 4350 (class 0 OID 0)
-- Dependencies: 269
-- Name: lot_mortality_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lot_mortality_records_id_seq', 1, true);


--
-- TOC entry 4351 (class 0 OID 0)
-- Dependencies: 226
-- Name: lots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.lots_id_seq', 2, true);


--
-- TOC entry 4352 (class 0 OID 0)
-- Dependencies: 307
-- Name: measurements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.measurements_id_seq', 1, false);


--
-- TOC entry 4353 (class 0 OID 0)
-- Dependencies: 228
-- Name: mortality_rates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.mortality_rates_id_seq', 1, false);


--
-- TOC entry 4354 (class 0 OID 0)
-- Dependencies: 263
-- Name: notification_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_settings_id_seq', 1, false);


--
-- TOC entry 4355 (class 0 OID 0)
-- Dependencies: 261
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- TOC entry 4356 (class 0 OID 0)
-- Dependencies: 285
-- Name: operation_impact_defaults_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operation_impact_defaults_id_seq', 11, true);


--
-- TOC entry 4357 (class 0 OID 0)
-- Dependencies: 275
-- Name: operation_impacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operation_impacts_id_seq', 1, false);


--
-- TOC entry 4358 (class 0 OID 0)
-- Dependencies: 230
-- Name: operations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.operations_id_seq', 19, true);


--
-- TOC entry 4359 (class 0 OID 0)
-- Dependencies: 293
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- TOC entry 4360 (class 0 OID 0)
-- Dependencies: 291
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- TOC entry 4361 (class 0 OID 0)
-- Dependencies: 295
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- TOC entry 4362 (class 0 OID 0)
-- Dependencies: 305
-- Name: report_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.report_templates_id_seq', 1, false);


--
-- TOC entry 4363 (class 0 OID 0)
-- Dependencies: 299
-- Name: reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reports_id_seq', 1, false);


--
-- TOC entry 4364 (class 0 OID 0)
-- Dependencies: 323
-- Name: sale_bags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sale_bags_id_seq', 1, false);


--
-- TOC entry 4365 (class 0 OID 0)
-- Dependencies: 327
-- Name: sale_operations_ref_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sale_operations_ref_id_seq', 1, false);


--
-- TOC entry 4366 (class 0 OID 0)
-- Dependencies: 303
-- Name: sales_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sales_reports_id_seq', 1, false);


--
-- TOC entry 4367 (class 0 OID 0)
-- Dependencies: 232
-- Name: screening_basket_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_basket_history_id_seq', 1, false);


--
-- TOC entry 4368 (class 0 OID 0)
-- Dependencies: 234
-- Name: screening_destination_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_destination_baskets_id_seq', 1, false);


--
-- TOC entry 4369 (class 0 OID 0)
-- Dependencies: 236
-- Name: screening_lot_references_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_lot_references_id_seq', 1, false);


--
-- TOC entry 4370 (class 0 OID 0)
-- Dependencies: 238
-- Name: screening_operations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_operations_id_seq', 1, false);


--
-- TOC entry 4371 (class 0 OID 0)
-- Dependencies: 240
-- Name: screening_source_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.screening_source_baskets_id_seq', 1, false);


--
-- TOC entry 4372 (class 0 OID 0)
-- Dependencies: 242
-- Name: selection_basket_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_basket_history_id_seq', 8, true);


--
-- TOC entry 4373 (class 0 OID 0)
-- Dependencies: 244
-- Name: selection_destination_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_destination_baskets_id_seq', 4, true);


--
-- TOC entry 4374 (class 0 OID 0)
-- Dependencies: 246
-- Name: selection_lot_references_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_lot_references_id_seq', 1, false);


--
-- TOC entry 4375 (class 0 OID 0)
-- Dependencies: 248
-- Name: selection_source_baskets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selection_source_baskets_id_seq', 2, true);


--
-- TOC entry 4376 (class 0 OID 0)
-- Dependencies: 250
-- Name: selections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selections_id_seq', 1, true);


--
-- TOC entry 4377 (class 0 OID 0)
-- Dependencies: 253
-- Name: sgr_giornalieri_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sgr_giornalieri_id_seq', 1, false);


--
-- TOC entry 4378 (class 0 OID 0)
-- Dependencies: 254
-- Name: sgr_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sgr_id_seq', 12, true);


--
-- TOC entry 4379 (class 0 OID 0)
-- Dependencies: 265
-- Name: sgr_monthly_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sgr_monthly_id_seq', 12, true);


--
-- TOC entry 4380 (class 0 OID 0)
-- Dependencies: 256
-- Name: sizes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sizes_id_seq', 30, true);


--
-- TOC entry 4381 (class 0 OID 0)
-- Dependencies: 281
-- Name: sustainability_goals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sustainability_goals_id_seq', 20, true);


--
-- TOC entry 4382 (class 0 OID 0)
-- Dependencies: 283
-- Name: sustainability_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sustainability_reports_id_seq', 1, false);


--
-- TOC entry 4383 (class 0 OID 0)
-- Dependencies: 335
-- Name: sync_log_fatture_in_cloud_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sync_log_fatture_in_cloud_id_seq', 1, false);


--
-- TOC entry 4384 (class 0 OID 0)
-- Dependencies: 311
-- Name: sync_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.sync_status_id_seq', 1348, true);


--
-- TOC entry 4385 (class 0 OID 0)
-- Dependencies: 258
-- Name: target_size_annotations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.target_size_annotations_id_seq', 1, false);


--
-- TOC entry 4386 (class 0 OID 0)
-- Dependencies: 287
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 5, true);


--
-- TOC entry 3907 (class 2606 OID 720906)
-- Name: advanced_sales advanced_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advanced_sales
    ADD CONSTRAINT advanced_sales_pkey PRIMARY KEY (id);


--
-- TOC entry 3909 (class 2606 OID 720908)
-- Name: advanced_sales advanced_sales_sale_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advanced_sales
    ADD CONSTRAINT advanced_sales_sale_number_key UNIQUE (sale_number);


--
-- TOC entry 3916 (class 2606 OID 720928)
-- Name: bag_allocations bag_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bag_allocations
    ADD CONSTRAINT bag_allocations_pkey PRIMARY KEY (id);


--
-- TOC entry 3947 (class 2606 OID 958473)
-- Name: basket_lot_composition basket_lot_composition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.basket_lot_composition
    ADD CONSTRAINT basket_lot_composition_pkey PRIMARY KEY (id);


--
-- TOC entry 3708 (class 2606 OID 246326)
-- Name: baskets baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baskets
    ADD CONSTRAINT baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3933 (class 2606 OID 786467)
-- Name: clienti clienti_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clienti
    ADD CONSTRAINT clienti_pkey PRIMARY KEY (id);


--
-- TOC entry 3849 (class 2606 OID 442380)
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- TOC entry 3923 (class 2606 OID 786444)
-- Name: configurazione configurazione_chiave_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configurazione
    ADD CONSTRAINT configurazione_chiave_key UNIQUE (chiave);


--
-- TOC entry 3925 (class 2606 OID 786442)
-- Name: configurazione configurazione_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configurazione
    ADD CONSTRAINT configurazione_pkey PRIMARY KEY (id);


--
-- TOC entry 3836 (class 2606 OID 385097)
-- Name: cycle_impacts cycle_impacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycle_impacts
    ADD CONSTRAINT cycle_impacts_pkey PRIMARY KEY (id);


--
-- TOC entry 3722 (class 2606 OID 246328)
-- Name: cycles cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_pkey PRIMARY KEY (id);


--
-- TOC entry 3928 (class 2606 OID 786456)
-- Name: ddt ddt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ddt
    ADD CONSTRAINT ddt_pkey PRIMARY KEY (id);


--
-- TOC entry 3955 (class 2606 OID 1212434)
-- Name: ddt_righe ddt_righe_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ddt_righe
    ADD CONSTRAINT ddt_righe_pkey PRIMARY KEY (id);


--
-- TOC entry 3868 (class 2606 OID 442484)
-- Name: delivery_reports delivery_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reports
    ADD CONSTRAINT delivery_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3862 (class 2606 OID 442433)
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- TOC entry 3805 (class 2606 OID 327691)
-- Name: email_config email_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_key_key UNIQUE (key);


--
-- TOC entry 3807 (class 2606 OID 327689)
-- Name: email_config email_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_config
    ADD CONSTRAINT email_config_pkey PRIMARY KEY (id);


--
-- TOC entry 3891 (class 2606 OID 704541)
-- Name: external_customers_sync external_customers_sync_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_customers_sync
    ADD CONSTRAINT external_customers_sync_external_id_key UNIQUE (external_id);


--
-- TOC entry 3893 (class 2606 OID 704539)
-- Name: external_customers_sync external_customers_sync_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_customers_sync
    ADD CONSTRAINT external_customers_sync_pkey PRIMARY KEY (id);


--
-- TOC entry 3899 (class 2606 OID 712716)
-- Name: external_deliveries_sync external_deliveries_sync_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_deliveries_sync
    ADD CONSTRAINT external_deliveries_sync_external_id_key UNIQUE (external_id);


--
-- TOC entry 3901 (class 2606 OID 712714)
-- Name: external_deliveries_sync external_deliveries_sync_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_deliveries_sync
    ADD CONSTRAINT external_deliveries_sync_pkey PRIMARY KEY (id);


--
-- TOC entry 3903 (class 2606 OID 712729)
-- Name: external_delivery_details_sync external_delivery_details_sync_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_delivery_details_sync
    ADD CONSTRAINT external_delivery_details_sync_external_id_key UNIQUE (external_id);


--
-- TOC entry 3905 (class 2606 OID 712727)
-- Name: external_delivery_details_sync external_delivery_details_sync_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_delivery_details_sync
    ADD CONSTRAINT external_delivery_details_sync_pkey PRIMARY KEY (id);


--
-- TOC entry 3895 (class 2606 OID 704559)
-- Name: external_sales_sync external_sales_sync_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_sales_sync
    ADD CONSTRAINT external_sales_sync_external_id_key UNIQUE (external_id);


--
-- TOC entry 3897 (class 2606 OID 704557)
-- Name: external_sales_sync external_sales_sync_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_sales_sync
    ADD CONSTRAINT external_sales_sync_pkey PRIMARY KEY (id);


--
-- TOC entry 3953 (class 2606 OID 1114129)
-- Name: fatture_in_cloud_config fatture_in_cloud_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fatture_in_cloud_config
    ADD CONSTRAINT fatture_in_cloud_config_pkey PRIMARY KEY (id);


--
-- TOC entry 3834 (class 2606 OID 385082)
-- Name: flupsy_impacts flupsy_impacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsy_impacts
    ADD CONSTRAINT flupsy_impacts_pkey PRIMARY KEY (id);


--
-- TOC entry 3731 (class 2606 OID 246330)
-- Name: flupsys flupsys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsys
    ADD CONSTRAINT flupsys_pkey PRIMARY KEY (id);


--
-- TOC entry 3828 (class 2606 OID 385042)
-- Name: impact_categories impact_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_categories
    ADD CONSTRAINT impact_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 3830 (class 2606 OID 385052)
-- Name: impact_factors impact_factors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_factors
    ADD CONSTRAINT impact_factors_pkey PRIMARY KEY (id);


--
-- TOC entry 3822 (class 2606 OID 368650)
-- Name: lot_inventory_transactions lot_inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions
    ADD CONSTRAINT lot_inventory_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 3949 (class 2606 OID 1073166)
-- Name: lot_ledger lot_ledger_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_ledger
    ADD CONSTRAINT lot_ledger_idempotency_key_key UNIQUE (idempotency_key);


--
-- TOC entry 3951 (class 2606 OID 1073164)
-- Name: lot_ledger lot_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_ledger
    ADD CONSTRAINT lot_ledger_pkey PRIMARY KEY (id);


--
-- TOC entry 3826 (class 2606 OID 368671)
-- Name: lot_mortality_records lot_mortality_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mortality_records
    ADD CONSTRAINT lot_mortality_records_pkey PRIMARY KEY (id);


--
-- TOC entry 3743 (class 2606 OID 246332)
-- Name: lots lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lots
    ADD CONSTRAINT lots_pkey PRIMARY KEY (id);


--
-- TOC entry 3879 (class 2606 OID 491529)
-- Name: measurements measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.measurements
    ADD CONSTRAINT measurements_pkey PRIMARY KEY (id);


--
-- TOC entry 3745 (class 2606 OID 246334)
-- Name: mortality_rates mortality_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mortality_rates
    ADD CONSTRAINT mortality_rates_pkey PRIMARY KEY (id);


--
-- TOC entry 3816 (class 2606 OID 344074)
-- Name: notification_settings notification_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_settings
    ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3814 (class 2606 OID 335882)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 3843 (class 2606 OID 393244)
-- Name: operation_impact_defaults operation_impact_defaults_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_impact_defaults
    ADD CONSTRAINT operation_impact_defaults_pkey PRIMARY KEY (id);


--
-- TOC entry 3832 (class 2606 OID 385067)
-- Name: operation_impacts operation_impacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_impacts
    ADD CONSTRAINT operation_impacts_pkey PRIMARY KEY (id);


--
-- TOC entry 3761 (class 2606 OID 246336)
-- Name: operations operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_pkey PRIMARY KEY (id);


--
-- TOC entry 3943 (class 2606 OID 884748)
-- Name: operators operators_operator_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operators
    ADD CONSTRAINT operators_operator_id_key UNIQUE (operator_id);


--
-- TOC entry 3945 (class 2606 OID 884746)
-- Name: operators operators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operators
    ADD CONSTRAINT operators_pkey PRIMARY KEY (id);


--
-- TOC entry 3857 (class 2606 OID 442412)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 3852 (class 2606 OID 442400)
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- TOC entry 3854 (class 2606 OID 442398)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 3860 (class 2606 OID 442422)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- TOC entry 3877 (class 2606 OID 442507)
-- Name: report_templates report_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT report_templates_pkey PRIMARY KEY (id);


--
-- TOC entry 3866 (class 2606 OID 442474)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3914 (class 2606 OID 720919)
-- Name: sale_bags sale_bags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_bags
    ADD CONSTRAINT sale_bags_pkey PRIMARY KEY (id);


--
-- TOC entry 3921 (class 2606 OID 720936)
-- Name: sale_operations_ref sale_operations_ref_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_operations_ref
    ADD CONSTRAINT sale_operations_ref_pkey PRIMARY KEY (id);


--
-- TOC entry 3874 (class 2606 OID 442494)
-- Name: sales_reports sales_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT sales_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3763 (class 2606 OID 246338)
-- Name: screening_basket_history screening_basket_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_basket_history
    ADD CONSTRAINT screening_basket_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3765 (class 2606 OID 246340)
-- Name: screening_destination_baskets screening_destination_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_destination_baskets
    ADD CONSTRAINT screening_destination_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3767 (class 2606 OID 246342)
-- Name: screening_lot_references screening_lot_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_lot_references
    ADD CONSTRAINT screening_lot_references_pkey PRIMARY KEY (id);


--
-- TOC entry 3771 (class 2606 OID 246344)
-- Name: screening_operations screening_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_operations
    ADD CONSTRAINT screening_operations_pkey PRIMARY KEY (id);


--
-- TOC entry 3773 (class 2606 OID 246346)
-- Name: screening_source_baskets screening_source_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screening_source_baskets
    ADD CONSTRAINT screening_source_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3775 (class 2606 OID 246348)
-- Name: selection_basket_history selection_basket_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_basket_history
    ADD CONSTRAINT selection_basket_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3778 (class 2606 OID 246350)
-- Name: selection_destination_baskets selection_destination_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_destination_baskets
    ADD CONSTRAINT selection_destination_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3780 (class 2606 OID 246352)
-- Name: selection_lot_references selection_lot_references_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_lot_references
    ADD CONSTRAINT selection_lot_references_pkey PRIMARY KEY (id);


--
-- TOC entry 3783 (class 2606 OID 246354)
-- Name: selection_source_baskets selection_source_baskets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selection_source_baskets
    ADD CONSTRAINT selection_source_baskets_pkey PRIMARY KEY (id);


--
-- TOC entry 3787 (class 2606 OID 246356)
-- Name: selections selections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selections
    ADD CONSTRAINT selections_pkey PRIMARY KEY (id);


--
-- TOC entry 3793 (class 2606 OID 246358)
-- Name: sgr_giornalieri sgr_giornalieri_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_giornalieri
    ADD CONSTRAINT sgr_giornalieri_pkey PRIMARY KEY (id);


--
-- TOC entry 3818 (class 2606 OID 344084)
-- Name: sgr_monthly sgr_monthly_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr_monthly
    ADD CONSTRAINT sgr_monthly_pkey PRIMARY KEY (id);


--
-- TOC entry 3790 (class 2606 OID 246360)
-- Name: sgr sgr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sgr
    ADD CONSTRAINT sgr_pkey PRIMARY KEY (id);


--
-- TOC entry 3795 (class 2606 OID 246362)
-- Name: sizes sizes_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_code_unique UNIQUE (code);


--
-- TOC entry 3797 (class 2606 OID 246364)
-- Name: sizes sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sizes
    ADD CONSTRAINT sizes_pkey PRIMARY KEY (id);


--
-- TOC entry 3838 (class 2606 OID 385113)
-- Name: sustainability_goals sustainability_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sustainability_goals
    ADD CONSTRAINT sustainability_goals_pkey PRIMARY KEY (id);


--
-- TOC entry 3840 (class 2606 OID 385128)
-- Name: sustainability_reports sustainability_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sustainability_reports
    ADD CONSTRAINT sustainability_reports_pkey PRIMARY KEY (id);


--
-- TOC entry 3941 (class 2606 OID 786477)
-- Name: sync_log_fatture_in_cloud sync_log_fatture_in_cloud_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_log_fatture_in_cloud
    ADD CONSTRAINT sync_log_fatture_in_cloud_pkey PRIMARY KEY (id);


--
-- TOC entry 3887 (class 2606 OID 704525)
-- Name: sync_status sync_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_status
    ADD CONSTRAINT sync_status_pkey PRIMARY KEY (id);


--
-- TOC entry 3889 (class 2606 OID 704527)
-- Name: sync_status sync_status_table_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_status
    ADD CONSTRAINT sync_status_table_name_key UNIQUE (table_name);


--
-- TOC entry 3803 (class 2606 OID 246366)
-- Name: target_size_annotations target_size_annotations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_size_annotations
    ADD CONSTRAINT target_size_annotations_pkey PRIMARY KEY (id);


--
-- TOC entry 3845 (class 2606 OID 417802)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3847 (class 2606 OID 417804)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 3910 (class 1259 OID 720938)
-- Name: idx_advanced_sales_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_advanced_sales_date ON public.advanced_sales USING btree (sale_date);


--
-- TOC entry 3911 (class 1259 OID 720937)
-- Name: idx_advanced_sales_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_advanced_sales_status ON public.advanced_sales USING btree (status);


--
-- TOC entry 3917 (class 1259 OID 720940)
-- Name: idx_bag_allocations_bag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bag_allocations_bag_id ON public.bag_allocations USING btree (sale_bag_id);


--
-- TOC entry 3709 (class 1259 OID 434179)
-- Name: idx_baskets_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_active ON public.baskets USING btree (active);


--
-- TOC entry 3710 (class 1259 OID 499732)
-- Name: idx_baskets_active_flupsy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_active_flupsy ON public.baskets USING btree (flupsy_id, state) WHERE (state = 'active'::text);


--
-- TOC entry 3711 (class 1259 OID 499712)
-- Name: idx_baskets_current_cycle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_current_cycle_id ON public.baskets USING btree (current_cycle_id);


--
-- TOC entry 3712 (class 1259 OID 524291)
-- Name: idx_baskets_cycle_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_cycle_code ON public.baskets USING btree (cycle_code);


--
-- TOC entry 3713 (class 1259 OID 434181)
-- Name: idx_baskets_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_external_id ON public.baskets USING btree (external_id);


--
-- TOC entry 3714 (class 1259 OID 458757)
-- Name: idx_baskets_flupsy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_flupsy_id ON public.baskets USING btree (flupsy_id);


--
-- TOC entry 3715 (class 1259 OID 524288)
-- Name: idx_baskets_flupsy_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_flupsy_position ON public.baskets USING btree (flupsy_id, "row", "position");


--
-- TOC entry 3716 (class 1259 OID 1024002)
-- Name: idx_baskets_flupsy_state_cycle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_flupsy_state_cycle ON public.baskets USING btree (flupsy_id, state, current_cycle_id);


--
-- TOC entry 3717 (class 1259 OID 524292)
-- Name: idx_baskets_physical_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_physical_number ON public.baskets USING btree (physical_number);


--
-- TOC entry 3718 (class 1259 OID 524290)
-- Name: idx_baskets_position_not_null; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_position_not_null ON public.baskets USING btree (flupsy_id, "row", "position") WHERE ("position" IS NOT NULL);


--
-- TOC entry 3719 (class 1259 OID 499714)
-- Name: idx_baskets_row_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_row_position ON public.baskets USING btree ("row", "position");


--
-- TOC entry 3720 (class 1259 OID 499713)
-- Name: idx_baskets_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_baskets_state ON public.baskets USING btree (state);


--
-- TOC entry 3934 (class 1259 OID 786482)
-- Name: idx_clienti_denominazione; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clienti_denominazione ON public.clienti USING btree (denominazione);


--
-- TOC entry 3935 (class 1259 OID 786484)
-- Name: idx_clienti_fatture_in_cloud_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clienti_fatture_in_cloud_id ON public.clienti USING btree (fatture_in_cloud_id);


--
-- TOC entry 3936 (class 1259 OID 786483)
-- Name: idx_clienti_piva; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clienti_piva ON public.clienti USING btree (piva);


--
-- TOC entry 3926 (class 1259 OID 786478)
-- Name: idx_configurazione_chiave; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_configurazione_chiave ON public.configurazione USING btree (chiave);


--
-- TOC entry 3723 (class 1259 OID 499733)
-- Name: idx_cycles_active_basket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycles_active_basket ON public.cycles USING btree (basket_id, state) WHERE (state = 'active'::text);


--
-- TOC entry 3724 (class 1259 OID 483331)
-- Name: idx_cycles_active_end_null; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycles_active_end_null ON public.cycles USING btree (basket_id) WHERE (end_date IS NULL);


--
-- TOC entry 3725 (class 1259 OID 458759)
-- Name: idx_cycles_basket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycles_basket_id ON public.cycles USING btree (basket_id);


--
-- TOC entry 3726 (class 1259 OID 483329)
-- Name: idx_cycles_basket_id_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycles_basket_id_end_date ON public.cycles USING btree (basket_id, end_date);


--
-- TOC entry 3727 (class 1259 OID 499717)
-- Name: idx_cycles_startdate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycles_startdate ON public.cycles USING btree (start_date);


--
-- TOC entry 3728 (class 1259 OID 458758)
-- Name: idx_cycles_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycles_state ON public.cycles USING btree (state);


--
-- TOC entry 3729 (class 1259 OID 499718)
-- Name: idx_cycles_state_startdate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cycles_state_startdate ON public.cycles USING btree (state, start_date);


--
-- TOC entry 3929 (class 1259 OID 786480)
-- Name: idx_ddt_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ddt_data ON public.ddt USING btree (data);


--
-- TOC entry 3930 (class 1259 OID 786481)
-- Name: idx_ddt_fatture_in_cloud_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ddt_fatture_in_cloud_id ON public.ddt USING btree (fatture_in_cloud_id);


--
-- TOC entry 3931 (class 1259 OID 786479)
-- Name: idx_ddt_numero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ddt_numero ON public.ddt USING btree (numero);


--
-- TOC entry 3869 (class 1259 OID 442511)
-- Name: idx_delivery_reports_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_reports_client_id ON public.delivery_reports USING btree (client_id);


--
-- TOC entry 3870 (class 1259 OID 442510)
-- Name: idx_delivery_reports_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_reports_order_id ON public.delivery_reports USING btree (order_id);


--
-- TOC entry 3871 (class 1259 OID 442509)
-- Name: idx_delivery_reports_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_reports_report_id ON public.delivery_reports USING btree (report_id);


--
-- TOC entry 3863 (class 1259 OID 442437)
-- Name: idx_documents_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_entity ON public.documents USING btree (entity_type, entity_id);


--
-- TOC entry 3732 (class 1259 OID 524289)
-- Name: idx_flupsys_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_flupsys_active ON public.flupsys USING btree (active);


--
-- TOC entry 3819 (class 1259 OID 368678)
-- Name: idx_lot_inventory_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_inventory_transactions_date ON public.lot_inventory_transactions USING btree (date);


--
-- TOC entry 3820 (class 1259 OID 368677)
-- Name: idx_lot_inventory_transactions_lot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_inventory_transactions_lot_id ON public.lot_inventory_transactions USING btree (lot_id);


--
-- TOC entry 3823 (class 1259 OID 368680)
-- Name: idx_lot_mortality_records_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_mortality_records_date ON public.lot_mortality_records USING btree (calculation_date);


--
-- TOC entry 3824 (class 1259 OID 368679)
-- Name: idx_lot_mortality_records_lot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lot_mortality_records_lot_id ON public.lot_mortality_records USING btree (lot_id);


--
-- TOC entry 3733 (class 1259 OID 434180)
-- Name: idx_lots_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_active ON public.lots USING btree (active);


--
-- TOC entry 3734 (class 1259 OID 466945)
-- Name: idx_lots_animal_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_animal_count ON public.lots USING btree (animal_count);


--
-- TOC entry 3735 (class 1259 OID 458760)
-- Name: idx_lots_arrival_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_arrival_date ON public.lots USING btree (arrival_date DESC);


--
-- TOC entry 3736 (class 1259 OID 434182)
-- Name: idx_lots_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_external_id ON public.lots USING btree (external_id);


--
-- TOC entry 3737 (class 1259 OID 458768)
-- Name: idx_lots_quality; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_quality ON public.lots USING btree (quality);


--
-- TOC entry 3738 (class 1259 OID 466946)
-- Name: idx_lots_quality_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_quality_date ON public.lots USING btree (quality, arrival_date);


--
-- TOC entry 3739 (class 1259 OID 466944)
-- Name: idx_lots_size_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_size_id ON public.lots USING btree (size_id);


--
-- TOC entry 3740 (class 1259 OID 499722)
-- Name: idx_lots_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_state ON public.lots USING btree (state);


--
-- TOC entry 3741 (class 1259 OID 458767)
-- Name: idx_lots_supplier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lots_supplier ON public.lots USING btree (supplier);


--
-- TOC entry 3883 (class 1259 OID 507911)
-- Name: idx_mv_active_baskets_basket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_active_baskets_basket_id ON public.mv_active_baskets USING btree (basket_id);


--
-- TOC entry 3884 (class 1259 OID 507912)
-- Name: idx_mv_active_baskets_flupsy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_active_baskets_flupsy_id ON public.mv_active_baskets USING btree (flupsy_id);


--
-- TOC entry 3885 (class 1259 OID 507913)
-- Name: idx_mv_active_baskets_size_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_active_baskets_size_id ON public.mv_active_baskets USING btree (size_id);


--
-- TOC entry 3880 (class 1259 OID 499818)
-- Name: idx_mv_active_cycles_stats_basket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_active_cycles_stats_basket_id ON public.mv_active_cycles_stats USING btree (basket_id);


--
-- TOC entry 3881 (class 1259 OID 499817)
-- Name: idx_mv_active_cycles_stats_cycle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_active_cycles_stats_cycle_id ON public.mv_active_cycles_stats USING btree (cycle_id);


--
-- TOC entry 3882 (class 1259 OID 499819)
-- Name: idx_mv_active_cycles_stats_flupsy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mv_active_cycles_stats_flupsy_id ON public.mv_active_cycles_stats USING btree (flupsy_id);


--
-- TOC entry 3808 (class 1259 OID 499730)
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- TOC entry 3809 (class 1259 OID 499727)
-- Name: idx_notifications_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);


--
-- TOC entry 3810 (class 1259 OID 499729)
-- Name: idx_notifications_related_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_related_entity ON public.notifications USING btree (related_entity_type, related_entity_id);


--
-- TOC entry 3811 (class 1259 OID 499728)
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- TOC entry 3812 (class 1259 OID 499735)
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (is_read, created_at) WHERE (is_read = false);


--
-- TOC entry 3841 (class 1259 OID 393245)
-- Name: idx_operation_impact_defaults_operation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operation_impact_defaults_operation_type ON public.operation_impact_defaults USING btree (operation_type);


--
-- TOC entry 3746 (class 1259 OID 458754)
-- Name: idx_operations_basket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_basket_id ON public.operations USING btree (basket_id);


--
-- TOC entry 3747 (class 1259 OID 483328)
-- Name: idx_operations_basket_id_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_basket_id_date ON public.operations USING btree (basket_id, date DESC);


--
-- TOC entry 3748 (class 1259 OID 1024000)
-- Name: idx_operations_basket_id_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_basket_id_id ON public.operations USING btree (basket_id, id);


--
-- TOC entry 3749 (class 1259 OID 1032193)
-- Name: idx_operations_basket_latest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_basket_latest ON public.operations USING btree (basket_id, id DESC);


--
-- TOC entry 3750 (class 1259 OID 458755)
-- Name: idx_operations_cycle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_cycle_id ON public.operations USING btree (cycle_id);


--
-- TOC entry 3751 (class 1259 OID 458752)
-- Name: idx_operations_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_date ON public.operations USING btree (date DESC);


--
-- TOC entry 3752 (class 1259 OID 458753)
-- Name: idx_operations_date_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_date_id ON public.operations USING btree (date DESC, id DESC);


--
-- TOC entry 3753 (class 1259 OID 483330)
-- Name: idx_operations_date_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_date_type ON public.operations USING btree (date, type);


--
-- TOC entry 3754 (class 1259 OID 499731)
-- Name: idx_operations_date_type_basket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_date_type_basket ON public.operations USING btree (date, type, basket_id);


--
-- TOC entry 3755 (class 1259 OID 458756)
-- Name: idx_operations_lot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_lot_id ON public.operations USING btree (lot_id);


--
-- TOC entry 3756 (class 1259 OID 499715)
-- Name: idx_operations_size_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_size_id ON public.operations USING btree (size_id) WHERE (size_id IS NOT NULL);


--
-- TOC entry 3757 (class 1259 OID 499716)
-- Name: idx_operations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_type ON public.operations USING btree (type);


--
-- TOC entry 3758 (class 1259 OID 458769)
-- Name: idx_operations_type_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_type_date ON public.operations USING btree (type, date DESC);


--
-- TOC entry 3759 (class 1259 OID 499736)
-- Name: idx_operations_weight_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_operations_weight_date ON public.operations USING btree (date, basket_id, average_weight) WHERE (type = 'peso'::text);


--
-- TOC entry 3855 (class 1259 OID 442435)
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- TOC entry 3850 (class 1259 OID 442434)
-- Name: idx_orders_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_client_id ON public.orders USING btree (client_id);


--
-- TOC entry 3858 (class 1259 OID 442436)
-- Name: idx_payments_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_order_id ON public.payments USING btree (order_id);


--
-- TOC entry 3875 (class 1259 OID 442513)
-- Name: idx_report_templates_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_templates_type ON public.report_templates USING btree (type);


--
-- TOC entry 3864 (class 1259 OID 442508)
-- Name: idx_reports_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reports_type ON public.reports USING btree (type);


--
-- TOC entry 3912 (class 1259 OID 720939)
-- Name: idx_sale_bags_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_bags_sale_id ON public.sale_bags USING btree (advanced_sale_id);


--
-- TOC entry 3918 (class 1259 OID 720942)
-- Name: idx_sale_operations_ref_operation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_operations_ref_operation_id ON public.sale_operations_ref USING btree (operation_id);


--
-- TOC entry 3919 (class 1259 OID 720941)
-- Name: idx_sale_operations_ref_sale_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_operations_ref_sale_id ON public.sale_operations_ref USING btree (advanced_sale_id);


--
-- TOC entry 3872 (class 1259 OID 442512)
-- Name: idx_sales_reports_report_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_reports_report_id ON public.sales_reports USING btree (report_id);


--
-- TOC entry 3768 (class 1259 OID 458765)
-- Name: idx_screening_operations_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_screening_operations_date ON public.screening_operations USING btree (date DESC);


--
-- TOC entry 3769 (class 1259 OID 458766)
-- Name: idx_screening_operations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_screening_operations_status ON public.screening_operations USING btree (status);


--
-- TOC entry 3776 (class 1259 OID 458762)
-- Name: idx_selection_destination_baskets_selection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selection_destination_baskets_selection_id ON public.selection_destination_baskets USING btree (selection_id);


--
-- TOC entry 3781 (class 1259 OID 458761)
-- Name: idx_selection_source_baskets_selection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selection_source_baskets_selection_id ON public.selection_source_baskets USING btree (selection_id);


--
-- TOC entry 3784 (class 1259 OID 458763)
-- Name: idx_selections_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selections_date ON public.selections USING btree (date DESC);


--
-- TOC entry 3785 (class 1259 OID 458764)
-- Name: idx_selections_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selections_status ON public.selections USING btree (status);


--
-- TOC entry 3791 (class 1259 OID 458770)
-- Name: idx_sgr_giornalieri_record_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sgr_giornalieri_record_date ON public.sgr_giornalieri USING btree (record_date DESC);


--
-- TOC entry 3788 (class 1259 OID 458771)
-- Name: idx_sgr_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sgr_month ON public.sgr USING btree (month);


--
-- TOC entry 3937 (class 1259 OID 786487)
-- Name: idx_sync_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_log_created_at ON public.sync_log_fatture_in_cloud USING btree (created_at);


--
-- TOC entry 3938 (class 1259 OID 786486)
-- Name: idx_sync_log_entita; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_log_entita ON public.sync_log_fatture_in_cloud USING btree (entita);


--
-- TOC entry 3939 (class 1259 OID 786485)
-- Name: idx_sync_log_tipo_operazione; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sync_log_tipo_operazione ON public.sync_log_fatture_in_cloud USING btree (tipo_operazione);


--
-- TOC entry 3798 (class 1259 OID 499723)
-- Name: idx_target_size_annotations_basket_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_size_annotations_basket_id ON public.target_size_annotations USING btree (basket_id);


--
-- TOC entry 3799 (class 1259 OID 499726)
-- Name: idx_target_size_annotations_predicted_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_size_annotations_predicted_date ON public.target_size_annotations USING btree (predicted_date);


--
-- TOC entry 3800 (class 1259 OID 499725)
-- Name: idx_target_size_annotations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_size_annotations_status ON public.target_size_annotations USING btree (status);


--
-- TOC entry 3801 (class 1259 OID 499724)
-- Name: idx_target_size_annotations_target_size_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_size_annotations_target_size_id ON public.target_size_annotations USING btree (target_size_id);


--
-- TOC entry 3984 (class 2606 OID 1212417)
-- Name: advanced_sales advanced_sales_ddt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.advanced_sales
    ADD CONSTRAINT advanced_sales_ddt_id_fkey FOREIGN KEY (ddt_id) REFERENCES public.ddt(id);


--
-- TOC entry 3968 (class 2606 OID 385098)
-- Name: cycle_impacts cycle_impacts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycle_impacts
    ADD CONSTRAINT cycle_impacts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.impact_categories(id);


--
-- TOC entry 3985 (class 2606 OID 794624)
-- Name: ddt ddt_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ddt
    ADD CONSTRAINT ddt_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clienti(id);


--
-- TOC entry 3956 (class 2606 OID 499751)
-- Name: baskets fk_baskets_flupsy_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baskets
    ADD CONSTRAINT fk_baskets_flupsy_id FOREIGN KEY (flupsy_id) REFERENCES public.flupsys(id) ON DELETE RESTRICT;


--
-- TOC entry 3957 (class 2606 OID 499781)
-- Name: cycles fk_cycles_basket_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT fk_cycles_basket_id FOREIGN KEY (basket_id) REFERENCES public.baskets(id) ON DELETE CASCADE;


--
-- TOC entry 3976 (class 2606 OID 442524)
-- Name: delivery_reports fk_delivery_reports_client_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reports
    ADD CONSTRAINT fk_delivery_reports_client_id FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- TOC entry 3977 (class 2606 OID 442519)
-- Name: delivery_reports fk_delivery_reports_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reports
    ADD CONSTRAINT fk_delivery_reports_order_id FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 3978 (class 2606 OID 442514)
-- Name: delivery_reports fk_delivery_reports_report_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_reports
    ADD CONSTRAINT fk_delivery_reports_report_id FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- TOC entry 3958 (class 2606 OID 499756)
-- Name: operations fk_operations_basket_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT fk_operations_basket_id FOREIGN KEY (basket_id) REFERENCES public.baskets(id) ON DELETE CASCADE;


--
-- TOC entry 3959 (class 2606 OID 499761)
-- Name: operations fk_operations_cycle_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT fk_operations_cycle_id FOREIGN KEY (cycle_id) REFERENCES public.cycles(id) ON DELETE CASCADE;


--
-- TOC entry 3960 (class 2606 OID 499766)
-- Name: operations fk_operations_lot_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT fk_operations_lot_id FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;


--
-- TOC entry 3961 (class 2606 OID 499771)
-- Name: operations fk_operations_size_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT fk_operations_size_id FOREIGN KEY (size_id) REFERENCES public.sizes(id) ON DELETE SET NULL;


--
-- TOC entry 3971 (class 2606 OID 442453)
-- Name: order_items fk_order_items_lot_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_lot_id FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;


--
-- TOC entry 3972 (class 2606 OID 442443)
-- Name: order_items fk_order_items_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_order_id FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 3973 (class 2606 OID 442458)
-- Name: order_items fk_order_items_size_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fk_order_items_size_id FOREIGN KEY (size_id) REFERENCES public.sizes(id) ON DELETE SET NULL;


--
-- TOC entry 3970 (class 2606 OID 442438)
-- Name: orders fk_orders_client_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_client_id FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- TOC entry 3974 (class 2606 OID 442448)
-- Name: payments fk_payments_order_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT fk_payments_order_id FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 3983 (class 2606 OID 442554)
-- Name: report_templates fk_report_templates_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_templates
    ADD CONSTRAINT fk_report_templates_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3975 (class 2606 OID 442549)
-- Name: reports fk_reports_generated_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT fk_reports_generated_by FOREIGN KEY (generated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 3979 (class 2606 OID 442529)
-- Name: sales_reports fk_sales_reports_report_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT fk_sales_reports_report_id FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE;


--
-- TOC entry 3980 (class 2606 OID 442534)
-- Name: sales_reports fk_sales_reports_top_client_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT fk_sales_reports_top_client_id FOREIGN KEY (top_client_id) REFERENCES public.clients(id) ON DELETE SET NULL;


--
-- TOC entry 3981 (class 2606 OID 442544)
-- Name: sales_reports fk_sales_reports_top_lot_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT fk_sales_reports_top_lot_id FOREIGN KEY (top_lot_id) REFERENCES public.lots(id) ON DELETE SET NULL;


--
-- TOC entry 3982 (class 2606 OID 442539)
-- Name: sales_reports fk_sales_reports_top_size_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_reports
    ADD CONSTRAINT fk_sales_reports_top_size_id FOREIGN KEY (top_size_id) REFERENCES public.sizes(id) ON DELETE SET NULL;


--
-- TOC entry 3967 (class 2606 OID 385083)
-- Name: flupsy_impacts flupsy_impacts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.flupsy_impacts
    ADD CONSTRAINT flupsy_impacts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.impact_categories(id);


--
-- TOC entry 3965 (class 2606 OID 385053)
-- Name: impact_factors impact_factors_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impact_factors
    ADD CONSTRAINT impact_factors_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.impact_categories(id);


--
-- TOC entry 3962 (class 2606 OID 368651)
-- Name: lot_inventory_transactions lot_inventory_transactions_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions
    ADD CONSTRAINT lot_inventory_transactions_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- TOC entry 3963 (class 2606 OID 368656)
-- Name: lot_inventory_transactions lot_inventory_transactions_operation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_inventory_transactions
    ADD CONSTRAINT lot_inventory_transactions_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES public.operations(id) ON DELETE SET NULL;


--
-- TOC entry 3964 (class 2606 OID 368672)
-- Name: lot_mortality_records lot_mortality_records_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lot_mortality_records
    ADD CONSTRAINT lot_mortality_records_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.lots(id) ON DELETE CASCADE;


--
-- TOC entry 3966 (class 2606 OID 385068)
-- Name: operation_impacts operation_impacts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operation_impacts
    ADD CONSTRAINT operation_impacts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.impact_categories(id);


--
-- TOC entry 3969 (class 2606 OID 385114)
-- Name: sustainability_goals sustainability_goals_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sustainability_goals
    ADD CONSTRAINT sustainability_goals_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.impact_categories(id);


--
-- TOC entry 4222 (class 0 OID 507904)
-- Dependencies: 310 4259
-- Name: mv_active_baskets; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: -
--

REFRESH MATERIALIZED VIEW public.mv_active_baskets;


--
-- TOC entry 4221 (class 0 OID 499810)
-- Dependencies: 309 4259
-- Name: mv_active_cycles_stats; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: -
--

REFRESH MATERIALIZED VIEW public.mv_active_cycles_stats;


-- Completed on 2025-10-06 14:26:23 UTC

--
-- PostgreSQL database dump complete
--

