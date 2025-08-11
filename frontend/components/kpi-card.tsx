import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  className?: string
}

export function KpiCard({ title, value, change, icon: Icon, className }: KpiCardProps) {
  const isPositive = change && change > 0
  const isNegative = change && change < 0

  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={cn(
            "text-xs",
            isPositive && "text-green-600",
            isNegative && "text-red-600",
            !isPositive && !isNegative && "text-muted-foreground"
          )}>
            {change > 0 && "+"}
            {change}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  )
}
