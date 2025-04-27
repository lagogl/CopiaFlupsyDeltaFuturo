import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    value: number;
    max?: number;
    showValue?: boolean;
  }
>(({ className, value, max = 100, showValue = false, ...props }, ref) => {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 transition-all bg-primary"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
    </ProgressPrimitive.Root>
  )
}
)
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }