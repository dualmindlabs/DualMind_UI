'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    checkUser()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background via-background to-muted px-4">
        <div className="max-w-lg text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="9" height="9" rx="1" fill="#577B87" />
              <rect x="12" width="9" height="9" rx="1" fill="#4AABC2" />
              <rect x="12" y="12" width="9" height="9" rx="1" fill="#CB9275" />
              <rect y="12" width="9" height="9" rx="1" fill="#FDF4CD" />
            </svg>
          </div>

          <h1 className="mb-4 text-4xl font-bold text-foreground">DualMind Lab</h1>
          <p className="mb-8 text-lg text-muted-foreground">
            Compare AI models in real-time battles. Vote for your favorite responses and shape the leaderboard.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/auth/login"
              className="rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/sign-up"
              className="rounded-lg border border-primary bg-transparent px-8 py-3 font-semibold text-primary hover:bg-primary/10 transition-colors"
            >
              Sign Up
            </Link>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-card p-4">
              <div className="mb-2 text-2xl">⚔️</div>
              <h3 className="font-semibold">Battle</h3>
              <p className="text-sm text-muted-foreground">Compare two models</p>
            </div>
            <div className="rounded-lg bg-card p-4">
              <div className="mb-2 text-2xl">🏆</div>
              <h3 className="font-semibold">Vote</h3>
              <p className="text-sm text-muted-foreground">Pick the better response</p>
            </div>
            <div className="rounded-lg bg-card p-4">
              <div className="mb-2 text-2xl">📊</div>
              <h3 className="font-semibold">Rank</h3>
              <p className="text-sm text-muted-foreground">Check the leaderboard</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted">
      <div className="text-center">
        <h1 className="mb-4 text-3xl font-bold text-foreground">Welcome back, {user.email}</h1>
        <p className="mb-8 text-muted-foreground">Redirecting to arena...</p>
        <Link
          href="/arena"
          className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors inline-block"
        >
          Go to Arena
        </Link>
      </div>
    </div>
  )
}
