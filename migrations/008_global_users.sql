-- Migration 008: Expand users table for global platform
-- Adds profile fields, global identity, auth management columns
-- All new columns are nullable or have defaults — existing data unaffected

-- Profile fields
ALTER TABLE users ADD COLUMN first_name TEXT CHECK(length(first_name) <= 100);
ALTER TABLE users ADD COLUMN last_name TEXT CHECK(length(last_name) <= 100);
ALTER TABLE users ADD COLUMN display_name TEXT CHECK(length(display_name) <= 100);
ALTER TABLE users ADD COLUMN bio TEXT CHECK(length(bio) <= 300);
ALTER TABLE users ADD COLUMN avatar_url TEXT CHECK(length(avatar_url) <= 500);
ALTER TABLE users ADD COLUMN date_of_birth TEXT; -- YYYY-MM-DD, for 13+ age gate

-- Global identity
ALTER TABLE users ADD COLUMN country_code TEXT CHECK(length(country_code) <= 3);
ALTER TABLE users ADD COLUMN language_code TEXT DEFAULT 'en' CHECK(length(language_code) <= 10);

-- Auth verification
ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN phone_verified INTEGER NOT NULL DEFAULT 0;

-- Account management (deletion grace period, session invalidation)
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active' CHECK(status IN ('active','deactivated','deleted'));
ALTER TABLE users ADD COLUMN deactivated_at TEXT;
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1;
