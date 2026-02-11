"use client"

import { useRef, useEffect, useMemo } from "react"
import { Swords, Columns2, MessageSquare } from "lucide-react"
import type { ChatMode, Turn, DirectMessage, AIModel } from "@/lib/types"
import { ResponseCard } from "./response-card"
import { DirectMessageBubble } from "./direct-message-bubble"

interface ChatViewProps {
  mode: ChatMode
  turns: Turn[]
  directMessages: DirectMessage[]
  models: AIModel[]
  streaming: boolean
}

export function ChatView({
  mode,
  turns,
  directMessages,
  models,
  streaming,
}: ChatViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" })
    }
  }, [turns, directMessages, streaming])

  if (mode === "direct") {
    return (
      <DirectView messages={directMessages} scrollRef={scrollRef} />
    )
  }

  return <ArenaView mode={mode} turns={turns} models={models} scrollRef={scrollRef} />
}

// ========== Arena View (Battle + Side-by-Side) ==========

function ArenaView({
  mode,
  turns,
  models,
  scrollRef,
}: {
  mode: ChatMode
  turns: Turn[]
  models: AIModel[]
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  if (turns.length === 0) {
    return <EmptyArenaState mode={mode} models={models} />
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-col gap-8">
        {turns.map((turn) => (
          <TurnSection key={turn.id} turn={turn} mode={mode} />
        ))}
        <div ref={scrollRef} className="h-24" aria-hidden="true" />
      </div>
    </div>
  )
}

function TurnSection({ turn, mode }: { turn: Turn; mode: ChatMode }) {
  const isBattle = mode === "battle"
  const voted = turn.voteStatus === "submitted"
  const showBoth =
    !voted ||
    turn.voteChoice === "tie" ||
    turn.voteChoice === "both-bad" ||
    turn._showHidden
  const showLeft = showBoth || turn.voteChoice === "left"
  const showRight = showBoth || turn.voteChoice === "right"

  return (
    <section className="animate-fade-in">
      {/* User prompt */}
      <div className="mb-4 flex justify-end">
        <div className="max-w-xl rounded-2xl bg-primary/15 px-4 py-3 text-sm">
          <div className="mb-1 text-xs font-medium text-primary">You</div>
          <p className="whitespace-pre-wrap">{turn.prompt}</p>
        </div>
      </div>

      {/* Response cards */}
      <div
        className={`grid gap-4 ${
          showLeft && showRight
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {showLeft && (
          <ResponseCard
            turn={turn}
            side="left"
            data={turn.left}
            isBattle={isBattle}
          />
        )}
        {showRight && (
          <ResponseCard
            turn={turn}
            side="right"
            data={turn.right}
            isBattle={isBattle}
          />
        )}
      </div>

      {/* Vote status */}
      {voted && turn.voteChoice && (
        <div className="mt-3 flex justify-center">
          <div className="rounded-full bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground">
            {turn.voteChoice === "tie"
              ? "Voted: Tie"
              : turn.voteChoice === "both-bad"
                ? "Voted: Both are bad"
                : turn.voteChoice === "left"
                  ? "Voted: Left wins"
                  : "Voted: Right wins"}
          </div>
        </div>
      )}
    </section>
  )
}

// ========== Direct View ==========

function DirectView({
  messages,
  scrollRef,
}: {
  messages: DirectMessage[]
  scrollRef: React.RefObject<HTMLDivElement | null>
}) {
  if (messages.length === 0) {
    return <EmptyDirectState />
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex flex-col gap-4">
        {messages.map((msg) => (
          <DirectMessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={scrollRef} className="h-24" aria-hidden="true" />
      </div>
    </div>
  )
}

// ========== Empty states ==========

function EmptyArenaState({
  mode,
  models: _models,
}: {
  mode: ChatMode
  models: AIModel[]
}) {
  // Memoize to avoid recreating on each render
  const content = useMemo(() => {
    if (mode === "battle") {
      return {
        icon: <Swords className="h-8 w-8 text-primary" />,
        title: "Battle Mode",
        subtitle: "Two anonymous models. One winner. Your vote.",
        detail: (
          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 px-6 py-4">
              <span className="text-2xl">{"?"}</span>
              <span className="text-xs text-muted-foreground">
                Random Model
              </span>
            </div>
            <div className="rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-bold text-primary">
              VS
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 px-6 py-4">
              <span className="text-2xl">{"?"}</span>
              <span className="text-xs text-muted-foreground">
                Random Model
              </span>
            </div>
          </div>
        ),
      }
    }

    return {
      icon: <Columns2 className="h-8 w-8 text-primary" />,
      title: "Side-by-Side Comparison",
      subtitle: "Select models above, then type your prompt below",
      detail: null,
    }
  }, [mode])

  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="glass-panel mx-auto max-w-lg rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          {content.icon}
        </div>
        <h2 className="text-xl font-semibold text-balance">{content.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          {content.subtitle}
        </p>
        {content.detail}
        <p className="mt-6 text-xs text-muted-foreground/60">
          Enter your prompt below to start!
        </p>
      </div>
    </div>
  )
}

function EmptyDirectState() {
  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="glass-panel mx-auto max-w-lg rounded-2xl p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-balance">Direct Chat</h2>
        <p className="mt-2 text-sm text-muted-foreground text-pretty">
          Chat with a single AI model. Fast and focused.
        </p>
        <p className="mt-6 text-xs text-muted-foreground/60">
          Enter your prompt below to start!
        </p>
      </div>
    </div>
  )
}
