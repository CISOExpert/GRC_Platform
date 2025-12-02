// Module declarations (if needed)

declare module 'lucide-react' {
  import { FC, SVGProps } from 'react'

  export type LucideProps = SVGProps<SVGSVGElement> & {
    size?: number | string
    absoluteStrokeWidth?: boolean
  }

  export type LucideIcon = FC<LucideProps>

  // Navigation & UI
  export const ChevronDown: LucideIcon
  export const ChevronRight: LucideIcon
  export const ChevronLeft: LucideIcon
  export const ArrowLeft: LucideIcon
  export const Search: LucideIcon
  export const Filter: LucideIcon
  export const X: LucideIcon
  export const Save: LucideIcon
  export const Bookmark: LucideIcon

  // Data & Status
  export const Database: LucideIcon
  export const Network: LucideIcon

  // Alert/Security icons
  export const TriangleAlert: LucideIcon
  export const AlertTriangle: LucideIcon
  export const Shield: LucideIcon
  export const Zap: LucideIcon
  export const Cloud: LucideIcon
  export const Skull: LucideIcon
}