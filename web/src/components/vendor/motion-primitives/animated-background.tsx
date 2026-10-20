/**
 * Animated Background, from Motion Primitives by ibelick.
 * Source: https://motion-primitives.com/c/animated-background.json (copied 2026-10-20)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - Controlled (`value` + `onValueChange`) as well as uncontrolled (`defaultValue`), without
 *   syncing props into state in an effect; typed children instead of `any`.
 * - It only draws the sliding highlight: the children keep their own semantics and handlers
 *   (radio inputs, tabs, links); its click or hover handler runs after theirs.
 * - Loads Motion's layout features (features-dom-max.ts) for itself; the spring comes from the
 *   motion tokens. Motion follows reduced motion, so the highlight jumps instead of sliding.
 */
import { AnimatePresence, LazyMotion, m, type Transition } from 'motion/react';
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
} from 'react';

import { transitions } from '@/components/motion/presets';
import { cn } from '@/lib/utils/cn';

const loadLayoutFeatures = () =>
  import('@/components/motion/features-dom-max').then(module => module.features);

interface ItemProps {
  'data-id': string;
  'data-checked'?: 'true' | 'false';
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

export interface AnimatedBackgroundProps {
  children: ReactElement<ItemProps> | ReactElement<ItemProps>[];
  /** The active item's `data-id` (controlled). */
  value?: string | null;
  defaultValue?: string;
  onValueChange?: (id: string | null) => void;
  /** Classes of the highlight (colour, radius). */
  className?: string;
  transition?: Transition;
  /** Follow the pointer instead of clicks. */
  enableHover?: boolean;
}

/** A highlight that slides between items: the mode switch and the theme toggle. */
export function AnimatedBackground({
  children,
  value,
  defaultValue,
  onValueChange,
  className,
  transition = transitions.spring,
  enableHover = false,
}: AnimatedBackgroundProps) {
  const [internal, setInternal] = useState<string | null>(defaultValue ?? null);
  const active = value === undefined ? internal : value;
  const layoutId = `background-${useId()}`;

  const select = (id: string | null) => {
    if (value === undefined) setInternal(id);
    onValueChange?.(id);
  };

  return (
    <LazyMotion features={loadLayoutFeatures}>
      {Children.map(children, child => {
        if (!isValidElement<ItemProps>(child)) return child;
        const id = child.props['data-id'];
        const { onClick, onPointerEnter, onPointerLeave } = child.props;
        const interaction: Partial<ItemProps> = enableHover
          ? {
              onPointerEnter: () => {
                onPointerEnter?.();
                select(id);
              },
              onPointerLeave: () => {
                onPointerLeave?.();
                select(null);
              },
            }
          : {
              onClick: () => {
                onClick?.();
                select(id);
              },
            };
        const props: Partial<ItemProps> = {
          className: cn('relative inline-flex', child.props.className),
          'data-checked': active === id ? 'true' : 'false',
          ...interaction,
        };
        return cloneElement(
          child,
          props,
          <>
            <AnimatePresence initial={false}>
              {active === id ? (
                <m.span
                  aria-hidden="true"
                  layoutId={layoutId}
                  className={cn('absolute inset-0', className)}
                  transition={transition}
                  initial={{ opacity: defaultValue === undefined && value === undefined ? 0 : 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              ) : null}
            </AnimatePresence>
            <span className="relative z-10 inline-flex items-center gap-[inherit]">
              {child.props.children}
            </span>
          </>,
        );
      })}
    </LazyMotion>
  );
}
