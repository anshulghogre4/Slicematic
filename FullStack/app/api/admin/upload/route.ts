import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../lib/admin-auth";
import { getSupabaseServerClient } from "../../../../lib/supabase";

export const dynamic = "force-dynamic";

const BUCKET = "menu-images";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxBytes = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Choose an image file to upload." }, { status: 400 });
    }

    if (!allowedTypes.has(file.type)) {
      return NextResponse.json({ ok: false, error: "Upload JPG, PNG, WEBP, or GIF images only." }, { status: 400 });
    }

    if (file.size > maxBytes) {
      return NextResponse.json({ ok: false, error: "Image must be 4 MB or smaller." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Image upload needs Supabase Storage configured for this environment." },
        { status: 400 }
      );
    }

    const extension = extensionFor(file.type);
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 42) || "menu-image";
    const fileName = `${Date.now()}-${safeName}.${extension}`;

    const bytes = Buffer.from(await file.arrayBuffer());
    const uploaded = await supabase.storage.from(BUCKET).upload(fileName, bytes, { contentType: file.type });
    if (uploaded.error) {
      return NextResponse.json({ ok: false, error: "Image upload failed." }, { status: 500 });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(uploaded.data.path);

    return NextResponse.json({
      ok: true,
      url: data.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Image upload failed." }, { status: 500 });
  }
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}
