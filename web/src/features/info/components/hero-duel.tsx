import { ModelMark } from '@/components/ui/model-mark';

/**
 * Decoration for the page hero: two anonymous answer cards, one per Mind, with a "hidden until you
 * vote" plate. It repeats the product's one idea above the fold of every info page. Hidden from
 * assistive tech and from phones' first screen (it only shows from the lg breakpoint).
 */
export function HeroDuel() {
  const lines = ['w-[92%]', 'w-[78%]', 'w-[86%]', 'w-[54%]'];
  return (
    <div aria-hidden="true" className="relative hidden h-[22rem] w-full max-w-md lg:block">
      <div className="surface-a absolute top-0 left-0 w-[68%] -rotate-3 p-5">
        <div className="flex items-center gap-3">
          <ModelMark name="A" who="a" size="sm" />
          <span className="eyebrow text-mind-a">Mind A</span>
        </div>
        <div className="mt-5 grid gap-2.5">
          {lines.map((width, index) => (
            <span key={index} className={`h-2 rounded-full bg-line-strong/70 ${width}`} />
          ))}
        </div>
      </div>
      <div className="surface-b absolute right-0 bottom-0 w-[68%] rotate-2 p-5">
        <div className="flex items-center gap-3">
          <ModelMark name="B" who="b" size="sm" />
          <span className="eyebrow text-mind-b-text">Mind B</span>
        </div>
        <div className="mt-5 grid gap-2.5">
          {[...lines].reverse().map((width, index) => (
            <span key={index} className={`h-2 rounded-full bg-line-strong/70 ${width}`} />
          ))}
        </div>
      </div>
      <div className="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center">
        <span className="grid size-14 place-items-center surface-float rounded-full border border-line-strong font-mono text-ui font-semibold text-fg">
          VS
        </span>
      </div>
    </div>
  );
}
