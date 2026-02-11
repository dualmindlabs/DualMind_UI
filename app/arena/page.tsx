'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ArenaPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading arena...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="9" height="9" rx="1" fill="#577B87" />
              <rect x="12" width="9" height="9" rx="1" fill="#4AABC2" />
              <rect x="12" y="12" width="9" height="9" rx="1" fill="#CB9275" />
              <rect y="12" width="9" height="9" rx="1" fill="#FDF4CD" />
            </svg>
            <h1 className="font-semibold">DualMind Arena</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
              className="rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="mb-2 text-2xl font-bold text-foreground">Arena Coming Soon</h2>
            <p className="text-muted-foreground">
              The full arena interface with model battles, voting, and leaderboards is being built.
            </p>
            <div className="mt-8 grid gap-4 max-w-md">
              <div className="rounded-lg border border-border bg-card p-4 text-left">
                <div className="mb-2 font-semibold">Features in Development:</div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✓ Real-time model battles</li>
                  <li>✓ Blind voting system</li>
                  <li>✓ Live leaderboard</li>
                  <li>✓ Thread history & sharing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
