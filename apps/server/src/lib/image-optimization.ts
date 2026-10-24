import sharp from 'sharp';
import { validateUpload } from './storage';

const maxPixels = 40_000_000;
/** Optimize static images within bounded pixel limits; store animated images unchanged. */
export async function optimizeUpload(input: Uint8Array, filename: string, declaredMime = '') {
  let info = validateUpload(input, filename, declaredMime);
  if (!info.mime.startsWith('image/')) return { bytes: input, info };
  try {
    const image = sharp(input, { limitInputPixels: maxPixels, failOn: 'warning' });
    const metadata = await image.metadata();
    if ((metadata.pages ?? 1) > 1) return { bytes: input, info };
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > maxPixels)
      throw new Error('IMAGE_DIMENSIONS_INVALID');
    const bytes = await image
      .rotate()
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .timeout({ seconds: 15 })
      .toBuffer();
    info = validateUpload(bytes, info.filename.replace(/\.[^.]+$/, '.webp'), 'image/webp');
    return { bytes, info };
  } catch (error) {
    const message = (error as Error).message;
    if (message === 'IMAGE_DIMENSIONS_INVALID') throw error;
    if (/^(Input buffer|Input file)/.test(message)) throw new Error('IMAGE_CONTENT_INVALID');
    throw error;
  }
}
