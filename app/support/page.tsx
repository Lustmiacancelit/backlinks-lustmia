export default function SupportPage() {
  return (
    <div className="max-w-2xl mx-auto mt-20 p-6">
      <h1 className="text-4xl font-bold mb-4">Support</h1>
      <p className="mb-8 text-gray-400">
        Need help? Open a support ticket and our team will respond shortly.
      </p>

      <form
        action="mailto:support@rankcore.ai"
        method="post"
        encType="text/plain"
        className="space-y-4"
      >
        <input
          type="text"
          name="name"
          placeholder="Your name"
          required
          className="w-full p-3 rounded bg-black border border-gray-700"
        />

        <input
          type="email"
          name="email"
          placeholder="Your email"
          required
          className="w-full p-3 rounded bg-black border border-gray-700"
        />

        <input
          type="text"
          name="subject"
          placeholder="Subject"
          required
          className="w-full p-3 rounded bg-black border border-gray-700"
        />

        <textarea
          name="message"
          placeholder="Describe your issue"
          required
          className="w-full p-3 rounded bg-black border border-gray-700 h-40"
        />

        <button className="px-6 py-3 bg-purple-600 rounded hover:bg-purple-700">
          Submit Ticket
        </button>
      </form>
    </div>
  )
}