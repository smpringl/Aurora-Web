import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { encode as base64urlEncode } from "https://deno.land/std@0.190.0/encoding/base64url.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ApiKeyData {
  key_hash: string
  key_encrypted: string
  prefix: string
  last_four: string
}

// Generate a secure API key
function generateApiKey(): { key: string; data: ApiKeyData } {
  // Generate 32 random bytes
  const keyBytes = new Uint8Array(32)
  crypto.getRandomValues(keyBytes)

  // Generate 8-char prefix
  const prefixBytes = new Uint8Array(4)
  crypto.getRandomValues(prefixBytes)
  const prefixHex = Array.from(prefixBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Create the full key
  const keyBase64 = base64urlEncode(keyBytes)
  const fullKey = `sk_live_${prefixHex}_${keyBase64}`

  // Hash the key (using Web Crypto API)
  const encoder = new TextEncoder()
  const keyData = encoder.encode(fullKey)

  return crypto.subtle.digest('SHA-256', keyData).then(hashBuffer => {
    const hashArray = new Uint8Array(hashBuffer)
    const hashHex = Array.from(hashArray)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return {
      key: fullKey,
      data: {
        key_hash: hashHex,
        key_encrypted: fullKey, // Store the full key as encrypted (in production, you'd want proper encryption)
        prefix: `sk_live_${prefixHex}_`,
        last_four: keyBase64.slice(-4)
      }
    }
  })
}

// Verify API key
async function verifyApiKey(apiKey: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData)
  const hashArray = new Uint8Array(hashBuffer)
  const hashHex = Array.from(hashArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return hashHex === storedHash
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response('Unauthorized', {
        status: 401,
        headers: corsHeaders
      })
    }

    const { action } = await req.json()

    if (action === 'create') {
      // Check if user already has an API key
      const { data: existingKey } = await supabaseClient
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (existingKey) {
        return new Response(
          JSON.stringify({ error: 'User already has an API key' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Generate new API key
      const { key, data: keyData } = await generateApiKey()

      // Store in database
      const { error: insertError } = await supabaseClient
        .from('api_keys')
        .insert({
          user_id: user.id,
          ...keyData
        })

      if (insertError) {
        console.error('Error inserting API key:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to create API key' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ key }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (action === 'regenerate') {
      // Generate new API key
      const { key, data: keyData } = await generateApiKey()

      // Update existing record
      const { error: updateError } = await supabaseClient
        .from('api_keys')
        .update({
          ...keyData,
          rotated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (updateError) {
        console.error('Error updating API key:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to regenerate API key' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ key }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (action === 'verify') {
      const apiKey = req.headers.get('X-API-Key')
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'API key required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Extract prefix from API key
      const prefix = apiKey.substring(0, apiKey.lastIndexOf('_') + 1)

      // Find API key by prefix
      const { data: keyRecord, error: fetchError } = await supabaseClient
        .from('api_keys')
        .select('user_id, key_hash')
        .eq('prefix', prefix)
        .single()

      if (fetchError || !keyRecord) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid API key' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Verify the key
      const isValid = await verifyApiKey(apiKey, keyRecord.key_hash)

      if (!isValid) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Invalid API key' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      return new Response(
        JSON.stringify({ ok: true, userId: keyRecord.user_id }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in manage-api-key function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
