ALTER TABLE users ADD COLUMN email_verification_source VARCHAR(16) CHECK(email_verification_source IN ('local','resend'));
UPDATE users SET email_verification_source='local' WHERE email_verified_at IS NOT NULL;
ALTER TABLE account_actions ADD COLUMN delivery VARCHAR(16) NOT NULL DEFAULT 'local' CHECK(delivery IN ('local','resend'));
CREATE TABLE mail_usage (
 window_key VARCHAR(32) PRIMARY KEY,
 reserved INTEGER NOT NULL CHECK(reserved>=0)
);
CREATE TABLE mail_outbox (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 action_id UUID NOT NULL REFERENCES account_actions(id) ON DELETE CASCADE,
 ciphertext BYTEA,
 state VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','dead')),
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0 AND attempts<=5),
 available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 expires_at TIMESTAMPTZ NOT NULL,
 lease_until TIMESTAMPTZ,
 lease_token UUID,
 last_error VARCHAR(40),
 provider_message_id VARCHAR(200),
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX mail_outbox_ready ON mail_outbox(state,available_at);
