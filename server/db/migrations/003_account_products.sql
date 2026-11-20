CREATE TABLE user_products (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id VARCHAR(43) NOT NULL CHECK (id ~ '^custom-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  data JSONB NOT NULL CHECK (jsonb_typeof(data) = 'object' AND octet_length(data::text) <= 40000),
  image BYTEA CHECK (octet_length(image) <= 614400),
  revision UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, id)
);
