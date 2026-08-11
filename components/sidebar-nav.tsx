'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Ticket,
  Newspaper,
  ClipboardList,
  ScrollText,
  CalendarDays,
  Settings as SettingsIcon,
} from 'lucide-react'
import { TideMark } from '@/components/brand/tide-waves'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/advertisers', label: 'Advertisers', icon: Building2 },
  { href: '/bookings', label: 'Bookings', icon: Ticket },
  { href: '/issues', label: 'Issues', icon: Newspaper },
  { href: '/classifieds', label: 'Classifieds', icon: ScrollText },
  { href: '/events', label: 'Events', icon: CalendarDays },
  { href: '/survey', label: 'Reader survey', icon: ClipboardList },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
]

export function SidebarNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav className="flex flex-col gap-1" aria-label="Main">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? 'page' : undefined}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActive(href)
              ? 'bg-tide-800 text-foam'
              : 'text-tide-100/80 hover:bg-tide-800/60 hover:text-foam'
          )}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function SidebarBrand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-3 py-1">
      {/* The full logo is Sea Glass on transparent and would vanish against
          Deep Harbor, so the sidebar carries the wave mark instead. */}
      <TideMark />
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-bold text-foam">The Tide</span>
        <span className="text-xs text-tide-200">Ad Manager</span>
      </span>
    </Link>
  )
}
