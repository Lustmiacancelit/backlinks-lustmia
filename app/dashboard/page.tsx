"use client";

import DashboardPage from "../page";

/**
 * /dashboard
 *
 * This route just reuses the main dashboard UI currently
 * defined in app/page.tsx. So when middleware or Stripe
 * redirects to /dashboard, users will see the same app.
 */
export default function DashboardRoute() {
  return <DashboardPage />;
}
