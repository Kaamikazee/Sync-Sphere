// app/api/attachments/generate-thumb/route.ts
import { generateThumbnailForAttachment } from '@/lib/generateThumb';
import { NextRequest, NextResponse } from 'next/server';
// import { generateThumbnailForAttachment } from '@/lib/attachments/generateThumb';

export async function POST(req: NextRequest) {
  try {
    // optional: protect this route with an internal secret
    const internalSecret = process.env.INTERNAL_API_SECRET;
    if (internalSecret) {
      const header = req.headers.get('x-internal-secret') || '';
      if (header !== internalSecret) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
      }
    }

    const payload = await req.json();
    const { attachmentId } = payload;
    if (!attachmentId) return NextResponse.json({ error: 'Missing attachmentId' }, { status: 400 });

    const res = await generateThumbnailForAttachment(attachmentId);
    return NextResponse.json(res);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('generate-thumb route error', err);
    return NextResponse.json({ error: err?.message || 'server error' }, { status: 500 });
  }
}
