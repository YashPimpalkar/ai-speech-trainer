import type { ButtonHTMLAttributes, ReactNode } from 'react'

export const Button = ({ variant = 'solid', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' }) => (
  <button
    {...p}
    className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
      variant === 'solid'
        ? 'bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200'
        : 'border border-black/30 hover:bg-black/5 dark:border-white/30 dark:hover:bg-white/10'
    } ${className}`}
  />
)

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-black/15 p-5 dark:border-white/15 ${className}`}>{children}</div>
)

export const Field = 'w-full rounded-xl border border-black/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/20 dark:focus:border-white'

export const ErrorMsg = ({ text }: { text: string }) =>
  text ? <p role="alert" className="mt-3 rounded-lg border border-black/40 px-3 py-2 text-sm dark:border-white/40">⚠ {text}</p> : null

export const Label = ({ children }: { children: ReactNode }) => (
  <span className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">{children}</span>
)
