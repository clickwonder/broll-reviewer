import React from 'react';

interface HeaderProps {
  viewMode: 'grid' | 'timeline' | 'vertical';
  onViewModeChange: (mode: 'grid' | 'timeline' | 'vertical') => void;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  onApproveAll?: () => void;
  onRejectAll?: () => void;
  onSettingsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  onViewModeChange,
  approvedCount,
  pendingCount,
  rejectedCount,
  onApproveAll,
  onRejectAll,
  onSettingsClick
}) => {
  return (
    <header style={{
      background: 'linear-gradient(to right, #1e293b, #334155)',
      padding: '16px 24px',
      borderBottom: '1px solid #475569',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#f1f5f9',
            margin: 0
          }}>
            B-Roll Reviewer
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#94a3b8',
            margin: '4px 0 0 0'
          }}>
            Review and approve B-roll assets for video production
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Status badges */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <StatusBadge label="Approved" count={approvedCount} color="#22c55e" />
            <StatusBadge label="Pending" count={pendingCount} color="#f59e0b" />
            <StatusBadge label="Rejected" count={rejectedCount} color="#ef4444" />
          </div>

          {/* Bulk actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onApproveAll}
              style={{
                padding: '8px 16px',
                background: '#22c55e20',
                border: '1px solid #22c55e60',
                borderRadius: '6px',
                color: '#22c55e',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Approve All
            </button>
            <button
              onClick={onRejectAll}
              style={{
                padding: '8px 16px',
                background: '#ef444420',
                border: '1px solid #ef444460',
                borderRadius: '6px',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Reject All
            </button>
          </div>

          {/* Settings button */}
          <button
            onClick={onSettingsClick}
            title="Generation Settings"
            style={{
              padding: '10px',
              background: 'linear-gradient(135deg, #8b5cf620, #3b82f620)',
              border: '1px solid #8b5cf660',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {/* View toggle */}
          <div style={{
            display: 'flex',
            background: '#1e293b',
            borderRadius: '8px',
            padding: '4px'
          }}>
            <ViewButton
              active={viewMode === 'grid'}
              onClick={() => onViewModeChange('grid')}
              icon="grid"
              label="Grid"
            />
            <ViewButton
              active={viewMode === 'timeline'}
              onClick={() => onViewModeChange('timeline')}
              icon="timeline"
              label="Scenes"
            />
            <ViewButton
              active={viewMode === 'vertical'}
              onClick={() => onViewModeChange('vertical')}
              icon="vertical"
              label="Full Timeline"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

const StatusBadge: React.FC<{ label: string; count: number; color: string }> = ({
  label,
  count,
  color
}) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: `${color}20`,
    borderRadius: '6px',
    border: `1px solid ${color}40`
  }}>
    <span style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: color
    }} />
    <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{label}</span>
    <span style={{
      fontSize: '14px',
      fontWeight: 600,
      color: color
    }}>{count}</span>
  </div>
);

const ViewButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: 'grid' | 'timeline' | 'vertical';
  label: string;
}> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    title={label}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 12px',
      background: active ? '#3b82f6' : 'transparent',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      color: active ? '#fff' : '#94a3b8',
      fontSize: '13px',
      fontWeight: 500,
      transition: 'all 0.2s'
    }}
  >
    {icon === 'grid' && (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    )}
    {icon === 'timeline' && (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <circle cx="8" cy="6" r="2" fill="currentColor" />
        <circle cx="14" cy="12" r="2" fill="currentColor" />
        <circle cx="10" cy="18" r="2" fill="currentColor" />
      </svg>
    )}
    {icon === 'vertical' && (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="2" x2="12" y2="22" />
        <rect x="4" y="4" width="16" height="4" rx="1" />
        <rect x="4" y="10" width="16" height="4" rx="1" />
        <rect x="4" y="16" width="16" height="4" rx="1" />
      </svg>
    )}
    {label}
  </button>
);
