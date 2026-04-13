import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  await resend.emails.send({
    from: "Gymbro <onboarding@resend.dev>",
    to: email,
    subject: "Reset your Gymbro password",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="margin-bottom:8px">Reset your password</h2>
        <p style="color:#555;margin-bottom:24px">
          Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
          Reset password
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
