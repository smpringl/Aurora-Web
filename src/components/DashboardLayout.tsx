import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
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
    signOut().catch(() => {})
    localStorage.removeItem('sb-kfuuqxmaihlwhzfibhvj-auth-token')
    window.location.href = '/auth?mode=signin'
  }

  const navItems: { id: typeof activeTab; label: string; icon: typeof Home }[] = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'playground', label: 'Playground', icon: Play },
  ]

  const navItems2: { id: typeof activeTab; label: string; icon: typeof Home }[] = [
    { id: 'activity-logs', label: 'Activity Logs', icon: List },
    { id: 'usage', label: 'Usage', icon: BarChart3 },
    { id: 'api-key', label: 'API Key', icon: Key },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const renderNavButton = (item: { id: typeof activeTab; label: string; icon: typeof Home }) => {
    const Icon = item.icon
    const isActive = activeTab === item.id
    return (
      <button
        key={item.id}
        onClick={() => handleTabClick(item.id)}
        className={`w-full flex items-center ${isSidebarOpen ? 'px-3' : 'px-0 justify-center'} py-2.5 text-[13px] font-medium rounded-lg transition-colors ${
          isActive
            ? 'text-black bg-gray-50'
            : 'text-gray-500 hover:bg-gray-50 hover:text-black'
        }`}
        title={!isSidebarOpen ? item.label : ''}
      >
        <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-gray-400'} ${isSidebarOpen ? 'mr-3' : ''}`} />
        {isSidebarOpen && item.label}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Fixed Header */}
      <header className="bg-white h-[60px] border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
        <div className="flex h-full">
          <div className="w-[240px] flex items-center">
            <div className="px-4 flex items-center">
              <img src="/aurora-logo-black.png" alt="Aurora" className="h-7 w-auto" />
            </div>
          </div>
          <div className="flex-1 flex items-center justify-end px-6">
            <div className="flex items-center space-x-4">
              <span className="text-[13px] text-gray-500">{user?.email}</span>
              <Button
                size="sm"
                onClick={handleSignOut}
                variant="ghost"
                className="text-gray-500 hover:text-black hover:bg-gray-50 h-8"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content area */}
      <div className="flex pt-[60px] flex-1">
        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-[60px] h-[calc(100vh-60px)] bg-white border-r border-gray-200 transition-all duration-300 ease-in-out z-40 ${
            isSidebarOpen ? 'w-[240px]' : 'w-[64px]'
          }`}
        >
          <nav className="p-3 h-full flex flex-col overflow-y-auto">
            <div className="space-y-0.5 flex-1">
              {navItems.map(renderNavButton)}

              <div className="py-2">
                <div className="border-t border-gray-200" />
              </div>

              {navItems2.map(renderNavButton)}
            </div>

            {/* Collapse button */}
            <div className="pt-3 border-t border-gray-200">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={`w-full flex items-center ${isSidebarOpen ? 'px-3' : 'px-0 justify-center'} py-2.5 text-[13px] font-medium rounded-lg transition-colors text-gray-500 hover:bg-gray-50 hover:text-black`}
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

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'ml-[240px]' : 'ml-[64px]'
          } overflow-y-auto h-[calc(100vh-60px)]`}
        >
          <div className="max-w-[1200px] mx-auto px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
