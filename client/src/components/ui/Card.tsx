import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'forest' | 'gold' | 'outline';
}

export function Card({ children, className = '', padding = 'md', variant = 'default' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  const variants = {
    default: 'bg-white border border-zinc-200 shadow-sm',
    forest: 'bg-gradient-to-br from-forest-800 to-forest-900 border border-forest-700/30 text-white shadow-lg',
    gold: 'bg-gradient-to-br from-gold-100 to-gold-200 border border-gold-300 text-forest-900 shadow-sm',
    outline: 'bg-transparent border border-zinc-200',
  };

  return (
    <div className={`rounded-2xl ${variants[variant]} ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex items-center justify-between mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`text-sm font-semibold tracking-wide uppercase ${className}`}>{children}</h3>;
}
