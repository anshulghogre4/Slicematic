import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../lib/admin-auth";
import { loadMenu } from "../../../../lib/data-service";
import { getSupabaseServerClient } from "../../../../lib/supabase";
import { MenuItem } from "../../../../lib/types";

export const dynamic = "force-dynamic";

type MenuSection = "pizzas" | "bases" | "toppings";

type MenuMutationPayload = {
  section: MenuSection;
  item: Partial<MenuItem>;
};

const tableMeta: Record<MenuSection, { table: string; id: string; name: string; codePrefix: string }> = {
  pizzas: { table: "pizza_types", id: "pizza_type_id", name: "pizza_name", codePrefix: "P" },
  bases: { table: "pizza_bases", id: "base_id", name: "base_name", codePrefix: "B" },
  toppings: { table: "toppings", id: "topping_id", name: "topping_name", codePrefix: "T" }
};

export async function POST(request: Request) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  try {
    const payload = (await request.json()) as MenuMutationPayload;
    const validation = validatePayload(payload);
    if (validation) {
      return NextResponse.json({ ok: false, errors: validation }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      const created = await createDemoItem(payload);
      return NextResponse.json({ ok: true, item: created, mode: "demo" });
    }

    const meta = tableMeta[payload.section];
    const latest = await supabase
      .schema("slicematic")
      .from(meta.table)
      .select(meta.id)
      .order(meta.id, { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) throw latest.error;

    const latestRow = latest.data as Record<string, unknown> | null;
    const nextId = Number(latestRow?.[meta.id] ?? 0) + 1;
    const code = cleanCode(payload.item.code) || `${meta.codePrefix}${nextId}`;
    const row = buildInsertRow(payload.section, nextId, code, payload.item);

    const inserted = await (supabase
      .schema("slicematic")
      .from(meta.table) as any)
      .insert(row)
      .select("*")
      .single();
    if (inserted.error) throw inserted.error;

    return NextResponse.json({ ok: true, item: rowToMenuItem(payload.section, inserted.data as Record<string, unknown>) });
  } catch {
    return NextResponse.json({ ok: false, errors: { server: "Menu item could not be saved." } }, { status: 500 });
  }
}

type MenuPatchPayload = {
  section: MenuSection;
  id: number;
  item: Partial<MenuItem>;
};

export async function PATCH(request: Request) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  try {
    const payload = (await request.json()) as MenuPatchPayload;
    if (!payload || !tableMeta[payload.section]) {
      return NextResponse.json({ ok: false, errors: { section: "Choose pizza, base, or topping." } }, { status: 400 });
    }
    if (!Number.isFinite(Number(payload.id))) {
      return NextResponse.json({ ok: false, errors: { id: "A valid item id is required." } }, { status: 400 });
    }
    const validation = validateItemFields(payload.item);
    if (Object.keys(validation).length) {
      return NextResponse.json({ ok: false, errors: validation }, { status: 400 });
    }

    const meta = tableMeta[payload.section];
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      const patched = await patchDemoItem(payload);
      if (!patched) {
        return NextResponse.json({ ok: false, errors: { server: "Menu item not found." } }, { status: 404 });
      }
      return NextResponse.json({ ok: true, item: patched, mode: "demo" });
    }

    const row = buildUpdateRow(payload.section, payload.item);
    const updated = await (supabase
      .schema("slicematic")
      .from(meta.table) as any)
      .update(row)
      .eq(meta.id, payload.id)
      .select("*")
      .single();
    if (updated.error) throw updated.error;

    return NextResponse.json({ ok: true, item: rowToMenuItem(payload.section, updated.data as Record<string, unknown>) });
  } catch {
    return NextResponse.json({ ok: false, errors: { server: "Menu item could not be updated." } }, { status: 500 });
  }
}

function validateItemFields(item?: Partial<MenuItem>) {
  const errors: Record<string, string> = {};
  const name = item?.name?.trim() ?? "";
  if (name.length < 2 || name.length > 60) {
    errors.name = "Menu item name must be 2-60 characters.";
  }
  if (!Number.isFinite(Number(item?.price)) || Number(item?.price) < 0) {
    errors.price = "Price must be a positive number.";
  }
  if (item?.code && !/^[A-Z][A-Z0-9-]{1,11}$/i.test(item.code.trim())) {
    errors.code = "Code must be short, alphanumeric, and start with a letter.";
  }
  return errors;
}

function validatePayload(payload: MenuMutationPayload) {
  const errors: Record<string, string> = {};
  if (!payload || !tableMeta[payload.section]) {
    errors.section = "Choose pizza, base, or topping.";
  }
  Object.assign(errors, validateItemFields(payload?.item));
  return Object.keys(errors).length ? errors : null;
}

async function createDemoItem(payload: MenuMutationPayload): Promise<MenuItem> {
  const menu = await loadMenu();
  const collection = menu[payload.section];
  const meta = tableMeta[payload.section];
  const nextId = Math.max(0, ...collection.map((item) => item.id)) + 1;
  const code = cleanCode(payload.item.code) || `${meta.codePrefix}${nextId}`;
  return {
    id: nextId,
    code,
    name: payload.item.name?.trim() ?? `${payload.section} ${nextId}`,
    price: Number(payload.item.price ?? 0),
    description: payload.item.description?.trim() || defaultDescription(payload.section),
    image: payload.section === "pizzas" ? payload.item.image || "/assets/pizza-hero.jpg" : payload.item.image,
    badge: payload.section === "pizzas" ? payload.item.badge || "New" : payload.item.badge,
    tags: payload.section === "pizzas" ? normalizeTags(payload.item.tags) : undefined,
    prepMinutes: payload.section === "pizzas" ? Number(payload.item.prepMinutes ?? 24) : undefined,
    available: payload.item.available ?? true
  };
}

function buildInsertRow(section: MenuSection, id: number, code: string, item: Partial<MenuItem>) {
  const baseFields = {
    code,
    price: Number(item.price),
    is_available: item.available ?? true
  };

  if (section === "pizzas") {
    return {
      pizza_type_id: id,
      pizza_name: item.name?.trim(),
      description: item.description?.trim() || defaultDescription(section),
      image_url: item.image || "/assets/pizza-hero.jpg",
      badge: item.badge?.trim() || "New",
      tags: normalizeTags(item.tags),
      prep_minutes: Number(item.prepMinutes ?? 24),
      ...baseFields
    };
  }

  if (section === "bases") {
    return {
      base_id: id,
      base_name: item.name?.trim(),
      description: item.description?.trim() || defaultDescription(section),
      ...baseFields
    };
  }

  return {
    topping_id: id,
    topping_name: item.name?.trim(),
    ...baseFields
  };
}

function buildUpdateRow(section: MenuSection, item: Partial<MenuItem>) {
  const row: Record<string, unknown> = {};
  if (item.price !== undefined) row.price = Number(item.price);
  if (item.available !== undefined) row.is_available = item.available;
  if (item.code !== undefined && item.code.trim()) row.code = cleanCode(item.code);

  if (section === "pizzas") {
    if (item.name !== undefined) row.pizza_name = item.name.trim();
    if (item.description !== undefined) row.description = item.description.trim();
    if (item.image !== undefined) row.image_url = item.image;
    if (item.badge !== undefined) row.badge = item.badge.trim();
    if (item.tags !== undefined) row.tags = normalizeTags(item.tags);
    if (item.prepMinutes !== undefined) row.prep_minutes = Number(item.prepMinutes);
    return row;
  }

  if (section === "bases") {
    if (item.name !== undefined) row.base_name = item.name.trim();
    if (item.description !== undefined) row.description = item.description.trim();
    return row;
  }

  if (item.name !== undefined) row.topping_name = item.name.trim();
  return row;
}

async function patchDemoItem(payload: MenuPatchPayload): Promise<MenuItem | null> {
  const menu = await loadMenu();
  const collection = menu[payload.section];
  const existing = collection.find((entry) => entry.id === Number(payload.id));
  if (!existing) return null;
  return { ...existing, ...payload.item, id: existing.id, code: existing.code };
}

function rowToMenuItem(section: MenuSection, row: Record<string, unknown>): MenuItem {
  if (section === "pizzas") {
    return {
      id: Number(row.pizza_type_id),
      code: String(row.code),
      name: String(row.pizza_name),
      price: Number(row.price),
      description: String(row.description ?? ""),
      image: String(row.image_url ?? "/assets/pizza-hero.jpg"),
      badge: String(row.badge ?? "New"),
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      prepMinutes: Number(row.prep_minutes ?? 24),
      available: Boolean(row.is_available)
    };
  }

  if (section === "bases") {
    return {
      id: Number(row.base_id),
      code: String(row.code),
      name: String(row.base_name),
      price: Number(row.price),
      description: String(row.description ?? ""),
      available: Boolean(row.is_available)
    };
  }

  return {
    id: Number(row.topping_id),
    code: String(row.code),
    name: String(row.topping_name),
    price: Number(row.price),
    available: Boolean(row.is_available)
  };
}

function cleanCode(value?: string) {
  return value?.trim().toUpperCase() ?? "";
}

function normalizeTags(tags?: string[]) {
  if (!Array.isArray(tags)) return ["Signature"];
  const cleaned = tags.map((tag) => tag.trim()).filter(Boolean);
  return cleaned.length ? [...new Set(cleaned)] : ["Signature"];
}

function defaultDescription(section: MenuSection) {
  if (section === "pizzas") return "New chef-curated pizza added from the admin menu studio.";
  if (section === "bases") return "New crust option added for customer customization.";
  return "New add-on topping available for customized orders.";
}
