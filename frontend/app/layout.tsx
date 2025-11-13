import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agent101',
  description: 'Next.js application with API endpoints',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

