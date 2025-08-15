// app/api/attachments/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET || 'attachments';

export async function POST(req: NextRequest) {
  const { path, expires = 60 } = await req.json();
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  try {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(path, expires);
    if (error) throw error;
    return NextResponse.json({ url: data.signedUrl });
  } catch (err) {
    console.error('download signed url error', err);
    return NextResponse.json({ error: 'Failed to create signed url' }, { status: 500 });
  }
}
