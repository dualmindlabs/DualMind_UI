/**
 * Toasts on Sonner, styled with our tokens, and the `toast()` helper with our defaults.
 * Source: shadcn/ui `sonner` (base-vega), MIT, see ./LICENSE.md.
 * Changes: unstyled Sonner toasts drawn with our raised surface and type tokens, status icons in
 * the status colours (with words, never colour alone), the theme from useTheme() instead of
 * next-themes, longer default time for errors.
 *
 * Mount <Toaster /> once (src/app/root.tsx). Toasts are announced through Sonner's polite live
 * region ("Notifications", Alt+T moves focus to it). Use them for confirmations (vote saved, link
 * copied), connection changes and errors with a retry action, never for the only copy of
 * important information.
 */
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { type ExternalToast, toast as sonnerToast, Toaster as Sonner, type ToasterProps } from 'sonner';

import { useTheme } from '@/hooks/use-theme';

export function Toaster(props: ToasterProps) {
  const { preference } = useTheme();

  return (
    <Sonner
      theme={preference}
      position="bottom-right"
      offset={24}
      mobileOffset={16}
      gap={10}
      visibleToasts={4}
      closeButton
      icons={{
        success: <CircleCheck className="size-4.5 text-ok" strokeWidth={2} />,
        info: <Info className="size-4.5 text-mind-a" strokeWidth={2} />,
        warning: <TriangleAlert className="size-4.5 text-warn" strokeWidth={2} />,
        error: <CircleAlert className="size-4.5 text-bad" strokeWidth={2} />,
        loading: <LoaderCircle className="size-4.5 animate-spin text-muted" strokeWidth={2} />,
        close: <X className="size-3.5" strokeWidth={2} />,
      }}
      toastOptions={{
        unstyled: true,
        duration: 5000,
        classNames: {
          toast:
            'group/toast flex w-(--width) items-start gap-3 rounded-lg border border-line bg-surface-2 py-3.5 pr-11 pl-4 font-sans text-ui-sm text-fg shadow-raise-strong',
          icon: 'mt-px flex size-4.5 shrink-0 items-center justify-center',
          content: 'grid min-w-0 flex-1 gap-0.5',
          title: 'font-medium text-fg',
          description: 'text-ui-sm text-muted',
          actionButton:
            'ml-2 inline-flex h-8 shrink-0 cursor-pointer items-center rounded-md bg-mind-a px-3 text-ui-sm font-medium text-on-accent transition-colors duration-(--dur-fast) hover:bg-[color-mix(in_oklab,var(--mind-a)_86%,var(--fg))]',
          cancelButton:
            'ml-2 inline-flex h-8 shrink-0 cursor-pointer items-center rounded-md px-3 text-ui-sm font-medium text-fg-soft hover:bg-hover hover:text-fg',
          closeButton:
            'absolute top-2.5 right-2.5 grid size-7 cursor-pointer place-items-center rounded-md text-muted transition-colors duration-(--dur-fast) hover:bg-hover hover:text-fg',
        },
      }}
      {...props}
    />
  );
}

type ToastMessage = Parameters<typeof sonnerToast>[0];

/** Errors stay longer: people need time to read them and reach the retry action. */
const ERROR_DURATION = 9000;

/**
 * Sonner's `toast()` with our defaults. Import it from here, not from 'sonner':
 *
 *   toast.success('Vote saved');
 *   toast.error('Could not reach the Arena', { action: { label: 'Retry', onClick: retry } });
 */
export const toast = Object.assign(
  (message: ToastMessage, data?: ExternalToast) => sonnerToast(message, data),
  sonnerToast,
  {
    error: (message: ToastMessage, data?: ExternalToast) =>
      sonnerToast.error(message, { duration: ERROR_DURATION, ...data }),
  },
);
