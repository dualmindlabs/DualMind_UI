import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils/cn';

/** Writes text to the clipboard; false when the browser refuses (permissions, insecure page). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export interface CopyButtonProps {
  text: string;
  /** The accessible name, for example "Copy answer A". */
  label: string;
  /** Shows the word "Copy" next to the icon. */
  showLabel?: boolean;
  className?: string;
}

/** Copies text, then shows a check for two seconds; a failure says so in a toast. */
export function CopyButton({ text, label, showLabel = false, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (await copyText(text)) setCopied(true);
    else toast.error('Could not copy', { description: 'The browser blocked the clipboard.' });
  };

  const Icon = copied ? Check : Copy;
  return (
    <Button
      variant="ghost"
      size={showLabel ? 'xs' : 'icon-xs'}
      aria-label={showLabel ? undefined : copied ? `${label}: copied` : label}
      onClick={() => void copy()}
      className={cn('text-muted hover:text-fg', copied && 'text-ok hover:text-ok', className)}
    >
      <Icon aria-hidden="true" strokeWidth={1.75} />
      {showLabel ? (
        <>
          <span aria-hidden="true">{copied ? 'Copied' : 'Copy'}</span>
          <span className="sr-only">{copied ? `${label}: copied` : label}</span>
        </>
      ) : null}
    </Button>
  );
}
