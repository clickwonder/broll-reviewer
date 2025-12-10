import React, { useState, useRef } from 'react';
import { BRollAsset, SceneCutaway } from '../types';

interface SceneTimelineProps {
  scenes: SceneCutaway[];
  assets: BRollAsset[];
  onApprove: (assetId: string) => void;
  onReject: (assetId: string) => void;
  onRegenerate: (assetId: string) => void;
}

export const SceneTimeline: React.FC<SceneTimelineProps> = ({
  scenes,
  assets,
  onApprove,
  onReject,
  onRegenerate
}) => {
  const [expandedScene, setExpandedScene] = useState<string | null>(null);

  const getAssetFromPath = (path: string): BRollAsset | undefined => {
    const filename = path.split('/').pop()?.replace('.mp4', '');
    return assets.find(a => a.id === filename);
  };

  return (
    <div>
      <h2 style={{
        fontSize: '18px',
        fontWeight: 600,
        color: '#f1f5f9',
        margin: '0 0 20px 0'
      }}>
        Scene Timeline with Cutaways
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {scenes.map(scene => (
          <SceneRow
            key={scene.sceneId}
            scene={scene}
            assets={assets}
            isExpanded={expandedScene === scene.sceneId}
            onToggle={() => setExpandedScene(
              expandedScene === scene.sceneId ? null : scene.sceneId
            )}
            onApprove={onApprove}
            onReject={onReject}
            onRegenerate={onRegenerate}
            getAssetFromPath={getAssetFromPath}
          />
        ))}
      </div>
    </div>
  );
};

interface SceneRowProps {
  scene: SceneCutaway;
  assets: BRollAsset[];
  isExpanded: boolean;
  onToggle: () => void;
  onApprove: (assetId: string) => void;
  onReject: (assetId: string) => void;
  onRegenerate: (assetId: string) => void;
  getAssetFromPath: (path: string) => BRollAsset | undefined;
}

const SceneRow: React.FC<SceneRowProps> = ({
  scene,
  isExpanded,
  onToggle,
  onApprove,
  onReject,
  onRegenerate,
  getAssetFromPath
}) => {
  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #334155'
    }}>
      {/* Scene Header */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          cursor: 'pointer',
          background: isExpanded ? '#334155' : 'transparent',
          transition: 'background 0.2s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            padding: '4px 12px',
            background: '#3b82f620',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#3b82f6'
          }}>
            {scene.sceneId.toUpperCase().replace('_', ' ')}
          </span>
          <span style={{
            fontSize: '15px',
            fontWeight: 500,
            color: '#f1f5f9'
          }}>
            {scene.sceneTitle}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '13px',
            color: '#94a3b8'
          }}>
            {scene.cutaways.length} cutaways
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{
          padding: '20px',
          borderTop: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {scene.cutaways.map((cutaway, index) => {
            const asset = getAssetFromPath(cutaway.video);
            return (
              <CutawayPreview
                key={index}
                cutaway={cutaway}
                asset={asset}
                index={index}
                onApprove={onApprove}
                onReject={onReject}
                onRegenerate={onRegenerate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

interface CutawayPreviewProps {
  cutaway: SceneCutaway['cutaways'][0];
  asset: BRollAsset | undefined;
  index: number;
  onApprove: (assetId: string) => void;
  onReject: (assetId: string) => void;
  onRegenerate: (assetId: string) => void;
}

const CutawayPreview: React.FC<CutawayPreviewProps> = ({
  cutaway,
  asset,
  index,
  onApprove,
  onReject,
  onRegenerate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const statusColors = asset ? {
    approved: '#22c55e',
    pending: '#f59e0b',
    rejected: '#ef4444',
    regenerating: '#3b82f6'
  }[asset.status] : '#475569';

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
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '16px',
      background: '#0f172a',
      borderRadius: '8px',
      border: `1px solid ${statusColors}40`
    }}>
      {/* Video Preview */}
      <div
        style={{
          width: '240px',
          flexShrink: 0,
          aspectRatio: '16/9',
          background: '#1e293b',
          borderRadius: '6px',
          overflow: 'hidden',
          cursor: 'pointer',
          position: 'relative'
        }}
        onClick={togglePlay}
      >
        {asset ? (
          <>
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
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.9)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#0f172a">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#475569'
          }}>
            Video not found
          </div>
        )}
      </div>

      {/* Cutaway Info */}
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px'
        }}>
          <span style={{
            padding: '2px 8px',
            background: '#475569',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#e2e8f0'
          }}>
            CUTAWAY {index + 1}
          </span>
          {asset && (
            <span style={{
              padding: '2px 8px',
              background: `${statusColors}20`,
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: statusColors,
              textTransform: 'uppercase'
            }}>
              {asset.status}
            </span>
          )}
        </div>

        <h4 style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#f1f5f9',
          margin: '0 0 4px 0'
        }}>
          {cutaway.video.split('/').pop()}
        </h4>

        {asset && (
          <p style={{
            fontSize: '13px',
            color: '#94a3b8',
            margin: '0 0 12px 0'
          }}>
            {asset.description}
          </p>
        )}

        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <MetricBadge label="Start" value={`${cutaway.startTime}s`} />
          <MetricBadge label="Duration" value={`${cutaway.duration}s`} />
          <MetricBadge label="Video Start" value={`${cutaway.videoStartTime}s`} />
          <MetricBadge label="Speed" value={`${cutaway.playbackRate}x`} />
        </div>

        {/* Actions */}
        {asset && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <SmallButton
              onClick={() => onApprove(asset.id)}
              disabled={asset.status === 'approved'}
              variant="approve"
            >
              Approve
            </SmallButton>
            <SmallButton
              onClick={() => onReject(asset.id)}
              disabled={asset.status === 'rejected'}
              variant="reject"
            >
              Reject
            </SmallButton>
            <SmallButton
              onClick={() => onRegenerate(asset.id)}
              variant="regenerate"
            >
              Regenerate
            </SmallButton>
          </div>
        )}
      </div>
    </div>
  );
};

const MetricBadge: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }}>
    <span style={{ fontSize: '12px', color: '#64748b' }}>{label}:</span>
    <span style={{
      fontSize: '12px',
      fontWeight: 600,
      color: '#94a3b8'
    }}>{value}</span>
  </div>
);

const SmallButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: 'approve' | 'reject' | 'regenerate';
}> = ({ children, onClick, disabled, variant }) => {
  const variants = {
    approve: { color: '#22c55e' },
    reject: { color: '#ef4444' },
    regenerate: { color: '#3b82f6' }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        background: disabled ? '#1e293b' : `${variants[variant].color}20`,
        border: `1px solid ${disabled ? '#334155' : variants[variant].color}40`,
        borderRadius: '4px',
        color: disabled ? '#475569' : variants[variant].color,
        fontSize: '11px',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      {children}
    </button>
  );
};
