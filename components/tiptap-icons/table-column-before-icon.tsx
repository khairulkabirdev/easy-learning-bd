import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableColumnBeforeIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path d="M4 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6.5 9.5L4 12L6.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="4" width="10" height="16" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M10 10H20" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
})

TableColumnBeforeIcon.displayName = "TableColumnBeforeIcon"
