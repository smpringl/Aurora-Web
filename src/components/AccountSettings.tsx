import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { supabase } from '@/integrations/supabase/client'
import { showSuccess, showError } from '@/utils/toast'
import { Mail } from 'lucide-react'

const AccountSettings = () => {
  const { user } = useAuth()
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      showError('Password must be at least 6 characters')
      return
    }

    setIsChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        showError('Error updating password')
      } else {
        showSuccess('Password updated successfully')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch {
      showError('Error updating password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      showError('Account deletion is not implemented yet. Please contact support.')
    } catch {
      showError('Error deleting account')
    }
  }

  const isEmailAuth = user?.app_metadata?.provider === 'email'
  const connectedProviders = user?.app_metadata?.providers || []

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your basic account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="mt-1"
            />
          </div>
          <div>
            <Label>Account Created</Label>
            <p className="text-sm text-gray-600 mt-1">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </CardContent>
      </Card>

      {isEmailAuth && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handlePasswordChange}
              disabled={isChangingPassword || !newPassword || !confirmPassword}
              className="bg-primary-black text-white hover:bg-detail-gray"
            >
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your connected social accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <h4 className="font-medium">Email</h4>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
            <span className="text-sm text-green-600">Connected</span>
          </div>

          {connectedProviders.includes('google') && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">G</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Google</h4>
                    <p className="text-sm text-gray-600">Connected</p>
                  </div>
                </div>
                <span className="text-sm text-green-600">Connected</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your
                  account and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
                  Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

export default AccountSettings
