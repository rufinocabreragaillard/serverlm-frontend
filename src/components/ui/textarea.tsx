'use client'

import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiqueta?: string
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, etiqueta, error, id, rows = 4, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {etiqueta && (
          <label htmlFor={id} className="text-sm font-medium text-texto">
            {etiqueta}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          className={cn(
            'w-full rounded-lg border border-borde bg-surface px-3 py-2 text-sm text-texto',
            'placeholder:text-texto-light',
            'focus:outline-none focus:ring-2 focus:ring-primario focus:border-primario',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'resize-y overflow-y-auto',
            error && 'border-error focus:ring-error',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
