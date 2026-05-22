-- schema.sql
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    clerk_user_id TEXT PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'user',
    api_key_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_banned INTEGER DEFAULT 0
);

CREATE TABLE images (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    original_name TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    expires_at DATETIME,
    is_reported INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(clerk_user_id) ON DELETE CASCADE
);

CREATE INDEX idx_images_user_id ON images(user_id);
CREATE INDEX idx_images_expires_at ON images(expires_at);