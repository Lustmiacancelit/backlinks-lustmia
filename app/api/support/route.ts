import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

function generateTicketNumber() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `RANK-${datePart}-${randomPart}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 }
      );
    }

    const ticketNumber = generateTicketNumber();

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "support@rankcore.ai",
      replyTo: email,
      subject: `[${ticketNumber}] ${subject}`,
      html: `
        <h2>New Support Ticket</h2>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${String(message).replace(/\n/g, "<br>")}</p>
      `,
      text: `
New Support Ticket

Ticket Number: ${ticketNumber}
Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
      `,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: `We received your ticket ${ticketNumber}`,
      html: `
        <h2>Support Request Received</h2>
        <p>Hello ${name},</p>
        <p>We received your support request successfully.</p>
        <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
        <p>Our team will review your case and get back to you as soon as possible.</p>
        <p>Subject: ${subject}</p>
        <p>Thank you,<br>Rankcore.ai Support</p>
      `,
      text: `
Hello ${name},

We received your support request successfully.

Ticket Number: ${ticketNumber}

Our team will review your case and get back to you as soon as possible.

Subject: ${subject}

Thank you,
Rankcore.ai Support
      `,
    });

    return NextResponse.json({
      success: true,
      ticketNumber,
    });
  } catch (error) {
    console.error("Support ticket error:", error);

    return NextResponse.json(
      { error: "Unable to send support request right now." },
      { status: 500 }
    );
  }
}