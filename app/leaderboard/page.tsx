"use client"

import { useEffect, useState, useCallback } from "react"
import { ArrowLeft, Trophy, Medal, TrendingUp, Users } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/use-auth"
import * as apiClient from "@/lib/api-client"
import type { LeaderboardEntry } from "@/lib/types"
import { prettifyModelName, cn } from "@/lib/utils"

export default function LeaderboardPage() {
  const { getToken } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<
    "eloRating" | "wins" | "totalVotes" | "winRate"
  >("eloRating")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  const fetchLeaderboard = useCallback(async () => {
    try {
      const token = await getToken()
      const data = await apiClient.getLeaderboard(token)
      setEntries(
        data.map((e) => ({
          ...e,
          winRate:
            e.totalVotes > 0
              ? Math.round((e.wins / e.totalVotes) * 100)
              : 0,
        }))
      )
    } catch (err) {
      console.error("Failed to load leaderboard:", err)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  const sorted = [...entries].sort((a, b) => {
    const aVal = a[sortField] ?? 0
    const bVal = b[sortField] ?? 0
    return sortDir === "desc" ? Number(bVal) - Number(aVal) : Number(aVal) - Number(bVal)
  })

  const totalVotes = entries.reduce((sum, e) => sum + (e.totalVotes || 0), 0)
  const totalModels = entries.length

  function handleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  function getRankBadge(index: number) {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-400" />
    if (index === 1) return <Medal className="h-4 w-4 text-gray-300" />
    if (index === 2) return <Medal className="h-4 w-4 text-amber-600" />
    return (
      <span className="text-xs text-muted-foreground">{index + 1}</span>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Model Leaderboard</h1>
            <p className="text-xs text-muted-foreground">
              ELO rankings based on community votes
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Stats cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label="Total Votes"
            value={totalVotes.toLocaleString()}
          />
          <StatCard
            icon={<Trophy className="h-5 w-5 text-yellow-400" />}
            label="Active Models"
            value={String(totalModels)}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-green-400" />}
            label="Top ELO"
            value={
              sorted[0]
                ? Math.round(sorted[0].eloRating).toLocaleString()
                : "-"
            }
          />
          <StatCard
            icon={<Medal className="h-5 w-5 text-orange-400" />}
            label="Top Model"
            value={
              sorted[0]
                ? prettifyModelName(sorted[0].modelName).split(" ").slice(0, 2).join(" ")
                : "-"
            }
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-line h-12 rounded-xl"
              />
            ))}
          </div>
        ) : (
          <div className="glass-panel overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-left">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Model
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("eloRating")}
                    >
                      ELO{" "}
                      {sortField === "eloRating" &&
                        (sortDir === "desc" ? "\u2193" : "\u2191")}
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort("wins")}
                    >
                      Wins{" "}
                      {sortField === "wins" &&
                        (sortDir === "desc" ? "\u2193" : "\u2191")}
                    </th>
                    <th
                      className="hidden cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground md:table-cell"
                      onClick={() => handleSort("winRate")}
                    >
                      Win Rate{" "}
                      {sortField === "winRate" &&
                        (sortDir === "desc" ? "\u2193" : "\u2191")}
                    </th>
                    <th
                      className="hidden cursor-pointer px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground md:table-cell"
                      onClick={() => handleSort("totalVotes")}
                    >
                      Total Votes{" "}
                      {sortField === "totalVotes" &&
                        (sortDir === "desc" ? "\u2193" : "\u2191")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((entry, idx) => (
                    <tr
                      key={entry.modelId || entry.modelName}
                      className={cn(
                        "border-b border-border/30 transition-colors hover:bg-muted/30",
                        idx < 3 && "bg-muted/10"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex h-7 w-7 items-center justify-center">
                          {getRankBadge(idx)}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {prettifyModelName(entry.modelName)}
                        {entry.provider && (
                          <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {entry.provider}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-primary">
                        {Math.round(entry.eloRating)}
                      </td>
                      <td className="px-4 py-3 text-green-400">
                        {entry.wins}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${entry.winRate}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {entry.winRate}%
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        {entry.totalVotes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="mb-2">{icon}</div>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
