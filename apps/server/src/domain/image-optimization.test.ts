import { expect, test } from 'bun:test';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { optimizeUpload } from '../lib/image-optimization';

test('image uploads become bounded WebP with matching stored metadata and stripped EXIF', async () => {
  const input = await sharp({
    create: {
      width: 3000,
      height: 1500,
      channels: 4,
      background: { r: 20, g: 80, b: 120, alpha: 0.5 }
    }
  })
    .png()
    .withMetadata()
    .toBuffer();
  const { bytes, info } = await optimizeUpload(input, 'photo.png', 'image/png');
  const output = await sharp(bytes).metadata();
  expect(info.mime).toBe('image/webp');
  expect(info.filename).toBe('photo.webp');
  expect(info.hash).toBe(createHash('sha256').update(bytes).digest('hex'));
  expect(output.width).toBe(2560);
  expect(output.height).toBe(1280);
  expect(output.hasAlpha).toBe(true);
  expect(output.exif).toBeUndefined();
});
test('documents keep exact bytes and corrupt images fail before storage', async () => {
  const input = new TextEncoder().encode('document');
  const output = await optimizeUpload(input, 'notes.txt', 'text/plain');
  expect(output.bytes).toEqual(input);
  expect(output.info.mime).toBe('text/plain');
  const corrupt = Buffer.alloc(40);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(corrupt);
  corrupt.write('IHDR', 12);
  await expect(optimizeUpload(corrupt, 'corrupt.png', 'image/png')).rejects.toThrow(
    'IMAGE_CONTENT_INVALID'
  );
});
