import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummyKeyForBuildOnly");
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "PaperHub Auth <onboarding@resend.dev>";

export async function sendVerificationEmail(email: string, url: string) {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Verify your PaperHub Account 🚀",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #333;">Welcome to PaperHub 2.0!</h2>
          <p>Please click the button below to verify your email address and activate your student account:</p>
          <div style="margin: 24px 0;">
            <a href="${url}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 24 hours. If you did not sign up for PaperHub, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">PaperHub — Centralized University Exam Preparation</p>
        </div>
      `,
    });

    if (error) {
      console.error("Failed to send verification email via Resend:", error);
    }
  } catch (err) {
    console.error("Error sending verification email:", err);
  }
}

export async function sendResetPasswordEmail(email: string, url: string) {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Reset your PaperHub Password 🔒",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #333;">Reset Password Request</h2>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="margin: 24px 0;">
            <a href="${url}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">PaperHub — Centralized University Exam Preparation</p>
        </div>
      `,
    });

    if (error) {
      console.error("Failed to send reset password email via Resend:", error);
    }
  } catch (err) {
    console.error("Error sending reset password email:", err);
  }
}
