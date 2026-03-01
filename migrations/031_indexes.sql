-- Org-scoped aggregation queries (Phase 6)
CREATE INDEX IF NOT EXISTS idx_issue_org_org_id ON issue_organisation(organisation_id);

-- Personal feed UNION ALL queries (Phase 8) — include here to ensure they exist well before Phase 8 code deploys
CREATE INDEX IF NOT EXISTS idx_feed_issue ON feed(issue_id);
CREATE INDEX IF NOT EXISTS idx_feed_issue_created ON feed(issue_id, created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_issue_created ON evidence(issue_id, created_at);
CREATE INDEX IF NOT EXISTS idx_riot_reels_issue_created ON riot_reels(issue_id, created_at);
