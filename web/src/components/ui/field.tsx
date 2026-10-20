/**
 * Form field helpers: a label, a control, a description and an error, wired for assistive tech.
 * Source: shadcn/ui `field` (base-vega), MIT, see ./LICENSE.md, for the layout and naming.
 * Changes: the wiring is ours. <Field> and <GroupField> generate the ids and hand the control
 * `id`, `aria-describedby`, `aria-invalid` and `aria-required` through a render prop, so a field
 * can never ship with an unlinked hint or error.
 */
import { CircleAlert } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { cn } from '@/lib/utils/cn';

/** Props a <Field> hands to its control so the label, description and error are announced. */
export interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
}

/** Props a <GroupField> hands to its group control (a radio group, a toggle group...). */
export interface GroupFieldControlProps {
  'aria-labelledby': string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
}

type FieldLayout = 'stack' | 'control-start' | 'control-end';

export interface FieldProps {
  label: ReactNode;
  /** Help text under the control, announced with it. */
  description?: ReactNode;
  /** Shown in the bad colour and announced with the control; also sets aria-invalid. */
  error?: ReactNode;
  /** Adds aria-required and a visible "Required" marker next to the label. */
  required?: boolean;
  /**
   * `stack`: label above the control (inputs, selects). `control-start`: the control before the
   * label (checkboxes, radios). `control-end`: the label first, the control at the end (switches).
   */
  layout?: FieldLayout;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

function describedBy(...ids: Array<string | false>): string | undefined {
  const joined = ids.filter(Boolean).join(' ');
  return joined || undefined;
}

/** The small "Required" marker: text, not a lone asterisk, so it is announced and understood. */
function RequiredMark() {
  return <span className="text-caption font-normal text-muted">(required)</span>;
}

export function FieldDescription({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} data-slot="field-description" className="text-caption text-muted">
      {children}
    </p>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} data-slot="field-error" className="flex items-start gap-1.5 text-caption text-bad">
      <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}

/**
 * Label, control, description and error, wired together: a real <label>, the description and
 * error linked with aria-describedby, aria-invalid while there is an error.
 *
 *   <Field label="Email" error={error}>{control => <Input {...control} type="email" />}</Field>
 */
export function Field({
  label,
  description,
  error,
  required = false,
  layout = 'stack',
  className,
  children,
}: FieldProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  const control: FieldControlProps = { id };
  const ariaDescribedBy = describedBy(!!description && descriptionId, !!error && errorId);
  if (ariaDescribedBy) control['aria-describedby'] = ariaDescribedBy;
  if (error) control['aria-invalid'] = true;
  if (required) control['aria-required'] = true;

  const labelNode = (
    <label
      htmlFor={id}
      data-slot="field-label"
      className="inline-flex items-baseline gap-1.5 text-ui-sm font-medium text-fg"
    >
      {label}
      {required ? (
        <>
          {' '}
          <RequiredMark />
        </>
      ) : null}
    </label>
  );
  const messages = (
    <>
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </>
  );

  if (layout === 'stack') {
    return (
      <div
        data-slot="field"
        data-invalid={error ? '' : undefined}
        className={cn('grid content-start gap-2', className)}
      >
        {labelNode}
        {children(control)}
        {messages}
      </div>
    );
  }

  // Inline layouts: the control and the label share a row; messages sit under the label.
  return (
    <div
      data-slot="field"
      data-invalid={error ? '' : undefined}
      className={cn(
        'grid items-start gap-x-3 gap-y-1',
        layout === 'control-start'
          ? 'grid-cols-[auto_minmax(0,1fr)]'
          : 'grid-cols-[minmax(0,1fr)_auto]',
        className,
      )}
    >
      <div
        className={cn(
          'flex min-h-6 items-center',
          layout === 'control-start' ? 'col-start-1 row-start-1' : 'col-start-2 row-start-1',
        )}
      >
        {children(control)}
      </div>
      <div
        className={cn(
          'grid gap-1',
          layout === 'control-start' ? 'col-start-2 row-start-1' : 'col-start-1 row-start-1',
        )}
      >
        <div className="flex min-h-6 items-center">{labelNode}</div>
        {messages}
      </div>
    </div>
  );
}

export interface GroupFieldProps {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: (group: GroupFieldControlProps) => ReactNode;
}

/**
 * A labelled group of controls (radio group, toggle group, OTP slots): the visible label names
 * the group through aria-labelledby, with the same description and error wiring as <Field>.
 */
export function GroupField({
  label,
  description,
  error,
  required = false,
  className,
  children,
}: GroupFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  const group: GroupFieldControlProps = { 'aria-labelledby': labelId };
  const ariaDescribedBy = describedBy(!!description && descriptionId, !!error && errorId);
  if (ariaDescribedBy) group['aria-describedby'] = ariaDescribedBy;
  if (error) group['aria-invalid'] = true;
  if (required) group['aria-required'] = true;

  return (
    <div
      data-slot="group-field"
      data-invalid={error ? '' : undefined}
      className={cn('grid content-start gap-2.5', className)}
    >
      <p id={labelId} className="inline-flex items-baseline gap-1.5 text-ui-sm font-medium text-fg">
        {label}
        {required ? (
          <>
            {' '}
            <RequiredMark />
          </>
        ) : null}
      </p>
      {children(group)}
      {description ? <FieldDescription id={descriptionId}>{description}</FieldDescription> : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
