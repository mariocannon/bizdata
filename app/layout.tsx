import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { SidebarNav, SidebarBrand } from '@/components/sidebar-nav'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'The Tide — Ad Manager',
  description: 'Advertising CRM, bookings and inventory for The Tide newsletter.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="shrink-0 border-b border-tide-800 bg-tide-900 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r">
            <div className="flex flex-col gap-6 p-4 lg:h-full">
              <SidebarBrand />
              <SidebarNav />
            </div>
          </aside>

          <main className="min-w-0 flex-1">
            <div className="page-shell">{children}</div>
          </main>
        </div>

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
