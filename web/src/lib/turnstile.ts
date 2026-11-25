/**
 * Cloudflare Turnstile (the bot check for the guest battle). The widget script is loaded only when
 * a visitor opens the guest battle, and only when the feature is on (src/config/features.ts), so
 * a default build never contacts challenges.cloudflare.com. The token goes to the API's
 * `POST /api/arena/guest-battle`, which verifies it server-side with the secret key.
 */

export const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: 'auto' | 'light' | 'dark';
      callback: (token: string) => void;
      'expired-callback'?: () => void;
      'error-callback'?: () => void;
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

/** Loads the Turnstile script once. Rejects when it cannot load (blocked, offline). */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('Turnstile did not start'));
    };
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('Turnstile could not load'));
    };
    document.head.append(script);
  });
  return loading;
}

export interface TurnstileHandle {
  /** Asks for a fresh token (after a failed or used one). */
  reset: () => void;
  remove: () => void;
}

/**
 * Renders the widget into `container`. `onToken` gets a token when the check passes and null when
 * it expires or fails, so the caller can disable its button.
 */
export async function renderTurnstile(
  container: HTMLElement,
  siteKey: string,
  onToken: (token: string | null) => void,
): Promise<TurnstileHandle> {
  const api = await loadTurnstile();
  const id = api.render(container, {
    sitekey: siteKey,
    theme: 'auto',
    callback: token => onToken(token),
    'expired-callback': () => onToken(null),
    'error-callback': () => onToken(null),
  });
  return { reset: () => api.reset(id), remove: () => api.remove(id) };
}
