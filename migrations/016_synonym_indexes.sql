-- Add indexes on synonyms table for search performance.
-- Without these, `term LIKE ?` in issue search is a full table scan.

CREATE INDEX IF NOT EXISTS idx_synonyms_issue ON synonyms(issue_id);
CREATE INDEX IF NOT EXISTS idx_synonyms_term ON synonyms(term);
