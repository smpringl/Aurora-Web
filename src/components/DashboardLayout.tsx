import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Home, Play, List, BarChart3, Key, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface DashboardLayoutProps {
  children: ReactNode
  activeTab: 'overview' | 'playground' | 'activity-logs' | 'usage' | 'api-key' | 'settings'
  onTabChange: (tab: 'overview' | 'playground' | 'activity-logs' | 'usage' | 'api-key' | 'settings') => void
}

const DashboardLayout = ({ children, activeTab, onTabChange }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const handleTabClick = (tab: 'overview' | 'playground' | 'activity-logs' | 'usage' | 'api-key' | 'settings') => {
    if (!isSidebarOpen) {
      setIsSidebarOpen(true)
    }
    onTabChange(tab)
  }

  const handleSignOut = () => {
    // Fire and forget — don't await, redirect immediately
    signOut().catch(() => {})
    // Clear local storage as fallback and redirect
    localStorage.removeItem('sb-kfuuqxmaihlwhzfibhvj-auth-token')
    window.location.href = '/auth?mode=signin'
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col">
      {/* Fixed Header */}
      <header className="bg-white h-[73px] border-b border-detail-light fixed top-0 left-0 right-0 z-50">
        <div className="flex h-full">
          {/* Left section - static width matching expanded sidebar */}
          <div className="w-[280px] flex items-center">
            <div className="px-4 flex items-center">
              <img
                src="/aurora-logo-black.png"
                alt="Aurora"
                className="h-8 w-auto"
              />
              <span className="ml-4 text-sm text-detail-gray font-sans">Dashboard</span>
            </div>
          </div>

          {/* Right section */}
          <div className="flex-1 flex items-center justify-end px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-detail-gray font-sans">{user?.email}</span>
              <Button
                size="sm"
                onClick={handleSignOut}
                className="bg-primary-black text-white hover:bg-detail-gray font-heading"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content area with sidebar and main content */}
      <div className="flex pt-[73px] flex-1">
        {/* Fixed Sidebar */}
        <aside
          className={`fixed left-0 top-[73px] h-[calc(100vh-73px)] bg-white border-r border-detail-light transition-all duration-300 ease-in-out z-40 ${
            isSidebarOpen ? 'w-[280px]' : 'w-[72px]'
          }`}
        >
          <nav className="p-4 h-full flex flex-col overflow-y-auto">
            <div className="space-y-1 flex-1">
              <button
                onClick={() => handleTabClick('overview')}
                className={`w-full flex items-center ${isSidebarOpen ? 'px-4' : 'px-0 justify-center'} py-3 text-sm font-heading rounded-lg transition-colors ${
                  activeTab === 'overview'
                    ? 'text-primary-black font-bold bg-[#f8f8f8]'
                    : 'text-detail-gray hover:bg-[#f8f8f8] hover:text-primary-black'
                }`}
                title={!isSidebarOpen ? 'Overview' : ''}
              >
                <Home className={`w-4 h-4 ${isSidebarOpen ? 'mr-3' : ''}`} />
                {isSidebarOpen && 'Overview'}
              </button>

              <button
                onClick={() => handleTabClick('playground')}
                className={`w-full flex items-center ${isSidebarOpen ? 'px-4' : 'px-0 justify-center'} py-3 text-sm font-heading rounded-lg transition-colors ${
                  activeTab === 'playground'
                    ? 'text-primary-black font-bold bg-[#f8f8f8]'
                    : 'text-detail-gray hover:bg-[#f8f8f8] hover:text-primary-black'
                }`}
                title={!isSidebarOpen ? 'Playground' : ''}
              >
                <Play className={`w-4 h-4 ${isSidebarOpen ? 'mr-3' : ''}`} />
                {isSidebarOpen && 'Playground'}
              </button>

              {/* Divider */}
              <div className="py-2">
                <Separator className="bg-detail-light" />
              </div>

              <button
                onClick={() => handleTabClick('activity-logs')}
                className={`w-full flex items-center ${isSidebarOpen ? 'px-4' : 'px-0 justify-center'} py-3 text-sm font-heading rounded-lg transition-colors ${
                  activeTab === 'activity-logs'
                    ? 'text-primary-black font-bold bg-[#f8f8f8]'
                    : 'text-detail-gray hover:bg-[#f8f8f8] hover:text-primary-black'
                }`}
                title={!isSidebarOpen ? 'Activity Logs' : ''}
              >
                <List className={`w-4 h-4 ${isSidebarOpen ? 'mr-3' : ''}`} />
                {isSidebarOpen && 'Activity Logs'}
              </button>

              <button
                onClick={() => handleTabClick('usage')}
                className={`w-full flex items-center ${isSidebarOpen ? 'px-4' : 'px-0 justify-center'} py-3 text-sm font-heading rounded-lg transition-colors ${
                  activeTab === 'usage'
                    ? 'text-primary-black font-bold bg-[#f8f8f8]'
                    : 'text-detail-gray hover:bg-[#f8f8f8] hover:text-primary-black'
                }`}
                title={!isSidebarOpen ? 'Usage' : ''}
              >
                <BarChart3 className={`w-4 h-4 ${isSidebarOpen ? 'mr-3' : ''}`} />
                {isSidebarOpen && 'Usage'}
              </button>

              <button
                onClick={() => handleTabClick('api-key')}
                className={`w-full flex items-center ${isSidebarOpen ? 'px-4' : 'px-0 justify-center'} py-3 text-sm font-heading rounded-lg transition-colors ${
                  activeTab === 'api-key'
                    ? 'text-primary-black font-bold bg-[#f8f8f8]'
                    : 'text-detail-gray hover:bg-[#f8f8f8] hover:text-primary-black'
                }`}
                title={!isSidebarOpen ? 'API Key' : ''}
              >
                <Key className={`w-4 h-4 ${isSidebarOpen ? 'mr-3' : ''}`} />
                {isSidebarOpen && 'API Key'}
              </button>

              <button
                onClick={() => handleTabClick('settings')}
                className={`w-full flex items-center ${isSidebarOpen ? 'px-4' : 'px-0 justify-center'} py-3 text-sm font-heading rounded-lg transition-colors ${
                  activeTab === 'settings'
                    ? 'text-primary-black font-bold bg-[#f8f8f8]'
                    : 'text-detail-gray hover:bg-[#f8f8f8] hover:text-primary-black'
                }`}
                title={!isSidebarOpen ? 'Settings' : ''}
              >
                <Settings className={`w-4 h-4 ${isSidebarOpen ? 'mr-3' : ''}`} />
                {isSidebarOpen && 'Settings'}
              </button>
            </div>

            {/* Collapse/Expand Button at Bottom */}
            <div className="pt-4 border-t border-detail-light">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`w-full flex items-center ${isSidebarOpen ? 'px-4' : 'px-0 justify-center'} py-3 text-sm font-heading rounded-lg transition-colors text-detail-gray hover:bg-[#f8f8f8] hover:text-primary-black`}
                title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {isSidebarOpen ? (
                  <>
                    <ChevronLeft className="w-4 h-4 mr-3" />
                    Collapse
                  </>
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </nav>
        </aside>

        {/* Scrollable Main Content */}
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'ml-[280px]' : 'ml-[72px]'
          } overflow-y-auto h-[calc(100vh-73px)]`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
