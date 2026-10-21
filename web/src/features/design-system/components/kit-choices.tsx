import { Checkbox } from '@/components/ui/checkbox';
import { Field, GroupField } from '@/components/ui/field';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

import { KitCard, KitState } from './kit-card';

const modes = [
  { value: 'battle', label: 'Battle', description: 'Two anonymous models, names after your vote' },
  { value: 'side', label: 'Side by side', description: 'Pick both models yourself' },
  { value: 'direct', label: 'Direct', description: 'Chat with one model' },
];

/** Checkboxes, radios and switches: 20px controls with 24px targets (44px on touch screens). */
export function KitChoices() {
  return (
    <KitCard
      title="Choices"
      source="@/components/ui/checkbox, radio-group, switch"
      description="Base UI controls with a hidden native input, so forms and autofill work. Ticked and on states use Mind A plus a shape change, never colour alone."
    >
      <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
        <div className="grid content-start gap-4">
          <Field label="Show model names after voting" layout="control-start">
            {control => <Checkbox {...control} name="reveal" defaultChecked />}
          </Field>
          <Field
            label="Include my votes in public statistics"
            description="Anonymous, aggregated with everyone else's."
            layout="control-start"
          >
            {control => <Checkbox {...control} name="stats" />}
          </Field>
          <Field label="Some categories selected" layout="control-start">
            {control => <Checkbox {...control} name="categories" indeterminate />}
          </Field>
          <Field label="Locked by your workspace" layout="control-start">
            {control => <Checkbox {...control} name="locked" defaultChecked disabled />}
          </Field>
        </div>
        <GroupField label="Default mode" description="Where a new chat starts.">
          {group => (
            <RadioGroup {...group} defaultValue="battle" name="mode">
              {modes.map(mode => (
                <Field
                  key={mode.value}
                  label={mode.label}
                  description={mode.description}
                  layout="control-start"
                >
                  {control => <RadioGroupItem {...control} value={mode.value} />}
                </Field>
              ))}
            </RadioGroup>
          )}
        </GroupField>
        <div className="grid content-start gap-4 sm:col-span-2 sm:grid-cols-2">
          <Field
            label="Keyboard shortcuts"
            description="1 and 2 vote, N starts a new battle."
            layout="control-end"
          >
            {control => <Switch {...control} name="shortcuts" defaultChecked />}
          </Field>
          <Field label="Reduce motion in the Arena" layout="control-end">
            {control => <Switch {...control} name="reduce-motion" />}
          </Field>
        </div>
        <KitState label="Off, on, disabled" className="sm:col-span-2">
          <Switch aria-label="Example switch, off" />
          <Switch aria-label="Example switch, on" defaultChecked />
          <Switch aria-label="Example switch, disabled" disabled />
          <Checkbox aria-label="Example checkbox, unticked" />
          <Checkbox aria-label="Example checkbox, ticked" defaultChecked />
          <Checkbox aria-label="Example checkbox, disabled" disabled />
        </KitState>
      </div>
    </KitCard>
  );
}
