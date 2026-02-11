import Link from 'next/link'

export default function ModelsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            AI Models
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Meet the AI models competing in DualMind Lab
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 mb-8">
          <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-6">
            DualMind Lab features a diverse collection of state-of-the-art AI language models
            from leading AI research organizations and companies. Each model brings unique
            strengths and capabilities to the arena.
          </p>

          <div className="grid gap-6 mb-8">
            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-2">GPT Series (OpenAI)</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Including GPT-4, GPT-3.5, and variants. Known for strong reasoning, creativity, and instruction following.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-2">Claude Series (Anthropic)</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Claude 3 Opus, Sonnet, and Haiku. Excels at nuanced analysis, extended context, and harmless outputs.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-2">Gemini Series (Google)</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Gemini Pro and variants. Strong multimodal capabilities and factual accuracy.
              </p>
            </div>

            <div className="border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-2">LLaMA & Mistral (Open Source)</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Open-source models providing competitive performance with transparency.
              </p>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-900 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2 text-purple-900 dark:text-purple-100">
              How Rankings Work
            </h3>
            <p className="text-purple-800 dark:text-purple-200">
              All models start with an ELO rating of 1000. When you vote, ratings are adjusted based on the outcome
              and the rating difference between models. This creates a dynamic, community-driven ranking that
              reflects real-world performance across diverse tasks.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/leaderboard"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors text-center"
          >
            View Current Rankings
          </Link>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors text-center"
          >
            Try the Arena
          </Link>
        </div>
      </div>
    </div>
  )
}
