'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { Thread } from '@/lib/types'
import { ChatView } from '@/src/components/chat-view'
import { Loader2 } from 'lucide-react'

export default function SharedThreadPage() {
  const params = useParams()
  const router = useRouter()
  const shareId = params?.shareId as string
  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSharedThread() {
      if (!shareId) return

      try {
        setLoading(true)
        const data = await apiClient.getSharedThread(shareId)
        setThread(data)
      } catch (err) {
        setError('Failed to load shared thread')
        console.error('Error loading shared thread:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSharedThread()
  }, [shareId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading shared thread...</p>
        </div>
      </div>
    )
  }

  if (error || !thread) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-2xl font-bold mb-2">Thread Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'This shared thread could not be found or is no longer available.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Go to Arena
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Shared Thread</h1>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Try DualMind Lab
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Shared by user on {new Date(thread.updated_at).toLocaleDateString()}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChatView
            messages={thread.model_a_messages || []}
            modelName={thread.model_a || 'Model A'}
            isStreaming={false}
            position="left"
          />
          <ChatView
            messages={thread.model_b_messages || []}
            modelName={thread.model_b || 'Model B'}
            isStreaming={false}
            position="right"
          />
        </div>

        {thread.result && (
          <div className="mt-6 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vote result: <span className="font-semibold">{thread.result}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
