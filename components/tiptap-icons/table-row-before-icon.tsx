import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableRowBeforeIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <path d="M12 4V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9.5 6.5L12 4L14.5 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="10" width="16" height="10" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M10 10V20" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
})

TableRowBeforeIcon.displayName = "TableRowBeforeIcon"
