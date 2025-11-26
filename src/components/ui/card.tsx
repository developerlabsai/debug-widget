import { JSX, ComponentChildren } from 'preact';
import { cn } from '../../lib/utils';

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: ComponentChildren;
}

export function Card({ class: className, children, ...props }: CardProps) {
  return (
    <div
      class={cn(
        'rounded-lg border border-gray-200 bg-white shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ class: className, children, ...props }: CardProps) {
  return (
    <div class={cn('flex flex-col space-y-1.5 p-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ class: className, children, ...props }: CardProps) {
  return (
    <h3
      class={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ class: className, children, ...props }: CardProps) {
  return (
    <div class={cn('p-4 pt-0', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ class: className, children, ...props }: CardProps) {
  return (
    <div class={cn('flex items-center p-4 pt-0', className)} {...props}>
      {children}
    </div>
  );
}
