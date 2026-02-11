'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const faqs = [
  {
    question: 'What is DualMind Lab?',
    answer: 'DualMind Lab is a platform where you can compare responses from different AI models side-by-side and vote on which one provides better answers. Your votes help create community-driven rankings of AI model performance.'
  },
  {
    question: 'How does the voting system work?',
    answer: 'After two AI models respond to your prompt, you can vote for which response was better (Left, Right, or Tie). Models remain anonymous during voting to ensure unbiased evaluation. After you vote, the model identities are revealed.'
  },
  {
    question: 'What are the different modes?',
    answer: 'Arena Mode: Two anonymous models compete, you vote on the winner. Direct Chat: Chat with a specific model of your choice. Side-by-Side: Compare responses from two models you select.'
  },
  {
    question: 'How are models ranked?',
    answer: 'Models are ranked using an ELO rating system, similar to chess rankings. When you vote, the winner gains rating points while the loser loses points. The amount depends on the rating difference between models.'
  },
  {
    question: 'Can I see my voting history?',
    answer: 'Yes! Your threads are saved in the sidebar. You can revisit any conversation and see the models that participated and how you voted.'
  },
  {
    question: 'Do I need an account?',
    answer: 'While you can try DualMind Lab without an account, creating one allows you to save your conversation history, contribute to rankings, and track your participation.'
  },
  {
    question: 'Which AI models are available?',
    answer: 'We feature leading models including GPT-4, Claude, Gemini, and many others. The available models are regularly updated. Check the leaderboard to see the current lineup and their rankings.'
  },
  {
    question: 'Is my data private?',
    answer: 'Yes. Your conversations are private and only used to generate responses. Voting data is anonymized and aggregated for ranking purposes. We do not share your personal information or conversation content.'
  },
  {
    question: 'How can I contribute?',
    answer: 'The best way to contribute is by using the platform and voting on responses! Each vote helps improve the accuracy of our rankings. You can also share interesting comparisons with the community.'
  },
  {
    question: 'What makes a good prompt?',
    answer: 'Good prompts are clear, specific, and have objective criteria for evaluation. Avoid overly subjective questions. Creative, technical, reasoning, and knowledge-based prompts all work well.'
  }
]

function FAQItem({ faq }: { faq: typeof faqs[0] }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-gray-200 dark:border-gray-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 px-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
      >
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {faq.question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-5">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {faq.answer}
          </p>
        </div>
      )}
    </div>
  )
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Everything you need to know about DualMind Lab
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
          {faqs.map((faq, index) => (
            <FAQItem key={index} faq={faq} />
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Still have questions?
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            Try DualMind Lab
          </a>
        </div>
      </div>
    </div>
  )
}
