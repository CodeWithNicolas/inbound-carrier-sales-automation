import React from 'react';

interface SidebarProps {
  activeView: 'loads' | 'calls' | 'routes' | 'analytics';
  onViewChange: (view: 'loads' | 'calls' | 'routes' | 'analytics') => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <div
      style={{
        width: '80px',
        height: '100vh',
        backgroundColor: '#020617',
        borderRight: '1px solid rgba(148, 163, 184, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '24px',
        gap: '32px',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          marginBottom: '16px',
          position: 'relative',
        }}
        title="Acme Logistics"
      >
        <AcmeLogo />
      </div>

      {/* Navigation Buttons */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', alignItems: 'center' }}>
        <NavButton
          icon={<BoxIcon />}
          label="Loads"
          active={activeView === 'loads'}
          onClick={() => onViewChange('loads')}
          color="#3b82f6"
        />
        <NavButton
          icon={<PhoneIcon />}
          label="Recent Calls"
          active={activeView === 'calls'}
          onClick={() => onViewChange('calls')}
          color="#10b981"
        />
        <NavButton
          icon={<MapIcon />}
          label="Routes & Lanes"
          active={activeView === 'routes'}
          onClick={() => onViewChange('routes')}
          color="#f43f5e"
        />
        <NavButton
          icon={<ChartIcon />}
          label="Analytics"
          active={activeView === 'analytics'}
          onClick={() => onViewChange('analytics')}
          color="#f59e0b"
        />
      </nav>
    </div>
  );
}

// Icon Components
function BoxIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function AcmeLogo() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hexagon Background */}
      <path
        d="M28 4L48 16V40L28 52L8 40V16L28 4Z"
        fill="url(#gradient)"
        stroke="#3b82f6"
        strokeWidth="2"
      />
      
      {/* Truck Icon */}
      <g transform="translate(14, 18)">
        {/* Truck body */}
        <rect x="0" y="8" width="16" height="8" rx="1" fill="#fff" />
        <rect x="16" y="4" width="8" height="12" rx="1" fill="#fff" />
        
        {/* Wheels */}
        <circle cx="6" cy="18" r="2" fill="#3b82f6" />
        <circle cx="20" cy="18" r="2" fill="#3b82f6" />
        
        {/* Window */}
        <rect x="17" y="5" width="6" height="4" rx="0.5" fill="#3b82f6" opacity="0.5" />
      </g>
      
      {/* Gradient Definition */}
      <defs>
        <linearGradient id="gradient" x1="28" y1="4" x2="28" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}

function NavButton({ icon, label, active, onClick, color }: NavButtonProps) {
  const activeColor = color;
  const backgroundColor = active ? `${color}33` : 'transparent'; // 33 = 20% opacity in hex

  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: '56px',
        height: '56px',
        backgroundColor: backgroundColor,
        border: active ? `2px solid ${activeColor}` : '2px solid transparent',
        borderRadius: '12px',
        color: active ? activeColor : 'rgba(148, 163, 184, 0.7)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        filter: active ? 'brightness(1.2)' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'rgba(148, 163, 184, 0.1)';
          e.currentTarget.style.color = activeColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'rgba(148, 163, 184, 0.7)';
        }
      }}
    >
      {icon}
    </button>
  );
}

