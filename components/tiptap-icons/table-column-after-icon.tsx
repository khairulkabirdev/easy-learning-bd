import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableColumnAfterIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect x="4" y="4" width="10" height="16" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M4 10H14" stroke="currentColor" strokeWidth="2" />
      <path d="M20 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17.5 9.5L20 12L17.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
})

TableColumnAfterIcon.displayName = "TableColumnAfterIcon"
