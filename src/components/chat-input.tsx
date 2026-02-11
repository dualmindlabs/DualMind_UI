"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ArrowUp, Paperclip, Globe, Code, ImageIcon, Loader2 } from "lucide-react"
import type { ChatMode } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ChatInputProps {
  onSubmit: (message: string) => void
  loading: boolean
  mode: ChatMode
}

export function ChatInput({ onSubmit, loading, mode }: ChatInputProps) {
  const [value, setValue] = useState("")
  const [webSearch, setWebSearch] = useState(false)
  const [codeMode, setCodeMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [])

  useEffect(() => {
    autoResize()
  }, [value, autoResize])

  const handleSubmit = useCallback(() => {
    if (!value.trim() || loading) return
    onSubmit(value.trim())
    setValue("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [value, loading, onSubmit])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  const placeholder =
    mode === "battle"
      ? "Message DualMind... (Battle Mode)"
      : mode === "arena"
        ? "Message DualMind... (Side by Side)"
        : "Message DualMind..."

  return (
    <div className="shrink-0 border-t border-border/30 bg-background/80 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        <div className="glass-panel rounded-2xl p-3">
          {/* Textarea */}
          <div className="px-1">
            <textarea
              ref={textareaRef}
              id="chat-input-textarea"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={loading}
              rows={1}
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
              aria-label="Enter your message"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                title="Attach file"
                aria-label="Attach file"
                disabled={loading}
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  setWebSearch((p) => !p)
                  if (!webSearch && codeMode) setCodeMode(false)
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted disabled:opacity-50",
                  webSearch
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Enable web search"
                aria-label="Enable web search"
                disabled={loading}
              >
                <Globe className="h-4 w-4" />
              </button>

              <button
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                title="Add image"
                aria-label="Add image"
                disabled={loading}
              >
                <ImageIcon className="h-4 w-4" />
              </button>

              <button
                onClick={() => {
                  setCodeMode((p) => !p)
                  if (!codeMode && webSearch) setWebSearch(false)
                }}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-muted disabled:opacity-50",
                  codeMode
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Enable code mode"
                aria-label="Enable code mode"
                disabled={loading}
              >
                <Code className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || (!value.trim())}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                loading
                  ? "bg-primary/30 text-primary"
                  : value.trim()
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-muted text-muted-foreground"
              )}
              aria-label={loading ? "Sending message..." : "Send message"}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
