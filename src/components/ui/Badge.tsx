import { cn } from '@/lib/utils/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'gray'
  className?: string
}

const variants = {
  default: 'bg-slate-100 text-slate-700',
  blue:    'bg-blue-50 text-blue-700',
  green:   'bg-green-50 text-green-700',
  yellow:  'bg-yellow-50 text-yellow-700',
  orange:  'bg-orange-50 text-orange-700',
  red:     'bg-red-50 text-red-700',
  purple:  'bg-purple-50 text-purple-700',
  gray:    'bg-gray-100 text-gray-600',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}
