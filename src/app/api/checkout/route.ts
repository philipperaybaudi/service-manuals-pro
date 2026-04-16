import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';
import { SITE_URLS, type Locale } from '@/lib/i18n';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    let documentId: string, email: string, locale: string;
    try {
      ({ documentId, email, locale } = await req.json());
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!documentId || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const validLocale: Locale = locale === 'fr' ? 'fr' : 'en';
    const currency = validLocale === 'fr' ? 'eur' : 'usd';
    const siteUrl = SITE_URLS[validLocale];

    const { data: doc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('active', true)
      .single();

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: doc.title,
              description: `Service Manual - PDF Download`,
            },
            unit_amount: doc.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${siteUrl}/download/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/docs/${doc.slug}`,
      metadata: {
        document_id: doc.id,
        customer_email: email,
        locale: validLocale,
        site: validLocale === 'fr' ? 'service-manuels-pro' : 'service-manuals-pro',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
