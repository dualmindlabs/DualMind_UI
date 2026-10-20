import { roleDetails } from '../lib/roles';
import { BattleDemo } from './battle-demo';
import { RoleCard } from './role-card';
import { Section } from './section';

export function RolesSection() {
  return (
    <Section
      id="roles"
      title={
        <>
          Three roles, <span className="human-voice text-human">one of them yours.</span>
        </>
      }
      lead={
        <p>
          A battle needs two colours of equal status that never read as good or bad, so never red
          against green, plus one warm colour for the person judging. Machine voices are cool, the
          human voice is warm.
        </p>
      }
    >
      <ul className="grid gap-4 md:grid-cols-3">
        {roleDetails.map(detail => (
          <RoleCard key={detail.role} {...detail} />
        ))}
      </ul>
      <div className="mt-10">
        <h3 className="text-h3 font-semibold">A battle, at rest</h3>
        <div className="mt-5">
          <BattleDemo />
        </div>
      </div>
    </Section>
  );
}
