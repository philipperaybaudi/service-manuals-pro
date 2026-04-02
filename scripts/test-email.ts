/**
 * Test script: Send a test download email via Resend
 * Usage: npx tsx scripts/test-email.ts
 */

import * as path from 'path';
import * as fs from 'fs';

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  console.log('Sending test email...');

  const { data, error } = await resend.emails.send({
    from: 'Service Manuals Pro <onboarding@resend.dev>',
    to: 'joseph.corso@la-documentation-technique.fr',
    subject: 'Your download is ready: Nikon F4 Service Manual (TEST)',
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
              <p style="color:#18181b;font-weight:600;margin:0 0 4px;">Nikon F4 Service Manual (TEST)</p>
              <p style="color:#71717a;font-size:14px;margin:0;">Click the button below to download your file.</p>
            </div>

            <a href="https://www.service-manuals-pro.com" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">
              Download Now
            </a>

            <p style="color:#a1a1aa;font-size:13px;margin:24px 0 0;">
              This link expires on April 1, 2026, 3:00 PM. If you need assistance, reply to this email.
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

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Email sent successfully!');
    console.log('ID:', data?.id);
  }
}

main().catch(console.error);
