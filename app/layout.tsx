import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Ashton's Finance Dashboard",
  description: 'Personal finance tracker — safe-to-spend, projections, AI coach',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
