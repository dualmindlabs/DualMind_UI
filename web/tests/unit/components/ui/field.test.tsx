import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Checkbox } from '@/components/ui/checkbox';
import { Field, GroupField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

describe('Field', () => {
  it('labels the control with a real <label>', () => {
    render(<Field label="Display name">{control => <Input {...control} />}</Field>);
    const input = screen.getByRole('textbox', { name: 'Display name' });
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('links the description', () => {
    render(
      <Field label="Display name" description="Shown on the battles you share.">
        {control => <Input {...control} />}
      </Field>,
    );
    expect(screen.getByRole('textbox', { name: 'Display name' })).toHaveAccessibleDescription(
      'Shown on the battles you share.',
    );
  });

  it('links the error after the description and marks the control invalid', () => {
    render(
      <Field label="Email" description="We never share it." error="Enter a full address.">
        {control => <Input {...control} type="email" />}
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('We never share it. Enter a full address.');
  });

  it('marks required fields in text and for assistive tech', () => {
    render(
      <Field label="Email" required>
        {control => <Input {...control} type="email" />}
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email (required)' });
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('gives each field its own ids', () => {
    render(
      <>
        <Field label="First" description="One">
          {control => <Input {...control} />}
        </Field>
        <Field label="Second" description="Two">
          {control => <Input {...control} />}
        </Field>
      </>,
    );
    const first = screen.getByRole('textbox', { name: 'First' });
    const second = screen.getByRole('textbox', { name: 'Second' });
    expect(first.id).not.toBe(second.id);
    expect(first).toHaveAccessibleDescription('One');
    expect(second).toHaveAccessibleDescription('Two');
  });

  it('names Base UI checkboxes and switches through the label (inline layouts)', () => {
    render(
      <>
        <Field label="Show model names" description="After you vote." layout="control-start">
          {control => <Checkbox {...control} />}
        </Field>
        <Field label="Keyboard shortcuts" layout="control-end">
          {control => <Switch {...control} />}
        </Field>
      </>,
    );
    expect(screen.getByRole('checkbox', { name: 'Show model names' })).toHaveAccessibleDescription(
      'After you vote.',
    );
    expect(screen.getByRole('switch', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  });
});

describe('GroupField', () => {
  it('names a radio group and links its description and error', () => {
    render(
      <GroupField label="Default mode" description="Where a new chat starts." error="Pick one.">
        {group => (
          <RadioGroup {...group}>
            <Field label="Battle" layout="control-start">
              {control => <RadioGroupItem {...control} value="battle" />}
            </Field>
            <Field label="Direct" layout="control-start">
              {control => <RadioGroupItem {...control} value="direct" />}
            </Field>
          </RadioGroup>
        )}
      </GroupField>,
    );
    const group = screen.getByRole('radiogroup', { name: 'Default mode' });
    expect(group).toHaveAccessibleDescription('Where a new chat starts. Pick one.');
    expect(group).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('radio', { name: 'Battle' })).toBeInTheDocument();
  });
});
