CREATE TABLE account_actions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 purpose VARCHAR(16) NOT NULL CHECK (purpose IN ('verify','reset')),
 token_hash CHAR(64) UNIQUE NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL,
 used_at TIMESTAMPTZ
);
CREATE INDEX account_actions_user_purpose ON account_actions (user_id,purpose,created_at);
