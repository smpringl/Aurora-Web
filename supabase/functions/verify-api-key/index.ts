import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Get API key from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ ok: false, error: 'API key required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const apiKey = authHeader.replace('Bearer ', '')

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

  } catch (error) {
    console.error('Error in verify-api-key function:', error)
    return new Response(
      JSON.stringify({ ok: false, error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
