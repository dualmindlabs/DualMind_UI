import { Check, Copy, ReceiptText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { VoteReceipt } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

/** First 8 and last 4 characters of the entry hash: enough to compare by eye, short enough to fit. */
export function shortHash(hash: string): string {
  return hash.length <= 14 ? hash : `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

/**
 * The vote's receipt, shown after a vote while the API's receipts flag is on: the entry hash in
 * Geist Mono, as a button that copies the full hash. The vote sits at this position in the public,
 * hash-chained vote log; the link says how to check it. Nothing renders without a receipt, so with
 * the flag off the reveal is exactly what it was.
 */
export function ReceiptChip({ receipt, className }: { receipt: VoteReceipt; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(receipt.entryHash);
      setFailed(false);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (or no secure context): say so, the short hash is on screen.
      setCopied(false);
      setFailed(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setFailed(false), 4000);
    }
  }

  return (
    <div
      data-testid="receipt-chip"
      className={cn('flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5', className)}
    >
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`Vote receipt, entry ${receipt.seq}, hash ${receipt.entryHash.slice(0, 8)}. Copy the full hash.`}
        className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1 font-mono text-caption text-fg-soft transition-colors duration-(--dur-fast) outline-none hover:bg-hover focus-visible:outline-(length:--focus-width) focus-visible:outline-offset-2 focus-visible:outline-focus focus-visible:outline-solid"
      >
        <ReceiptText aria-hidden="true" strokeWidth={1.75} className="size-3.5 text-human" />
        <span className="tracking-[0.08em] text-muted uppercase">Receipt</span>
        <span className="numeric text-fg" data-testid="receipt-hash">
          {shortHash(receipt.entryHash)}
        </span>
        {copied ? (
          <Check aria-hidden="true" strokeWidth={1.75} className="size-3.5 text-ok" />
        ) : (
          <Copy aria-hidden="true" strokeWidth={1.75} className="size-3.5 text-muted" />
        )}
      </button>
      <a
        href="/methodology/#receipts"
        className="rounded-sm text-caption text-fg-soft underline decoration-line-strong underline-offset-4 hover:text-fg hover:decoration-current"
      >
        How to verify
      </a>
      <span
        role="status"
        data-testid="receipt-copy-status"
        className={failed ? 'text-caption text-warn' : 'sr-only'}
      >
        {copied ? 'Receipt hash copied' : failed ? 'Could not copy. Copy it by hand from the page.' : ''}
      </span>
    </div>
  );
}
