/**
 * DualMind API Client for Next.js
 * Typed API client that communicates with the .NET backend
 */

import type {
  AIModel,
  DualChatResponse,
  SingleChatResponse,
  Thread,
  LeaderboardEntry,
} from "./types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.dualmindlab.tech"

async function getHeaders(token?: string | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null; timeout?: number } = {}
): Promise<T> {
  const { token, timeout = 30000, ...fetchOptions } = options
  const headers = await getHeaders(token)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      headers: { ...headers, ...(fetchOptions.headers as Record<string, string>) },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        (errorData as Record<string, string>).message ||
          (errorData as Record<string, string>).error ||
          `HTTP ${response.status}`
      )
    }

    const text = await response.text()
    return text ? JSON.parse(text) : ({} as T)
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// ========== Arena Service ==========

export async function dualChat(
  prompt: string,
  options: {
    model1?: string | null
    model2?: string | null
    threadId?: string | null
    userId?: string | null
    temperature?: number
    token?: string | null
  } = {}
): Promise<DualChatResponse> {
  const body: Record<string, unknown> = {
    prompt,
    maxTokens: 4096,
    selectionMode: options.model1 || options.model2 ? "manual" : "random",
  }
  if (options.model1) body.model1 = options.model1
  if (options.model2) body.model2 = options.model2
  if (options.threadId) body.threadId = options.threadId
  if (options.userId) body.userId = options.userId
  if (options.temperature !== undefined) body.temperature = options.temperature

  return apiRequest<DualChatResponse>("/api/arena/dualchat", {
    method: "POST",
    body: JSON.stringify(body),
    token: options.token,
  })
}

export async function singleChat(
  prompt: string,
  options: {
    model?: string
    threadId?: string | null
    userId?: string | null
    token?: string | null
  } = {}
): Promise<SingleChatResponse> {
  const body: Record<string, unknown> = {
    prompt,
    model: options.model || "auto",
    maxTokens: 4096,
  }
  if (options.threadId) body.threadId = options.threadId
  if (options.userId) body.userId = options.userId

  return apiRequest<SingleChatResponse>("/api/arena/chat", {
    method: "POST",
    body: JSON.stringify(body),
    token: options.token,
  })
}

export async function submitVote(
  comparisonId: string,
  voteChoice: string,
  userId?: string | null,
  token?: string | null
) {
  const body: Record<string, unknown> = { comparisonId, voteChoice }
  if (userId) body.userId = userId

  return apiRequest("/api/arena/model-vote", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  })
}

// ========== Models Service ==========

export async function getModels(token?: string | null): Promise<AIModel[]> {
  const data = await apiRequest<{ items?: AIModel[] } | AIModel[]>("/api/models", {
    method: "GET",
    token,
  })
  return (data as { items?: AIModel[] }).items || (data as AIModel[]) || []
}

// ========== Thread Service ==========

export async function getThreads(
  limit = 20,
  token?: string | null
): Promise<Thread[]> {
  const data = await apiRequest<{ items?: Thread[] } | Thread[]>(
    `/api/threads?limit=${limit}`,
    { method: "GET", token }
  )
  return (data as { items?: Thread[] }).items || (data as Thread[]) || []
}

export async function getThread(
  threadId: string,
  token?: string | null
): Promise<Thread> {
  return apiRequest<Thread>(`/api/threads/${threadId}`, {
    method: "GET",
    token,
  })
}

export async function getThreadMessages(
  threadId: string,
  token?: string | null
) {
  const data = await apiRequest<{ items?: unknown[] } | unknown[]>(
    `/api/threads/${threadId}/messages`,
    { method: "GET", token }
  )
  return (data as { items?: unknown[] }).items || (data as unknown[]) || []
}

export async function createThread(
  title: string,
  token?: string | null
): Promise<{ threadId?: string; id?: string }> {
  return apiRequest(`/api/threads`, {
    method: "POST",
    body: JSON.stringify({ title }),
    token,
  })
}

export async function updateThreadVisibility(
  threadId: string,
  visibility: string,
  token?: string | null
) {
  return apiRequest(`/api/threads/${threadId}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
    token,
  })
}

export async function updateThread(
  threadId: string,
  title: string,
  token?: string | null
) {
  return apiRequest(`/api/threads/${threadId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
    token,
  })
}

export async function deleteThread(threadId: string, token?: string | null) {
  return apiRequest(`/api/threads/${threadId}`, {
    method: "DELETE",
    token,
  })
}

// ========== Leaderboard Service ==========

export async function getLeaderboard(
  token?: string | null
): Promise<LeaderboardEntry[]> {
  const data = await apiRequest<{ items?: LeaderboardEntry[] } | LeaderboardEntry[]>(
    "/api/arena/model-stats",
    { method: "GET", token, timeout: 6000 }
  )
  return (data as { items?: LeaderboardEntry[] }).items || (data as LeaderboardEntry[]) || []
}

// ========== User Service ==========

export async function syncUser(
  userData: Record<string, unknown>,
  token?: string | null
) {
  return apiRequest("/api/users/sync", {
    method: "POST",
    body: JSON.stringify(userData),
    token,
  })
}

// ========== Health Check ==========

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
      cache: "no-cache",
    })
    return response.ok
  } catch {
    return false
  }
}
