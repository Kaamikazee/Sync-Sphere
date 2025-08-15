// lib/supabaseAdmin.js (server-only)
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('Missing SUPABASE env vars (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)');
}

export const supabaseAdmin = createClient(url, key);
export const ATTACHMENT_BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET || 'attachments';
