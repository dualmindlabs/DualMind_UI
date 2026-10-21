import { CirclePause, Monitor, Moon, Play, Sun } from 'lucide-react';

import { useMotionPreference } from '@/hooks/use-motion-preference';
import { useSystemReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import type { MotionPreference } from '@/lib/motion/motion-preference';
import type { ThemePreference } from '@/lib/theme/theme';

import { useSavedFlash } from '../hooks/use-saved-flash';
import { ChoiceCards, type ChoiceOption } from './choice-cards';
import { SavedNote, SettingsCard, SettingsSection } from './settings-card';
import { ThemePreview } from './theme-preview';

const THEME_OPTIONS: ReadonlyArray<ChoiceOption<ThemePreference>> = [
  {
    value: 'system',
    label: 'System',
    icon: Monitor,
    description: 'Follows your device',
    preview: <ThemePreview preference="system" />,
  },
  {
    value: 'light',
    label: 'Light',
    icon: Sun,
    description: 'Bright surfaces',
    preview: <ThemePreview preference="light" />,
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: Moon,
    description: 'Graphite, easy at night',
    preview: <ThemePreview preference="dark" />,
  },
];

function ThemeCard() {
  const { preference, setPreference } = useTheme();
  const [saved, flash] = useSavedFlash();
  return (
    <SettingsCard
      title="Theme"
      description="The colours of every page. The header’s theme switch changes the same setting."
      footer={
        <>
          <span>Applied before the page paints, so it never flashes the other theme.</span>
          <SavedNote visible={saved} />
        </>
      }
    >
      {({ descriptionId }) => (
        <ChoiceCards
          legend="Theme"
          dense
          value={preference}
          options={THEME_OPTIONS}
          describedBy={descriptionId}
          onChange={value => {
            setPreference(value);
            flash();
          }}
        />
      )}
    </SettingsCard>
  );
}

function MotionCard() {
  const { preference, setPreference } = useMotionPreference();
  const systemReduce = useSystemReducedMotion();
  const [saved, flash] = useSavedFlash();
  const options: ReadonlyArray<ChoiceOption<MotionPreference>> = [
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      description: systemReduce
        ? 'Your device asks for reduced motion, so effects are still.'
        : 'Your device allows motion, so effects play.',
    },
    {
      value: 'reduce',
      label: 'Reduce',
      icon: CirclePause,
      description: 'Nothing moves: no animations, transitions or moving backgrounds.',
    },
    {
      value: 'allow',
      label: 'Allow',
      icon: Play,
      description: 'Animations play even if your device asks for less motion.',
    },
  ];
  return (
    <SettingsCard
      title="Motion"
      description="Animations, the battle reveal and the moving backgrounds. Reduce stops them everywhere in the Arena."
      footer={
        <>
          <span>With Reduce, battle answers and the reveal appear at once.</span>
          <SavedNote visible={saved} />
        </>
      }
    >
      {({ descriptionId }) => (
        <ChoiceCards
          legend="Motion"
          value={preference}
          options={options}
          describedBy={descriptionId}
          onChange={value => {
            setPreference(value);
            flash();
          }}
        />
      )}
    </SettingsCard>
  );
}

/** Appearance: the colour theme and the motion override, both stored on this device. */
export function AppearanceSection() {
  return (
    <SettingsSection
      id="appearance"
      title="Appearance"
      description="How DualMind Arena looks on this device. Saved in this browser, not in your account."
    >
      <ThemeCard />
      <MotionCard />
    </SettingsSection>
  );
}
