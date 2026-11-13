-- GIM marketplace foundation: migration 001
-- PostgreSQL 15+. NOT deployed. Run only after review in an authenticated backend.
-- This schema does not enable checkout, subscriptions, vendor payouts, or fulfillment.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS marketplace_vendors (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 display_name text NOT NULL CHECK (length(display_name) BETWEEN 2 AND 160),
 country_code char(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','review','approved','suspended','rejected')),
 legal_verified boolean NOT NULL DEFAULT false,
 processor_approved boolean NOT NULL DEFAULT false,
 payout_ready boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT vendor_approval_gate CHECK (status <> 'approved' OR (legal_verified AND processor_approved))
);
CREATE TABLE IF NOT EXISTS marketplace_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 vendor_id uuid NOT NULL REFERENCES marketplace_vendors(id),
 sku text NOT NULL,
 title text NOT NULL CHECK (length(title) BETWEEN 2 AND 250),
 currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
 price_minor bigint NOT NULL CHECK (price_minor >= 0),
 inventory_count integer NOT NULL DEFAULT 0 CHECK (inventory_count >= 0),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','suspended')),
 resale_rights_verified boolean NOT NULL DEFAULT false,
 media_rights_verified boolean NOT NULL DEFAULT false,
 territory_reviewed boolean NOT NULL DEFAULT false,
 age_restricted boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(vendor_id,sku),
 CONSTRAINT product_approval_gate CHECK (status <> 'approved' OR (resale_rights_verified AND media_rights_verified AND territory_reviewed))
);
CREATE TABLE IF NOT EXISTS marketplace_regions (
 product_id uuid NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
 country_code char(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
 shipping_enabled boolean NOT NULL DEFAULT false,
 PRIMARY KEY(product_id,country_code)
);
CREATE TABLE IF NOT EXISTS marketplace_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 external_reference text UNIQUE,
 currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
 total_minor bigint NOT NULL CHECK (total_minor >= 0),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','authorized','paid','routing','fulfilled','cancelled','refunded','disputed')),
 processor_payment_id text UNIQUE,
 destination_country char(2) NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS marketplace_order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES marketplace_orders(id),
 product_id uuid NOT NULL REFERENCES marketplace_products(id),
 vendor_id uuid NOT NULL REFERENCES marketplace_vendors(id),
 quantity integer NOT NULL CHECK (quantity > 0),
 unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
 fulfillment_status text NOT NULL DEFAULT 'held' CHECK (fulfillment_status IN ('held','ready','sent','shipped','delivered','failed','returned')),
 supplier_reference text,
 UNIQUE(order_id,product_id)
);
CREATE TABLE IF NOT EXISTS marketplace_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 entity_type text NOT NULL CHECK (entity_type IN ('vendor','product','order','subscription','fulfillment')),
 entity_id uuid NOT NULL,
 event_type text NOT NULL,
 event_key text NOT NULL UNIQUE,
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_product_vendor ON marketplace_products(vendor_id,status);
CREATE INDEX IF NOT EXISTS idx_marketplace_order_status ON marketplace_orders(status,created_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_events_entity ON marketplace_events(entity_type,entity_id);
-- Defense in depth: no application role receives table access by default.
-- Backend service authorization and scoped RLS policies must be reviewed before granting access.
ALTER TABLE marketplace_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_events ENABLE ROW LEVEL SECURITY;
COMMIT;
