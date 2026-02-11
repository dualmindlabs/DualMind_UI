"use client"

import { useState, useCallback, useEffect } from "react"
import { X, Lock, Link2, Globe, Copy, Check } from "lucide-react"
import * as apiClient from "@/lib/api-client"
import { cn } from "@/lib/utils"

interface ShareModalProps {
  threadId: string
  visibility: string
  onClose: () => void
  getToken: () => Promise<string | null>
}

const visibilityOptions = [
  {
    key: "private",
    icon: Lock,
    name: "Private",
    desc: "Only you",
  },
  {
    key: "unlisted",
    icon: Link2,
    name: "Unlisted",
    desc: "Anyone with link",
  },
  {
    key: "public",
    icon: Globe,
    name: "Public",
    desc: "Everyone",
  },
]

export function ShareModal({
  threadId,
  visibility: initialVisibility,
  onClose,
  getToken,
}: ShareModalProps) {
  const [currentVisibility, setCurrentVisibility] = useState(initialVisibility)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/share/${threadId}`
      : ""

  const isShareable =
    currentVisibility === "public" || currentVisibility === "unlisted"

  const updateVisibility = useCallback(
    async (newVisibility: string) => {
      if (loading) return
      setLoading(true)
      try {
        const token = await getToken()
        await apiClient.updateThreadVisibility(threadId, newVisibility, token)
        setCurrentVisibility(newVisibility)
      } catch (err) {
        console.error("Failed to update visibility:", err)
      } finally {
        setLoading(false)
      }
    },
    [threadId, getToken, loading]
  )

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }, [shareUrl])

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="glass-panel-strong relative z-10 w-full max-w-md rounded-2xl p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share Conversation</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info card if private */}
        {!isShareable && (
          <div className="mb-5 flex items-start gap-3 rounded-xl bg-muted/50 p-4">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="text-sm font-medium">Private Conversation</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                Only you can see this. Enable sharing to create a link.
              </div>
            </div>
          </div>
        )}

        {/* Share link */}
        <div className="mb-5">
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Shareable Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={shareUrl}
              readOnly
              disabled={!isShareable}
              className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground disabled:opacity-40"
            />
            <button
              onClick={handleCopy}
              disabled={!isShareable}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-all",
                isShareable
                  ? "hover:bg-primary/10 hover:text-primary"
                  : "opacity-40",
                copied && "border-green-500/50 bg-green-500/10 text-green-400"
              )}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Visibility options */}
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Visibility
          </label>
          <div className="flex gap-2">
            {visibilityOptions.map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.key}
                  onClick={() => updateVisibility(opt.key)}
                  disabled={loading}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                    currentVisibility === opt.key
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border hover:border-border/80 hover:bg-muted/50",
                    loading && "opacity-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{opt.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {opt.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Updating...</span>
          </div>
        )}
      </div>
    </div>
  )
}
