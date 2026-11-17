import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'electric';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]';

    const variants = {
      primary:
        'bg-[#0B1E3F] text-white hover:bg-[#142C4C] focus:ring-[#2563EB] active:bg-[#07152B] shadow-sm',
      electric:
        'bg-[#2563EB] text-white hover:bg-[#1D4ED8] focus:ring-[#2563EB] active:bg-[#1E40AF] shadow-sm',
      secondary:
        'bg-[#F5F7FB] text-[#0B1E3F] border border-[#E2E8F0] hover:bg-[#EAF2FF] hover:border-[#BFDBFE] focus:ring-[#2563EB] active:bg-[#DBEAFE]',
      outline:
        'border border-[#E2E8F0] bg-white text-[#17243A] hover:bg-[#F5F7FB] hover:border-[#CBD5E1] focus:ring-[#2563EB]',
      danger:
        'bg-[#DC4545] text-white hover:bg-[#B91C1C] focus:ring-[#DC4545] shadow-sm',
      ghost:
        'bg-transparent text-[#17243A] hover:bg-[#EAF2FF] hover:text-[#0B1E3F] focus:ring-[#2563EB]',
    };

    const sizes = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
