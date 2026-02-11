"use client"

import type { DirectMessage } from "@/lib/types"
import { MarkdownRenderer } from "./markdown-renderer"
import { cn } from "@/lib/utils"

interface DirectMessageBubbleProps {
  message: DirectMessage
}

export function DirectMessageBubble({ message }: DirectMessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-xl rounded-2xl bg-primary/15 px-4 py-3 text-sm">
          <div className="mb-1 text-xs font-medium text-primary">You</div>
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start animate-fade-in">
      <div
        className={cn(
          "glass-panel max-w-2xl rounded-2xl px-4 py-3 text-sm",
          message.streaming && "animate-pulse-glow"
        )}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/20 text-[10px] font-bold text-primary">
            AI
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {message.modelName || "Assistant"}
          </span>
        </div>
        {message.text ? (
          <>
            <MarkdownRenderer content={message.text} />
            {message.streaming && (
              <span className="stream-caret" aria-hidden="true" />
            )}
          </>
        ) : message.streaming ? (
          <div className="flex flex-col gap-2">
            {[100, 80, 60].map((w, i) => (
              <div
                key={i}
                className="skeleton-line"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
