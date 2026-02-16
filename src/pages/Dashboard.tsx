import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import Overview from '@/components/Overview'
import Playground from '@/components/Playground'
import ActivityLogs from '@/components/ActivityLogs'
import Usage from '@/components/Usage'
import AccountSettings from '@/components/AccountSettings'
import ApiKeyManagement from '@/components/ApiKeyManagement'

const Dashboard = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'playground' | 'activity-logs' | 'usage' | 'api-key' | 'settings'>('overview')

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'overview' && <Overview />}
      {activeTab === 'playground' && <Playground />}
      {activeTab === 'activity-logs' && <ActivityLogs />}
      {activeTab === 'usage' && <Usage />}
      {activeTab === 'api-key' && <ApiKeyManagement />}
      {activeTab === 'settings' && <AccountSettings />}
    </DashboardLayout>
  )
}

export default Dashboard
