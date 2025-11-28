import React from 'react';

export function LoadsView() {
  return (
    <div>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>
          Available Loads
        </h1>
        <p style={{ opacity: 0.7, marginTop: '4px' }}>
          Browse and manage freight loads available for carrier booking.
        </p>
      </header>

      <div
        style={{
          backgroundColor: '#020617',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 10px 30px rgba(15,23,42,0.9)',
          border: '1px solid rgba(148,163,184,0.3)',
          textAlign: 'center',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>📦</div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
          Loads View Coming Soon
        </h2>
        <p style={{ opacity: 0.7, maxWidth: '500px' }}>
          This view will display available freight loads from your database,
          with filtering and search capabilities.
        </p>
      </div>
    </div>
  );
}

