// app/api/email/open.gif/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const user_id = url.searchParams.get("u");

    if (user_id) {
      await supabaseAdmin
        .from("notification_settings")
        .update({ last_weekly_open: new Date().toISOString() })
        .eq("user_id", user_id);
    }

    // Return a transparent GIF
    const pixel = Buffer.from(
      "47494638396101000100800000ffffff00000021f90401000001002c00000000010001000002024401003b",
      "hex"
    );

    return new NextResponse(pixel, {
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": pixel.length.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (e) {
    console.error("open.gif tracking error:", e);
    return new NextResponse("error", { status: 500 });
  }
}
