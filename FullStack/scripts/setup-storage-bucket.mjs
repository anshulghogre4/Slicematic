import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";

const BUCKET_ID = "menu-images";
const BUCKET_OPTIONS = {
  public: true,
  fileSizeLimit: "4MB",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"]
};

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
}

function isBucketAlreadyExistsError(error) {
  if (!error) return false;
  const status = Number(error.status ?? error.statusCode ?? 0);
  if (status === 409) return true;
  return /already exists/i.test(error.message ?? "");
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env/.env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);

  // createBucket() is NOT idempotent — Supabase returns 409 BucketAlreadyExists on
  // re-run. Check listBuckets() first so repeat runs (e.g. CI, redeploys) are safe,
  // and also swallow a 409 from createBucket itself as a defense-in-depth fallback
  // in case of a race with another process provisioning the same bucket.
  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error(`Could not list existing buckets: ${listError.message}`);
    process.exit(1);
  }

  if (existingBuckets?.some((bucket) => bucket.id === BUCKET_ID)) {
    console.log(`Bucket "${BUCKET_ID}" already exists. Nothing to do.`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(BUCKET_ID, BUCKET_OPTIONS);
  if (createError) {
    if (isBucketAlreadyExistsError(createError)) {
      console.log(`Bucket "${BUCKET_ID}" already exists (race with another setup run). Nothing to do.`);
      return;
    }
    console.error(`Failed to create bucket "${BUCKET_ID}": ${createError.message}`);
    process.exit(1);
  }

  console.log(`Created public Storage bucket "${BUCKET_ID}" (4MB limit, JPEG/PNG/WEBP/GIF only).`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
