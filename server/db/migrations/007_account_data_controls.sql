CREATE TABLE account_export_grants (
 session_id UUID PRIMARY KEY REFERENCES user_sessions(id) ON DELETE CASCADE,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 capability_hash CHAR(64) NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX account_export_grants_user ON account_export_grants(user_id);
