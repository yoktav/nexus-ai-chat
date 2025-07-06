'use client';

interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingDots({ size = 'md', className = '' }: LoadingDotsProps) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  const dotSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className={`${dotSize} bg-muted-foreground rounded-full animate-bounce`}></div>
      <div className={`${dotSize} bg-muted-foreground rounded-full animate-bounce`} style={{ animationDelay: '0.1s' }}></div>
      <div className={`${dotSize} bg-muted-foreground rounded-full animate-bounce`} style={{ animationDelay: '0.2s' }}></div>
    </div>
  );
}