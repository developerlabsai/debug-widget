import { JSX } from 'preact';
import { cn } from '../../lib/utils';

export interface TextareaProps extends JSX.HTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ class: className, ...props }: TextareaProps) {
  return (
    <textarea
      class={cn(
        'flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none',
        className
      )}
      {...props}
    />
  );
}
