import { buttonVariants } from '@/components/ui/button';

import { SIGN_IN_HREF } from '../content/landing';

/**
 * Shown above the demo when the visitor sent their own prompt from the hero: it cannot reach real
 * models signed out, so the page says that plainly, plays a recorded battle and offers sign-in.
 */
export function AskedNote({ prompt }: { prompt: string }) {
  return (
    <div
      data-testid="asked-note"
      className="flex flex-col gap-3 rounded-lg border border-human/40 bg-human-tint p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <p className="min-w-0 text-ui text-fg">
        <span className="font-medium">You asked: </span>
        <span className="[overflow-wrap:anywhere]">&ldquo;{prompt}&rdquo;</span>{' '}
        <span className="text-fg-soft">
          Real models answer it once you sign in. Until then, here is a recorded battle.
        </span>
      </p>
      <a href={SIGN_IN_HREF} className={buttonVariants({ variant: 'human', size: 'sm' })}>
        Sign in to battle real models
      </a>
    </div>
  );
}
