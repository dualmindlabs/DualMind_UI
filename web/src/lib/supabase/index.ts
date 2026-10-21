/**
 * The public API of the auth layer. Features and components import from `@/lib/supabase`.
 * See README.md in this folder.
 */
export { getAccessToken } from './access-token';
export {
  authEmailUrl,
  sendAuthEmail,
  sendLoginNotice,
  sendWelcomeOnce,
  WELCOME_SENT_KEY_PREFIX,
} from './auth-email';
export {
  authReducer,
  type AuthState,
  type AuthStatus,
  type AuthStore,
  type AuthStoreOptions,
  createAuthStore,
  INITIAL_AUTH_STATE,
  UNAVAILABLE_AUTH_STATE,
} from './auth-store';
export {
  AUTH_CLIENT_OPTIONS,
  type AuthClient,
  loadSupabaseClient,
  SupabaseUnavailableError,
} from './client';
export { authErrorMessage, GENERIC_AUTH_ERROR, NETWORK_AUTH_ERROR } from './errors';
export { guardRedirect } from './guard';
export { landingUrl, type UrlSnapshot } from './landing-url';
export { migrateLegacySession, readLegacyTokens } from './migration';
export {
  type BreachResult,
  checkPwnedPassword,
  evaluatePassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  type PasswordEvaluation,
  type PasswordStrength,
  STRENGTH_LABELS,
} from './password';
export { toUserSyncInput } from './profile';
export {
  AUTH_CALLBACK_PATH,
  DEFAULT_REDIRECT,
  FORGOT_PASSWORD_PATH,
  LOGIN_PATH,
  loginUrl,
  redirectFromSearch,
  safeRedirect,
  SIGNUP_PATH,
  UPDATE_PASSWORD_PATH,
  withRedirect,
} from './redirect';
export {
  browserLocalStorage,
  browserSessionStorage,
  clearSignedOutData,
  LEGACY_AUTH_KEYS,
} from './storage';
export {
  normalizeEmail,
  normalizeOtp,
  normalizePhone,
  OTP_LENGTH,
  validateEmail,
  validateName,
  validateOtp,
  validatePasswordMatch,
  validatePasswordPresent,
  validatePhone,
} from './validation';
