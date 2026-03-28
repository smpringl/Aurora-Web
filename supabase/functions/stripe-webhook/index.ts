import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    // ── payment_intent.succeeded ──
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const userId = pi.metadata.supabase_user_id
      const priceId = pi.metadata.price_id
      const packName = pi.metadata.pack_name
      const credits = parseInt(pi.metadata.credits || '0', 10)
      const promoCode = pi.metadata.promo_code || null
      const discountCents = parseInt(pi.metadata.discount_cents || '0', 10)
      const originalAmount = parseInt(pi.metadata.original_amount || String(pi.amount), 10)

      if (!userId || !credits) {
        console.log('Skipping PI without Aurora metadata:', pi.id)
        return new Response('OK', { status: 200 })
      }

      // Get card details from the payment method
      let cardBrand: string | null = null
      let cardLast4: string | null = null
      if (pi.payment_method) {
        const pm = await stripe.paymentMethods.retrieve(pi.payment_method as string)
        cardBrand = pm.card?.brand ?? null
        cardLast4 = pm.card?.last4 ?? null
      }

      // Idempotent add (RPC checks for duplicate PI)
      await supabase.rpc('add_credits', {
        p_user_id: userId,
        p_amount: credits,
        p_stripe_pi: pi.id,
        p_price_id: priceId,
        p_pack_name: packName,
        p_promo_code: promoCode,
        p_amount_cents: originalAmount,
        p_discount_cents: discountCents,
        p_card_brand: cardBrand,
        p_card_last4: cardLast4,
      })

      console.log(`Credits added via webhook: ${credits} for user ${userId} (PI: ${pi.id})`)
    }

    // ── payment_intent.payment_failed ──
    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent
      const userId = pi.metadata.supabase_user_id

      if (userId) {
        // Log failed transaction
        await supabase.from('credit_transactions').insert({
          user_id: userId,
          type: 'purchase',
          credits: 0,
          balance_after: 0,
          stripe_payment_intent_id: pi.id,
          stripe_price_id: pi.metadata.price_id,
          pack_name: pi.metadata.pack_name,
          amount_cents: pi.amount,
          status: 'failed',
          description: `Payment failed: ${pi.last_payment_error?.message || 'Unknown error'}`,
        })
      }
    }

    // ── charge.refunded ──
    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge
      const pi = charge.payment_intent as string

      if (pi) {
        // Find the original transaction
        const { data: original } = await supabase
          .from('credit_transactions')
          .select('*')
          .eq('stripe_payment_intent_id', pi)
          .eq('status', 'completed')
          .single()

        if (original) {
          // Deduct the credits that were added
          const { data: bal } = await supabase
            .from('credit_balances')
            .select('balance')
            .eq('user_id', original.user_id)
            .single()

          const currentBalance = bal?.balance ?? 0
          const refundCredits = original.credits
          const newBalance = Math.max(0, currentBalance - refundCredits)

          await supabase
            .from('credit_balances')
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq('user_id', original.user_id)

          await supabase.from('credit_transactions').insert({
            user_id: original.user_id,
            type: 'refund',
            credits: -refundCredits,
            balance_after: newBalance,
            stripe_payment_intent_id: pi,
            stripe_price_id: original.stripe_price_id,
            pack_name: original.pack_name,
            amount_cents: charge.amount_refunded,
            status: 'refunded',
            description: `Refund for ${original.pack_name} Pack`,
          })

          // Mark original as refunded
          await supabase
            .from('credit_transactions')
            .update({ status: 'refunded' })
            .eq('id', original.id)
        }
      }
    }

  } catch (err) {
    console.error('Webhook handler error:', err)
    // Return 200 anyway to prevent Stripe retries on processing errors
    // The idempotent add_credits RPC ensures no double-crediting
  }

  return new Response('OK', { status: 200 })
})
