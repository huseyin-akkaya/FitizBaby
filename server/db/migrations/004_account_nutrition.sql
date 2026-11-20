CREATE TABLE user_nutrition (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(32) NOT NULL CHECK (key IN ('profile','plan','targets') OR key ~ '^day:[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  data JSONB NOT NULL CHECK (jsonb_typeof(data) = 'object' AND octet_length(data::text) <= 150000),
  revision UUID NOT NULL DEFAULT gen_random_uuid(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, key)
);
