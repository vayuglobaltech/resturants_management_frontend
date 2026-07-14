import * as React from "react"

import { cn } from "@/lib/utils"

type InputProps = React.ComponentProps<"input"> & {
  label?: string
  description?: string
  error?: string
  wrapperClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type, label, description, error, id, wrapperClassName, ...props },
  ref
) {
  const inputId = id ?? props.name

  return (
    <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
      {label ? (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-muted-foreground"
        >
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        type={type}
        data-slot="input"
        className={cn(
          "h-10 w-full min-w-0 rounded-xl border border-border/70 bg-background/80 px-3.5 py-2.5 text-sm text-foreground shadow-sm transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          error && "border-red-500/60 focus:border-red-500 focus:ring-red-500/20",
          className
        )}
        {...props}
      />
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  )
})

export { Input }
