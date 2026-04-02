const RESEND_API_KEY = process.env.RESEND_API_KEY!;

async function sendEmail(payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${res.status} ${error}`);
  }

  return res.json();
}

export async function sendDownloadEmail(
  email: string,
  documentTitle: string,
  downloadUrl: string,
  expiresAt: Date
) {
  const expiresFormatted = expiresAt.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  await sendEmail({
    from: 'Service Manuals Pro <noreply@service-manuals-pro.com>',
    to: email,
    subject: `Your download is ready: ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
          <div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color:#18181b;font-size:24px;margin:0 0 8px;">Your Document is Ready</h1>
            <p style="color:#71717a;font-size:16px;margin:0 0 24px;">Thank you for your purchase!</p>

            <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:0 0 24px;">
              <p style="color:#18181b;font-weight:600;margin:0 0 4px;">${documentTitle}</p>
              <p style="color:#71717a;font-size:14px;margin:0;">Click the button below to download your file.</p>
            </div>

            <a href="${downloadUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">
              Download Now
            </a>

            <p style="color:#a1a1aa;font-size:13px;margin:24px 0 0;">
              This link expires on ${expiresFormatted}. If you need assistance, reply to this email.
            </p>
          </div>
          <p style="color:#a1a1aa;font-size:12px;text-align:center;margin:16px 0 0;">
            Service Manuals Pro &mdash; Professional Technical Documentation
          </p>
        </div>
      </body>
      </html>
    `,
  });
}

export async function sendBundleDownloadEmail(
  email: string,
  documentTitle: string,
  downloadLinks: { label: string; url: string }[],
  expiresAt: Date
) {
  const expiresFormatted = expiresAt.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const linksHtml = downloadLinks.map((link) => `
    <tr>
      <td style="padding:6px 0;">
        <a href="${link.url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:500;font-size:14px;">
          Download: ${link.label}
        </a>
      </td>
    </tr>
  `).join('');

  await sendEmail({
    from: 'Service Manuals Pro <noreply@service-manuals-pro.com>',
    to: email,
    subject: `Your downloads are ready: ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
          <div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color:#18181b;font-size:24px;margin:0 0 8px;">Your Documents are Ready</h1>
            <p style="color:#71717a;font-size:16px;margin:0 0 24px;">Thank you for your purchase!</p>

            <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:0 0 24px;">
              <p style="color:#18181b;font-weight:600;margin:0 0 4px;">${documentTitle}</p>
              <p style="color:#71717a;font-size:14px;margin:0;">
                This bundle contains ${downloadLinks.length} files. Click each button below to download.
              </p>
            </div>

            <table role="presentation" style="width:100%;border:0;cellpadding:0;cellspacing:0;">
              ${linksHtml}
            </table>

            <p style="color:#a1a1aa;font-size:13px;margin:24px 0 0;">
              Each link expires on ${expiresFormatted} and can be used up to 3 times. If you need assistance, reply to this email.
            </p>
          </div>
          <p style="color:#a1a1aa;font-size:12px;text-align:center;margin:16px 0 0;">
            Service Manuals Pro &mdash; Professional Technical Documentation
          </p>
        </div>
      </body>
      </html>
    `,
  });
}
