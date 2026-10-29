import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getUrls } from 'shared';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const extensions: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json'
};
export function sanitizeFilename(name: string): string {
  return (
    name
      .split(/[\\/]/)
      .pop()!
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f"<>:|?*]/g, '_')
      .replace(/^\.+/, '')
      .slice(0, 160) || 'attachment'
  );
}
/** Verify bytes rather than trusting browser-provided MIME or extension. Archives and executable formats are deliberately not accepted. */
export function validateUpload(
  bytes: Uint8Array,
  filename: string,
  declaredMime = ''
): { mime: string; filename: string; hash: string } {
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) throw new Error('FILE_SIZE_INVALID');
  if (
    /\.(exe|dll|com|bat|cmd|ps1|sh|js|mjs|cjs|html?|svg|wasm|jar|apk|msi|zip|rar|7z|tar|gz)(?:\.|$)/i.test(
      filename
    )
  )
    throw new Error('FILE_TYPE_UNSUPPORTED');
  const prefix = Buffer.from(bytes.subarray(0, 64));
  const ascii = prefix.toString('ascii');
  let mime: string | undefined;
  if (
    prefix.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    ascii.slice(12, 16) === 'IHDR' &&
    bytes.length >= 33
  )
    mime = 'image/png';
  else if (
    bytes.length > 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255 &&
    bytes[bytes.length - 2] === 255 &&
    bytes[bytes.length - 1] === 217
  )
    mime = 'image/jpeg';
  else if (/^GIF8[79]a/.test(ascii) && bytes.length >= 14 && bytes[bytes.length - 1] === 59)
    mime = 'image/gif';
  else if (
    ascii.startsWith('RIFF') &&
    ascii.slice(8, 12) === 'WEBP' &&
    /^(VP8 |VP8L|VP8X)$/.test(ascii.slice(12, 16)) &&
    bytes.length >= 20
  )
    mime = 'image/webp';
  else if (
    ascii.slice(4, 8) === 'ftyp' &&
    /avif|avis/.test(ascii.slice(8, 32)) &&
    bytes.length >= 32
  )
    mime = 'image/avif';
  else if (
    ascii.startsWith('%PDF-') &&
    Buffer.from(bytes.subarray(Math.max(0, bytes.length - 1024))).includes(Buffer.from('%%EOF'))
  )
    mime = 'application/pdf';
  else if (/\.(txt|csv|json)$/i.test(filename)) {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error('FILE_TYPE_UNSUPPORTED');
    }
    if (
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text) ||
      /^\s*(#!|<\?php|<!doctype|<html|<script|<svg)/i.test(text)
    )
      throw new Error('FILE_TYPE_UNSUPPORTED');
    mime = /\.json$/i.test(filename)
      ? 'application/json'
      : /\.csv$/i.test(filename)
        ? 'text/csv'
        : 'text/plain';
    if (mime === 'application/json') {
      try {
        JSON.parse(text);
      } catch {
        throw new Error('FILE_CONTENT_INVALID');
      }
    }
  }
  if (
    !mime ||
    (declaredMime && declaredMime !== 'application/octet-stream' && declaredMime !== mime)
  )
    throw new Error('FILE_TYPE_UNSUPPORTED');
  const clean = sanitizeFilename(filename).replace(/\.[^.]+$/, '');
  return {
    mime,
    filename: `${clean}.${extensions[mime]}`,
    hash: createHash('sha256').update(bytes).digest('hex')
  };
}
export function objectKey(
  environment: string,
  hash: string,
  identity: string = randomUUID()
): string {
  if (
    !/^[a-z0-9][a-z0-9-]{0,62}$/.test(environment) ||
    !/^[a-f0-9]{64}$/.test(hash) ||
    !/^[a-zA-Z0-9_-]{1,64}$/.test(identity)
  )
    throw new Error('INVALID_OBJECT_KEY');
  // Random suffix prevents identical uploads sharing lifecycle/authorization across owners.
  return `${environment}/${hash.slice(0, 2)}/${hash}/${identity}`;
}
function configuration() {
  const endpoint = Bun.env.R2_ENDPOINT,
    accessKeyId = Bun.env.R2_ACCESS_KEY_ID,
    secretAccessKey = Bun.env.R2_SECRET_ACCESS_KEY;
  const privateBucket = Bun.env.R2_PRIVATE_BUCKET,
    publicBucket = Bun.env.R2_PUBLIC_BUCKET;
  if (
    !endpoint ||
    !accessKeyId ||
    !secretAccessKey ||
    !privateBucket ||
    !publicBucket ||
    privateBucket === publicBucket
  )
    throw new Error('R2_NOT_CONFIGURED');
  if (new URL(endpoint).protocol !== 'https:' && Bun.env.NODE_ENV === 'production')
    throw new Error('R2_ENDPOINT_INSECURE');
  return {
    privateBucket,
    publicBucket,
    client: new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED'
    })
  };
}
export async function uploadPrivate(
  key: string,
  bytes: Uint8Array,
  mime: string,
  filename: string
) {
  const { client, privateBucket } = configuration();
  await client.send(
    new PutObjectCommand({
      Bucket: privateBucket,
      Key: key,
      Body: bytes,
      ContentType: mime,
      ContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      CacheControl: 'private, no-store'
    })
  );
}
export async function publishObject(key: string) {
  const { client, privateBucket, publicBucket } = configuration();
  await client.send(
    new CopyObjectCommand({
      Bucket: publicBucket,
      Key: key,
      CopySource: `${privateBucket}/${key.split('/').map(encodeURIComponent).join('/')}`,
      MetadataDirective: 'COPY'
    })
  );
}
export async function unpublishObject(key: string) {
  const { client, publicBucket } = configuration();
  await client.send(new DeleteObjectCommand({ Bucket: publicBucket, Key: key }));
}
export async function deleteObject(key: string) {
  const { client, privateBucket, publicBucket } = configuration();
  await client.send(new DeleteObjectCommand({ Bucket: publicBucket, Key: key }));
  await client.send(new DeleteObjectCommand({ Bucket: privateBucket, Key: key }));
}
export async function privateDownloadUrl(key: string, filename: string, mime: string) {
  const { client, privateBucket } = configuration();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: privateBucket,
      Key: key,
      ResponseContentType: mime,
      ResponseContentDisposition: `${mime.startsWith('image/') ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      ResponseCacheControl: 'private, no-store'
    }),
    { expiresIn: 60 }
  );
}
export function publicObjectUrl(key: string): string {
  if (!Bun.env.R2_PUBLIC_ORIGIN) throw new Error('R2_PUBLIC_ORIGIN_NOT_CONFIGURED');
  const origin = new URL(Bun.env.R2_PUBLIC_ORIGIN);
  if (origin.protocol !== 'https:' && Bun.env.NODE_ENV === 'production')
    throw new Error('R2_PUBLIC_ORIGIN_INSECURE');
  return `${origin.href.replace(/\/$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`;
}
export function storageEnvironment() {
  return getUrls().environment;
}

export function referencedFileIds(content: string): string[] {
  return [
    ...new Set(
      [
        ...content.matchAll(
          /(?:\/(?:files|media)\/|file:)([a-zA-Z0-9_-]{8,64})(?=[/\s)\]"'?,}]|$)/g
        )
      ].map((match) => match[1]!)
    )
  ];
}
export function mailRetryDelay(attempt: number): number {
  return Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.max(0, Math.min(attempt - 1, 10)));
}
/** Only error codes and SMTP statuses are logged; messages can echo addresses or credentials. */
export function mailFailure(error: unknown): { reason: string; smtpStatus?: number } {
  const { code, responseCode } = (error ?? {}) as { code?: unknown; responseCode?: unknown };
  return {
    reason: typeof code === 'string' && /^[A-Z_]{1,40}$/.test(code) ? code : 'UNKNOWN',
    ...(typeof responseCode === 'number' ? { smtpStatus: responseCode } : {})
  };
}

export async function uploadEncryptedBackup(path: string) {
  const { client, privateBucket } = configuration();
  const key = `${storageEnvironment()}/backups/${new Date().toISOString().replace(/:/g, '-')}-${randomUUID()}.enc`;
  await client.send(
    new PutObjectCommand({
      Bucket: privateBucket,
      Key: key,
      Body: createReadStream(path),
      ContentLength: (await stat(path)).size,
      ContentType: 'application/octet-stream',
      CacheControl: 'private, no-store'
    })
  );
  return key;
}
export async function retainEncryptedBackups(now = new Date()) {
  const { client, privateBucket } = configuration();
  let continuationToken: string | undefined;
  const cutoff = now.getTime() - 14 * 24 * 60 * 60 * 1000;
  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: privateBucket,
        Prefix: `${storageEnvironment()}/backups/`,
        ContinuationToken: continuationToken
      })
    );
    for (const object of page.Contents ?? [])
      if (
        object.Key?.endsWith('.enc') &&
        object.LastModified &&
        object.LastModified.getTime() < cutoff
      )
        await client.send(new DeleteObjectCommand({ Bucket: privateBucket, Key: object.Key }));
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
}
