-- Fix production action_initiative descriptions that still use Stripe-prohibited language.
-- Seed was corrected in session 50, but production DB was never updated.

-- 1. Fix English descriptions
UPDATE action_initiatives
SET description = 'Purchase portable water testing kits for 50 volunteer river monitors across England'
WHERE description LIKE 'Crowdfund portable water testing kits%';

UPDATE action_initiatives
SET description = 'Commission development of a community broadband speed testing and mapping app'
WHERE description LIKE 'Fund development of a community broadband%';

UPDATE action_initiatives
SET description = 'Commission Freedom of Information requests to every NHS trust on GP appointment statistics'
WHERE description LIKE 'Crowdfund Freedom of Information requests%';

-- 2. Delete stale translations for these descriptions so they fall back to
--    corrected English until new translations are generated.
DELETE FROM translations
WHERE entity_type = 'action_initiative'
  AND field = 'description'
  AND entity_id IN (
    SELECT id FROM action_initiatives
    WHERE description LIKE 'Purchase portable water testing kits%'
       OR description LIKE 'Commission development of a community broadband%'
       OR description LIKE 'Commission Freedom of Information requests to every NHS trust%'
  );
