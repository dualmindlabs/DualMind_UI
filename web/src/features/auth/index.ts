// Public API of the auth feature: the sign-in pages (slice S6) and the URL reading the two
// email-link routes do in their clientLoader, before supabase-js clears the #hash.
export { AuthCallbackPage } from './components/auth-callback-page';
export { ForgotPasswordPage } from './components/forgot-password-page';
export { LoginPage } from './components/login-page';
export { SignupPage } from './components/signup-page';
export { UpdatePasswordPage } from './components/update-password-page';
export { SEO as authSeo } from './content/copy';
export { type CallbackUrl, readCallbackUrl, recoveryForward } from './lib/callback-url';
