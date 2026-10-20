import { demoBattle } from '../lib/demo-battle';
import { AnswerPane } from './answer-pane';
import { VoteBar } from './vote-bar';

/** A battle at rest: your prompt (terra), two equal answer panes (A cyan, B violet), the verdict. */
export function BattleDemo() {
  return (
    <figure className="rounded-xl border border-line bg-surface p-3 shadow-raise-strong sm:p-5">
      <div className="flex flex-col gap-2 rounded-lg border border-human/30 bg-human-tint px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
        <span className="eyebrow text-human">Your prompt</span>
        <p className="text-body text-fg">{demoBattle.prompt}</p>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <AnswerPane role="a" meta={demoBattle.a.meta}>
          {demoBattle.a.paragraphs.map(text => (
            <p key={text}>{text}</p>
          ))}
        </AnswerPane>
        <AnswerPane role="b" meta={demoBattle.b.meta}>
          {demoBattle.b.paragraphs.map(text => (
            <p key={text}>{text}</p>
          ))}
        </AnswerPane>
      </div>
      <div className="mt-4">
        <VoteBar />
      </div>
      <figcaption className="mt-4 border-t border-line pt-4 text-caption text-muted">
        Static demo. Both panes use identical type and surfaces; only the letter, the position and
        a 10% tint tell them apart.
      </figcaption>
    </figure>
  );
}
