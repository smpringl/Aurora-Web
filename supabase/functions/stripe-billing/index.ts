import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' })

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Price ID → credits mapping
const PRICE_CREDITS: Record<string, { credits: number; pack: string }> = {
  'price_1TDlfXKGTy4BfEAsATcrEiJo': { credits: 120, pack: 'Starter' },
  'price_1TDlfZKGTy4BfEAsDmFlTS2u': { credits: 5400, pack: 'Growth' },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Authenticate user via JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const body = await req.json()
    const { action } = body

    // ── Get or create Stripe customer ──
    async function getOrCreateCustomer(): Promise<string> {
      const { data: existing } = await supabase
        .from('stripe_customers')
        .select('stripe_customer_id')
        .eq('user_id', user!.id)
        .single()

      if (existing) return existing.stripe_customer_id

      const customer = await stripe.customers.create({
        email: user!.email,
        metadata: { supabase_user_id: user!.id },
      })

      await supabase.from('stripe_customers').insert({
        user_id: user!.id,
        stripe_customer_id: customer.id,
      })

      return customer.id
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: setup-intent
    // Creates a SetupIntent for adding a card via Stripe Elements
    // ═══════════════════════════════════════════════════════════════
    if (action === 'setup-intent') {
      const customerId = await getOrCreateCustomer()
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      })
      return json({ client_secret: setupIntent.client_secret })
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: add-card
    // Attaches a PaymentMethod to the customer after confirmSetup
    // ═══════════════════════════════════════════════════════════════
    if (action === 'add-card') {
      const { payment_method_id } = body
      if (!payment_method_id) return json({ error: 'payment_method_id required' }, 400)

      const customerId = await getOrCreateCustomer()

      // Retrieve PM details from Stripe
      const pm = await stripe.paymentMethods.retrieve(payment_method_id)

      // Check if this is the first card
      const { data: existingCards } = await supabase
        .from('payment_methods')
        .select('id')
        .eq('user_id', user!.id)

      const isFirst = !existingCards || existingCards.length === 0

      // If first card, set as default on Stripe customer
      if (isFirst) {
        await stripe.customers.update(customerId, {
          invoice_settings: { default_payment_method: payment_method_id },
        })
      }

      // Store in DB
      await supabase.from('payment_methods').insert({
        user_id: user!.id,
        stripe_payment_method_id: payment_method_id,
        brand: pm.card?.brand ?? 'unknown',
        last4: pm.card?.last4 ?? '0000',
        exp_month: pm.card?.exp_month ?? 0,
        exp_year: pm.card?.exp_year ?? 0,
        is_default: isFirst,
      })

      // Send email notification (fire-and-forget)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          template: 'card_added',
          to: user!.email,
          data: { brand: pm.card?.brand, last4: pm.card?.last4, exp_month: pm.card?.exp_month, exp_year: pm.card?.exp_year },
        }),
      }).catch(() => {})

      return json({
        success: true,
        card: {
          id: payment_method_id,
          brand: pm.card?.brand,
          last4: pm.card?.last4,
          exp_month: pm.card?.exp_month,
          exp_year: pm.card?.exp_year,
          is_default: isFirst,
        },
      })
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: remove-card
    // ═══════════════════════════════════════════════════════════════
    if (action === 'remove-card') {
      const { payment_method_id } = body
      if (!payment_method_id) return json({ error: 'payment_method_id required' }, 400)

      // Get the card record to check ownership
      const { data: cardRow } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user!.id)
        .eq('stripe_payment_method_id', payment_method_id)
        .single()

      if (!cardRow) return json({ error: 'Card not found' }, 404)

      // Detach from Stripe
      await stripe.paymentMethods.detach(payment_method_id)

      // Remove from DB
      await supabase
        .from('payment_methods')
        .delete()
        .eq('stripe_payment_method_id', payment_method_id)

      // If this was the default, promote the next card
      if (cardRow.is_default) {
        const { data: remaining } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: true })
          .limit(1)

        if (remaining && remaining.length > 0) {
          await supabase
            .from('payment_methods')
            .update({ is_default: true })
            .eq('id', remaining[0].id)

          const customerId = await getOrCreateCustomer()
          await stripe.customers.update(customerId, {
            invoice_settings: { default_payment_method: remaining[0].stripe_payment_method_id },
          })
        }
      }

      // Send email (fire-and-forget)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          template: 'card_removed',
          to: user!.email,
          data: { brand: cardRow.brand, last4: cardRow.last4 },
        }),
      }).catch(() => {})

      return json({ success: true })
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: set-default-card
    // ═══════════════════════════════════════════════════════════════
    if (action === 'set-default-card') {
      const { payment_method_id } = body
      if (!payment_method_id) return json({ error: 'payment_method_id required' }, 400)

      // Verify ownership
      const { data: cardRow } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user!.id)
        .eq('stripe_payment_method_id', payment_method_id)
        .single()

      if (!cardRow) return json({ error: 'Card not found' }, 404)

      // Unset all defaults for this user
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user!.id)

      // Set new default
      await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('stripe_payment_method_id', payment_method_id)

      // Update Stripe customer
      const customerId = await getOrCreateCustomer()
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: payment_method_id },
      })

      // Send email (fire-and-forget)
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          template: 'default_card_changed',
          to: user!.email,
          data: { brand: cardRow.brand, last4: cardRow.last4 },
        }),
      }).catch(() => {})

      return json({ success: true })
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: validate-promo
    // ═══════════════════════════════════════════════════════════════
    if (action === 'validate-promo') {
      const { code, price_id } = body
      if (!code) return json({ error: 'code required' }, 400)

      const promos = await stripe.promotionCodes.list({
        code,
        active: true,
        limit: 1,
      })

      if (promos.data.length === 0) {
        return json({ valid: false, error: 'Invalid or expired promo code' })
      }

      const promo = promos.data[0]
      const coupon = promo.coupon

      // Check if coupon restricts to specific products
      if (coupon.applies_to?.products && price_id) {
        const price = await stripe.prices.retrieve(price_id)
        if (!coupon.applies_to.products.includes(price.product as string)) {
          return json({ valid: false, error: 'Promo code not applicable to this pack' })
        }
      }

      return json({
        valid: true,
        promo_code_id: promo.id,
        coupon_id: coupon.id,
        percent_off: coupon.percent_off,
        amount_off: coupon.amount_off,
        currency: coupon.currency,
      })
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: purchase-credits
    // ═══════════════════════════════════════════════════════════════
    if (action === 'purchase-credits') {
      const { price_id, payment_method_id, promo_code } = body
      if (!price_id) return json({ error: 'price_id required' }, 400)

      const packInfo = PRICE_CREDITS[price_id]
      if (!packInfo) return json({ error: 'Invalid price_id' }, 400)

      const customerId = await getOrCreateCustomer()
      const price = await stripe.prices.retrieve(price_id)
      let amountCents = price.unit_amount!
      let discountCents = 0
      let promoCodeStr: string | null = null
      let promoCodeId: string | null = null

      // Validate promo code if provided
      if (promo_code) {
        const promos = await stripe.promotionCodes.list({
          code: promo_code,
          active: true,
          limit: 1,
        })

        if (promos.data.length > 0) {
          const promo = promos.data[0]
          promoCodeId = promo.id
          promoCodeStr = promo_code
          const coupon = promo.coupon

          if (coupon.percent_off) {
            discountCents = Math.round(amountCents * coupon.percent_off / 100)
          } else if (coupon.amount_off) {
            discountCents = coupon.amount_off
          }
        } else {
          return json({ error: 'Invalid or expired promo code' }, 400)
        }
      }

      const chargeAmount = amountCents - discountCents

      // ── $0 promo purchase — skip Stripe charge ──
      if (chargeAmount <= 0) {
        const syntheticPi = `promo_${crypto.randomUUID()}`

        const { data: result } = await supabase.rpc('add_credits', {
          p_user_id: user!.id,
          p_amount: packInfo.credits,
          p_stripe_pi: syntheticPi,
          p_price_id: price_id,
          p_pack_name: packInfo.pack,
          p_promo_code: promoCodeStr,
          p_amount_cents: amountCents,
          p_discount_cents: discountCents,
          p_card_brand: null,
          p_card_last4: null,
        })

        // Send receipt email
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            template: 'purchase_receipt',
            to: user!.email,
            data: {
              pack_name: packInfo.pack,
              credits: packInfo.credits,
              amount_cents: amountCents,
              discount_cents: discountCents,
              promo_code: promoCodeStr,
              card_brand: 'promo',
              card_last4: '0000',
            },
          }),
        }).catch(() => {})

        return json({
          success: true,
          credits_added: packInfo.credits,
          balance: result?.balance,
          amount_charged: 0,
        })
      }

      // ── Paid purchase — charge saved card ──
      // Use specified payment_method_id or default
      let pmToCharge = payment_method_id
      if (!pmToCharge) {
        const { data: defaultCard } = await supabase
          .from('payment_methods')
          .select('stripe_payment_method_id')
          .eq('user_id', user!.id)
          .eq('is_default', true)
          .single()

        if (!defaultCard) return json({ error: 'No payment method on file. Please add a card first.' }, 400)
        pmToCharge = defaultCard.stripe_payment_method_id
      }

      // Get card details for receipt
      const pm = await stripe.paymentMethods.retrieve(pmToCharge)

      const piParams: Stripe.PaymentIntentCreateParams = {
        amount: chargeAmount,
        currency: 'usd',
        customer: customerId,
        payment_method: pmToCharge,
        off_session: true,
        confirm: true,
        metadata: {
          supabase_user_id: user!.id,
          price_id,
          pack_name: packInfo.pack,
          credits: String(packInfo.credits),
          promo_code: promoCodeStr || '',
        },
      }

      // Apply promo code discount via Stripe if available
      if (promoCodeId) {
        piParams.metadata!.promo_code_id = promoCodeId
        piParams.metadata!.discount_cents = String(discountCents)
        piParams.metadata!.original_amount = String(amountCents)
      }

      const paymentIntent = await stripe.paymentIntents.create(piParams)

      if (paymentIntent.status === 'succeeded') {
        // Add credits immediately (webhook is backup)
        const { data: result } = await supabase.rpc('add_credits', {
          p_user_id: user!.id,
          p_amount: packInfo.credits,
          p_stripe_pi: paymentIntent.id,
          p_price_id: price_id,
          p_pack_name: packInfo.pack,
          p_promo_code: promoCodeStr,
          p_amount_cents: amountCents,
          p_discount_cents: discountCents,
          p_card_brand: pm.card?.brand ?? null,
          p_card_last4: pm.card?.last4 ?? null,
        })

        // Send receipt email
        fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            template: 'purchase_receipt',
            to: user!.email,
            data: {
              pack_name: packInfo.pack,
              credits: packInfo.credits,
              amount_cents: amountCents,
              discount_cents: discountCents,
              promo_code: promoCodeStr,
              card_brand: pm.card?.brand,
              card_last4: pm.card?.last4,
            },
          }),
        }).catch(() => {})

        return json({
          success: true,
          credits_added: packInfo.credits,
          balance: result?.balance,
          amount_charged: chargeAmount,
        })
      }

      // Payment requires action or failed
      return json({
        success: false,
        error: 'Payment failed. Please try a different card.',
        status: paymentIntent.status,
      }, 402)
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: list-cards
    // ═══════════════════════════════════════════════════════════════
    if (action === 'list-cards') {
      const { data: cards } = await supabase
        .from('payment_methods')
        .select('stripe_payment_method_id, brand, last4, exp_month, exp_year, is_default, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: true })

      return json({ cards: cards || [] })
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: get-balance
    // ═══════════════════════════════════════════════════════════════
    if (action === 'get-balance') {
      const { data: bal } = await supabase
        .from('credit_balances')
        .select('balance')
        .eq('user_id', user!.id)
        .single()

      return json({ balance: bal?.balance ?? 0 })
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTION: get-transactions
    // ═══════════════════════════════════════════════════════════════
    if (action === 'get-transactions') {
      const limit = body.limit || 20
      const offset = body.offset || 0

      const { data: txns, count } = await supabase
        .from('credit_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user!.id)
        .in('type', ['purchase', 'refund', 'promo'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      return json({ transactions: txns || [], total: count || 0 })
    }

    return json({ error: 'Invalid action' }, 400)

  } catch (err) {
    console.error('stripe-billing error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'

    // Handle Stripe card errors gracefully
    if (err && typeof err === 'object' && 'type' in err) {
      const stripeErr = err as { type: string; message: string; code?: string }
      if (stripeErr.type === 'StripeCardError') {
        return json({ error: stripeErr.message, code: stripeErr.code }, 402)
      }
    }

    return json({ error: message }, 500)
  }
})
