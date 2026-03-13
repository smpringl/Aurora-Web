import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess, showError } from '@/utils/toast'
import { Copy, EyeOff, RefreshCw, Key } from 'lucide-react'

interface ApiKey {
  id: string
  prefix: string
  last_four: string
  created_at: string
  rotated_at?: string
}

const ApiKeyManagement = () => {
  const { user } = useAuth()
  const [apiKey, setApiKey] = useState<ApiKey | null>(null)
  const [plaintextKey, setPlaintextKey] = useState<string>('')
  const [showPlaintext, setShowPlaintext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKey()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchApiKey = async () => {
    if (!user) {
      console.log('No user found, skipping API key fetch')
      setLoading(false)
      return
    }

    console.log('Fetching API key for user:', user.id)
    setError(null)

    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .single()

      console.log('API key fetch result:', { data, error })

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No API key found for user (expected for new users)')
          setApiKey(null)
        } else {
          console.error('Error fetching API key:', error)
          setError(`Error loading API key: ${error.message}`)
          showError('Error loading API key')
        }
      } else if (data) {
        console.log('API key found:', data)
        setApiKey(data)
      }
    } catch (err) {
      console.error('Exception while fetching API key:', err)
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
      console.log('Attempting to generate API key for user:', user.id)

      const { data: sessionData } = await supabase.auth.getSession()
      console.log('Current session:', sessionData.session ? 'Active' : 'None')

      const response = await supabase.functions.invoke('manage-api-key', {
        body: { action: 'create' }
      })

      console.log('Function response:', response)

      if (response.error) {
        console.error('Function error:', response.error)
        setError(`Error generating API key: ${response.error.message}`)
        showError(`Error generating API key: ${response.error.message || 'Unknown error'}`)
        return
      }

      const { data } = response
      console.log('Function data:', data)

      if (data?.key) {
        setPlaintextKey(data.key)
        setShowPlaintext(true)
        await fetchApiKey()
        showSuccess('API key generated successfully')
      } else if (data?.error) {
        console.error('API error:', data.error)
        setError(`Error: ${data.error}`)
        showError(`Error: ${data.error}`)
      } else {
        console.error('Unexpected response format:', data)
        setError('Unexpected response from server')
        showError('Unexpected response from server')
      }
    } catch (err) {
      console.error('Error generating API key:', err)
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
      console.log('Attempting to regenerate API key for user:', user.id)

      const response = await supabase.functions.invoke('manage-api-key', {
        body: { action: 'regenerate' }
      })

      console.log('Function response:', response)

      if (response.error) {
        console.error('Function error:', response.error)
        setError(`Error regenerating API key: ${response.error.message}`)
        showError(`Error regenerating API key: ${response.error.message || 'Unknown error'}`)
        return
      }

      const { data } = response
      console.log('Function data:', data)

      if (data?.key) {
        setPlaintextKey(data.key)
        setShowPlaintext(true)
        await fetchApiKey()
        showSuccess('API key regenerated successfully')
      } else if (data?.error) {
        console.error('API error:', data.error)
        setError(`Error: ${data.error}`)
        showError(`Error: ${data.error}`)
      } else {
        console.error('Unexpected response format:', data)
        setError('Unexpected response from server')
        showError('Unexpected response from server')
      }
    } catch (err) {
      console.error('Error regenerating API key:', err)
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Error regenerating API key: ${msg}`)
      showError(`Error regenerating API key: ${msg}`)
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccess('Copied to clipboard')
    } catch {
      showError('Failed to copy to clipboard')
    }
  }

  const hidePlaintext = () => {
    setShowPlaintext(false)
    setPlaintextKey('')
  }

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
    <div className="space-y-6">
      <div className="border border-gray-200 rounded-xl p-8 bg-white">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-5 h-5 text-gray-900" />
          <h3 className="text-xl font-semibold tracking-[-0.01em] text-gray-900">API Key Management</h3>
        </div>
        <p className="text-[13px] text-gray-500 mb-6">
          Manage your API key for accessing Aurora Carbon data
        </p>

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
          <div className="space-y-4">
            <div>
              <Label className="text-[13px] text-gray-500">API Key</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Input
                  value={
                    showPlaintext && plaintextKey
                      ? plaintextKey
                      : `${apiKey.prefix}••••••••••••••••${apiKey.last_four}`
                  }
                  readOnly
                  className="font-mono text-[13px] bg-gray-50 border-gray-200"
                />
                {showPlaintext && plaintextKey ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(plaintextKey)}
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={hidePlaintext}
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      <EyeOff className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(`${apiKey.prefix}••••••••••••••••${apiKey.last_four}`)}
                    className="bg-black text-white hover:bg-gray-800"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

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

            <div className="pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={generating} className="bg-black text-white hover:bg-gray-800">
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

        {showPlaintext && plaintextKey && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mt-6">
            <p className="text-sm text-gray-600">
              <strong>Important:</strong> This is the only time you'll see your API key in plain text.
              Make sure to copy and store it securely. Once you hide it, you'll only see the masked version.
            </p>
          </div>
        )}
      </div>

      <div className="border border-gray-200 rounded-xl p-8 bg-white">
        <h3 className="text-xl font-semibold tracking-[-0.01em] text-gray-900 mb-1">Usage Examples</h3>
        <p className="text-[13px] text-gray-500 mb-6">
          How to use your API key to authenticate requests
        </p>

        <div className="space-y-4">
          <div>
            <Label className="text-[13px] font-medium text-gray-900">cURL</Label>
            <div className="mt-1 p-4 bg-gray-50 rounded-lg">
              <code className="text-[13px] font-mono text-gray-900">
                curl -X POST https://kfuuqxmaihlwhzfibhvj.supabase.co/functions/v1/verify-api-key \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY"
              </code>
            </div>
          </div>

          <div>
            <Label className="text-[13px] font-medium text-gray-900">JavaScript</Label>
            <div className="mt-1 p-4 bg-gray-50 rounded-lg">
              <code className="text-[13px] font-mono text-gray-900">
                fetch('https://kfuuqxmaihlwhzfibhvj.supabase.co/functions/v1/verify-api-key', {'{'}
                <br />
                &nbsp;&nbsp;method: 'POST',
                <br />
                &nbsp;&nbsp;headers: {'{'}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;'Authorization': `Bearer ${'${apiKey}'}`
                <br />
                &nbsp;&nbsp;{'}'}
                <br />
                {'}'})
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApiKeyManagement
