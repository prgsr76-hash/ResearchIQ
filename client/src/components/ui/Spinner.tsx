interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export default function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div
        className={`absolute inset-0 rounded-full border-2 border-primary/20`}
      />
      <div
        className={`absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin`}
      />
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="lg" />
        <p className="text-text-muted text-sm animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
