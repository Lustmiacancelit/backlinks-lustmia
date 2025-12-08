import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // frontend uses localStorage userId; backend expects u=
    const userId =
      searchParams.get("u") ||
      "9b7e2a2a-7f2f-4f6a-9d9e-falmeida000001";

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("backlinks_scans")
      .select("domain,total_backlinks,ref_domains,mode,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json({ scans: data || [] });

  } catch (e: any) {

    // ⭐ CUSTOM ERROR MESSAGE FOR BLOCKED / PROTECTED SITES ⭐
    const friendlyMessage =
      "This website is protected by its hosting or DNS provider and cannot be scanned due to security restrictions.";

    return NextResponse.json(
      {
        error: friendlyMessage,
        technical: e?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
