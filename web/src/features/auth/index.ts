// Public API of the auth feature: the sign-in pages (slice S6), the URL reading the two
// email-link routes do in their clientLoader, before supabase-js clears the #hash, and the
// change-password form of the settings page (slice S12).
export { AuthCallbackPage } from './components/auth-callback-page';
export {
  ChangePasswordForm,
  type ChangePasswordFormProps,
} from './components/change-password-form';
export { ForgotPasswordPage } from './components/forgot-password-page';
export { LoginPage } from './components/login-page';
export { SignupPage } from './components/signup-page';
export { UpdatePasswordPage } from './components/update-password-page';
export { SEO as authSeo } from './content/copy';
export { type CallbackUrl, readCallbackUrl, recoveryForward } from './lib/callback-url';
