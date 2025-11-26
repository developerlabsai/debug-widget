import { JSX } from 'preact';
import { cn } from '../../lib/utils';

export interface InputProps extends JSX.HTMLAttributes<HTMLInputElement> {}

export function Input({ class: className, ...props }: InputProps) {
  return (
    <input
      class={cn(
        'flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}
