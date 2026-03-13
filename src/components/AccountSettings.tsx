import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
      {/* Account Information */}
      <div className="border border-gray-200 rounded-xl p-8 bg-white">
        <h3 className="text-xl font-semibold tracking-[-0.01em] text-gray-900 mb-1">Account Information</h3>
        <p className="text-[13px] text-gray-500 mb-6">Your basic account details</p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-[13px] text-gray-500">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="mt-1 bg-gray-50 border-gray-200"
            />
          </div>
          <div>
            <Label className="text-[13px] text-gray-500">Account Created</Label>
            <p className="text-sm text-gray-900 mt-1">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Change Password */}
      {isEmailAuth && (
        <div className="border border-gray-200 rounded-xl p-8 bg-white">
          <h3 className="text-xl font-semibold tracking-[-0.01em] text-gray-900 mb-1">Change Password</h3>
          <p className="text-[13px] text-gray-500 mb-6">Update your account password</p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password" className="text-[13px] text-gray-500">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 border-gray-200"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-[13px] text-gray-500">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 border-gray-200"
              />
            </div>
            <Button
              onClick={handlePasswordChange}
              disabled={isChangingPassword || !newPassword || !confirmPassword}
              className="bg-black text-white hover:bg-gray-800"
            >
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </div>
      )}

      {/* Connected Accounts */}
      <div className="border border-gray-200 rounded-xl p-8 bg-white">
        <h3 className="text-xl font-semibold tracking-[-0.01em] text-gray-900 mb-1">Connected Accounts</h3>
        <p className="text-[13px] text-gray-500 mb-6">Manage your connected social accounts</p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Email</h4>
                <p className="text-[13px] text-gray-500">{user?.email}</p>
              </div>
            </div>
            <span className="text-[12px] font-medium text-gray-900">Connected</span>
          </div>

          {connectedProviders.includes('google') && (
            <>
              <div className="border-t border-gray-200" />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-semibold">G</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Google</h4>
                    <p className="text-[13px] text-gray-500">Connected</p>
                  </div>
                </div>
                <span className="text-[12px] font-medium text-gray-900">Connected</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-gray-200 rounded-xl p-8 bg-white">
        <h3 className="text-xl font-semibold tracking-[-0.01em] text-gray-900 mb-1">Danger Zone</h3>
        <p className="text-[13px] text-gray-500 mb-6">Irreversible and destructive actions</p>

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
      </div>
    </div>
  )
}

export default AccountSettings
