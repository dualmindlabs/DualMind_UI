'use client';

import { useEffect, useState } from 'react';
import DualMindApp from '@/components/DualMindApp';
import AuthLoadingOverlay from '@/components/AuthLoadingOverlay';
import ErrorBanner from '@/components/ErrorBanner';

export default function Home() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if auth is initialized
    const checkAuth = async () => {
      try {
        // Wait a bit for any auth initialization
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsReady(true);
      } catch (err) {
        setError('Failed to initialize app');
        console.error('App initialization error:', err);
      }
    };

    checkAuth();

    // Timeout: if app doesn't initialize in 10 seconds, show error
    const timeout = setTimeout(() => {
      if (!isReady) {
        setError('App initialization timed out');
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isReady]);

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      setError('Failed to load the application');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled rejection:', event.reason);
      if (event.reason?.message?.includes('Failed to fetch') ||
          event.reason?.message?.includes('NetworkError')) {
        setError('Network error occurred');
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  if (error) {
    return <ErrorBanner message={error} onRetry={() => window.location.reload()} />;
  }

  if (!isReady) {
    return <AuthLoadingOverlay />;
  }

  return (
    <>
      <a className="skip-link" href="#chat-input">Skip to chat input</a>
      <div className="bg-glow"></div>
      {/* Premium Background Image */}
      <img src="/assets/background.png" className="app-background" alt="" aria-hidden="true" />
      <DualMindApp />
    </>
  );
}
