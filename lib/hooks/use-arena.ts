"use client"

import { useState, useCallback, useRef } from "react"
import type {
  ChatMode,
  Turn,
  DirectMessage,
  VoteChoice,
  AIModel,
} from "@/lib/types"
import * as api from "@/lib/api-client"
import { streamText } from "@/lib/utils"

export function useArena(getToken: () => Promise<string | null>) {
  const [mode, setMode] = useState<ChatMode>("battle")
  const [turns, setTurns] = useState<Turn[]>([])
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [models, setModels] = useState<AIModel[]>([])
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [currentVoteTurnId, setCurrentVoteTurnId] = useState<string | null>(null)
  const activeStreams = useRef<Array<{ cancel: () => void }>>([])

  const cancelStreams = useCallback(() => {
    activeStreams.current.forEach((s) => s.cancel())
    activeStreams.current = []
    setStreaming(false)
  }, [])

  const checkBackend = useCallback(async () => {
    const ok = await api.healthCheck()
    setBackendAvailable(ok)
    return ok
  }, [])

  const fetchModels = useCallback(async () => {
    try {
      const token = await getToken()
      const result = await api.getModels(token)
      setModels(result)
    } catch {
      setModels([])
    }
  }, [getToken])

  const createThreadIfNeeded = useCallback(
    async (prompt: string) => {
      if (currentThreadId || !backendAvailable) return currentThreadId
      try {
        const token = await getToken()
        const title =
          prompt.length > 40 ? prompt.substring(0, 40) + "..." : prompt
        const result = await api.createThread(title, token)
        const id = result.threadId || result.id || null
        if (id) setCurrentThreadId(id)
        return id
      } catch {
        return null
      }
    },
    [currentThreadId, backendAvailable, getToken]
  )

  const submitArena = useCallback(
    async (
      prompt: string,
      options: {
        model1?: string | null
        model2?: string | null
        userId?: string | null
        temperature?: number
      } = {}
    ) => {
      if (streaming) return
      cancelStreams()
      setCurrentVoteTurnId(null)

      const threadId = await createThreadIfNeeded(prompt)
      const battleId = crypto.randomUUID()

      // Build turn placeholder
      const turn: Turn = {
        id: battleId,
        prompt,
        comparisonId: battleId,
        left: {
          modelId: options.model1 || null,
          modelName: "Model A",
          text: "",
          streaming: true,
        },
        right: {
          modelId: options.model2 || null,
          modelName: "Model B",
          text: "",
          streaming: true,
        },
        voteStatus: "idle",
        voteChoice: null,
      }

      setTurns((prev) => [...prev, turn])
      setStreaming(true)

      try {
        const token = await getToken()
        const resp = await api.dualChat(prompt, {
          model1: options.model1,
          model2: options.model2,
          threadId,
          userId: options.userId,
          temperature: options.temperature ?? 0.7,
          token,
        })

        // Update comparison ID and model names from backend
        const updatedTurn = { ...turn }
        if (resp.comparisonId) updatedTurn.comparisonId = resp.comparisonId
        if (resp.agent1?.model) {
          updatedTurn.left.modelName =
            resp.agent1.model.displayName || resp.agent1.model.name || "Model A"
        }
        if (resp.agent2?.model) {
          updatedTurn.right.modelName =
            resp.agent2.model.displayName || resp.agent2.model.name || "Model B"
        }

        // Stream left and right responses
        const leftText = resp.agent1?.message || ""
        const rightText = resp.agent2?.message || ""

        const leftStream = streamText(
          leftText,
          (chunk) => {
            updatedTurn.left.text += chunk
            setTurns((prev) =>
              prev.map((t) =>
                t.id === battleId
                  ? {
                      ...t,
                      left: { ...updatedTurn.left, text: updatedTurn.left.text },
                      comparisonId: updatedTurn.comparisonId,
                    }
                  : t
              )
            )
          },
          { minDelay: 5, maxDelay: 15, minChunk: 2, maxChunk: 8 }
        )

        const rightStream = streamText(
          rightText,
          (chunk) => {
            updatedTurn.right.text += chunk
            setTurns((prev) =>
              prev.map((t) =>
                t.id === battleId
                  ? {
                      ...t,
                      right: { ...updatedTurn.right, text: updatedTurn.right.text },
                      comparisonId: updatedTurn.comparisonId,
                    }
                  : t
              )
            )
          },
          { minDelay: 5, maxDelay: 15, minChunk: 2, maxChunk: 8 }
        )

        activeStreams.current = [leftStream, rightStream]
        await Promise.all([leftStream.promise, rightStream.promise])

        // Finalize
        setTurns((prev) =>
          prev.map((t) =>
            t.id === battleId
              ? {
                  ...t,
                  left: { ...updatedTurn.left, streaming: false },
                  right: { ...updatedTurn.right, streaming: false },
                  comparisonId: updatedTurn.comparisonId,
                }
              : t
          )
        )
        setCurrentVoteTurnId(battleId)
      } catch (err) {
        console.error("Arena API failed:", err)
        setTurns((prev) => prev.filter((t) => t.id !== battleId))
      } finally {
        setStreaming(false)
        activeStreams.current = []
      }
    },
    [streaming, cancelStreams, createThreadIfNeeded, getToken]
  )

  const submitDirect = useCallback(
    async (
      prompt: string,
      options: { model?: string; userId?: string | null } = {}
    ) => {
      if (streaming) return
      cancelStreams()

      const threadId = await createThreadIfNeeded(prompt)
      const msgId = Date.now()

      setDirectMessages((prev) => [
        ...prev,
        { id: msgId, role: "user", text: prompt },
        {
          id: msgId + 1,
          role: "assistant",
          modelName: "Assistant",
          text: "",
          streaming: true,
        },
      ])
      setStreaming(true)

      try {
        const token = await getToken()
        const resp = await api.singleChat(prompt, {
          model: options.model || "auto",
          threadId,
          userId: options.userId,
          token,
        })

        const name =
          resp.model?.displayName || resp.model?.name || "Assistant"
        const text = resp.message || ""

        setDirectMessages((prev) =>
          prev.map((m) =>
            m.id === msgId + 1
              ? { ...m, text, modelName: name, streaming: false }
              : m
          )
        )
      } catch (err) {
        console.error("Direct chat failed:", err)
        setDirectMessages((prev) =>
          prev.map((m) =>
            m.id === msgId + 1
              ? { ...m, text: "Failed to get response. Please try again.", streaming: false }
              : m
          )
        )
      } finally {
        setStreaming(false)
      }
    },
    [streaming, cancelStreams, createThreadIfNeeded, getToken]
  )

  const handleVote = useCallback(
    async (turnId: string, choice: VoteChoice, userId?: string | null) => {
      const turn = turns.find((t) => t.id === turnId)
      if (!turn || turn.voteStatus !== "idle") return

      // Optimistic update
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? { ...t, voteStatus: "submitting", voteChoice: choice }
            : t
        )
      )

      try {
        const token = await getToken()
        if (turn.comparisonId) {
          await api.submitVote(turn.comparisonId, choice, userId, token)
        }
      } catch (err) {
        console.error("Vote failed:", err)
      }

      // Delay then finalize
      setTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? { ...t, voteStatus: "vote-delay", voteChoice: choice }
            : t
        )
      )
      setCurrentVoteTurnId(null)

      setTimeout(() => {
        setTurns((prev) =>
          prev.map((t) =>
            t.id === turnId ? { ...t, voteStatus: "submitted" } : t
          )
        )
      }, 2000)
    },
    [turns, getToken]
  )

  const startNewChat = useCallback(() => {
    cancelStreams()
    setTurns([])
    setDirectMessages([])
    setCurrentThreadId(null)
    setCurrentVoteTurnId(null)
  }, [cancelStreams])

  const loadThread = useCallback(
    async (threadId: string) => {
      cancelStreams()
      setCurrentVoteTurnId(null)
      setCurrentThreadId(threadId)
      setTurns([])
      setDirectMessages([])

      try {
        const token = await getToken()
        const messages = (await api.getThreadMessages(
          threadId,
          token
        )) as Array<Record<string, unknown>>

        const reconstructedTurns: Turn[] = messages.map(
          (msg: Record<string, unknown>, idx: number) => {
            const voteChoice =
              (msg.voteChoice as string) ||
              (msg.vote_choice as string) ||
              (msg.userVote as string) ||
              null
            return {
              id:
                (msg.messageId as string) ||
                (msg.message_id as string) ||
                String(Date.now() + idx),
              prompt:
                (msg.promptText as string) || (msg.prompt_text as string) || "",
              comparisonId:
                (msg.comparisonId as string) ||
                (msg.comparison_id as string) ||
                null,
              left: {
                modelId:
                  (msg.model1Id as string) || (msg.model1_id as string) || null,
                modelName:
                  (msg.model1Name as string) ||
                  (msg.model1_name as string) ||
                  "Model A",
                text:
                  (msg.model1Response as string) ||
                  (msg.model1_response as string) ||
                  "",
                streaming: false,
              },
              right: {
                modelId:
                  (msg.model2Id as string) || (msg.model2_id as string) || null,
                modelName:
                  (msg.model2Name as string) ||
                  (msg.model2_name as string) ||
                  "Model B",
                text:
                  (msg.model2Response as string) ||
                  (msg.model2_response as string) ||
                  "",
                streaming: false,
              },
              voteStatus: voteChoice ? "submitted" : "idle",
              voteChoice: (voteChoice as Turn["voteChoice"]) || null,
            }
          }
        )

        setTurns(reconstructedTurns)

        // Show voting for last unvoted turn
        const lastUnvoted = reconstructedTurns
          .filter((t) => t.voteStatus === "idle" && t.comparisonId)
          .pop()
        if (lastUnvoted) setCurrentVoteTurnId(lastUnvoted.id)
      } catch (err) {
        console.error("Failed to load thread:", err)
      }
    },
    [cancelStreams, getToken]
  )

  return {
    mode,
    setMode,
    turns,
    setTurns,
    directMessages,
    streaming,
    currentThreadId,
    setCurrentThreadId,
    models,
    backendAvailable,
    currentVoteTurnId,
    setCurrentVoteTurnId,
    checkBackend,
    fetchModels,
    submitArena,
    submitDirect,
    handleVote,
    startNewChat,
    loadThread,
    cancelStreams,
  }
}
