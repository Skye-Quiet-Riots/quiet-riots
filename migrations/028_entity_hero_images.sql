-- Add hero image columns to issues and organisations
-- hero_image_url: full-size WebP (~200-500KB) for detail page hero
-- hero_thumb_url: small WebP thumbnail (~20-40KB, 400x133) for browse page cards

ALTER TABLE issues ADD COLUMN hero_image_url TEXT DEFAULT NULL;
ALTER TABLE issues ADD COLUMN hero_thumb_url TEXT DEFAULT NULL;

ALTER TABLE organisations ADD COLUMN hero_image_url TEXT DEFAULT NULL;
ALTER TABLE organisations ADD COLUMN hero_thumb_url TEXT DEFAULT NULL;
