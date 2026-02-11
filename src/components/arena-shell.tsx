"use client"

import { useEffect, useCallback, useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useArena } from "@/lib/hooks/use-arena"
import { AppHeader } from "./header"
import { AppSidebar } from "./sidebar"
import { ChatView } from "./chat-view"
import { ChatInput } from "./chat-input"
import { FloatingVoting } from "./floating-voting"
import { ShareModal } from "./share-modal"
import type { ChatMode, VoteChoice } from "@/lib/types"
import * as apiClient from "@/lib/api-client"

export function ArenaShell() {
  const { user, signOut, getToken } = useAuth()
  const arena = useArena(getToken)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [threadVisibility, setThreadVisibility] = useState<string>("private")

  // Check mobile on mount and resize
  useEffect(() => {
    function check() {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) {
        setSidebarOpen(false)
        setSidebarCollapsed(false)
      } else {
        setSidebarOpen(true)
      }
    }
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  // Initialize backend and models
  useEffect(() => {
    arena.checkBackend()
    arena.fetchModels()
    // Sync user with backend
    async function sync() {
      if (!user) return
      try {
        const token = await getToken()
        await apiClient.syncUser(
          {
            id: user.id,
            email: user.email,
            name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0] ||
              "User",
            avatar_url: user.user_metadata?.avatar_url || null,
            provider: user.app_metadata?.provider || "email",
          },
          token
        )
      } catch {
        // Non-blocking
      }
    }
    sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleModeChange = useCallback(
    (m: ChatMode) => {
      arena.setMode(m)
      arena.startNewChat()
    },
    [arena]
  )

  const handleChatSubmit = useCallback(
    (message: string) => {
      if (!message.trim() || arena.streaming) return

      if (arena.mode === "direct") {
        arena.submitDirect(message, { userId: user?.id })
      } else {
        // Battle = random, Arena = allow selected
        const isBattle = arena.mode === "battle"
        arena.submitArena(message, {
          model1: isBattle ? null : null, // Models can be selected from ChatView
          model2: isBattle ? null : null,
          userId: user?.id,
        })
      }
    },
    [arena, user]
  )

  const handleVote = useCallback(
    (turnId: string, choice: VoteChoice) => {
      arena.handleVote(turnId, choice, user?.id)
    },
    [arena, user]
  )

  const handleNewChat = useCallback(() => {
    arena.startNewChat()
  }, [arena])

  const handleThreadClick = useCallback(
    (threadId: string) => {
      arena.loadThread(threadId)
      if (isMobile) setSidebarOpen(false)
    },
    [arena, isMobile]
  )

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setSidebarOpen((prev) => !prev)
    } else {
      setSidebarCollapsed((prev) => !prev)
    }
  }, [isMobile])

  const handleShare = useCallback(async () => {
    if (!arena.currentThreadId) return
    try {
      const token = await getToken()
      const threadData = await apiClient.getThread(arena.currentThreadId, token)
      setThreadVisibility(
        (threadData as unknown as { visibility?: string }).visibility || "private"
      )
    } catch {
      setThreadVisibility("private")
    }
    setShareOpen(true)
  }, [arena.currentThreadId, getToken])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        document.getElementById("chat-input-textarea")?.focus()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault()
        toggleSidebar()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [toggleSidebar])

  const sidebarWidth = isMobile
    ? 0
    : sidebarCollapsed
      ? 80
      : sidebarOpen
        ? 260
        : 0

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <AppSidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        isMobile={isMobile}
        onToggle={toggleSidebar}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onThreadClick={handleThreadClick}
        onLogout={signOut}
        getToken={getToken}
        currentThreadId={arena.currentThreadId}
      />

      {/* Main content */}
      <div
        className="flex flex-1 flex-col transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        <AppHeader
          mode={arena.mode}
          onModeChange={handleModeChange}
          onToggleSidebar={toggleSidebar}
          onShare={handleShare}
          onLogout={signOut}
          user={user}
          isMobile={isMobile}
        />

        <main className="relative flex-1 overflow-y-auto scrollbar-thin">
          <ChatView
            mode={arena.mode}
            turns={arena.turns}
            directMessages={arena.directMessages}
            models={arena.models}
            streaming={arena.streaming}
          />
        </main>

        {/* Floating voting */}
        {arena.currentVoteTurnId && !arena.streaming && (
          <FloatingVoting
            turnId={arena.currentVoteTurnId}
            turns={arena.turns}
            onVote={handleVote}
          />
        )}

        <ChatInput
          onSubmit={handleChatSubmit}
          loading={arena.streaming}
          mode={arena.mode}
        />
      </div>

      {/* Share modal */}
      {shareOpen && arena.currentThreadId && (
        <ShareModal
          threadId={arena.currentThreadId}
          visibility={threadVisibility}
          onClose={() => setShareOpen(false)}
          getToken={getToken}
        />
      )}
    </div>
  )
}
