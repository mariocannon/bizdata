import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'The Tide — Ad Manager',
  description: 'Advertising CRM, bookings and inventory for The Tide newsletter.',
}

/**
 * Root layout is deliberately bare — the sidebar chrome lives in the (app)
 * route group so the login screen renders on its own.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={inter.variable}>
      <body className="min-h-screen font-sans">
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{ className: 'text-sm' }}
          richColors
          closeButton
        />
      </body>
    </html>
  )
}
