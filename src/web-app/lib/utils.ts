import { twMerge } from 'tailwind-merge';

export function cn(...inputs: unknown[]) {
  return twMerge(inputs.flat(Infinity).filter(Boolean).join(' '));
}
