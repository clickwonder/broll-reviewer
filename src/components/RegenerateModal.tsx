import React, { useState } from 'react';
import { BRollAsset, GenerationSettings, IMAGE_MODEL_INFO, VIDEO_MODEL_INFO } from '../types';

type RegenerateSource = 'ai' | 'pexels' | 'pixabay';

interface RegenerateModalProps {
  asset: BRollAsset;
  settings: GenerationSettings;
  onClose: () => void;
  onSubmit: (prompt: string, style: string) => void;
  onBrowseStock: (source: 'pexels' | 'pixabay', searchQuery: string) => void;
}

export const RegenerateModal: React.FC<RegenerateModalProps> = ({
  asset,
  settings,
  onClose,
  onSubmit,
  onBrowseStock
}) => {
  const [source, setSource] = useState<RegenerateSource>('ai');
  const [prompt, setPrompt] = useState(asset.description);
  const [style, setStyle] = useState<'realistic' | 'cinematic' | 'documentary'>('cinematic');

  const handleSubmit = () => {
    if (source === 'ai') {
      onSubmit(prompt, style);
    } else {
      onBrowseStock(source, prompt);
    }
  };

  const sourceOptions: { id: RegenerateSource; label: string; description: string; icon: JSX.Element; color: string }[] = [
    {
      id: 'ai',
      label: 'AI Generation',
      description: `${IMAGE_MODEL_INFO[settings.imageModel]?.name ?? 'Unknown'} → ${VIDEO_MODEL_INFO[settings.videoModel]?.name ?? 'Unknown'}`,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
          <circle cx="8" cy="14" r="2" />
          <circle cx="16" cy="14" r="2" />
        </svg>
      ),
      color: '#8b5cf6'
    },
    {
      id: 'pexels',
      label: 'Pexels Stock',
      description: 'Free HD/4K stock videos',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z"/>
        </svg>
      ),
      color: '#05a081'
    },
    {
      id: 'pixabay',
      label: 'Pixabay Stock',
      description: 'Free stock videos & footage',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      ),
      color: '#00ab6c'
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1e293b',
        borderRadius: '16px',
        width: '640px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        border: '1px solid #334155'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(to right, #f59e0b20, #f59e0b10)',
          borderBottom: '1px solid #f59e0b40',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#f59e0b20',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </div>
          <div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#f1f5f9',
              margin: 0
            }}>
              Replace B-Roll
            </h2>
            <p style={{
              fontSize: '13px',
              color: '#94a3b8',
              margin: '2px 0 0 0'
            }}>
              Choose a source for the new footage
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Current Asset Info */}
          <div style={{
            display: 'flex',
            gap: '16px',
            padding: '16px',
            background: '#0f172a',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <div style={{
              width: '140px',
              aspectRatio: '16/9',
              background: '#1e293b',
              borderRadius: '6px',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              <video
                src={asset.path}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                muted
                autoPlay
                loop
                playsInline
              />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#f1f5f9',
                margin: '0 0 4px 0'
              }}>
                {asset.filename}
              </p>
              <p style={{
                fontSize: '12px',
                color: '#64748b',
                margin: '0 0 8px 0'
              }}>
                Used in: {asset.usedInScenes.join(', ')}
              </p>
              <p style={{
                fontSize: '12px',
                color: '#94a3b8',
                margin: 0
              }}>
                {asset.description}
              </p>
            </div>
          </div>

          {/* Source Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#e2e8f0',
              marginBottom: '12px'
            }}>
              Source
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px'
            }}>
              {sourceOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSource(opt.id)}
                  style={{
                    padding: '16px',
                    background: source === opt.id ? `${opt.color}15` : '#0f172a',
                    border: `2px solid ${source === opt.id ? opt.color : '#334155'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: source === opt.id ? `${opt.color}20` : '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: source === opt.id ? opt.color : '#64748b'
                  }}>
                    {opt.icon}
                  </div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: source === opt.id ? opt.color : '#e2e8f0',
                    margin: '0 0 4px 0'
                  }}>
                    {opt.label}
                  </p>
                  <p style={{
                    fontSize: '11px',
                    color: '#64748b',
                    margin: 0
                  }}>
                    {opt.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Search/Prompt Input */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#e2e8f0',
              marginBottom: '8px'
            }}>
              {source === 'ai' ? 'Generation Prompt' : 'Search Query'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={source === 'ai'
                ? "Describe the B-roll footage you want to generate..."
                : "Search for stock videos (e.g., medical, office, family)..."
              }
              style={{
                width: '100%',
                minHeight: source === 'ai' ? '100px' : '60px',
                padding: '12px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </div>

          {/* Style Selection (only for AI) */}
          {source === 'ai' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#e2e8f0',
                marginBottom: '8px'
              }}>
                Visual Style
              </label>
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                {(['realistic', 'cinematic', 'documentary'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: style === s ? '#3b82f620' : '#0f172a',
                      border: `1px solid ${style === s ? '#3b82f6' : '#334155'}`,
                      borderRadius: '6px',
                      color: style === s ? '#3b82f6' : '#94a3b8',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info box based on source */}
          <div style={{
            padding: '12px 16px',
            background: source === 'ai' ? '#f59e0b10' : `${sourceOptions.find(o => o.id === source)?.color}10`,
            border: `1px solid ${source === 'ai' ? '#f59e0b30' : `${sourceOptions.find(o => o.id === source)?.color}30`}`,
            borderRadius: '8px'
          }}>
            <p style={{
              fontSize: '12px',
              color: source === 'ai' ? '#f59e0b' : sourceOptions.find(o => o.id === source)?.color,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {source === 'ai' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  This will use AI credits. Image → Video generation takes ~2-5 minutes.
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Free to use. Browse and select from {source === 'pexels' ? 'Pexels' : 'Pixabay'} stock library.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#0f172a',
          borderTop: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '12px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {source === 'ai' && (
              <>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#8b5cf6'
                }} />
                Models: {IMAGE_MODEL_INFO[settings.imageModel]?.name ?? 'Unknown'} + {VIDEO_MODEL_INFO[settings.videoModel]?.name ?? 'Unknown'}
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#94a3b8',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              style={{
                padding: '10px 24px',
                background: source === 'ai'
                  ? '#8b5cf6'
                  : sourceOptions.find(o => o.id === source)?.color,
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: prompt.trim() ? 'pointer' : 'not-allowed',
                opacity: prompt.trim() ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {source === 'ai' ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2v6h-6" />
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  </svg>
                  Generate with AI
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Browse {source === 'pexels' ? 'Pexels' : 'Pixabay'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
