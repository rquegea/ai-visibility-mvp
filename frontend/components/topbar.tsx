"use client"

import { Button } from '@/components/ui/button'
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuLabel,
DropdownMenuSeparator,
DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Moon, Sun, User, LogOut, Settings, ChevronDown, Globe, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { useGlobalFilters } from '@/stores/use-global-filters'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function Topbar() {
const { theme, setTheme } = useTheme()
const router = useRouter()

const {
timeRange,
from,
to,
setTimeRange,
setCustomRange,
model,
setModel,
region,
setRegion,
advanced,
setAdvanced,
} = useGlobalFilters()

const [draftFrom, setDraftFrom] = useState(from ?? "")
const [draftTo, setDraftTo] = useState(to ?? "")

const pill = (active: boolean) =>
cn(
  "rounded-full border border-border px-4 py-1.5 text-sm transition-colors",
  active ? "bg-secondary text-foreground" : "bg-card hover:bg-muted"
)

const handleLogout = () => {
localStorage.removeItem('jwt')
router.push('/login')
}

return (
<header className="border-b bg-card px-6 py-4 min-h-[64px]">
<div className="flex items-center justify-between gap-x-4 gap-y-2 flex-wrap sm:flex-nowrap">
  {/* Left: Segmented time controls */}
  <div className="flex items-center gap-2 flex-wrap">
    <Button
      variant="ghost"
      className={pill(timeRange === '24h')}
      aria-pressed={timeRange === '24h'}
      onClick={() => setTimeRange('24h')}
    >
      Last 24 hours
    </Button>
    <Button
      variant="ghost"
      className={pill(timeRange === '7d')}
      aria-pressed={timeRange === '7d'}
      onClick={() => setTimeRange('7d')}
    >
      Last 7 days
    </Button>
    <Button
      variant="ghost"
      className={pill(timeRange === '30d')}
      aria-pressed={timeRange === '30d'}
      onClick={() => setTimeRange('30d')}
    >
      Last 30 days
    </Button>

    {/* Custom range dropdown */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={pill(timeRange === 'custom')}
          aria-pressed={timeRange === 'custom'}
        >
          {timeRange === 'custom'
            ? `Custom: ${from ?? '…'} – ${to ?? '…'}`
            : 'Custom range'}
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Presets</div>
        <DropdownMenuItem onClick={() => setTimeRange('24h')}>Last 24 hours</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTimeRange('7d')}>Last 7 days</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTimeRange('30d')}>Last 30 days</DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Custom</div>
        <div className="px-2 py-2 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">From</Label>
            <Input id="from" type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">To</Label>
            <Input id="to" type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setDraftFrom(''); setDraftTo(''); setCustomRange(undefined, undefined) }}
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={() => setCustomRange(draftFrom || undefined, draftTo || undefined)}
            >
              Apply
            </Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>

  {/* Right: Model / Region / Filter + theme + profile */}
  <div className="ml-auto flex items-center gap-2 flex-wrap sm:flex-nowrap">
    {/* Model */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-full border border-border bg-card hover:bg-muted px-4 py-2 text-sm transition-colors inline-flex items-center" variant="ghost">
          <Sparkles className="mr-2 h-4 w-4" />
          {model}
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {['All models', 'GPT-4o', 'Sonar 7-B', 'Claude 3.5'].map((m) => (
          <DropdownMenuItem key={m} onClick={() => setModel(m)}>
            {m}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Region */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-full border border-border bg-card hover:bg-muted px-4 py-2 text-sm transition-colors inline-flex items-center" variant="ghost">
          <Globe className="mr-2 h-4 w-4" />
          {region}
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {['Region', 'Global', 'US', 'EU', 'APAC'].map((r) => (
          <DropdownMenuItem key={r} onClick={() => setRegion(r)}>
            {r}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Advanced Filter */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-full border border-border bg-card hover:bg-muted px-4 py-2 text-sm transition-colors inline-flex items-center" variant="ghost">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filter
          <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Sentiment</div>
        {[
          { key: 'all', label: 'All' },
          { key: 'positive', label: 'Positive' },
          { key: 'neutral', label: 'Neutral' },
          { key: 'negative', label: 'Negative' },
        ].map((o) => (
          <DropdownMenuItem key={o.key} onClick={() => setAdvanced({ sentiment: o.key as any })}>
            <div className="flex items-center gap-2">
              <span className={cn(
                'size-3 rounded-full border',
                advanced.sentiment === o.key ? 'bg-foreground' : 'bg-background'
              )} />
              <span>{o.label}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Sources</div>
        <div className="px-2 py-2 space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={advanced.hideBots} onCheckedChange={(v) => setAdvanced({ hideBots: Boolean(v) })} />
            Hide bots
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={advanced.verifiedOnly} onCheckedChange={(v) => setAdvanced({ verifiedOnly: Boolean(v) })} />
            Verified sources only
          </label>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Theme toggle */}
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-full"
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>

    {/* Profile menu (unchanged functionality) */}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder-user.jpg" alt="User" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">John Doe</p>
            <p className="text-xs leading-none text-muted-foreground">
              john@example.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>
</header>
)
}
