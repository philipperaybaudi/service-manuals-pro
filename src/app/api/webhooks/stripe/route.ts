export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServiceClient } from '@/lib/supabase';
import { sendDownloadEmail, sendOrderNotification } from '@/lib/resend';
import { generateDownloadToken } from '@/lib/utils';
import { SITE_URLS, type Locale } from '@/lib/i18n';
import { generateInvoicePDF } from '@/lib/invoice';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    // Use async version for edge runtime (Web Crypto API instead of Node crypto)
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature: ' + err.message }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Verify payment was actually received
    if (session.payment_status !== 'paid') {
      console.error('Payment not completed:', session.payment_status);
      return NextResponse.json({ received: true });
    }

    const documentId = session.metadata?.document_id;
    const customerEmail = session.metadata?.customer_email || session.customer_email;

    if (!documentId || !customerEmail) {
      console.error('Missing metadata in session');
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    const supabaseAdmin = getServiceClient();

    // Idempotency: check if order already exists for this session
    const { data: existing } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .single();

    if (existing) {
      // Already processed, skip
      return NextResponse.json({ received: true });
    }

    const locale: Locale = session.metadata?.locale === 'fr' ? 'fr' : 'en';
    const siteUrl = SITE_URLS[locale];

    const token = generateDownloadToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Create order
    const { error: orderError } = await supabaseAdmin.from('orders').insert({
      document_id: documentId,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent as string,
      customer_email: customerEmail,
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
      download_token: token,
      download_expires_at: expiresAt.toISOString(),
    });

    if (orderError) {
      console.error('Failed to create order:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Get document title
    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('title')
      .eq('id', documentId)
      .single();

    // Prepare customer details
    const customerName = (session as any).customer_details?.name || 'Unknown';
    const countryCode = (session as any).customer_details?.address?.country || '';
    const customerCountry = countryCode
      ? (new Intl.DisplayNames(['fr'], { type: 'region' }).of(countryCode) || countryCode)
      : '—';

    // Retrieve Stripe receipt number from the charge
    let receiptNumber = session.id;
    try {
      if (session.payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(
          session.payment_intent as string,
          { expand: ['latest_charge'] }
        );
        const charge = pi.latest_charge as Stripe.Charge;
        if (charge?.receipt_number) receiptNumber = charge.receipt_number;
      }
    } catch (e) {
      console.error('Failed to retrieve receipt number:', e);
    }

    // Build invoice number and filename: YYYY-MM-DD_receiptNumber
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const invoiceNumber = `${yyyy}-${mm}-${dd}_${receiptNumber}`;
    const invoiceFilename = `facture-invoice-${invoiceNumber}.pdf`;

    // Generate invoice PDF
    let invoicePdf: Uint8Array | undefined;
    try {
      invoicePdf = generateInvoicePDF({
        invoiceNumber,
        date: now,
        customerEmail,
        customerName,
        customerCountry,
        documentTitle: doc?.title || 'Document',
        amount: session.amount_total || 0,
        currency: session.currency || 'usd',
        locale,
      });
    } catch (pdfError) {
      console.error('Failed to generate invoice PDF:', pdfError);
    }

    // Send download email (with invoice PDF attached)
    const downloadUrl = `${siteUrl}/download/${token}`;
    try {
      await sendDownloadEmail(
        customerEmail,
        doc?.title || 'Service Manual',
        downloadUrl,
        expiresAt,
        locale,
        invoicePdf,
        invoiceFilename,
      );
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    // Send order notification to admin
    try {
      await sendOrderNotification(
        doc?.title || 'Service Manual',
        customerName,
        customerEmail,
        customerCountry,
        session.amount_total || 0,
        session.currency || 'usd',
        (session.payment_intent as string) || session.id,
        invoicePdf,
        invoiceFilename,
      );
    } catch (notifError) {
      console.error('Failed to send order notification:', notifError);
    }
  }

  return NextResponse.json({ received: true });
}
