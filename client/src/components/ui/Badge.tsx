import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'forest' | 'gold' | 'red' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    forest: 'bg-forest-50 text-forest-800 border-forest-200',
    gold: 'bg-gold-100 text-forest-800 border-gold-300',
    red: 'bg-red-50 text-red-700 border-red-200',
    outline: 'bg-transparent border-zinc-300 text-zinc-600',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
