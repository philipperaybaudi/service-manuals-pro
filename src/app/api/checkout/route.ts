import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { documentId, email } = await req.json();

    if (!documentId || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

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
            currency: 'usd',
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
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/download/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/docs/${doc.slug}`,
      metadata: {
        document_id: doc.id,
        customer_email: email,
        site: 'service-manuals-pro',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
