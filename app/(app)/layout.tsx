import { SidebarNav, SidebarBrand } from '@/components/sidebar-nav'
import { SignOutButton } from '@/components/sign-out-button'
import { gateMode } from '@/lib/auth'

/** The app shell: sidebar nav plus the content area. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="shrink-0 border-b border-tide-800 bg-tide-900 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex flex-col gap-6 p-4 lg:h-full">
          <SidebarBrand />
          <SidebarNav />
          {gateMode() === 'enabled' ? (
            <div className="mt-auto hidden lg:block">
              <SignOutButton />
            </div>
          ) : null}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="page-shell">{children}</div>
      </main>
    </div>
  )
}
