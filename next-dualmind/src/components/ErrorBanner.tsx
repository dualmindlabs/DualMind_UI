'use client';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: '#1a1a2e',
        borderBottom: '2px solid #ef4444',
        padding: '16px 24px',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ color: '#fff', fontSize: '14px' }}>
        <strong style={{ color: '#ef4444' }}>⚠️ App Error:</strong>{' '}
        <span style={{ opacity: 0.9 }}>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            background: '#4AABC2',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
