import React, { useState, useRef } from 'react';
import { BRollAsset } from '../types';

interface BRollCardProps {
  asset: BRollAsset;
  onApprove: (assetId: string) => void;
  onReject: (assetId: string) => void;
  onRegenerate: (assetId: string) => void;
}

export const BRollCard: React.FC<BRollCardProps> = ({
  asset,
  onApprove,
  onReject,
  onRegenerate
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const statusColors = {
    approved: { bg: '#22c55e20', border: '#22c55e', text: '#22c55e' },
    pending: { bg: '#f59e0b20', border: '#f59e0b', text: '#f59e0b' },
    rejected: { bg: '#ef444420', border: '#ef4444', text: '#ef4444' },
    regenerating: { bg: '#3b82f620', border: '#3b82f6', text: '#3b82f6' }
  };

  const colors = statusColors[asset.status];

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div
      style={{
        background: '#1e293b',
        borderRadius: '12px',
        overflow: 'hidden',
        border: `2px solid ${isHovered ? colors.border : '#334155'}`,
        transition: 'all 0.2s'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Video Preview */}
      <div style={{
        position: 'relative',
        aspectRatio: '16/9',
        background: '#0f172a',
        cursor: 'pointer'
      }} onClick={togglePlay}>
        <video
          ref={videoRef}
          src={asset.path}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          muted
          loop
          playsInline
        />

        {/* Play/Pause overlay */}
        {!isPlaying && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#0f172a">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </div>
          </div>
        )}

        {/* Status badge */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          padding: '4px 10px',
          borderRadius: '4px',
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          color: colors.text
        }}>
          {asset.status}
        </div>

        {/* Regenerating spinner */}
        {asset.status === 'regenerating' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            gap: '12px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #3b82f630',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#3b82f6'
              }}>
                Regenerating...
              </span>
              <span style={{
                fontSize: '11px',
                color: '#94a3b8'
              }}>
                Generating new B-roll
              </span>
            </div>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div style={{ padding: '16px' }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#f1f5f9',
          margin: '0 0 4px 0'
        }}>
          {asset.filename}
        </h3>
        <p style={{
          fontSize: '13px',
          color: '#94a3b8',
          margin: '0 0 12px 0'
        }}>
          {asset.description}
        </p>

        {/* Usage tags */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '16px'
        }}>
          {asset.usedInScenes.map(scene => (
            <span
              key={scene}
              style={{
                padding: '3px 8px',
                background: '#334155',
                borderRadius: '4px',
                fontSize: '11px',
                color: '#94a3b8'
              }}
            >
              {scene}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{
          display: 'flex',
          gap: '8px'
        }}>
          <ActionButton
            onClick={() => onApprove(asset.id)}
            disabled={asset.status === 'approved' || asset.status === 'regenerating'}
            variant="approve"
          >
            Approve
          </ActionButton>
          <ActionButton
            onClick={() => onReject(asset.id)}
            disabled={asset.status === 'rejected' || asset.status === 'regenerating'}
            variant="reject"
          >
            Reject
          </ActionButton>
          <ActionButton
            onClick={() => onRegenerate(asset.id)}
            disabled={asset.status === 'regenerating'}
            variant="regenerate"
          >
            Regenerate
          </ActionButton>
        </div>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: 'approve' | 'reject' | 'regenerate';
}> = ({ children, onClick, disabled, variant }) => {
  const variants = {
    approve: {
      bg: '#22c55e20',
      hoverBg: '#22c55e40',
      border: '#22c55e60',
      color: '#22c55e'
    },
    reject: {
      bg: '#ef444420',
      hoverBg: '#ef444440',
      border: '#ef444460',
      color: '#ef4444'
    },
    regenerate: {
      bg: '#3b82f620',
      hoverBg: '#3b82f640',
      border: '#3b82f660',
      color: '#3b82f6'
    }
  };

  const style = variants[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        padding: '8px 12px',
        background: disabled ? '#1e293b' : style.bg,
        border: `1px solid ${disabled ? '#334155' : style.border}`,
        borderRadius: '6px',
        color: disabled ? '#475569' : style.color,
        fontSize: '12px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s'
      }}
    >
      {children}
    </button>
  );
};
