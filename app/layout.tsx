import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'The Tide — Ad Manager',
  description: 'Advertising CRM, bookings and inventory for The Tide newsletter.',
  icons: { icon: '/brand/tide-logo.webp' },
}

/**
 * Sand is the brand's ground colour, so the browser chrome matches the page.
 */
export const viewport: Viewport = {
  themeColor: '#f0e7d6',
}

/**
 * Root layout is deliberately bare — the sidebar chrome lives in the (app)
 * route group so the login screen renders on its own.
 *
 * No web font is loaded here on purpose: The Tide runs on the reader's own
 * system UI stack (docs/BRANDING.md §3). The stack itself lives in
 * `--font-sans` in globals.css.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ">
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
