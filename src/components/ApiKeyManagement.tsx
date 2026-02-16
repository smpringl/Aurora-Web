import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
      <Card className="bg-white">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-black mx-auto"></div>
            <p className="mt-2 text-sm text-detail-gray font-sans">Loading API key...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-white">
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={fetchApiKey} className="mt-4 bg-primary-black text-white hover:bg-detail-gray">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Manage your API key for accessing Aurora Carbon data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!apiKey ? (
            <div className="text-center py-8">
              <Key className="w-12 h-12 text-detail-gray mx-auto mb-4" />
              <h3 className="text-lg font-medium text-primary-black mb-2">No API Key</h3>
              <p className="text-detail-gray font-sans mb-6">
                Generate your first API key to start using the Aurora Carbon API
              </p>
              <Button onClick={generateApiKey} disabled={generating} className="bg-primary-black text-white hover:bg-detail-gray">
                {generating ? 'Generating...' : 'Generate API Key'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>API Key</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    value={
                      showPlaintext && plaintextKey
                        ? plaintextKey
                        : `${apiKey.prefix}••••••••••••••••${apiKey.last_four}`
                    }
                    readOnly
                    className="font-mono text-sm"
                  />
                  {showPlaintext && plaintextKey ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(plaintextKey)}
                        className="bg-primary-black text-white hover:bg-detail-gray"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={hidePlaintext}
                        className="bg-primary-black text-white hover:bg-detail-gray"
                      >
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(`${apiKey.prefix}••••••••••••••••${apiKey.last_four}`)}
                      className="bg-primary-black text-white hover:bg-detail-gray"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-detail-gray">Created</Label>
                  <p>{new Date(apiKey.created_at).toLocaleDateString()}</p>
                </div>
                {apiKey.rotated_at && (
                  <div>
                    <Label className="text-xs text-detail-gray">Last Rotated</Label>
                    <p>{new Date(apiKey.rotated_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      disabled={generating}
                      className="bg-primary-black text-white hover:bg-detail-gray"
                    >
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
                        className="bg-primary-black text-white hover:bg-detail-gray"
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
            <Alert>
              <AlertDescription>
                <strong>Important:</strong> This is the only time you'll see your API key in plain text.
                Make sure to copy and store it securely. Once you hide it, you'll only see the masked version.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
          <CardDescription>
            How to use your API key to authenticate requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium">cURL</Label>
            <div className="mt-1 p-3 bg-[#f9f9f9] rounded-md">
              <code className="text-sm">
                curl -X POST https://kfuuqxmaihlwhzfibhvj.supabase.co/functions/v1/verify-api-key \<br />
                &nbsp;&nbsp;-H "Authorization: Bearer YOUR_API_KEY"
              </code>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">JavaScript</Label>
            <div className="mt-1 p-3 bg-[#f9f9f9] rounded-md">
              <code className="text-sm">
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
        </CardContent>
      </Card>
    </div>
  )
}

export default ApiKeyManagement
