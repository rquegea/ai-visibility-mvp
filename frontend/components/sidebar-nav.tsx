"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Home, MessageSquare, Lightbulb, AlertTriangle, SettingsIcon, ChevronLeft, ChevronRight, BarChart3, Wrench } from 'lucide-react'

interface SidebarNavProps {
collapsed: boolean
onToggle: () => void
}

const NAV_ITEMS = [
{ label: "Home", icon: Home, href: "/" },
{ label: "Mentions", icon: MessageSquare, href: "/mentions" },
{ label: "Insights", icon: Lightbulb, href: "/insights" },
{ label: "Alerts", icon: AlertTriangle, href: "/alerts" },
{ label: "Industry", icon: BarChart3, href: "/industry" }, // updated
{ label: "Improve", icon: Wrench, href: "/improve" },       // updated
] as const

export function SidebarNav({ collapsed, onToggle }: SidebarNavProps) {
const pathname = usePathname()

const renderItem = (item: { label: string; href: string; icon: any }) => {
  const isActive = pathname === item.href
  const Icon = item.icon
  return (
    <Link key={item.label} href={item.href}>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn('w-full justify-start', collapsed && 'px-2')}
      >
        <Icon className="w-4 h-4" />
        {!collapsed && <span className="ml-2">{item.label}</span>}
      </Button>
    </Link>
  )
}

return (
  <div
    className={cn(
      'flex flex-col h-full bg-card border-r transition-all duration-300',
      collapsed ? 'w-16' : 'w-[260px]'
    )}
  >
    {/* Header */}
    <div className="flex items-center justify-between p-4 border-b min-h-[64px]">
      {!collapsed && (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold">Lotus Biscoff
</span>
        </div>
      )}
      <Button variant="ghost" size="sm" onClick={onToggle} className="ml-auto">
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </Button>
    </div>

    {/* Main nav (scrollable area) */}
    <nav className="flex-1 p-4 space-y-2">
      {/* Home */}
      {renderItem(NAV_ITEMS[0])}

      {/* Metrics section */}
      {!collapsed && (
        <div className="px-2 pt-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Metrics
        </div>
      )}
      {NAV_ITEMS.slice(1).map(renderItem)}
    </nav>

    {/* Footer: Settings at the bottom */}
    <div className="p-4 border-t">
      <Link href="/settings">
        <Button
          variant={pathname === '/settings' ? 'secondary' : 'ghost'}
          className={cn('w-full justify-start', collapsed && 'px-2')}
        >
          <SettingsIcon className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Settings</span>}
        </Button>
      </Link>
    </div>
  </div>
)
}
