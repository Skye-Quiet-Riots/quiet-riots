import OpenAI from 'openai';
import sharp from 'sharp';
import { put } from '@vercel/blob';
import { getDb, withTimeout } from './db';
import { logger } from './logger';

/**
 * Generate a DALL-E hero image for an issue or organisation,
 * convert to WebP, upload to Vercel Blob, and update the DB.
 */
export async function generateHeroImage(
  entityType: 'issue' | 'organisation',
  entityId: string,
  entityName: string,
): Promise<{ success: boolean; heroUrl?: string; thumbUrl?: string; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { success: false, error: 'OPENAI_API_KEY not configured' };

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return { success: false, error: 'BLOB_READ_WRITE_TOKEN not configured' };

  try {
    const client = new OpenAI({ apiKey });

    const prompt = buildImagePrompt(entityType, entityName);

    logger.info({ entityType, entityId, entityName }, 'Generating hero image via DALL-E');

    const result = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      size: '1536x1024',
      quality: 'high',
    });

    const imageData = result.data?.[0]?.b64_json;
    if (!imageData) {
      return { success: false, error: 'No image data returned from DALL-E' };
    }

    const rawBytes = Buffer.from(imageData, 'base64');

    // Convert to WebP (full size hero)
    const heroBuffer = await sharp(rawBytes).webp({ quality: 85 }).toBuffer();

    // Generate thumbnail (400x267 for 3:2 cards)
    const thumbBuffer = await sharp(rawBytes)
      .resize(400, 267, { fit: 'cover', position: 'centre' })
      .webp({ quality: 75 })
      .toBuffer();

    // Upload both to Vercel Blob
    const [heroBlob, thumbBlob] = await Promise.all([
      put(`heroes/${entityType}/${entityId}.webp`, heroBuffer, {
        access: 'public',
        contentType: 'image/webp',
        token: blobToken,
      }),
      put(`heroes/${entityType}/${entityId}-thumb.webp`, thumbBuffer, {
        access: 'public',
        contentType: 'image/webp',
        token: blobToken,
      }),
    ]);

    // Store URLs in entity table
    await updateEntityHeroImage(entityType, entityId, heroBlob.url, thumbBlob.url);

    logger.info(
      { entityType, entityId, heroUrl: heroBlob.url, thumbUrl: thumbBlob.url },
      'Hero image generated and uploaded',
    );

    return { success: true, heroUrl: heroBlob.url, thumbUrl: thumbBlob.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ entityType, entityId, error: message }, 'Hero image generation failed');
    return { success: false, error: message };
  }
}

/**
 * Build the DALL-E prompt for a hero image.
 */
function buildImagePrompt(entityType: 'issue' | 'organisation', entityName: string): string {
  return [
    `Create a vibrant, editorial-style illustration for a ${entityType === 'issue' ? 'social issue' : 'company'} called "${entityName}".`,
    'Include a person in a fun chicken costume as the central character — they should be',
    'recognisable as wearing a chicken costume but styled to look surprisingly appealing.',
    'The chicken character should be interacting with the theme of the subject in a way',
    'that conveys meaning to an international audience.',
    'IMPORTANT: No text, words, letters, or numbers anywhere in the image —',
    'the image must be understood without any written language.',
    'Place the main subject centrally so it works when cropped to different aspect ratios.',
    'Use a warm, optimistic colour palette with soft gradients.',
  ].join(' ');
}

/**
 * Update an entity's hero image URLs in the database.
 */
export async function updateEntityHeroImage(
  entityType: 'issue' | 'organisation',
  entityId: string,
  heroUrl: string,
  thumbUrl: string,
): Promise<void> {
  const db = getDb();
  const table = entityType === 'issue' ? 'issues' : 'organisations';
  await withTimeout(() =>
    db.execute({
      sql: `UPDATE ${table} SET hero_image_url = ?, hero_thumb_url = ? WHERE id = ?`,
      args: [heroUrl, thumbUrl, entityId],
    }),
  );
}
