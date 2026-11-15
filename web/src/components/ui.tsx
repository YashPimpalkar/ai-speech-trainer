import type { ButtonHTMLAttributes, ReactNode } from 'react'

export const Button = ({ variant = 'solid', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' }) => (
  <button
    {...p}
    className={`rounded-full px-4 py-2 text-sm font-medium transition max-sm:min-h-10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
      variant === 'solid'
        ? 'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200'
        : 'border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10'
    } ${className}`}
  />
)

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-neutral-900/60 ${className}`}>{children}</div>
)

export const Field = 'w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 text-base outline-none focus:border-blue-500 dark:border-white/20 dark:focus:border-blue-400 sm:text-sm'

export const ErrorMsg = ({ text }: { text: string }) =>
  text ? <p role="alert" className="mt-3 rounded-lg border border-black/40 px-3 py-2 text-sm dark:border-white/40">⚠ {text}</p> : null

/** Small mono, uppercase section label used across the design. */
export const Label = ({ children }: { children: ReactNode }) => (
  <span className="mb-1 block font-mono text-[11px] uppercase tracking-widest text-neutral-500">{children}</span>
)

/** Blue-tinted pill for coach/model badges (the design's one accent colour). */
export const Badge = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400">{children}</span>
)

export const PageHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="mb-6">
    <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
    <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
  </div>
)

/** Colours for <option>/<optgroup>: native dropdown popups don't always follow the page theme. */
export const optionCls = 'bg-white text-black dark:bg-black dark:text-white'
