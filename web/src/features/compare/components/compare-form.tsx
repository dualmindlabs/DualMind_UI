import { Play } from 'lucide-react';
import { type FormEvent, useId, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { ModelOption } from '@/features/arena';
import { COMPARE_MAX_PROMPT_CHARS, type CompareInput } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

export interface CompareFormProps {
  /** The catalogue; undefined while it loads. */
  options: readonly ModelOption[] | undefined;
  catalogueFailed: boolean;
  onRetryCatalogue: () => void;
  running: boolean;
  onRun: (input: CompareInput) => void;
}

function ModelSelect({
  label,
  value,
  onChange,
  options,
  disabled,
  otherValue,
}: {
  label: string;
  value: string;
  onChange: (name: string) => void;
  options: readonly ModelOption[] | undefined;
  disabled: boolean;
  otherValue: string;
}) {
  const items = useMemo(
    () => (options ?? []).map(option => ({ value: option.modelName, label: option.displayName })),
    [options],
  );
  return (
    <Field label={label} required>
      {control => (
        <Select
          items={items}
          value={value === '' ? null : value}
          onValueChange={next => onChange(next ?? '')}
          disabled={disabled || options === undefined}
        >
          <SelectTrigger
            {...control}
            data-testid={`compare-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <SelectValue
              placeholder={options === undefined ? 'Loading models' : 'Choose a model'}
            />
          </SelectTrigger>
          <SelectContent>
            {items.map(item => (
              <SelectItem key={item.value} value={item.value} disabled={item.value === otherValue}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}

/**
 * The compare form: a prompt and two named models. Nothing is blind here, so the names are chosen
 * and shown. The result is private unless the switch is on; the copy next to it says so, and says
 * how long a result is kept. The one thing this form cannot do is set a system prompt: the API
 * does not take one for compare, so there is no field to leave it in.
 */
export function CompareForm({
  options,
  catalogueFailed,
  onRetryCatalogue,
  running,
  onRun,
}: CompareFormProps) {
  const [prompt, setPrompt] = useState('');
  const [modelA, setModelA] = useState('');
  const [modelB, setModelB] = useState('');
  const [share, setShare] = useState(false);
  const countId = useId();

  const length = prompt.length;
  const tooLong = length > COMPARE_MAX_PROMPT_CHARS;
  const same = modelA !== '' && modelA === modelB;
  const ready = prompt.trim() !== '' && !tooLong && modelA !== '' && modelB !== '' && !same;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || running) return;
    onRun({ prompt, modelA, modelB, share });
  }

  return (
    <form
      onSubmit={submit}
      data-testid="compare-form"
      className="grid gap-6 surface-float p-5 sm:p-8"
      aria-describedby={countId}
    >
      <Field
        label="Your prompt"
        required
        error={tooLong ? 'That prompt is too long. Shorten it to send it.' : undefined}
      >
        {control => (
          <Textarea
            {...control}
            name="prompt"
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            disabled={running}
            rows={5}
            placeholder="Ask both models the same thing"
          />
        )}
      </Field>
      <p
        id={countId}
        className={cn(
          '-mt-3 text-end font-mono text-caption tabular-nums',
          tooLong ? 'text-bad' : 'text-muted',
        )}
      >
        {length.toLocaleString('en-US')} / {COMPARE_MAX_PROMPT_CHARS.toLocaleString('en-US')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <ModelSelect
          label="Model A"
          value={modelA}
          onChange={setModelA}
          options={options}
          disabled={running}
          otherValue={modelB}
        />
        <ModelSelect
          label="Model B"
          value={modelB}
          onChange={setModelB}
          options={options}
          disabled={running}
          otherValue={modelA}
        />
      </div>

      {catalogueFailed ? (
        <p role="alert" className="flex flex-wrap items-center gap-3 text-ui-sm text-bad">
          The model list did not load.
          <Button variant="ghost" size="sm" onClick={onRetryCatalogue}>
            Try again
          </Button>
        </p>
      ) : null}
      {same ? (
        <p role="status" className="-mt-2 text-ui-sm text-fg-soft">
          Pick two different models.
        </p>
      ) : null}

      <Field
        label="Let anyone with the link read the result"
        layout="control-end"
        description="Off by default. Results are private to you, and are deleted after 30 days."
      >
        {control => (
          <Switch
            {...control}
            checked={share}
            onCheckedChange={setShare}
            disabled={running}
            data-testid="compare-share-switch"
          />
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={running} disabled={!ready && !running}>
          <Play aria-hidden="true" strokeWidth={1.75} />
          {running ? 'Asking both models' : 'Run compare'}
        </Button>
        <p className="text-caption text-muted">
          Up to 6 comparisons a minute. Compare never counts toward the leaderboard.
        </p>
      </div>
    </form>
  );
}
