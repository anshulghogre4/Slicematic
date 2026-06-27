import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../lib/admin-auth";

export const dynamic = "force-dynamic";

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

    const extension = extensionFor(file.type);
    const safeName = file.name
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 42) || "menu-image";
    const fileName = `${Date.now()}-${safeName}.${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "menu");
    await mkdir(uploadDir, { recursive: true });

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, fileName), bytes);

    return NextResponse.json({
      ok: true,
      url: `/uploads/menu/${fileName}`,
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
