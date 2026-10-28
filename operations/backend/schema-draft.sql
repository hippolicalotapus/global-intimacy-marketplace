-- GIM private backend prototype. Run only on a dedicated development PostgreSQL database.
-- No personal data or production credentials. Application roles must not own tables or have BYPASSRLS.
BEGIN;
CREATE SCHEMA IF NOT EXISTS gim_private;
CREATE TABLE gim_private.creators (
 id uuid PRIMARY KEY, owner_user_id uuid NOT NULL UNIQUE, public_alias text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gim_private.wishlists (
 id uuid PRIMARY KEY, creator_id uuid NOT NULL REFERENCES gim_private.creators(id),
 public_slug text NOT NULL UNIQUE, published boolean NOT NULL DEFAULT false
);
CREATE TABLE gim_private.wishlist_items (
 id uuid PRIMARY KEY, wishlist_id uuid NOT NULL REFERENCES gim_private.wishlists(id),
 product_draft_id uuid NOT NULL, position integer NOT NULL DEFAULT 0
);
CREATE TABLE gim_private.recipient_addresses (
 id uuid PRIMARY KEY, creator_id uuid NOT NULL UNIQUE REFERENCES gim_private.creators(id),
 encrypted_payload bytea NOT NULL, key_version integer NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gim_private.gift_intents (
 id uuid PRIMARY KEY, wishlist_id uuid NOT NULL REFERENCES gim_private.wishlists(id),
 wishlist_item_id uuid NOT NULL REFERENCES gim_private.wishlist_items(id),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','cancelled','approved_for_fulfillment','fulfilled')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gim_private.fulfillment_grants (
 id uuid PRIMARY KEY, gift_intent_id uuid NOT NULL REFERENCES gim_private.gift_intents(id),
 recipient_address_id uuid NOT NULL REFERENCES gim_private.recipient_addresses(id),
 expires_at timestamptz NOT NULL, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE gim_private.audit_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_user_id uuid, action text NOT NULL, object_type text NOT NULL,
 object_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gim_private.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE gim_private.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE gim_private.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gim_private.recipient_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE gim_private.gift_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gim_private.fulfillment_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE gim_private.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE gim_private.creators FORCE ROW LEVEL SECURITY;
ALTER TABLE gim_private.wishlists FORCE ROW LEVEL SECURITY;
ALTER TABLE gim_private.wishlist_items FORCE ROW LEVEL SECURITY;
ALTER TABLE gim_private.recipient_addresses FORCE ROW LEVEL SECURITY;
ALTER TABLE gim_private.gift_intents FORCE ROW LEVEL SECURITY;
ALTER TABLE gim_private.fulfillment_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE gim_private.audit_events FORCE ROW LEVEL SECURITY;
-- Intentionally NO policies and NO grants: deny all to application roles.
-- Public wishlist access will be provided by reviewed, narrow API functions/views later.
-- Address decryption keys must reside outside PostgreSQL, in server-only secret storage.
COMMIT;
