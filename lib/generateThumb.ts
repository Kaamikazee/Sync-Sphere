// lib/attachments/generateThumb.ts
import sharp from 'sharp';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import db from '@/lib/db';

const BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET || 'attachments';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function streamToBuffer(body: any) {
  if (!body) return Buffer.alloc(0);
  if (typeof body.arrayBuffer === 'function') {
    const ab = await body.arrayBuffer();
    return Buffer.from(ab);
  }
  // fallback for Node streams
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function generateThumbnailForAttachment(attachmentId: string) {
  if (!attachmentId) throw new Error('missing attachmentId');

  const att = await db.attachment.findUnique({ where: { id: attachmentId } });
  if (!att) throw new Error('attachment not found');
  if (!att.mime?.startsWith('image/')) return { ok: false, reason: 'not image' };

  // download file from storage
  const { data, error: dlError } = await supabaseAdmin.storage.from(BUCKET).download(att.storagePath);
  if (dlError || !data) {
    throw new Error('failed to download file from storage: ' + JSON.stringify(dlError));
  }

  const buffer = await streamToBuffer(data);

  // create thumbnail (adjust width/format/quality as you prefer)
  const thumbBuffer = await sharp(buffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  const thumbPath = att.storagePath.replace(/([^/]+)$/, 'thumbs/$1.webp');

  const { error: upErr } = await supabaseAdmin.storage.from(BUCKET).upload(thumbPath, thumbBuffer, {
    contentType: 'image/webp',
    upsert: true,
  });

  if (upErr) throw new Error('upload thumb error: ' + JSON.stringify(upErr));

  const meta = await sharp(thumbBuffer).metadata();

  await db.attachment.update({
    where: { id: attachmentId },
    data: { thumbPath, width: meta.width ?? null, height: meta.height ?? null },
  });

  return { ok: true, thumbPath, width: meta.width, height: meta.height };
}
