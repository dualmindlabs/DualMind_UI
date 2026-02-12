'use client';

import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://calqfzajyidkdzbaswjp.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhbHFmemFqeWlka2R6YmFzd2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzMwODMsImV4cCI6MjA3OTg0OTA4M30.ptXyUNCcAhGi9u2kVDHOxSBvQv0W72S5HHqkIFXQS08';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AuthCallbackPage() {
  useEffect(() => {
    const handleAuthCallback = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Auth callback error:', error);
        window.location.href = '/login';
        return;
      }

      if (data.session) {
        // Store auth token
        localStorage.setItem('dualmind.auth.token', data.session.access_token);
        localStorage.setItem('dualmind.auth.userId', data.session.user?.id || '');
        localStorage.setItem('dualmind.auth.user', JSON.stringify(data.session.user));

        // Redirect to home
        window.location.href = '/';
      } else {
        window.location.href = '/login';
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#000',
      color: '#fff',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255,255,255,0.1)',
          borderTopColor: '#4AABC2',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p>Completing sign in...</p>
      </div>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
