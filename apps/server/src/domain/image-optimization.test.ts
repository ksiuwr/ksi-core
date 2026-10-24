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
test('static images are auto-oriented and never enlarged', async () => {
  const rotated = await sharp({
    create: {
      width: 40,
      height: 20,
      channels: 3,
      background: { r: 20, g: 80, b: 120 }
    }
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const oriented = await optimizeUpload(rotated, 'rotated.jpg', 'image/jpeg');
  const orientedOutput = await sharp(oriented.bytes).metadata();
  expect(orientedOutput.width).toBe(20);
  expect(orientedOutput.height).toBe(40);
  expect(orientedOutput.exif).toBeUndefined();

  const small = await sharp({
    create: {
      width: 100,
      height: 50,
      channels: 3,
      background: { r: 20, g: 80, b: 120 }
    }
  })
    .png()
    .toBuffer();
  const resized = await optimizeUpload(small, 'small.png', 'image/png');
  const resizedOutput = await sharp(resized.bytes).metadata();
  expect(resizedOutput.width).toBe(100);
  expect(resizedOutput.height).toBe(50);
});
test('animated images keep their original bytes', async () => {
  const frames = await Promise.all(
    [
      { r: 255, g: 0, b: 0, alpha: 1 },
      { r: 0, g: 0, b: 255, alpha: 1 }
    ].map((background) =>
      sharp({ create: { width: 4, height: 4, channels: 4, background } })
        .png()
        .toBuffer()
    )
  );
  const input = await sharp(frames, { join: { animated: true } })
    .gif()
    .toBuffer();
  const output = await optimizeUpload(input, 'animation.gif', 'image/gif');
  expect(output.bytes).toEqual(input);
  expect(output.info.mime).toBe('image/gif');
  expect(output.info.filename).toBe('animation.gif');
});
test('documents keep exact bytes and corrupt images fail before storage', async () => {
  const input = new TextEncoder().encode('document');
  const output = await optimizeUpload(input, 'notes.txt', 'text/plain');
  expect(output.bytes).toEqual(input);
  expect(output.info.mime).toBe('text/plain');
  const corrupt = Buffer.alloc(40);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(corrupt);
  corrupt.write('IHDR', 12);
  let error: unknown;
  try {
    await optimizeUpload(corrupt, 'corrupt.png', 'image/png');
  } catch (cause) {
    error = cause;
  }
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe('IMAGE_CONTENT_INVALID');
});
