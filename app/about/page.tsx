export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            About DualMind Lab
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Advancing AI through competitive collaboration
          </p>
        </div>

        <div className="space-y-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          <section>
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Our Mission
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              DualMind Lab is revolutionizing how we evaluate and improve AI systems by creating
              an arena where different AI models compete to provide the best responses to user queries.
              Through community voting and transparent rankings, we help users discover which models
              excel at different types of tasks.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              How It Works
            </h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Ask Your Question</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Enter any prompt or question you want the AI models to answer
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Compare Responses</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Two different AI models respond in parallel - you can watch their responses stream in real-time
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">Vote for the Best</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose which response was better, or declare it a tie. Your vote helps improve the rankings
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Why DualMind?
            </h2>
            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-3">
                <span className="text-purple-500 font-bold">→</span>
                <span><strong>Blind Testing:</strong> Models are anonymous until you vote, ensuring unbiased evaluations</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-500 font-bold">→</span>
                <span><strong>Community-Driven:</strong> Rankings reflect real user preferences, not theoretical benchmarks</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-500 font-bold">→</span>
                <span><strong>Multiple Modes:</strong> Test models in Arena, Direct Chat, or Side-by-Side comparison modes</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-purple-500 font-bold">→</span>
                <span><strong>Transparent:</strong> View comprehensive leaderboards and statistics for all models</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Join the Community
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
              Every vote you cast helps improve our understanding of AI capabilities. Join thousands
              of users helping to evaluate and rank the world's leading AI models.
            </p>
            <div className="flex gap-4">
              <a
                href="/"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Start Comparing
              </a>
              <a
                href="/leaderboard"
                className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                View Leaderboard
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
