import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'Aurora Carbon <no-reply@em.auroracarbon.com>'

// ── Email Templates ────────────────────────────────────────────

function baseLayout(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aurora Carbon</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .preheader { display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: #f5f5f5; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5;">
  ${preheader ? `<span class="preheader">${preheader}</span>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px; text-align:left;">
              <img src="https://kfuuqxmaihlwhzfibhvj.supabase.co/storage/v1/object/public/public-assets/aurora-logo-black.png" alt="Aurora Carbon" height="28" style="height:28px; width:auto; display:block;" />
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff; border:1px solid #e5e5e5; border-radius:12px; padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px; text-align:center;">
              <p style="font-size:12px; color:#a3a3a3; margin:0; line-height:1.5;">
                Aurora Carbon Inc. · <a href="https://auroracarbon.com" style="color:#a3a3a3; text-decoration:underline;">auroracarbon.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function greenBadge(text: string): string {
  return `<span style="display:inline-block; background-color:#B3FD00; color:#171717; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; padding:4px 12px; border-radius:20px;">${text}</span>`
}

function ctaButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="background-color:#171717; border-radius:999px; text-align:center;">
        <a href="${url}" style="display:inline-block; padding:12px 28px; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; letter-spacing:-0.01em;">${text}</a>
      </td>
    </tr>
  </table>`
}

function divider(): string {
  return `<hr style="border:none; border-top:1px solid #e5e5e5; margin:24px 0;">`
}

// ── Template Generators ────────────────────────────────────────

interface TemplateMap {
  [key: string]: (data: Record<string, unknown>) => { subject: string; html: string }
}

const templates: TemplateMap = {

  // ── Card Management ──

  card_added: (data) => ({
    subject: 'Payment method added',
    html: baseLayout(`
      <h1 style="font-size:24px; font-weight:600; color:#171717; margin:0 0 8px; letter-spacing:-0.02em;">Card Added</h1>
      <p style="font-size:14px; color:#737373; margin:0 0 24px; line-height:1.6;">
        A new payment method has been added to your Aurora Carbon account.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px; padding:16px 20px; width:100%;">
        <tr>
          <td>
            <p style="font-size:13px; color:#737373; margin:0 0 4px;">Card</p>
            <p style="font-size:15px; color:#171717; font-weight:600; margin:0; font-family:monospace;">
              ${String(data.brand).toUpperCase()} •••• ${data.last4}
            </p>
          </td>
          <td align="right">
            <p style="font-size:13px; color:#737373; margin:0 0 4px;">Expires</p>
            <p style="font-size:15px; color:#171717; font-weight:600; margin:0; font-family:monospace;">
              ${String(data.exp_month).padStart(2, '0')}/${data.exp_year}
            </p>
          </td>
        </tr>
      </table>
      <p style="font-size:13px; color:#a3a3a3; margin:16px 0 0; line-height:1.5;">
        If you didn't add this card, please <a href="https://auroracarbon.com/dashboard#billing" style="color:#171717; text-decoration:underline;">review your account</a> immediately.
      </p>
    `, 'A new payment method was added to your account.'),
  }),

  card_removed: (data) => ({
    subject: 'Payment method removed',
    html: baseLayout(`
      <h1 style="font-size:24px; font-weight:600; color:#171717; margin:0 0 8px; letter-spacing:-0.02em;">Card Removed</h1>
      <p style="font-size:14px; color:#737373; margin:0 0 24px; line-height:1.6;">
        A payment method has been removed from your Aurora Carbon account.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px; padding:16px 20px; width:100%;">
        <tr>
          <td>
            <p style="font-size:15px; color:#171717; font-weight:600; margin:0; font-family:monospace;">
              ${String(data.brand).toUpperCase()} •••• ${data.last4}
            </p>
          </td>
        </tr>
      </table>
    `, 'A payment method was removed from your account.'),
  }),

  default_card_changed: (data) => ({
    subject: 'Default payment method updated',
    html: baseLayout(`
      <h1 style="font-size:24px; font-weight:600; color:#171717; margin:0 0 8px; letter-spacing:-0.02em;">Default Card Updated</h1>
      <p style="font-size:14px; color:#737373; margin:0 0 24px; line-height:1.6;">
        Your default payment method has been changed.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#fafafa; border-radius:8px; padding:16px 20px; width:100%;">
        <tr>
          <td>
            <p style="font-size:13px; color:#737373; margin:0 0 4px;">New default</p>
            <p style="font-size:15px; color:#171717; font-weight:600; margin:0; font-family:monospace;">
              ${String(data.brand).toUpperCase()} •••• ${data.last4}
            </p>
          </td>
        </tr>
      </table>
    `, 'Your default payment method has been updated.'),
  }),

  // ── Purchase / Receipt ──

  purchase_receipt: (data) => {
    const amount = Number(data.amount_cents) / 100
    const discount = Number(data.discount_cents || 0) / 100
    const total = amount - discount

    return {
      subject: `Your receipt from Aurora Carbon — $${total.toFixed(2)}`,
      html: baseLayout(`
        <h1 style="font-size:24px; font-weight:600; color:#171717; margin:0 0 8px; letter-spacing:-0.02em;">Payment Receipt</h1>
        <p style="font-size:14px; color:#737373; margin:0 0 24px; line-height:1.6;">
          Thank you for your purchase. Your credits have been added to your account.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:12px 0; border-bottom:1px solid #e5e5e5;">
              <p style="font-size:13px; color:#737373; margin:0;">Pack</p>
            </td>
            <td align="right" style="padding:12px 0; border-bottom:1px solid #e5e5e5;">
              <p style="font-size:14px; color:#171717; font-weight:600; margin:0;">${data.pack_name} Pack</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0; border-bottom:1px solid #e5e5e5;">
              <p style="font-size:13px; color:#737373; margin:0;">Credits added</p>
            </td>
            <td align="right" style="padding:12px 0; border-bottom:1px solid #e5e5e5;">
              <p style="font-size:14px; color:#171717; font-weight:600; margin:0;">${greenBadge(`+${data.credits}`)}</p>
            </td>
          </tr>
          ${discount > 0 ? `
          <tr>
            <td style="padding:12px 0; border-bottom:1px solid #e5e5e5;">
              <p style="font-size:13px; color:#737373; margin:0;">Subtotal</p>
            </td>
            <td align="right" style="padding:12px 0; border-bottom:1px solid #e5e5e5;">
              <p style="font-size:14px; color:#a3a3a3; margin:0; text-decoration:line-through;">$${amount.toFixed(2)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0; border-bottom:1px solid #e5e5e5;">
              <p style="font-size:13px; color:#737373; margin:0;">Promo (${data.promo_code})</p>
            </td>
            <td align="right" style="padding:12px 0; border-bottom:1px solid #e5e5e5;">
              <p style="font-size:14px; color:#171717; font-weight:600; margin:0;">-$${discount.toFixed(2)}</p>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding:12px 0;">
              <p style="font-size:13px; color:#737373; margin:0;">Total charged</p>
            </td>
            <td align="right" style="padding:12px 0;">
              <p style="font-size:20px; color:#171717; font-weight:700; margin:0;">$${total.toFixed(2)}</p>
            </td>
          </tr>
        </table>
        ${divider()}
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
          <tr>
            <td>
              <p style="font-size:13px; color:#737373; margin:0;">Paid with</p>
              <p style="font-size:13px; color:#171717; margin:4px 0 0; font-family:monospace;">${String(data.card_brand).toUpperCase()} •••• ${data.card_last4}</p>
            </td>
            <td align="right">
              <p style="font-size:13px; color:#737373; margin:0;">Date</p>
              <p style="font-size:13px; color:#171717; margin:4px 0 0;">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </td>
          </tr>
        </table>
        ${ctaButton('View Balance', 'https://auroracarbon.com/dashboard#usage')}
      `, `Receipt for ${data.pack_name} Pack — $${total.toFixed(2)}`),
    }
  },

  // ── Credit Alerts ──

  credits_low: (data) => ({
    subject: 'Your Aurora credits are running low',
    html: baseLayout(`
      <h1 style="font-size:24px; font-weight:600; color:#171717; margin:0 0 8px; letter-spacing:-0.02em;">Credits Running Low</h1>
      <p style="font-size:14px; color:#737373; margin:0 0 24px; line-height:1.6;">
        You have <strong style="color:#171717;">${data.balance} credits</strong> remaining — that's about <strong style="color:#171717;">${Math.floor(Number(data.balance) / 3)} lookups</strong> left.
      </p>
      <p style="font-size:14px; color:#737373; margin:0 0 0; line-height:1.6;">
        Recharge now to keep your API access running without interruption.
      </p>
      ${ctaButton('Buy Credits', 'https://auroracarbon.com/dashboard#billing')}
    `, `You have ${data.balance} credits remaining.`),
  }),

  credits_depleted: (data) => ({
    subject: '[Action Needed] Your Aurora API access is paused',
    html: baseLayout(`
      <h1 style="font-size:24px; font-weight:600; color:#171717; margin:0 0 8px; letter-spacing:-0.02em;">API Access Paused</h1>
      <p style="font-size:14px; color:#737373; margin:0 0 24px; line-height:1.6;">
        Your credit balance has reached <strong style="color:#171717;">0</strong>. API requests will return a <span style="font-family:monospace; background-color:#fafafa; padding:2px 6px; border-radius:4px; font-size:13px;">402</span> error until credits are added.
      </p>
      <p style="font-size:14px; color:#737373; margin:0 0 0; line-height:1.6;">
        Purchase a credit pack to restore access immediately.
      </p>
      ${ctaButton('Recharge Now', 'https://auroracarbon.com/dashboard#billing')}
    `, 'Your Aurora API access has been paused due to insufficient credits.'),
  }),

  // ── Welcome ──

  welcome: (data) => ({
    subject: 'Welcome to Aurora Carbon',
    html: baseLayout(`
      <h1 style="font-size:24px; font-weight:600; color:#171717; margin:0 0 8px; letter-spacing:-0.02em;">Welcome to Aurora</h1>
      <p style="font-size:14px; color:#737373; margin:0 0 24px; line-height:1.6;">
        Your account is ready. Aurora gives you instant access to corporate greenhouse gas emissions data through a simple API.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td style="padding:12px 0; border-bottom:1px solid #e5e5e5;">
            <p style="font-size:14px; color:#171717; margin:0;"><strong>1.</strong> Generate your API key</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0; border-bottom:1px solid #e5e5e5;">
            <p style="font-size:14px; color:#171717; margin:0;"><strong>2.</strong> Try a lookup in the Playground</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;">
            <p style="font-size:14px; color:#171717; margin:0;"><strong>3.</strong> Integrate with your app</p>
          </td>
        </tr>
      </table>
      ${ctaButton('Go to Dashboard', 'https://auroracarbon.com/dashboard')}
    `, 'Your Aurora Carbon account is ready.'),
  }),
}

// ── Send via Resend ────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error (${res.status}): ${err}`)
  }

  return await res.json()
}

// ── Handler ────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Auth — verify JWT to get user, or accept service_role for internal calls
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { action, template, to, data } = await req.json()

    // Option 1: Internal call with explicit `to` email (from other Edge Functions)
    // Option 2: Authenticated user call (sends to their own email)
    let recipientEmail = to

    if (!recipientEmail && authHeader) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user } } = await userClient.auth.getUser()
      if (user?.email) {
        recipientEmail = user.email
      }
    }

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'No recipient email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const templateName = template || action
    const templateFn = templates[templateName]

    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${templateName}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { subject, html } = templateFn(data || {})
    const result = await sendEmail(recipientEmail, subject, html)

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('send-email error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
