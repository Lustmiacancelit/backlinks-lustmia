"use client";

import { FormEvent, useState } from "react";

export default function SupportPage() {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");
    setTicketNumber("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    };

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send ticket.");
      }

      setSuccessMessage("Your support request was sent successfully.");
      setTicketNumber(data.ticketNumber || "");
      form.reset();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="mb-4 text-4xl font-bold">Support</h1>
      <p className="mb-8 text-white/70">
        Need help? Open a support ticket and our team will review your case.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Your name"
          required
          className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white outline-none"
        />

        <input
          type="email"
          name="email"
          placeholder="Your email"
          required
          className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white outline-none"
        />

        <input
          type="text"
          name="subject"
          placeholder="Subject"
          required
          className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white outline-none"
        />

        <textarea
          name="message"
          placeholder="Describe your issue"
          required
          rows={6}
          className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-white outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-fuchsia-600 px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Sending..." : "Submit Ticket"}
        </button>
      </form>

      {successMessage && (
        <div className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-300">
          <div>{successMessage}</div>
          {ticketNumber && (
            <div className="mt-2 font-semibold">Ticket Number: {ticketNumber}</div>
          )}
          <div className="mt-2 text-sm text-green-200/90">
            A confirmation email has been sent to your email address.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          {errorMessage}
        </div>
      )}
    </div>
  );
}