import { memo } from "react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableMergeIcon = memo(({ className, ...props }: SvgProps) => {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} {...props}>
      <rect x="4" y="6" width="6" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="6" width="6" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M10 12H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 10L14 12L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 10L10 12L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
})

TableMergeIcon.displayName = "TableMergeIcon"
