import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableSplitIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect x="4" y="6" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6V18" stroke="currentColor" strokeWidth="2" />
      <path d="M10 12H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
})

TableSplitIcon.displayName = "TableSplitIcon"
