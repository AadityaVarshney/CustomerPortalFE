import { cn, getInitials } from '@/lib/utils'

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
}

const COLOR_MAP = [
  'bg-violet-500/20 text-violet-400',
  'bg-blue-500/20 text-blue-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-amber-500/20 text-amber-400',
  'bg-rose-500/20 text-rose-400',
  'bg-cyan-500/20 text-cyan-400',
]

function getColorIndex(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return Math.abs(hash) % COLOR_MAP.length
}

export function UserAvatar({ user, size = 'md', className }) {
  const name = user?.name || user?.email || '?'
  const initials = getInitials(name)
  const colorClass = COLOR_MAP[getColorIndex(name)]
  const sizeClass = SIZE_MAP[size] ?? SIZE_MAP.md

  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={name}
        className={cn('rounded-full object-cover ring-2 ring-border', sizeClass, className)}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold ring-2 ring-border shrink-0',
        sizeClass,
        colorClass,
        className,
      )}
      title={name}
    >
      {initials}
    </span>
  )
}
