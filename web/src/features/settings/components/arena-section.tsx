import {
  ArrowLeftRight,
  CornerDownLeft,
  type LucideIcon,
  MessageSquare,
  Swords,
} from 'lucide-react';

import { Field } from '@/components/ui/field';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Switch } from '@/components/ui/switch';
import {
  ARENA_MODES,
  ARENA_PREFERENCE_KEYS,
  type ArenaMode,
  isArenaMode,
  MODE_DETAILS,
  type SendKey,
  sendKeyFrom,
  useStoredValue,
} from '@/features/arena';
import { useModifierKey } from '@/hooks/use-modifier-key';

import { useSavedFlash } from '../hooks/use-saved-flash';
import { ChoiceCards,type ChoiceOption } from './choice-cards';
import { SavedNote, SettingsCard, SettingsSection } from './settings-card';

const MODE_ICONS: Record<ArenaMode, LucideIcon> = {
  battle: Swords,
  side: ArrowLeftRight,
  direct: MessageSquare,
};

const MODE_OPTIONS: ReadonlyArray<ChoiceOption<ArenaMode>> = ARENA_MODES.map(mode => ({
  value: mode,
  label: MODE_DETAILS[mode].label,
  description: MODE_DETAILS[mode].description,
  icon: MODE_ICONS[mode],
}));

function DefaultModeCard() {
  // The arena reads and writes the same key (dm.arena.mode): the mode you last used.
  const [stored, setStored] = useStoredValue(ARENA_PREFERENCE_KEYS.mode);
  const mode: ArenaMode = isArenaMode(stored) ? stored : 'battle';
  const [saved, flash] = useSavedFlash();
  return (
    <SettingsCard
      title="Default mode"
      description="The mode a new conversation starts in."
      footer={
        <>
          <span>Switching modes in the arena changes this too.</span>
          <SavedNote visible={saved} />
        </>
      }
    >
      {({ descriptionId }) => (
        <ChoiceCards
          legend="Default mode"
          value={mode}
          options={MODE_OPTIONS}
          describedBy={descriptionId}
          onChange={value => {
            setStored(value);
            flash();
          }}
        />
      )}
    </SettingsCard>
  );
}

function Keys({ keys }: { keys: readonly string[] }) {
  return (
    <KbdGroup>
      {keys.map(key => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </KbdGroup>
  );
}

function SendKeyCard() {
  const [stored, setStored] = useStoredValue(ARENA_PREFERENCE_KEYS.send);
  const sendKey = sendKeyFrom(stored);
  const modifier = useModifierKey();
  const [saved, flash] = useSavedFlash();
  const options: ReadonlyArray<ChoiceOption<SendKey>> = [
    {
      value: 'enter',
      label: 'Enter sends',
      icon: CornerDownLeft,
      description: (
        <span className="flex flex-wrap items-center gap-1.5">
          <Keys keys={['Shift', 'Enter']} /> adds a line
        </span>
      ),
    },
    {
      value: 'mod-enter',
      label: `${modifier}+Enter sends`,
      icon: CornerDownLeft,
      description: (
        <span className="flex flex-wrap items-center gap-1.5">
          <Keys keys={['Enter']} /> adds a line, for long prompts
        </span>
      ),
    },
  ];
  return (
    <SettingsCard
      title="Sending a prompt"
      description="Which key sends what you typed in the prompt box."
      footer={
        <>
          <span>
            <Keys keys={[modifier, 'Enter']} /> sends with either choice.
          </span>
          <SavedNote visible={saved} />
        </>
      }
    >
      {({ descriptionId }) => (
        <ChoiceCards
          legend="Sending a prompt"
          value={sendKey}
          options={options}
          columns={2}
          describedBy={descriptionId}
          onChange={value => {
            setStored(value === 'mod-enter' ? 'mod-enter' : null);
            flash();
          }}
        />
      )}
    </SettingsCard>
  );
}

function SingleKeyCard() {
  const [stored, setStored] = useStoredValue(ARENA_PREFERENCE_KEYS.shortcuts);
  const enabled = stored !== 'off';
  const modifier = useModifierKey();
  const [saved, flash] = useSavedFlash();
  return (
    <SettingsCard
      title="Single-key shortcuts"
      footer={
        <>
          <span>Shortcuts with {modifier} keep working either way.</span>
          <SavedNote visible={saved} />
        </>
      }
    >
      <Field
        label="Use single-key shortcuts"
        layout="control-end"
        description="N for a new battle, / for the prompt box, [ for the history and 1 to 4 to vote. Turn them off if they get in the way of speech input or a screen reader."
      >
        {control => (
          <Switch
            {...control}
            name="single-key-shortcuts"
            checked={enabled}
            onCheckedChange={checked => {
              setStored(checked ? null : 'off');
              flash();
            }}
          />
        )}
      </Field>
    </SettingsCard>
  );
}

/** Arena: the default mode, the send key and the single-key shortcuts (WCAG 2.1.4). */
export function ArenaSection() {
  return (
    <SettingsSection
      id="arena"
      title="Arena"
      description="How battles and chats start and how the keyboard works. Saved in this browser."
    >
      <DefaultModeCard />
      <SendKeyCard />
      <SingleKeyCard />
    </SettingsSection>
  );
}
