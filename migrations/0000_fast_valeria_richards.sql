CREATE TABLE "basket_position_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"basket_id" integer NOT NULL,
	"flupsy_id" integer NOT NULL,
	"row" text NOT NULL,
	"position" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"operation_id" integer
);
--> statement-breakpoint
CREATE TABLE "baskets" (
	"id" serial PRIMARY KEY NOT NULL,
	"physical_number" integer NOT NULL,
	"flupsy_id" integer NOT NULL,
	"cycle_code" text,
	"state" text DEFAULT 'available' NOT NULL,
	"current_cycle_id" integer,
	"nfc_data" text,
	"row" text,
	"position" integer
);
--> statement-breakpoint
CREATE TABLE "cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"basket_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"state" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "email_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "flupsys" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"max_positions" integer DEFAULT 10 NOT NULL,
	"production_center" text
);
--> statement-breakpoint
CREATE TABLE "lots" (
	"id" serial PRIMARY KEY NOT NULL,
	"arrival_date" date NOT NULL,
	"supplier" text NOT NULL,
	"quality" text,
	"animal_count" integer,
	"weight" real,
	"size_id" integer,
	"notes" text,
	"state" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mortality_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"size_id" integer NOT NULL,
	"month" text NOT NULL,
	"percentage" real NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_type" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"related_entity_type" text,
	"related_entity_id" integer,
	"data" text
);
--> statement-breakpoint
CREATE TABLE "operations" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"basket_id" integer NOT NULL,
	"cycle_id" integer NOT NULL,
	"size_id" integer,
	"sgr_id" integer,
	"lot_id" integer,
	"animal_count" integer,
	"total_weight" real,
	"animals_per_kg" integer,
	"average_weight" real,
	"dead_count" integer,
	"mortality_rate" real,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "screening_basket_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"screening_id" integer NOT NULL,
	"source_basket_id" integer NOT NULL,
	"source_cycle_id" integer NOT NULL,
	"destination_basket_id" integer NOT NULL,
	"destination_cycle_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening_destination_baskets" (
	"id" serial PRIMARY KEY NOT NULL,
	"screening_id" integer NOT NULL,
	"basket_id" integer NOT NULL,
	"cycle_id" integer,
	"category" text NOT NULL,
	"flupsy_id" integer,
	"row" text,
	"position" integer,
	"position_assigned" boolean DEFAULT false NOT NULL,
	"animal_count" integer,
	"live_animals" integer,
	"total_weight" real,
	"animals_per_kg" integer,
	"dead_count" integer,
	"mortality_rate" real,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "screening_lot_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"screening_id" integer NOT NULL,
	"destination_basket_id" integer NOT NULL,
	"destination_cycle_id" integer NOT NULL,
	"lot_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screening_operations" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"screening_number" integer NOT NULL,
	"purpose" text,
	"reference_size_id" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "screening_source_baskets" (
	"id" serial PRIMARY KEY NOT NULL,
	"screening_id" integer NOT NULL,
	"basket_id" integer NOT NULL,
	"cycle_id" integer NOT NULL,
	"dismissed" boolean DEFAULT false NOT NULL,
	"position_released" boolean DEFAULT false NOT NULL,
	"animal_count" integer,
	"total_weight" real,
	"animals_per_kg" integer,
	"size_id" integer,
	"lot_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_basket_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"selection_id" integer NOT NULL,
	"source_basket_id" integer NOT NULL,
	"source_cycle_id" integer NOT NULL,
	"destination_basket_id" integer NOT NULL,
	"destination_cycle_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_destination_baskets" (
	"id" serial PRIMARY KEY NOT NULL,
	"selection_id" integer NOT NULL,
	"basket_id" integer NOT NULL,
	"cycle_id" integer,
	"destination_type" text NOT NULL,
	"flupsy_id" integer,
	"position" text,
	"animal_count" integer,
	"live_animals" integer,
	"total_weight" real,
	"animals_per_kg" integer,
	"size_id" integer,
	"dead_count" integer,
	"mortality_rate" real,
	"sample_weight" real,
	"sample_count" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "selection_lot_references" (
	"id" serial PRIMARY KEY NOT NULL,
	"selection_id" integer NOT NULL,
	"destination_basket_id" integer NOT NULL,
	"destination_cycle_id" integer NOT NULL,
	"lot_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selection_source_baskets" (
	"id" serial PRIMARY KEY NOT NULL,
	"selection_id" integer NOT NULL,
	"basket_id" integer NOT NULL,
	"cycle_id" integer NOT NULL,
	"animal_count" integer,
	"total_weight" real,
	"animals_per_kg" integer,
	"size_id" integer,
	"lot_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"selection_number" integer NOT NULL,
	"purpose" text NOT NULL,
	"screening_type" text,
	"reference_size_id" integer,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "sgr" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"percentage" real NOT NULL,
	"calculated_from_real" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "sgr_giornalieri" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_date" timestamp NOT NULL,
	"temperature" real,
	"ph" real,
	"ammonia" real,
	"oxygen" real,
	"salinity" real,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "sizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"size_mm" real,
	"min_animals_per_kg" integer,
	"max_animals_per_kg" integer,
	"notes" text,
	"color" text,
	CONSTRAINT "sizes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "target_size_annotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"basket_id" integer NOT NULL,
	"target_size_id" integer NOT NULL,
	"predicted_date" date NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reached_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
