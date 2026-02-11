// ============================================
// DualMind Types
// ============================================

export type ChatMode = "battle" | "arena" | "direct"

export type VoteChoice = "left" | "right" | "tie" | "both-bad"

export type VoteStatus = "idle" | "submitting" | "vote-delay" | "submitted"

export type ThreadVisibility = "private" | "public" | "unlisted"

// Models
export interface AIModel {
  modelId: string
  modelName: string
  provider?: string
  isActive?: boolean
}

// Chat responses
export interface ResponseData {
  modelId?: string | null
  modelName: string
  text: string
  streaming: boolean
  responseTimeMs?: number | null
}

// Turn = a single prompt -> 2 model responses
export interface Turn {
  id: string
  prompt: string
  comparisonId?: string | null
  left: ResponseData
  right: ResponseData
  voteStatus: VoteStatus
  voteChoice?: VoteChoice | null
  _showHidden?: boolean
}

// Direct chat message
export interface DirectMessage {
  id: number | string
  role: "user" | "assistant"
  text: string
  modelName?: string
  streaming?: boolean
}

// Thread
export interface Thread {
  threadId: string
  title: string
  createdAt?: string
  visibility?: ThreadVisibility
}

// Leaderboard entry
export interface LeaderboardEntry {
  modelId: string
  modelName: string
  provider?: string
  eloRating: number
  wins: number
  losses: number
  ties: number
  totalVotes: number
  winRate?: number
}

// API response shapes
export interface DualChatResponse {
  agent1: {
    message: string
    model?: { name?: string; displayName?: string }
    responseTimeMs?: number
  }
  agent2: {
    message: string
    model?: { name?: string; displayName?: string }
    responseTimeMs?: number
  }
  comparisonId?: string
}

export interface SingleChatResponse {
  message: string
  model?: { name?: string; displayName?: string; modelId?: string }
  responseTimeMs?: number
}

// User from Supabase
export interface DualMindUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
    name?: string
  }
  app_metadata?: {
    provider?: string
  }
}
