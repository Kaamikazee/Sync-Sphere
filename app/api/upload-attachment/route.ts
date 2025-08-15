/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/upload-attachment/route.ts  (or pages/api/upload-attachment.ts depending on your setup)
import { NextRequest, NextResponse } from "next/server"; // or from "next" if using pages/api
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!; // ensure this is set on server only

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error("Missing SUPABASE env vars on server");
}

// server-side supabase client (use service role key on server only)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const chatId = formData.get("chatId")?.toString();
    const groupId = formData.get("groupId")?.toString();
    const uploaderId = formData.get("uploaderId")?.toString();

    if (!file || !chatId || !groupId || !uploaderId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const id = uuidv4();
    const ext = file.name.split(".").pop() ?? "bin";
    const storagePath = `attachments/${groupId}/${id}.${ext}`;

    // Convert File -> Uint8Array (works in Edge & Node)
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    const { error: upErr } = await supabaseAdmin.storage
      .from("Attachments")
      .upload(storagePath, uint8, { contentType: file.type });

    if (upErr) {
      console.error("supabase upload error:", upErr);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { data: signedData, error: signErr } = await supabaseAdmin.storage
      .from("Attachments")
      .createSignedUrl(storagePath, 60 * 60); // 1 hour

    if (signErr) {
      console.error("createSignedUrl error:", signErr);
      return NextResponse.json({ error: "Signed URL failed" }, { status: 500 });
    }

    // handle possible naming differences
    const publicUrl =
    
      (signedData as any)?.signedUrl ?? (signedData as any)?.signedURL ?? null;

    return NextResponse.json({
      storagePath,
      publicUrl,
      mime: file.type,
      size: file.size,
      originalName: file.name,
    });
  } catch (e) {
    console.error("upload route error:", e);
    return NextResponse.json(
      { error: "Server error", details: String(e) },
      { status: 500 }
    );
  }
}
