import type { ReactNode } from 'react'
import '../src/index.css'

type LayoutProps = {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return children
}
