import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const base =
    'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors';

  const variants: Record<string, string> = {
    default: 'bg-zinc-50 text-zinc-900',
    secondary: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    outline: 'border border-zinc-700 text-zinc-300',
    destructive: 'bg-red-900/50 text-red-300 border border-red-800',
  };

  return <div className={cn(base, variants[variant], className)} {...props} />;
}
