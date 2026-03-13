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

type Tab = 'overview' | 'playground' | 'activity-logs' | 'usage' | 'api-key' | 'settings'

const VALID_TABS: Tab[] = ['overview', 'playground', 'activity-logs', 'usage', 'api-key', 'settings']

function getTabFromHash(): Tab {
  const hash = window.location.hash.replace('#', '')
  return VALID_TABS.includes(hash as Tab) ? (hash as Tab) : 'overview'
}

const Dashboard = () => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>(getTabFromHash)

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    window.location.hash = tab
  }

  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-[13px] text-gray-500">Loading...</p>
          <button
            onClick={() => {
              localStorage.removeItem('sb-kfuuqxmaihlwhzfibhvj-auth-token')
              window.location.href = '/auth?mode=signin'
            }}
            className="mt-6 text-[13px] text-gray-400 hover:text-black underline"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
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
