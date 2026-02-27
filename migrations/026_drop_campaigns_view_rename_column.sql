-- Migration 026: Drop campaigns VIEW and rename campaign_updates column
--
-- 1. Drop the backwards-compatible campaigns VIEW (no longer needed —
--    all code now uses the action_initiatives table directly)
-- 2. Rename notification_preferences.campaign_updates → action_initiative_updates

DROP VIEW IF EXISTS campaigns;

ALTER TABLE notification_preferences RENAME COLUMN campaign_updates TO action_initiative_updates;
