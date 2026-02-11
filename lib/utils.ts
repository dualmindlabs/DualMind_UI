import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Prettify model name for display
 * Converts "llama-3.3-70b-versatile" -> "Llama 3.3 70B Versatile"
 */
export function prettifyModelName(modelName: string): string {
  if (!modelName) return modelName
  return modelName
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/\d+b\b/gi, (m) => m.toUpperCase())
}

/**
 * Strip provider prefix and description from model name
 */
export function cleanModelName(name: string): string {
  if (!name || name === "undefined" || name === "null") return "Unknown"
  let clean = name.split("\u2013")[0].split(" - ")[0].trim()
  clean = clean.replace(/^[^/]+\//, "")
  return clean
}

/**
 * Stream text character-by-character with configurable speed
 */
export function streamText(
  fullText: string,
  onChunk: (chunk: string) => void,
  options: {
    minDelay?: number
    maxDelay?: number
    minChunk?: number
    maxChunk?: number
  } = {}
): { promise: Promise<void>; cancel: () => void } {
  const { minDelay = 5, maxDelay = 15, minChunk = 2, maxChunk = 8 } = options
  let cancelled = false
  let timeoutId: ReturnType<typeof setTimeout>

  const promise = new Promise<void>((resolve) => {
    let pos = 0

    function next() {
      if (cancelled || pos >= fullText.length) {
        resolve()
        return
      }
      const chunkSize =
        Math.floor(Math.random() * (maxChunk - minChunk + 1)) + minChunk
      const chunk = fullText.slice(pos, pos + chunkSize)
      pos += chunkSize
      onChunk(chunk)
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
      timeoutId = setTimeout(next, delay)
    }

    next()
  })

  return {
    promise,
    cancel: () => {
      cancelled = true
      clearTimeout(timeoutId)
    },
  }
}
