// app/api/attachments/presign/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";
import db from "@/lib/db";
import { getToken } from "next-auth/jwt";

const BUCKET = process.env.SUPABASE_ATTACHMENTS_BUCKET || "attachments";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

function sanitizeFilename(name = "") {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 200);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { files = [], groupId, chatId } = body ?? {};

    console.log(
      `[PRESIGN ${new Date().toISOString()}] incoming presign request files=${
        files.length
      } groupId=${groupId} chatId=${chatId}`
    );
    console.log(
      `[PRESIGN ${new Date().toISOString()}] incoming headers -> Authorization present? ${!!req.headers.get(
        "authorization"
      )} x-user-id? ${!!req.headers.get("x-user-id")}`
    );

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // 1) Try to get authenticated user id from NextAuth (JWT cookie/session)
    let uploaderId: string | null = null;

    try {
      // getToken works with NextRequest in App Router
      const nextAuthToken = await getToken({ req, secret: NEXTAUTH_SECRET });
      if (nextAuthToken) {
        // NextAuth token commonly has .sub or .id
        uploaderId =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (nextAuthToken as any).sub ?? (nextAuthToken as any).id ?? null;
        console.log("presign: found next-auth token, uploaderId =", uploaderId);
      }
    } catch (err) {
      console.warn("presign: getToken error", err);
    }

    // 2) If not found via NextAuth, try Authorization: Bearer <supabase-token> (optional)
    if (!uploaderId) {
      const authHeader = req.headers.get("authorization") || "";
      if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const { data, error } = await supabaseAdmin.auth.getUser(token);
          if (!error && data?.user?.id) {
            uploaderId = data.user.id;
            console.log(
              "presign: validated supabase token -> uploaderId =",
              uploaderId
            );
          } else {
            console.warn(
              "presign: supabase getUser did not return user",
              error
            );
          }
        } catch (err) {
          console.warn("presign: error validating supabase token", err);
        }
      }
    }

    // 3) Very last resort: accept x-user-id header (INSECURE - dev only)
    if (!uploaderId) {
      const fallback = req.headers.get("x-user-id");
      if (fallback) {
        console.warn(
          "presign: using fallback x-user-id header (insecure) ->",
          fallback
        );
        uploaderId = fallback;
      }
    }

    if (!uploaderId) {
      console.log("presign: no authenticated user found; returning 401");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 4) Create DB rows and signed upload URLs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Array<any> = [];

    for (const f of files) {
      const id = crypto.randomUUID();
      const filename = sanitizeFilename(f.name || `file-${id}`);
      const ext = filename.includes(".")
        ? filename.slice(filename.lastIndexOf("."))
        : "";
      const path = `${groupId}/${id}${ext}`;

      const att = await db.attachment.create({
        data: {
          id,
          messageId: null,
          chatId: chatId ?? "",
          groupId,
          uploaderId,
          storagePath: path,
          mime: f.mime,
          size: f.size ?? 0,
        },
      });

      console.log(
        `[PRESIGN ${new Date().toISOString()}] created attachment row id=${
          att.id
        } path=${att.storagePath} uploader=${uploaderId}`
      );

      const { data: tokenData, error: tokenErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUploadUrl(path);

      if (tokenErr || !tokenData?.token) {
        console.error(
          `[PRESIGN ${new Date().toISOString()}] createSignedUploadUrl FAILED for ${
            att.id
          }`,
          tokenErr
        );
        await db.attachment.delete({ where: { id: att.id } }).catch(() => {});
        return NextResponse.json(
          { error: "Failed to create signed upload token" },
          { status: 500 }
        );
      } else {
        console.log(
          `[PRESIGN ${new Date().toISOString()}] created upload token for att=${
            att.id
          } token_ok=${!!tokenData.token}`
        );
      }

      results.push({
        id: att.id,
        storagePath: att.storagePath,
        mime: att.mime,
        size: att.size,
        uploadToken: tokenData.token,
      });
    }

    return NextResponse.json({ ok: true, files: results });
  } catch (err) {
    console.error("presign: unexpected server error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
