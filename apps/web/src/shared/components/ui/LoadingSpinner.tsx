import { cn } from '@/shared/utils/cn.ts';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fullPage?: boolean;
}

const sizes = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
};

export function LoadingSpinner({ size = 'md', className, fullPage }: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={cn(
        'rounded-full border-brand-500 border-t-transparent animate-spin',
        sizes[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        {spinner}
      </div>
    );
  }

  return spinner;
}

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-slate-500 dark:text-slate-400">Loading...</p>
    </div>
  );
}
