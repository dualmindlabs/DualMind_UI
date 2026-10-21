import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { copyText } from '@/lib/utils/clipboard';
import { cn } from '@/lib/utils/cn';

import { SUCCESS_POP } from '../lib/press';

export interface CopyButtonProps {
  text: string;
  /** The accessible name, for example "Copy answer A". */
  label: string;
  /** Shows the word "Copy" next to the icon. */
  showLabel?: boolean;
  className?: string;
}

/**
 * Copies text, then shows a check for two seconds (it pops in, and the button turns green); a
 * failure says so in a toast. Press, hover, focus and touch size come from the kit's Button.
 */
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
      <Icon
        key={copied ? 'copied' : 'copy'}
        aria-hidden="true"
        strokeWidth={1.75}
        className={copied ? SUCCESS_POP : undefined}
      />
      {showLabel ? (
        <>
          <span aria-hidden="true">{copied ? 'Copied' : 'Copy'}</span>
          <span className="sr-only">{copied ? `${label}: copied` : label}</span>
        </>
      ) : null}
    </Button>
  );
}
