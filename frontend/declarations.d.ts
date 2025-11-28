// Module declarations (if needed)

declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'
  
  export type LucideProps = SVGProps<SVGSVGElement> & {
    size?: number | string
    absoluteStrokeWidth?: boolean
  }
  
  export type LucideIcon = FC<LucideProps>
  
  export const ChevronDown: LucideIcon
  export const Search: LucideIcon
  export const Filter: LucideIcon
  export const X: LucideIcon
  export const ChevronRight: LucideIcon
  export const Database: LucideIcon
  export const Save: LucideIcon
  export const Bookmark: LucideIcon
  export const TriangleAlert: LucideIcon
  export const Network: LucideIcon
}