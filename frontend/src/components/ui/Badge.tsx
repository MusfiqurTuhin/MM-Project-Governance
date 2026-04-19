import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'info', className = '' }) => {
  const variants = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    error: 'bg-rose-500/10 border-rose-500/20 text-rose-500',
    info: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
  };

  return (
    <div className={`px-3 py-1 rounded-full text-[10px] font-black w-fit tracking-tighter border ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
};

export default Badge;
