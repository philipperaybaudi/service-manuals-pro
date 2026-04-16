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
  expiresAt: Date,
  locale: 'en' | 'fr' = 'en'
) {
  const isFr = locale === 'fr';
  const expiresFormatted = expiresAt.toLocaleString(isFr ? 'fr-FR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const fromName = isFr ? 'Service Manuels Pro' : 'Service Manuals Pro';
  const subject = isFr
    ? `Votre téléchargement est prêt : ${documentTitle}`
    : `Your download is ready: ${documentTitle}`;
  const heading = isFr ? 'Votre document est prêt' : 'Your Document is Ready';
  const thankYou = isFr ? 'Merci pour votre achat !' : 'Thank you for your purchase!';
  const clickBelow = isFr
    ? 'Cliquez sur le bouton ci-dessous pour télécharger votre fichier.'
    : 'Click the button below to download your file.';
  const downloadBtn = isFr ? 'Télécharger' : 'Download Now';
  const expiresText = isFr
    ? `Ce lien expire le ${expiresFormatted}. Si vous avez besoin d\u2019aide, répondez à cet email.`
    : `This link expires on ${expiresFormatted}. If you need assistance, reply to this email.`;
  const copyrightTitle = isFr ? '&#9888; Avis de droits d\u2019auteur' : '&#9888; Copyright Notice';
  const copyrightBody = isFr
    ? `La reproduction et la distribution sur des forums, réseaux sociaux ou toute autre plateforme sont strictement interdites.<br>
                Ce document est la propriété de ses ayants droit et est protégé par le droit international d\u2019auteur.<br>
                Toute duplication ou distribution est formellement interdite. Les contrevenants seront poursuivis.<br>
                <strong>Tous droits réservés &copy;</strong>`
    : `Reproduction and distribution on forums, social media, or any other platform is strictly prohibited.<br>
                This document is the property of its rights holders and is protected by international copyright law.<br>
                Any duplication or distribution is formally forbidden. Violations will be prosecuted.<br>
                <strong>All Rights Reserved &copy;</strong>`;
  const footer = isFr
    ? 'Service Manuels Pro &mdash; Documentation technique professionnelle'
    : 'Service Manuals Pro &mdash; Professional Technical Documentation';

  await sendEmail({
    from: `${fromName} <noreply@service-manuals-pro.com>`,
    to: email,
    subject,
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
            <h1 style="color:#18181b;font-size:24px;margin:0 0 8px;">${heading}</h1>
            <p style="color:#71717a;font-size:16px;margin:0 0 24px;">${thankYou}</p>

            <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:0 0 24px;">
              <p style="color:#18181b;font-weight:600;margin:0 0 4px;">${documentTitle}</p>
              <p style="color:#71717a;font-size:14px;margin:0;">${clickBelow}</p>
            </div>

            <div style="margin:0 0 24px;padding:16px;border:2px solid #dc2626;border-radius:8px;background:#fef2f2;">
              <p style="color:#991b1b;font-size:13px;font-weight:700;margin:0 0 8px;text-transform:uppercase;">${copyrightTitle}</p>
              <p style="color:#18181b;font-size:13px;line-height:1.5;margin:0;">
                ${copyrightBody}
              </p>
            </div>

            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px auto;">
              <tr>
                <td align="center" bgcolor="#16a34a" style="border-radius:50px;background:#16a34a;">
                  <a href="${downloadUrl}" target="_blank" style="display:block;padding:18px 48px;color:#ffffff;text-decoration:none;font-weight:700;font-size:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:0.5px;border-radius:50px;border:2px solid #16a34a;">
                    &#9660; ${downloadBtn}
                  </a>
                </td>
              </tr>
            </table>

            <p style="color:#a1a1aa;font-size:13px;margin:24px 0 0;">
              ${expiresText}
            </p>
          </div>
          <p style="color:#a1a1aa;font-size:12px;text-align:center;margin:16px 0 0;">
            ${footer}
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
  expiresAt: Date,
  locale: 'en' | 'fr' = 'en'
) {
  const isFr = locale === 'fr';
  const expiresFormatted = expiresAt.toLocaleString(isFr ? 'fr-FR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const fromName = isFr ? 'Service Manuels Pro' : 'Service Manuals Pro';
  const subject = isFr
    ? `Vos téléchargements sont prêts : ${documentTitle}`
    : `Your downloads are ready: ${documentTitle}`;
  const heading = isFr ? 'Vos documents sont prêts' : 'Your Documents are Ready';
  const thankYou = isFr ? 'Merci pour votre achat !' : 'Thank you for your purchase!';
  const bundleText = isFr
    ? `Ce pack contient ${downloadLinks.length} fichiers. Cliquez sur chaque bouton pour télécharger.`
    : `This bundle contains ${downloadLinks.length} files. Click each button to download.`;
  const expiresText = isFr
    ? `Chaque lien expire le ${expiresFormatted} et peut être utilisé jusqu\u2019à 3 fois. Si vous avez besoin d\u2019aide, répondez à cet email.`
    : `Each link expires on ${expiresFormatted} and can be used up to 3 times. If you need assistance, reply to this email.`;
  const copyrightTitle = isFr ? '&#9888; Avis de droits d\u2019auteur' : '&#9888; Copyright Notice';
  const copyrightBody = isFr
    ? `La reproduction et la distribution sur des forums, réseaux sociaux ou toute autre plateforme sont strictement interdites.<br>
                Ce document est la propriété de ses ayants droit et est protégé par le droit international d\u2019auteur.<br>
                Toute duplication ou distribution est formellement interdite. Les contrevenants seront poursuivis.<br>
                <strong>Tous droits réservés &copy;</strong>`
    : `Reproduction and distribution on forums, social media, or any other platform is strictly prohibited.<br>
                This document is the property of its rights holders and is protected by international copyright law.<br>
                Any duplication or distribution is formally forbidden. Violations will be prosecuted.<br>
                <strong>All Rights Reserved &copy;</strong>`;
  const footer = isFr
    ? 'Service Manuels Pro &mdash; Documentation technique professionnelle'
    : 'Service Manuals Pro &mdash; Professional Technical Documentation';

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
    from: `${fromName} <noreply@service-manuals-pro.com>`,
    to: email,
    subject,
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
            <h1 style="color:#18181b;font-size:24px;margin:0 0 8px;">${heading}</h1>
            <p style="color:#71717a;font-size:16px;margin:0 0 24px;">${thankYou}</p>

            <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:0 0 24px;">
              <p style="color:#18181b;font-weight:600;margin:0 0 4px;">${documentTitle}</p>
              <p style="color:#71717a;font-size:14px;margin:0;">${bundleText}</p>
            </div>

            <div style="margin:0 0 24px;padding:16px;border:2px solid #dc2626;border-radius:8px;background:#fef2f2;">
              <p style="color:#991b1b;font-size:13px;font-weight:700;margin:0 0 8px;text-transform:uppercase;">${copyrightTitle}</p>
              <p style="color:#18181b;font-size:13px;line-height:1.5;margin:0;">
                ${copyrightBody}
              </p>
            </div>

            <table role="presentation" style="width:100%;border:0;cellpadding:0;cellspacing:0;">
              ${linksHtml}
            </table>

            <p style="color:#a1a1aa;font-size:13px;margin:24px 0 0;">
              ${expiresText}
            </p>
          </div>
          <p style="color:#a1a1aa;font-size:12px;text-align:center;margin:16px 0 0;">
            ${footer}
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
