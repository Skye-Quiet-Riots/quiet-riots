-- Add language_code to issue_suggestions to track the submission language
ALTER TABLE issue_suggestions ADD COLUMN language_code TEXT DEFAULT 'en' CHECK(length(language_code) <= 10);
