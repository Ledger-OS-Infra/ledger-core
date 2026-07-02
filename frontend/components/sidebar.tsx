'use client'

import { createContext, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  MdDashboard,
  MdPeople,
  MdDescription,
  MdTrendingUp,
  MdTune,
  MdBarChart,
  MdSettings,
  MdChevronLeft,
  MdChevronRight,
  MdDarkMode,
  MdLightMode,
} from 'react-icons/md'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'

export interface SidebarContextType {
  isExpanded: boolean
  toggleExpanded: () => void
}

export const SidebarContext = createContext<SidebarContextType | null>(null)

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: MdDashboard },
  { label: 'Customers', href: '/customers', icon: MdPeople },
  { label: 'Obligations', href: '/obligations', icon: MdDescription },
  { label: 'Transactions', href: '/transactions', icon: MdTrendingUp },
  { label: 'Billing Rules', href: '/billing-rules', icon: MdTune },
  { label: 'Reports', href: '/reports', icon: MdBarChart },
  { label: 'Settings', href: '/settings', icon: MdSettings },
]

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true)
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()

  const toggleExpanded = () => setIsExpanded(!isExpanded)

  return (
    <SidebarContext.Provider value={{ isExpanded, toggleExpanded }}>
      <aside
        className={cn(
          'flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200',
          isExpanded ? 'w-60' : 'w-14'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
          {isExpanded && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                L
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Ledger</span>
                <div className="sidebar-logo-dot" />
              </div>
            </div>
          )}
          <button
            onClick={toggleExpanded}
            className="ml-auto p-1 hover:bg-sidebar-accent rounded transition-colors"
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <MdChevronLeft className="h-5 w-5" />
            ) : (
              <MdChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname?.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors sidebar-nav-item',
                  isActive && 'sidebar-nav-item-active',
                  !isExpanded && 'sidebar-nav-item-collapsed',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground'
                )}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {isExpanded && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border space-y-2 px-2 py-4">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 rounded px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
            title={isExpanded ? undefined : theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <MdDarkMode className="h-5 w-5 flex-shrink-0" />
            ) : (
              <MdLightMode className="h-5 w-5 flex-shrink-0" />
            )}
            {isExpanded && (
              <span className="capitalize">{theme === 'dark' ? 'dark' : 'light'}</span>
            )}
          </button>
        </div>
      </aside>
    </SidebarContext.Provider>
  )
}
