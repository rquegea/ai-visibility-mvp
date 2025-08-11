"use client"

import { ResponsiveContainer } from 'recharts'

interface ChartWrapperProps {
  children: React.ReactNode
  className?: string
}

export function ChartWrapper({ children, className }: ChartWrapperProps) {
  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}
