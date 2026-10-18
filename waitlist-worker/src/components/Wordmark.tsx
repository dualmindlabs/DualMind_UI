import DecryptedText from './reactbits/DecryptedText';

/**
 * The DualMind wordmark: DUALMIND in Bricolage 800 caps with a cyan suffix (LABS on the landing
 * page, ARENA here). Hovering scrambles and resolves the letters, a nod to the landing page's
 * split-flap wordmark.
 */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-[0.4em] font-extrabold uppercase tracking-[-0.01em] ${className}`}>
      <DecryptedText
        text="DUALMIND"
        animateOn="hover"
        characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        speed={45}
        maxIterations={7}
        sequential
        encryptedClassName="text-cyan"
      />
      <span className="text-cyan">Arena</span>
    </span>
  );
}
