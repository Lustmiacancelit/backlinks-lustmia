export const metadata = {
  title: "Terms of Service | Rankcore.ai",
  description: "Terms of Service governing the use of Rankcore.ai"
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">
          Terms of Service
        </h1>

        <p className="mt-3 text-sm text-white/60">
          Last updated: January 2026
        </p>

        <div className="mt-10 space-y-10 text-white/85 leading-relaxed">

          <section>
            <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing or using Rankcore.ai, you agree to be bound by these
              Terms of Service and our Privacy Policy. If you do not agree, you
              must not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">2. Description of Service</h2>
            <p className="mt-2">
              Rankcore.ai provides backlink monitoring, SEO analytics, toxicity
              detection, and AI-powered insights. Results are informational only
              and do not guarantee rankings, traffic, or revenue outcomes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">3. AI Disclaimer</h2>
            <p className="mt-2">
              AI-generated insights are provided "as is" and may be inaccurate,
              incomplete, or outdated. Rankcore.ai makes no warranties regarding
              correctness, effectiveness, or suitability for any purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">4. User Responsibilities</h2>
            <ul className="mt-2 list-disc pl-6 space-y-2">
              <li>You are responsible for domains you submit.</li>
              <li>You must not use the service for illegal or abusive purposes.</li>
              <li>You may not reverse engineer or resell the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">5. Subscriptions & Billing</h2>
            <p className="mt-2">
              Rankcore.ai operates on a subscription basis. Fees are billed in
              advance and renew automatically unless canceled before the renewal
              date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white text-red-400">
              6. No Refunds Policy
            </h2>
            <p className="mt-2">
              ALL PAYMENTS ARE FINAL. Rankcore.ai does not offer refunds, credits,
              chargebacks, or prorated billing for any reason, including but not
              limited to unused time, dissatisfaction, failed scans, AI output,
              account suspension, or cancellation.
            </p>
            <p className="mt-2">
              By purchasing a subscription, you acknowledge that access to
              digital services is delivered immediately and waive any right to
              a refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">7. Limitation of Liability</h2>
            <p className="mt-2">
              Rankcore.ai shall not be liable for indirect, incidental,
              consequential, or special damages, including loss of rankings,
              traffic, revenue, or data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">8. Termination</h2>
            <p className="mt-2">
              We may suspend or terminate access at any time without notice for
              violations of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">9. Governing Law</h2>
            <p className="mt-2">
              These Terms are governed by the laws of your operating jurisdiction,
              without regard to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white">10. Contact</h2>
            <p className="mt-2">
              Questions may be sent to{" "}
              <a href="mailto:support@rankcore.ai" className="text-fuchsia-400 hover:underline">
                support@rankcore.ai
              </a>.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
