import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getServiceClient } from '@/lib/supabase';
import { sendDownloadEmail } from '@/lib/resend';
import { generateDownloadToken } from '@/lib/utils';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
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

    // Send download email
    const downloadUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/download/${token}`;
    try {
      await sendDownloadEmail(
        customerEmail,
        doc?.title || 'Service Manual',
        downloadUrl,
        expiresAt
      );
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }
  }

  return NextResponse.json({ received: true });
}
