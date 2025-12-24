// app/api/weekly-report/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/sendEmail";
import { v4 as uuidv4 } from "uuid";

type ToxicSweepSettingsRow = {
  user_id: string;
  email: string;
  weekly_reports_enabled: boolean;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rankcore.ai";

function buildWeeklyReportEmail(options: {
  totalBacklinks: number;
  reportUrl: string;
  unsubscribeUrl: string;
  openPixelUrl: string;
}) {
  const { totalBacklinks, reportUrl, unsubscribeUrl, openPixelUrl } = options;

  const subject = "Your Rankcore.ai backlink report";

  const html = `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#111827; background:#f3f4f6; padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr>
        <td style="padding:20px 24px;background:#111827;color:#f9fafb;">
          <h1 style="margin:0;font-size:20px;font-weight:600;">Rankcore.ai</h1>
          <p style="margin:4px 0 0;font-size:13px;color:#e5e7eb;">Weekly backlink report</p>
        </td>
      </tr>

      <tr>
        <td style="padding:24px;">
          <p style="margin:0 0 16px;font-size:14px;">Here is your latest backlink summary.</p>

          <div style="margin:16px 0;padding:16px;border-radius:10px;border:1px solid #e5e7eb;background:#f9fafb;">
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Total backlinks tracked</p>
            <p style="margin:0;font-size:24px;font-weight:700;color:#111827;">${totalBacklinks.toLocaleString()}</p>
          </div>

          <p style="margin:16px 0 20px;font-size:14px;line-height:1.5;color:#374151;">
            Log into Rankcore.ai to see toxic links, new referring domains, anchor text,
            and other detailed metrics.
          </p>

          <a href="${reportUrl}"
             style="display:inline-block;padding:10px 18px;border-radius:999px;background:#4f46e5;color:white;font-size:14px;font-weight:600;text-decoration:none;">
            View full report
          </a>
        </td>
      </tr>

      <tr>
        <td style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
          <p style="margin:0 0 8px;">
            You are receiving this because weekly reports are enabled in your Rankcore.ai settings.
          </p>
          <p style="margin:0 0 8px;">
            <a href="${unsubscribeUrl}" style="color:#4b5563;">Manage notification settings</a>
          </p>
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            &copy; ${new Date().getFullYear()} Rankcore.ai. All rights reserved.
          </p>
        </td>
      </tr>
    </table>

    <!-- open tracking pixel -->
    <img src="${openPixelUrl}" alt="" width="1" height="1" style="display:block;opacity:0;" />
  </div>
  `;

  const text = `
Your Rankcore.ai backlink report

Total backlinks: ${totalBacklinks}

View full report: ${reportUrl}

You can manage your notification settings here:
${unsubscribeUrl}
  `.trim();

  return { subject, html, text };
}

export async function POST() {
  const startedAt = new Date().toISOString();
  console.log("[weekly-report] Cron started at", startedAt);

  try {
    // 1) Load all users who have weekly reports enabled
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from<ToxicSweepSettingsRow>("toxic_sweep_settings")
      .select("user_id, email, weekly_reports_enabled")
      .eq("weekly_reports_enabled", true);

    if (settingsError) {
      console.error("[weekly-report] Error loading settings rows:", settingsError);
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to load users for weekly report",
          supabaseError: settingsError.message,
          supabaseCode: settingsError.code,
        },
        { status: 500 },
      );
    }

    if (!settings || settings.length === 0) {
      console.log("[weekly-report] No users with weekly_reports_enabled=true");
      return NextResponse.json({
        ok: true,
        sent: 0,
        totalSettingsRows: 0,
        activeRows: 0,
      });
    }

    let sentCount = 0;

    for (const setting of settings) {
      const { user_id, email } = setting;

      // 2) Count that user’s backlinks (cheap count)
      const { count, error: backlinksError } = await supabaseAdmin
        .from("backlinks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id);

      if (backlinksError) {
        console.error(
          `[weekly-report] Error counting backlinks for user ${user_id}:`,
          backlinksError,
        );
        continue;
      }

      const totalBacklinks = count ?? 0;

      const token = uuidv4();
      const sentAt = new Date().toISOString();

      // Your app routes are /dashboard and /dashboard/settings
      const reportUrl = `${SITE_URL}/dashboard`;
      const unsubscribeUrl = `${SITE_URL}/dashboard/settings?tab=notifications&source=weekly_report`;
      const openPixelUrl = `${SITE_URL}/api/email/open.gif?token=${token}`;

      const { subject, html, text } = buildWeeklyReportEmail({
        totalBacklinks,
        reportUrl,
        unsubscribeUrl,
        openPixelUrl,
      });

      const emailResult = await sendEmail({
        to: email,
        subject,
        html,
        text,
      });

      // 3) Log the send into Supabase for open tracking/reporting
      try {
        await supabaseAdmin.from("email_sends").insert({
          user_id,
          email,
          type: "weekly_report",
          token,
          sent_at: sentAt,
          total_backlinks: totalBacklinks,
          meta: {
            subject,
            site_url: SITE_URL,
            email_ok: emailResult.ok,
            email_error: emailResult.error ?? null,
          },
        });
      } catch (insertError) {
        console.error(
          `[weekly-report] Failed to log email_sends for user ${user_id}:`,
          insertError,
        );
      }

      if (emailResult.ok) {
        sentCount += 1;
      } else {
        console.warn(`[weekly-report] sendEmail failed for ${email}: ${emailResult.error}`);
      }
    }

    console.log(
      "[weekly-report] Cron finished.",
      `Total active rows: ${settings.length}, emails sent OK: ${sentCount}`,
    );

    return NextResponse.json({
      ok: true,
      sent: sentCount,
      totalSettingsRows: settings.length,
      activeRows: settings.length,
    });
  } catch (err: any) {
    console.error("[weekly-report] Cron failed:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 500 },
    );
  }
}
