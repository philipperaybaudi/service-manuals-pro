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
    subject: `Votre documentation est disponible - Your download is ready: ${documentTitle}`,
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
            <h1 style="color:#18181b;font-size:24px;margin:0 0 8px;">Votre Documentation est Disponible <br> Your Document is Ready</h1>
            <p style="color:#71717a;font-size:16px;margin:0 0 24px;">Merci pour votre commande - Thank you for your purchase!</p>

            <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:0 0 24px;">
              <p style="color:#18181b;font-weight:600;margin:0 0 4px;">${documentTitle}</p>
	      <p style="color:#71717a;font-size:14px;margin:0;">Cliquez ci-dessous pour télécharger votre fichier <br> Click the button below to download your file.</p>
            </div>

            <a href="${downloadUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">
              Download Now <br> Télécharger maintenant
            </a>

            <p style="color:#a1a1aa;font-size:13px;margin:24px 0 0;">
              This link expires on... Ce lien expire le ${expiresFormatted}.
            </p>

            <div style="margin:24px 0 0;padding:16px;border:2px solid #dc2626;border-radius:8px;background:#fef2f2;">
              <p style="color:#991b1b;font-size:13px;font-weight:700;margin:0 0 8px;text-transform:uppercase;">&#9888; Droit d'Auteur - Copyright Notice</p>
              <p style="color:#18181b;font-size:13px;line-height:1.5;margin:0;">
                Reproduction et diffusion interdites sur les forums, réseaux sociaux ou autres.<br>
                Cette documentation est la propriété de ses concepteurs et est protégée par le droit d'auteur international.<br>
                Toute duplication ou diffusion est formellement interdite. Toute infraction sera sanctionnée.<br>
                <strong>Tous Droits Réservés &copy;</strong><br>
                _<br>
                Reproduction and distribution on forums, social media, or any other platform is strictly prohibited.<br>
                This document is the property of its rights holders and is protected by international copyright law.<br>
                Any duplication or distribution is formally forbidden. Violations will be prosecuted.<br>
                <strong>All Rights Reserved &copy;</strong>
              </p>
            </div>
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
    subject: `Votre documentation est disponible - Your downloads are ready: ${documentTitle}`,
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
            <h1 style="color:#18181b;font-size:24px;margin:0 0 8px;">Votre Documentation est Disponible <br> Your Documents are Ready</h1>
            <p style="color:#71717a;font-size:16px;margin:0 0 24px;">Merci pour votre commande - Thank you for your purchase!</p>

            <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:0 0 24px;">
              <p style="color:#18181b;font-weight:600;margin:0 0 4px;">${documentTitle}</p>
              <p style="color:#71717a;font-size:14px;margin:0;">
                This bundle contains ${downloadLinks.length} files. Cliquez sur le bouton pour télécharger <br> Click each button below to download.
              </p>
            </div>

            <table role="presentation" style="width:100%;border:0;cellpadding:0;cellspacing:0;">
              ${linksHtml}
            </table>

            <p style="color:#a1a1aa;font-size:13px;margin:24px 0 0;">
              Each link expires on ${expiresFormatted} and can be used up to 3 times. If you need assistance, reply to this email.
            </p>

            <div style="margin:24px 0 0;padding:16px;border:2px solid #dc2626;border-radius:8px;background:#fef2f2;">
              <p style="color:#991b1b;font-size:13px;font-weight:700;margin:0 0 8px;text-transform:uppercase;">&#9888; Droit d'Auteur - Copyright Notice</p>
              <p style="color:#18181b;font-size:13px;line-height:1.5;margin:0;">
                Reproduction et diffusion interdites sur les forums, réseaux sociaux ou autres.<br>
                Cette documentation est la propriété de ses concepteurs et est protégée par le droit d'auteur international.<br>
                Toute duplication ou diffusion est formellement interdite. Toute infraction sera sanctionnée.<br>
                <strong>Tous Droits Réservés &copy;</strong><br>
                _<br>
                Reproduction and distribution on forums, social media, or any other platform is strictly prohibited.<br>
                This document is the property of its rights holders and is protected by international copyright law.<br>
                Any duplication or distribution is formally forbidden. Violations will be prosecuted.<br>
                <strong>All Rights Reserved &copy;</strong>
              </p>
            </div>
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

export async function sendOrderNotification(
  documentTitle: string,
  customerName: string,
  customerEmail: string,
  amount: number,
  currency: string,
  paymentIntent: string,
) {
  const formattedAmount = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  const date = new Date().toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  await sendEmail({
    from: 'Service Manuals Pro <noreply@service-manuals-pro.com>',
    to: 'vente@service-manuals-pro.com',
    subject: `Nouvelle commande : ${formattedAmount} - ${documentTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
          <div style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <h1 style="color:#18181b;font-size:22px;margin:0 0 24px;">Nouvelle commande</h1>
            <table style="width:100%;border-collapse:collapse;font-size:15px;">
              <tr>
                <td style="padding:10px 0;color:#71717a;border-bottom:1px solid #f4f4f5;">Document</td>
                <td style="padding:10px 0;color:#18181b;font-weight:600;border-bottom:1px solid #f4f4f5;">${documentTitle}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#71717a;border-bottom:1px solid #f4f4f5;">Montant</td>
                <td style="padding:10px 0;color:#18181b;font-weight:600;border-bottom:1px solid #f4f4f5;">${formattedAmount}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#71717a;border-bottom:1px solid #f4f4f5;">Client</td>
                <td style="padding:10px 0;color:#18181b;border-bottom:1px solid #f4f4f5;">${customerName}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#71717a;border-bottom:1px solid #f4f4f5;">Email</td>
                <td style="padding:10px 0;color:#18181b;border-bottom:1px solid #f4f4f5;"><a href="mailto:${customerEmail}" style="color:#2563eb;">${customerEmail}</a></td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#71717a;border-bottom:1px solid #f4f4f5;">Transaction</td>
                <td style="padding:10px 0;color:#18181b;font-family:monospace;font-size:13px;border-bottom:1px solid #f4f4f5;">${paymentIntent}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;color:#71717a;">Date</td>
                <td style="padding:10px 0;color:#18181b;">${date}</td>
              </tr>
            </table>
          </div>
        </div>
      </body>
      </html>
    `,
  });
}
