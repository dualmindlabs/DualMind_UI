"use client"

import { useMemo } from "react"
import { marked } from "marked"
import DOMPurify from "dompurify"

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return ""
    try {
      const rawHtml = marked.parse(content, { async: false, breaks: true, gfm: true }) as string
      return DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } })
    } catch {
      return content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>")
    }
  }, [content])

  return (
    <div
      className="prose prose-sm prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground/85 prose-a:text-primary prose-strong:text-foreground prose-code:text-primary prose-pre:bg-black/50 prose-pre:border prose-pre:border-border/50"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
