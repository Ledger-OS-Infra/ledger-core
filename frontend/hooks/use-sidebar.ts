'use client'

import { useContext } from 'react'
import { SidebarContext } from '@/components/sidebar'

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within Sidebar component')
  }
  return context
}
