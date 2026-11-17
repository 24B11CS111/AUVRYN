import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Payment Gateway Webhook Receiver Route
 * Handles asynchronous server-to-server webhook notifications (Razorpay / Stripe).
 *
 * Security:
 * 1. Cryptographic HMAC-SHA256 signature verification using institution's webhook secret.
 * 2. Timing-safe equality comparison to prevent timing attacks.
 * 3. Duplicate event suppression using gateway_webhook_events table (replay attack prevention).
 * 4. Exact order ID, amount, currency, and lifecycle status validation.
 * 5. Atomic payment recording via record_fee_payment_atomic.
 * 6. Zero simulation in production.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const url = new URL(req.url);
    const institutionId = url.searchParams.get('institutionId') || req.headers.get('x-institution-id');

    if (!institutionId) {
      return NextResponse.json(
        { error: 'Missing required institution identifier (query param or x-institution-id header)' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient() as any;

    // 1. Fetch institution fee settings to retrieve merchant webhook secret
    const { data: feeSettings, error: settingsErr } = await supabase
      .from('institution_fee_settings')
      .select('is_gateway_live, gateway_provider, webhook_secret_ciphertext')
      .eq('institution_id', institutionId)
      .maybeSingle();

    if (settingsErr || !feeSettings || !feeSettings.is_gateway_live || !feeSettings.webhook_secret_ciphertext) {
      return NextResponse.json(
        { error: 'Payment gateway is not active or webhook secret is unconfigured for this institution' },
        { status: 403 }
      );
    }

    const provider = feeSettings.gateway_provider || 'razorpay';
    const secret = feeSettings.webhook_secret_ciphertext.trim();

    // 2. Validate cryptographic signature using official provider requirements
    let signatureVerified = false;
    let signatureError = '';

    if (provider === 'razorpay') {
      const razorpaySig = req.headers.get('x-razorpay-signature');
      if (!razorpaySig) {
        return NextResponse.json(
          { error: 'Missing required x-razorpay-signature header' },
          { status: 401 }
        );
      }

      const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      const sigBuffer = Buffer.from(razorpaySig.trim(), 'utf8');
      const expBuffer = Buffer.from(expectedSig, 'utf8');

      if (sigBuffer.length === expBuffer.length && crypto.timingSafeEqual(sigBuffer, expBuffer)) {
        signatureVerified = true;
      } else {
        signatureError = 'Cryptographic signature verification failed: Forged or tampered Razorpay webhook payload';
      }
    } else if (provider === 'stripe') {
      const stripeSigHeader = req.headers.get('stripe-signature');
      if (!stripeSigHeader) {
        return NextResponse.json(
          { error: 'Missing required stripe-signature header' },
          { status: 401 }
        );
      }

      // Parse official Stripe signature header: t=timestamp,v1=signature
      const parts = stripeSigHeader.split(',');
      let timestamp: string | null = null;
      let signature: string | null = null;

      for (const part of parts) {
        const [k, v] = part.trim().split('=');
        if (k === 't' && v) timestamp = v;
        if (k === 'v1' && v) signature = v;
      }

      if (!timestamp || !signature) {
        // Fallback for simple signature string
        if (parts.length === 1 && !stripeSigHeader.includes('=')) {
          signature = stripeSigHeader.trim();
        } else {
          return NextResponse.json(
            { error: 'Malformed stripe-signature header format' },
            { status: 401 }
          );
        }
      }

      if (timestamp) {
        const tsNum = parseInt(timestamp, 10);
        const now = Math.floor(Date.now() / 1000);
        // Official Stripe 300-second tolerance window against replay attacks
        if (isNaN(tsNum) || Math.abs(now - tsNum) > 300) {
          return NextResponse.json(
            { error: 'Stripe webhook signature timestamp outside 300s tolerance window (replay attack detected)' },
            { status: 401 }
          );
        }

        const signedPayload = `${timestamp}.${rawBody}`;
        const expectedSig = crypto
          .createHmac('sha256', secret)
          .update(signedPayload)
          .digest('hex');

        const sigBuffer = Buffer.from(signature.trim(), 'utf8');
        const expBuffer = Buffer.from(expectedSig, 'utf8');

        if (sigBuffer.length === expBuffer.length && crypto.timingSafeEqual(sigBuffer, expBuffer)) {
          signatureVerified = true;
        } else {
          signatureError = 'Cryptographic signature verification failed: Forged or tampered Stripe webhook payload';
        }
      } else {
        const expectedSig = crypto
          .createHmac('sha256', secret)
          .update(rawBody)
          .digest('hex');

        const sigBuffer = Buffer.from(signature.trim(), 'utf8');
        const expBuffer = Buffer.from(expectedSig, 'utf8');

        if (sigBuffer.length === expBuffer.length && crypto.timingSafeEqual(sigBuffer, expBuffer)) {
          signatureVerified = true;
        } else {
          signatureError = 'Cryptographic signature verification failed: Forged or tampered Stripe webhook payload';
        }
      }
    } else {
      return NextResponse.json(
        { error: `Unsupported payment provider: ${provider}` },
        { status: 400 }
      );
    }

    if (!signatureVerified) {
      return NextResponse.json(
        { error: signatureError || 'Cryptographic signature verification failed' },
        { status: 401 }
      );
    }

    // 3. Parse payload safely
    const payload = JSON.parse(rawBody);
    const eventId = payload.id || payload.event_id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const eventType = payload.event || payload.type || 'payment.captured';

    // 4. Duplicate event check & replay attack prevention
    const { data: existingEvent } = await supabase
      .from('gateway_webhook_events')
      .select('id, processed')
      .eq('institution_id', institutionId)
      .eq('provider', provider)
      .eq('event_id', eventId)
      .maybeSingle();

    if (existingEvent) {
      return NextResponse.json(
        { status: 'already_processed', message: 'Duplicate webhook event safely suppressed' },
        { status: 200 }
      );
    }

    // Record incoming webhook event
    await supabase.from('gateway_webhook_events').insert({
      institution_id: institutionId,
      provider,
      event_id: eventId,
      event_type: eventType,
      payload,
      signature_verified: true,
      processed: false,
    });

    // 5. Handle payment captured/successful event
    if (eventType === 'payment.captured' || eventType === 'order.paid' || eventType === 'payment_intent.succeeded' || eventType === 'checkout.session.completed') {
      const paymentEntity = payload.payload?.payment?.entity || payload.data?.object || {};
      const status = paymentEntity.status;

      // Strict provider status verification:
      // Razorpay must be 'captured'; Stripe must be 'succeeded'
      if (provider === 'razorpay' && status !== 'captured') {
        throw new Error(`Razorpay payment settlement rejected: Payment status is '${status}', not 'captured'.`);
      }

      if (provider === 'stripe' && status !== 'succeeded') {
        throw new Error(`Stripe payment settlement rejected: PaymentIntent status is '${status}', not 'succeeded'.`);
      }

      const gatewayOrderId = paymentEntity.order_id || paymentEntity.metadata?.gateway_order_id || paymentEntity.id;
      const externalTxnId = paymentEntity.id;
      const amountPaidMinor = Number(paymentEntity.amount_received ?? paymentEntity.amount);
      const currency = (paymentEntity.currency || 'INR').toUpperCase();

      if (!gatewayOrderId) {
        throw new Error('Webhook payload missing provider order identifier');
      }

      // Lookup target order
      const { data: order, error: orderErr } = await supabase
        .from('gateway_orders')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('gateway_order_id', gatewayOrderId)
        .maybeSingle();

      if (orderErr || !order) {
        throw new Error(`Matching gateway order not found for order id: ${gatewayOrderId}`);
      }

      // Idempotency: If already settled, mark event processed and exit
      if (order.status === 'paid') {
        await supabase
          .from('gateway_webhook_events')
          .update({ processed: true, processed_at: new Date().toISOString() })
          .eq('institution_id', institutionId)
          .eq('event_id', eventId);

        return NextResponse.json({ status: 'order_already_settled' }, { status: 200 });
      }

      // Exact amount validation (convert major units to minor units, e.g. 15000 INR = 1500000 paise)
      const expectedAmountMinor = Math.round(Number(order.amount) * 100);
      if (amountPaidMinor !== expectedAmountMinor) {
        throw new Error(`Amount mismatch: expected ${expectedAmountMinor} minor units, got ${amountPaidMinor}`);
      }

      if (currency !== order.currency.toUpperCase()) {
        throw new Error(`Currency mismatch: expected ${order.currency}, got ${currency}`);
      }

      // Atomic payment settlement
      const { data: paymentResult, error: payError } = await supabase.rpc('record_fee_payment_atomic', {
        p_institution_id: institutionId,
        p_student_id: order.student_id,
        p_enrollment_id: null,
        p_assignment_id: order.assignment_id || null,
        p_amount_received: order.amount,
        p_payment_method: 'payment_gateway',
        p_external_ref: externalTxnId,
        p_allocations: [],
        p_notes: `Webhook Settlement (${provider.toUpperCase()} Order: ${order.gateway_order_id}, Event: ${eventId})`,
        p_user_id: null,
      });

      if (payError) throw payError;

      // Update order status to paid
      await supabase
        .from('gateway_orders')
        .update({
          status: 'paid',
          payment_id: paymentResult.payment_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Mark webhook event processed
      await supabase
        .from('gateway_webhook_events')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('institution_id', institutionId)
        .eq('event_id', eventId);

      return NextResponse.json({ status: 'settled', payment_id: paymentResult.payment_id }, { status: 200 });
    }

    // Non-payment captured events (e.g. payment.failed)
    if (eventType === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const gatewayOrderId = paymentEntity.order_id;
      if (gatewayOrderId) {
        await supabase
          .from('gateway_orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('institution_id', institutionId)
          .eq('gateway_order_id', gatewayOrderId);
      }
    }

    await supabase
      .from('gateway_webhook_events')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('institution_id', institutionId)
      .eq('event_id', eventId);

    return NextResponse.json({ status: 'event_acknowledged' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown payment webhook processing failure';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
