"use client"

import { useEffect, useState, useCallback } from "react"
import {
  PanelLeftClose,
  PanelLeft,
  PenSquare,
  Trophy,
  MessageCircle,
  LogOut,
  Pencil,
  Trash2,
} from "lucide-react"
import * as apiClient from "@/lib/api-client"
import type { Thread } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AppSidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  isMobile: boolean
  onToggle: () => void
  onClose: () => void
  onNewChat: () => void
  onThreadClick: (threadId: string) => void
  onLogout: () => void
  getToken: () => Promise<string | null>
  currentThreadId: string | null
}

export function AppSidebar({
  isOpen,
  isCollapsed,
  isMobile,
  onToggle,
  onClose,
  onNewChat,
  onThreadClick,
  onLogout,
  getToken,
  currentThreadId,
}: AppSidebarProps) {
  const [threads, setThreads] = useState<Thread[]>([])

  const loadThreads = useCallback(async () => {
    try {
      const token = await getToken()
      const data = await apiClient.getThreads(20, token)
      const mapped: Thread[] = (data as unknown as Array<Record<string, unknown>>).map(
        (t: Record<string, unknown>) => ({
          threadId: (t.threadId as string) || (t.thread_id as string) || "",
          title: (t.title as string) || "Untitled Thread",
        })
      )
      setThreads(mapped)
    } catch {
      // Silently fail
    }
  }, [getToken])

  useEffect(() => {
    loadThreads()
  }, [loadThreads])

  // Reload threads when a new thread is created (currentThreadId changes)
  useEffect(() => {
    if (currentThreadId) {
      loadThreads()
    }
  }, [currentThreadId, loadThreads])

  const handleRename = useCallback(
    async (threadId: string) => {
      const thread = threads.find((t) => t.threadId === threadId)
      if (!thread) return
      const newTitle = prompt("Enter new thread name:", thread.title)
      if (!newTitle || newTitle.trim() === "" || newTitle === thread.title) return
      try {
        const token = await getToken()
        await apiClient.updateThread(threadId, newTitle.trim(), token)
        setThreads((prev) =>
          prev.map((t) =>
            t.threadId === threadId ? { ...t, title: newTitle.trim() } : t
          )
        )
      } catch (err) {
        console.error("Failed to rename:", err)
      }
    },
    [threads, getToken]
  )

  const handleDelete = useCallback(
    async (threadId: string) => {
      const thread = threads.find((t) => t.threadId === threadId)
      if (!thread) return
      if (!confirm(`Delete "${thread.title}"?\n\nThis cannot be undone.`)) return
      try {
        const token = await getToken()
        await apiClient.deleteThread(threadId, token)
        setThreads((prev) => prev.filter((t) => t.threadId !== threadId))
      } catch (err) {
        console.error("Failed to delete:", err)
      }
    },
    [threads, getToken]
  )

  // Resolved width
  const sidebarWidth = isCollapsed ? 80 : 260

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-dvh flex-col border-r border-border/50 bg-card/80 backdrop-blur-2xl transition-all duration-300",
          isMobile && !isOpen && "-translate-x-full",
          isMobile && isOpen && "translate-x-0"
        )}
        style={{ width: isMobile ? 260 : sidebarWidth }}
        role="navigation"
        aria-label="Sidebar"
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 px-4">
          {!isCollapsed && (
            <button
              onClick={onToggle}
              className="flex items-center gap-2"
              aria-label="DualMind Home"
            >
              <svg
                width="21"
                height="21"
                viewBox="0 0 21 21"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <rect width="9" height="9" rx="1" fill="#577B87" />
                <rect x="12" width="9" height="9" rx="1" fill="#4AABC2" />
                <rect x="12" y="12" width="9" height="9" rx="1" fill="#CB9275" />
                <rect y="12" width="9" height="9" rx="1" fill="#FDF4CD" />
              </svg>
              <span className="text-sm font-semibold">DualMind</span>
            </button>
          )}
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3">
          <button
            onClick={() => {
              onNewChat()
              if (isMobile) onClose()
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
            title="Start new conversation"
          >
            <PenSquare className="h-4 w-4" />
            {!isCollapsed && <span>New Chat</span>}
          </button>
          <a
            href="/leaderboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="View model leaderboard"
          >
            <Trophy className="h-4 w-4" />
            {!isCollapsed && <span>Leaderboard</span>}
          </a>
        </nav>

        {/* Threads */}
        {!isCollapsed && (
          <div className="flex flex-1 flex-col overflow-hidden px-3">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Chats
            </h3>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {threads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <MessageCircle className="mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No recent chats</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    Start a conversation to see it here
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {threads.map((thread) => (
                    <div
                      key={thread.threadId}
                      className={cn(
                        "group flex items-center gap-1 rounded-lg transition-colors hover:bg-muted",
                        currentThreadId === thread.threadId && "bg-muted"
                      )}
                    >
                      <button
                        onClick={() => onThreadClick(thread.threadId)}
                        className="flex flex-1 items-center gap-2 overflow-hidden px-3 py-2 text-left"
                      >
                        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm">{thread.title}</span>
                      </button>
                      <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRename(thread.threadId)
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
                          title="Rename"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(thread.threadId)
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 border-t border-border/50 p-3">
          {!isCollapsed && (
            <div className="mb-2 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
              <a href="/terms" className="hover:text-muted-foreground">
                Terms
              </a>
              <span>{"."}</span>
              <a href="/privacy" className="hover:text-muted-foreground">
                Privacy
              </a>
            </div>
          )}
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span>Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
