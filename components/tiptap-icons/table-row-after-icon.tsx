import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableRowAfterIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect x="4" y="4" width="16" height="10" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M10 4V14" stroke="currentColor" strokeWidth="2" />
      <path d="M12 20V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9.5 17.5L12 20L14.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
})

TableRowAfterIcon.displayName = "TableRowAfterIcon"
