"use client"

import { useCallback, useMemo } from "react"
import { Copy, RefreshCw, Maximize2, Volume2 } from "lucide-react"
import type { Turn, ResponseData } from "@/lib/types"
import { cleanModelName, cn } from "@/lib/utils"
import { MarkdownRenderer } from "./markdown-renderer"

interface ResponseCardProps {
  turn: Turn
  side: "left" | "right"
  data: ResponseData
  isBattle: boolean
}

export function ResponseCard({ turn, side, data, isBattle }: ResponseCardProps) {
  const voted = turn.voteStatus === "submitted"
  const assistantLabel = side === "left" ? "A" : "B"
  const anonymousLabel = side === "left" ? "Model A" : "Model B"

  const displayName = useMemo(() => {
    const showRealName = !isBattle || voted
    if (!showRealName) return anonymousLabel
    const name = data.modelName
    if (!name || name === "undefined" || name === "null") return anonymousLabel
    return cleanModelName(name)
  }, [isBattle, voted, data.modelName, anonymousLabel])

  const isWinner =
    voted && (turn.voteChoice === "tie" || turn.voteChoice === side)
  const isLoser =
    voted &&
    turn.voteChoice !== null &&
    turn.voteChoice !== "tie" &&
    turn.voteChoice !== "both-bad" &&
    turn.voteChoice !== side

  const handleCopy = useCallback(async () => {
    if (!data.text) return
    try {
      await navigator.clipboard.writeText(data.text)
    } catch {
      // Fallback
    }
  }, [data.text])

  return (
    <article
      className={cn(
        "glass-panel rounded-2xl transition-all",
        data.streaming && "animate-pulse-glow",
        isWinner && "vote-selected-green",
        isLoser && "opacity-60",
        turn.voteChoice === "both-bad" && voted && "vote-selected-red"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold",
              side === "left"
                ? "bg-primary/20 text-primary"
                : "bg-orange-500/20 text-orange-400"
            )}
          >
            {assistantLabel}
          </span>
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              side === "left" ? "bg-primary" : "bg-orange-400"
            )}
          />
          <span className="text-sm font-medium">{displayName}</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Regenerate reply"
            aria-label="Regenerate reply"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Copy reply"
            aria-label="Copy reply"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Read aloud"
            aria-label="Read aloud"
          >
            <Volume2 className="h-3.5 w-3.5" />
          </button>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Expand reply"
            aria-label="Expand reply"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div
        className="p-4 text-sm leading-relaxed"
        aria-live={data.streaming ? "polite" : "off"}
      >
        {data.text ? (
          <>
            <MarkdownRenderer content={data.text} />
            {data.streaming && <span className="stream-caret" aria-hidden="true" />}
          </>
        ) : data.streaming ? (
          <div className="flex flex-col gap-3">
            {[100, 90, 70, 80, 60].map((w, i) => (
              <div
                key={i}
                className="skeleton-line"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No response</p>
        )}
      </div>
    </article>
  )
}
