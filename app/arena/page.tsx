'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useArena } from '@/lib/hooks/use-arena'

export default function ArenaPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const {
    mode,
    setMode,
    turns,
    directMessages,
    streaming,
    models,
    submitArena,
    submitDirect,
    submitVote,
    loadThreads,
    threads,
    currentThreadId,
    setCurrentThreadId,
  } = useArena(getToken)

  const [prompt, setPrompt] = useState('')
  const [model1, setModel1] = useState('')
  const [model2, setModel2] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      setUser(user)
      setLoading(false)
      await loadThreads()
    }

    checkUser()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading arena...</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) return

    try {
      if (mode === 'battle') {
        await submitArena(prompt, { model1: model1 || null, model2: model2 || null, userId: user?.id })
      } else if (mode === 'arena') {
        await submitArena(prompt, { model1: model1 || null, model2: model2 || null, userId: user?.id })
      } else {
        await submitDirect(prompt, model1 || 'gpt-4', user?.id)
      }
      setPrompt('')
    } catch (error) {
      console.error('Error submitting:', error)
    }
  }

  const handleVote = (choice: 'left' | 'right', turnId: string) => {
    submitVote(turnId, choice)
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <svg
              width="24"
              height="24"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="9" height="9" rx="1" fill="#577B87" />
              <rect x="12" width="9" height="9" rx="1" fill="#4AABC2" />
              <rect x="12" y="12" width="9" height="9" rx="1" fill="#CB9275" />
              <rect y="12" width="9" height="9" rx="1" fill="#FDF4CD" />
            </svg>
            <h1 className="font-semibold">DualMind Arena</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <button
              onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
              className="rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 border-r border-border bg-card/30 flex flex-col">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Threads</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {threads?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No threads yet</p>
              ) : (
                threads?.map((thread) => (
                  <button
                    key={thread.id}
                    onClick={() => setCurrentThreadId(thread.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentThreadId === thread.id
                        ? 'bg-primary/20 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {thread.title}
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        {/* Main Arena */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mode and Model Selector */}
          <div className="border-b border-border bg-card/30 backdrop-blur-sm p-4">
            <div className="max-w-7xl mx-auto">
              {/* Mode Selection */}
              <div className="flex gap-2 mb-4">
                {(['battle', 'arena', 'direct'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      mode === m
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {m === 'battle'
                      ? 'Battle'
                      : m === 'arena'
                        ? 'Side-by-Side'
                        : 'Direct Chat'}
                  </button>
                ))}
              </div>

              {/* Model Selection */}
              {mode !== 'direct' && (
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={model1}
                    onChange={(e) => setModel1(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-background border border-border text-foreground"
                  >
                    <option value="">Select Model 1</option>
                    {models?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={model2}
                    onChange={(e) => setModel2(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-background border border-border text-foreground"
                  >
                    <option value="">Select Model 2</option>
                    {models?.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {mode === 'direct' && (
                <select
                  value={model1}
                  onChange={(e) => setModel1(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-background border border-border text-foreground w-full"
                >
                  <option value="">Select a Model</option>
                  {models?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Turns (for battle/arena modes) */}
              {turns?.map((turn) => (
                <div key={turn.id} className="space-y-4">
                  {/* User prompt */}
                  <div className="flex justify-end">
                    <div className="max-w-xl px-4 py-3 rounded-lg bg-primary text-primary-foreground rounded-br-none">
                      <p className="text-sm">{turn.prompt}</p>
                    </div>
                  </div>

                  {/* Responses */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">{turn.left.modelName}</h3>
                        {turn.left.streaming && (
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{turn.left.text}</p>
                      {mode === 'battle' && turn.voteStatus === 'idle' && !streaming && (
                        <button
                          onClick={() => handleVote('left', turn.id)}
                          className="mt-4 w-full px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                        >
                          Vote Left
                        </button>
                      )}
                    </div>

                    <div className="rounded-lg border border-border bg-card p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">{turn.right.modelName}</h3>
                        {turn.right.streaming && (
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{turn.right.text}</p>
                      {mode === 'battle' && turn.voteStatus === 'idle' && !streaming && (
                        <button
                          onClick={() => handleVote('right', turn.id)}
                          className="mt-4 w-full px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                        >
                          Vote Right
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Direct Messages */}
              {directMessages?.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {msg.userMessage && (
                    <div className="flex justify-end">
                      <div className="max-w-xl px-4 py-3 rounded-lg bg-primary text-primary-foreground rounded-br-none">
                        <p className="text-sm">{msg.userMessage}</p>
                      </div>
                    </div>
                  )}
                  {msg.assistantMessage && (
                    <div className="flex justify-start">
                      <div className="max-w-xl px-4 py-3 rounded-lg bg-card border border-border rounded-bl-none">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.assistantMessage}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {streaming && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Input */}
          <div className="border-t border-border bg-card/30 backdrop-blur-sm p-6">
            <div className="max-w-4xl mx-auto flex gap-3">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask something... (Ctrl+Enter to send)"
                disabled={streaming}
                className="flex-1 p-4 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
              />
              <button
                onClick={handleSubmit}
                disabled={streaming || !prompt.trim()}
                className="flex items-center justify-center px-6 py-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium h-14"
              >
                Send
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}


