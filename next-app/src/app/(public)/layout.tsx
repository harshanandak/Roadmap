/**
 * Public Layout
 *
 * Minimal layout for public-facing pages (no authentication required):
 * - Feedback submission pages
 * - Embeddable widget pages
 * - Public voting pages
 *
 * No sidebar, no header - just a clean, focused experience.
 */

import { Toaster } from '@/components/ui/toaster'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Simple centered container */}
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        {children}
      </main>

      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}
