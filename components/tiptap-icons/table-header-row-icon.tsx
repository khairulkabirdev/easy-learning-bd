import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableHeaderRowIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect x="4" y="5" width="16" height="14" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M4 10H20" stroke="currentColor" strokeWidth="2" />
      <path d="M4 5H20V10H4V5Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M10 5V19" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
})

TableHeaderRowIcon.displayName = "TableHeaderRowIcon"
