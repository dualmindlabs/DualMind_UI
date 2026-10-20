import { Field, GroupField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { KitCard } from './kit-card';

const languages = [
  { value: 'auto', label: 'Same as the prompt' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ja', label: 'Japanese' },
];

/** Text fields, select and the one-time code input, with labels, descriptions and errors wired. */
export function KitFields() {
  return (
    <KitCard
      title="Fields"
      source="@/components/ui/field"
      description="Field hands the control its id, aria-describedby and aria-invalid, so a description or error is never left unlinked."
      className="lg:col-span-2"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Share title" description="Shown when you share a battle.">
          {control => (
            <Input {...control} name="share-title" placeholder="Two takes on recursion" />
          )}
        </Field>
        <Field label="Model search" description="Pinned focus ring, for the review.">
          {control => (
            <Input
              {...control}
              name="model-search"
              defaultValue="claude"
              className="focus-ring-demo"
              tabIndex={-1}
            />
          )}
        </Field>
        <Field label="Contact address" required error="Enter a full address, like ada@example.com.">
          {control => (
            <Input
              {...control}
              name="contact"
              type="email"
              autoComplete="off"
              defaultValue="ada@"
            />
          )}
        </Field>
        <Field label="Workspace" description="Set by your team, read only here.">
          {control => <Input {...control} name="workspace" defaultValue="DualMind Labs" disabled />}
        </Field>
        <Field label="Answer language" description="Both models answer in this language.">
          {control => (
            <Select items={languages} defaultValue="auto" name="answer-language">
              <SelectTrigger {...control}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Language</SelectLabel>
                  {languages.map(language => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </Field>
        <GroupField label="Verification code" description="Six digits, sent to your email.">
          {group => (
            <InputOTP maxLength={6} defaultValue="4821" name="verification-code" {...group}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          )}
        </GroupField>
        <Field
          label="What made the better answer better?"
          description="Optional. Helps us explain the leaderboard."
          className="sm:col-span-2 lg:col-span-3"
        >
          {control => (
            <Textarea
              {...control}
              name="vote-reason"
              rows={3}
              placeholder="It cited sources and kept the code runnable"
            />
          )}
        </Field>
      </div>
    </KitCard>
  );
}
