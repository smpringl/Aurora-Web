import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess, showError } from '@/utils/toast'
import { Copy, Eye, EyeOff, RefreshCw, Key, FileText, ArrowUpRight, Rocket } from 'lucide-react'

interface ApiKey {
  id: string
  prefix: string
  last_four: string
  key_encrypted: string
  created_at: string
  rotated_at?: string
}

const ApiKeyManagement = () => {
  const { user, sessionReady } = useAuth()
  const [apiKey, setApiKey] = useState<ApiKey | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justGenerated, setJustGenerated] = useState(false)

  const userId = user?.id
  useEffect(() => {
    if (!sessionReady) return
    fetchApiKey()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, userId])

  const fetchApiKey = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    setError(null)

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, prefix, last_four, key_encrypted, created_at, rotated_at')
        .eq('user_id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setApiKey(null)
        } else {
          setError(`Error loading API key: ${error.message}`)
          showError('Error loading API key')
        }
      } else if (data) {
        setApiKey(data)
      }
    } catch (err) {
      setError(`Exception: ${err instanceof Error ? err.message : 'Unknown error'}`)
      showError('Error loading API key')
    } finally {
      setLoading(false)
    }
  }

  const generateApiKey = async () => {
    if (!user) return

    setGenerating(true)
    setError(null)

    try {
      const response = await supabase.functions.invoke('manage-api-key', {
        body: { action: 'create' }
      })

      if (response.error) {
        setError(`Error generating API key: ${response.error.message}`)
        showError(`Error generating API key: ${response.error.message || 'Unknown error'}`)
        return
      }

      const { data } = response

      if (data?.key) {
        setShowKey(true)
        setJustGenerated(true)
        await fetchApiKey()
        showSuccess('API key generated successfully')
      } else if (data?.error) {
        setError(`Error: ${data.error}`)
        showError(`Error: ${data.error}`)
      } else {
        setError('Unexpected response from server')
        showError('Unexpected response from server')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Error generating API key: ${msg}`)
      showError(`Error generating API key: ${msg}`)
    } finally {
      setGenerating(false)
    }
  }

  const regenerateApiKey = async () => {
    if (!user) return

    setGenerating(true)
    setError(null)

    try {
      const response = await supabase.functions.invoke('manage-api-key', {
        body: { action: 'regenerate' }
      })

      if (response.error) {
        setError(`Error regenerating API key: ${response.error.message}`)
        showError(`Error regenerating API key: ${response.error.message || 'Unknown error'}`)
        return
      }

      const { data } = response

      if (data?.key) {
        setShowKey(true)
        setJustGenerated(true)
        await fetchApiKey()
        showSuccess('API key regenerated successfully')
      } else if (data?.error) {
        setError(`Error: ${data.error}`)
        showError(`Error: ${data.error}`)
      } else {
        setError('Unexpected response from server')
        showError('Unexpected response from server')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Error regenerating API key: ${msg}`)
      showError(`Error regenerating API key: ${msg}`)
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (!apiKey?.key_encrypted) return
    try {
      await navigator.clipboard.writeText(apiKey.key_encrypted)
      showSuccess('API key copied to clipboard')
    } catch {
      showError('Failed to copy to clipboard')
    }
  }

  const toggleShowKey = () => {
    setShowKey(!showKey)
    setJustGenerated(false)
  }

  const displayValue = showKey && apiKey?.key_encrypted
    ? apiKey.key_encrypted
    : apiKey ? `${apiKey.prefix}${'•'.repeat(24)}${apiKey.last_four}` : ''

  if (loading) {
    return (
      <div className="border border-gray-200 rounded-xl p-8 bg-white">
        <div className="flex items-center justify-center py-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
            <p className="mt-2 text-[13px] text-gray-500">Loading API key...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-gray-200 rounded-xl p-8 bg-white">
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-4">
          <p className="text-sm text-gray-600">{error}</p>
        </div>
        <Button onClick={fetchApiKey} className="bg-black text-white hover:bg-gray-800">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="pb-8">
        <h1 className="text-[36px] font-semibold tracking-[-0.02em] leading-[1.2] text-gray-900">
          API Key
        </h1>
        <p className="text-gray-500 mt-1 text-[15px]">
          Manage your API key for accessing Aurora Carbon data
        </p>
      </div>

      <div className="border border-gray-200 rounded-xl p-8 bg-white">
        {!apiKey ? (
          <div className="text-center py-8">
            <Key className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No API Key</h3>
            <p className="text-gray-500 text-sm mb-6">
              Generate your first API key to start using the Aurora Carbon API
            </p>
            <Button onClick={generateApiKey} disabled={generating} className="bg-black text-white hover:bg-gray-800">
              {generating ? 'Generating...' : 'Generate API Key'}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <Label className="text-[13px] text-gray-500">API Key</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  value={displayValue}
                  readOnly
                  className="font-mono text-[13px] bg-gray-50 border-gray-200 flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleShowKey}
                  className="border-gray-200 shrink-0"
                  title={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="border-gray-200 shrink-0"
                  title="Copy key"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {justGenerated && (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <p className="text-sm text-gray-600">
                  <strong>Important:</strong> Make sure to copy and store your API key securely.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-[12px] text-gray-400 uppercase tracking-wider">Created</Label>
                <p className="text-gray-900 mt-0.5">{new Date(apiKey.created_at).toLocaleDateString()}</p>
              </div>
              {apiKey.rotated_at && (
                <div>
                  <Label className="text-[12px] text-gray-400 uppercase tracking-wider">Last Rotated</Label>
                  <p className="text-gray-900 mt-0.5">{new Date(apiKey.rotated_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={generating} className="bg-black text-white hover:bg-gray-800 rounded-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate Key
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will invalidate your current API key and generate a new one.
                      Any applications using the current key will stop working until updated.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={regenerateApiKey}
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      Regenerate Key
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

            </div>
          </div>
        )}
      </div>

      {/* Docs CTA */}
      <div className="border border-gray-200 rounded-xl p-8 bg-white mt-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#B3FD00' }}>
            <Rocket className="w-4 h-4 text-black" />
          </div>
          <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900">Get Started</h3>
        </div>
        <p className="text-[14px] text-gray-500 mb-5 max-w-lg">
          Ready to use your key? Review our API docs for code examples, endpoint details, and everything you need to start making calls.
        </p>
        <Button
          variant="outline"
          className="border-gray-200 group rounded-full"
          onClick={() => { window.location.hash = 'docs' }}
        >
          API Docs
          <ArrowUpRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Button>
      </div>
    </div>
  )
}

export default ApiKeyManagement
