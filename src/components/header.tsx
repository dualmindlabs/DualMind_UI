"use client"

import { useState, useRef, useEffect } from "react"
import {
  Menu,
  ChevronDown,
  Swords,
  Columns2,
  MessageSquare,
  Share2,
  LogOut,
} from "lucide-react"
import type { ChatMode } from "@/lib/types"
import type { User } from "@supabase/supabase-js"

const modes: { id: ChatMode; name: string; subtitle: string; icon: typeof Swords }[] = [
  {
    id: "battle",
    name: "Battle",
    subtitle: "2 anonymous models, your vote decides",
    icon: Swords,
  },
  {
    id: "arena",
    name: "Side by Side",
    subtitle: "Compare 2 models of your choice",
    icon: Columns2,
  },
  {
    id: "direct",
    name: "Direct Chat",
    subtitle: "Chat with one model at a time",
    icon: MessageSquare,
  },
]

interface AppHeaderProps {
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void
  onToggleSidebar: () => void
  onShare: () => void
  onLogout: () => void
  user: User | null
  isMobile: boolean
}

export function AppHeader({
  mode,
  onModeChange,
  onToggleSidebar,
  onShare,
  onLogout,
  user,
  isMobile,
}: AppHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const currentMode = modes.find((m) => m.id === mode) || modes[0]
  const ModeIcon = currentMode.icon

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function getUserInitials(): string {
    if (!user) return "?"
    const name = user.user_metadata?.full_name || user.email || ""
    const parts = name.split(/[\s@]/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.substring(0, 2).toUpperCase()
  }

  function getUserName(): string {
    if (!user) return "User"
    return (
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "User"
    )
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/50 bg-background/60 px-4 backdrop-blur-xl">
      {/* Left: Mobile menu + Mode selector */}
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Mode dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
          >
            <ModeIcon className="h-4 w-4 text-primary" />
            <span>{currentMode.name}</span>
            <ChevronDown
              className={`h-3 w-3 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-card/95 p-1 shadow-xl backdrop-blur-xl">
              {modes.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      onModeChange(m.id)
                      setDropdownOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted ${
                      m.id === mode ? "bg-muted" : ""
                    }`}
                    role="menuitemradio"
                    aria-checked={m.id === mode}
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    <div>
                      <div className="text-sm font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.subtitle}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Share + User menu */}
      <div className="flex items-center gap-2">
        <button
          onClick={onShare}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Share thread"
          title="Share this conversation"
        >
          <Share2 className="h-4 w-4" />
        </button>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen((p) => !p)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary transition-colors hover:bg-primary/30"
            aria-label="User menu"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
          >
            {getUserInitials()}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border bg-card/95 p-2 shadow-xl backdrop-blur-xl">
              <div className="mb-2 border-b border-border pb-2 px-2">
                <div className="text-sm font-medium">{getUserName()}</div>
                <div className="text-xs text-muted-foreground">
                  {user?.email || ""}
                </div>
              </div>
              <button
                onClick={() => {
                  setUserMenuOpen(false)
                  onLogout()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
