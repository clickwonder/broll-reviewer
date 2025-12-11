import React, { useState, useEffect } from 'react';
import {
  GenerationSettings,
  ImageModel,
  VideoModel,
  StockSource,
  SceneCutaway,
  IMAGE_MODEL_INFO,
  VIDEO_MODEL_INFO
} from '../types';
import { isExternalStockUrl, migrateExternalUrls, isStorageAvailable } from '../services/stockStorageService';

interface SettingsModalProps {
  settings: GenerationSettings;
  onSettingsChange: (settings: GenerationSettings) => void;
  onClose: () => void;
  onBrowseStock?: () => void;
  scenes?: SceneCutaway[];
  onScenesUpdate?: (scenes: SceneCutaway[]) => void;
  projectId?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSettingsChange,
  onClose,
  onBrowseStock,
  scenes,
  onScenesUpdate,
  projectId
}) => {
  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<{
    current: number;
    total: number;
    currentUrl: string;
  } | null>(null);
  const [storageAvailable, setStorageAvailable] = useState<boolean | null>(null);

  // Count external stock URLs
  const externalUrls = scenes?.flatMap(scene =>
    scene.cutaways
      .filter(c => isExternalStockUrl(c.video))
      .map(c => c.video)
  ) || [];
  const uniqueExternalUrls = [...new Set(externalUrls)];

  // Check storage availability
  useEffect(() => {
    isStorageAvailable().then(setStorageAvailable);
  }, []);

  // Handle migration
  const handleMigrateStockVideos = async () => {
    if (!scenes || !onScenesUpdate || uniqueExternalUrls.length === 0 || !projectId) return;

    setIsMigrating(true);
    setMigrationProgress({ current: 0, total: uniqueExternalUrls.length, currentUrl: '' });

    try {
      const urlMap = await migrateExternalUrls(
        uniqueExternalUrls,
        projectId,
        (current, total, url) => {
          setMigrationProgress({ current, total, currentUrl: url });
        }
      );

      // Update scenes with new URLs
      const updatedScenes = scenes.map(scene => ({
        ...scene,
        cutaways: scene.cutaways.map(cutaway => ({
          ...cutaway,
          video: urlMap.get(cutaway.video) || cutaway.video
        }))
      }));

      onScenesUpdate(updatedScenes);
      setMigrationProgress(null);
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleImageModelChange = (model: ImageModel) => {
    onSettingsChange({ ...settings, imageModel: model });
  };

  const handleVideoModelChange = (model: VideoModel) => {
    onSettingsChange({ ...settings, videoModel: model });
  };

  const handleStockSourceChange = (source: StockSource) => {
    onSettingsChange({ ...settings, stockSource: source });
  };

  const handlePreferStockChange = (prefer: boolean) => {
    onSettingsChange({ ...settings, preferStock: prefer });
  };

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
        width: '720px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(to right, #8b5cf620, #3b82f620)',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
              Generation Settings
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Configure AI models and stock footage sources
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflow: 'auto', flex: 1 }}>
          {/* Image Generation Models */}
          <Section title="Image Generation Model" icon="🖼️">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(Object.keys(IMAGE_MODEL_INFO) as ImageModel[]).map(model => (
                <ModelCard
                  key={model}
                  selected={settings.imageModel === model}
                  onClick={() => handleImageModelChange(model)}
                  name={IMAGE_MODEL_INFO[model].name}
                  description={IMAGE_MODEL_INFO[model].description}
                  badge1={IMAGE_MODEL_INFO[model].speed}
                  badge2={IMAGE_MODEL_INFO[model].quality}
                />
              ))}
            </div>
          </Section>

          {/* Video Generation Models */}
          <Section title="Video Generation Model" icon="🎬">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {(Object.keys(VIDEO_MODEL_INFO) as VideoModel[]).map(model => (
                <ModelCard
                  key={model}
                  selected={settings.videoModel === model}
                  onClick={() => handleVideoModelChange(model)}
                  name={VIDEO_MODEL_INFO[model].name}
                  description={VIDEO_MODEL_INFO[model].description}
                  badge1={VIDEO_MODEL_INFO[model].duration}
                  badge2={VIDEO_MODEL_INFO[model].quality}
                />
              ))}
            </div>
          </Section>

          {/* Stock Footage Sources */}
          <Section title="Stock Footage Sources" icon="📦">
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
              Search royalty-free stock footage before generating with AI
            </p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <StockSourceCard
                source="pexels"
                name="Pexels"
                description="Free stock videos"
                selected={settings.stockSource === 'pexels'}
                onClick={() => handleStockSourceChange('pexels')}
                logo="https://www.pexels.com/favicon.ico"
              />
              <StockSourceCard
                source="pixabay"
                name="Pixabay"
                description="Free stock videos"
                selected={settings.stockSource === 'pixabay'}
                onClick={() => handleStockSourceChange('pixabay')}
                logo="https://pixabay.com/favicon.ico"
              />
              <StockSourceCard
                source="none"
                name="None"
                description="AI generation only"
                selected={settings.stockSource === 'none'}
                onClick={() => handleStockSourceChange('none')}
              />
            </div>

            {settings.stockSource !== 'none' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #334155'
                }}>
                  <ToggleSwitch
                    checked={settings.preferStock}
                    onChange={handlePreferStockChange}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#f1f5f9', margin: 0 }}>
                      Search stock first
                    </p>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                      Show stock results before AI generation options
                    </p>
                  </div>
                </div>

                {/* Browse Stock Library Button */}
                <button
                  onClick={onBrowseStock}
                  style={{
                    padding: '14px 20px',
                    background: settings.stockSource === 'pexels' ? 'linear-gradient(135deg, #05a08120, #05a08140)' : 'linear-gradient(135deg, #00ab6c20, #00ab6c40)',
                    border: `2px solid ${settings.stockSource === 'pexels' ? '#05a081' : '#00ab6c'}`,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={settings.stockSource === 'pexels' ? '#05a081' : '#00ab6c'} strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: settings.stockSource === 'pexels' ? '#05a081' : '#00ab6c'
                  }}>
                    Browse {settings.stockSource === 'pexels' ? 'Pexels' : 'Pixabay'} Library
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={settings.stockSource === 'pexels' ? '#05a081' : '#00ab6c'} strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </Section>

          {/* Current Configuration Summary */}
          <Section title="Current Configuration" icon="⚙️">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px'
            }}>
              <ConfigSummary
                label="Image Model"
                value={IMAGE_MODEL_INFO[settings.imageModel].name}
                color="#22c55e"
              />
              <ConfigSummary
                label="Video Model"
                value={VIDEO_MODEL_INFO[settings.videoModel].name}
                color="#3b82f6"
              />
              <ConfigSummary
                label="Stock Source"
                value={settings.stockSource === 'none' ? 'Disabled' : settings.stockSource.charAt(0).toUpperCase() + settings.stockSource.slice(1)}
                color={settings.stockSource === 'none' ? '#64748b' : '#f59e0b'}
              />
            </div>
          </Section>

          {/* Stock Video Migration */}
          {scenes && scenes.length > 0 && (
            <Section title="Stock Video Storage" icon="💾">
              <div style={{
                padding: '16px',
                background: '#0f172a',
                borderRadius: '10px',
                border: '1px solid #334155'
              }}>
                {storageAvailable === false ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#f59e0b'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, margin: 0 }}>Supabase Storage Not Available</p>
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                        Configure Supabase to enable local storage for stock videos
                      </p>
                    </div>
                  </div>
                ) : uniqueExternalUrls.length === 0 ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: '#22c55e'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, margin: 0 }}>All Videos Stored Locally</p>
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                        No external stock video URLs found
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 500, color: '#f1f5f9', margin: 0 }}>
                          External Stock Videos Found
                        </p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0 0' }}>
                          {uniqueExternalUrls.length} video{uniqueExternalUrls.length !== 1 ? 's' : ''} from Pexels/Pixabay
                        </p>
                      </div>
                      <span style={{
                        padding: '4px 10px',
                        background: '#f59e0b20',
                        color: '#f59e0b',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {uniqueExternalUrls.length}
                      </span>
                    </div>

                    {isMigrating && migrationProgress ? (
                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '8px'
                        }}>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            Downloading {migrationProgress.current} of {migrationProgress.total}
                          </span>
                          <span style={{ fontSize: '12px', color: '#3b82f6' }}>
                            {Math.round((migrationProgress.current / migrationProgress.total) * 100)}%
                          </span>
                        </div>
                        <div style={{
                          height: '8px',
                          background: '#1e293b',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${(migrationProgress.current / migrationProgress.total) * 100}%`,
                            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                            borderRadius: '4px',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                        <p style={{
                          fontSize: '10px',
                          color: '#64748b',
                          margin: '8px 0 0 0',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {migrationProgress.currentUrl.split('/').pop()}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleMigrateStockVideos}
                        disabled={!projectId || !onScenesUpdate}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          background: 'linear-gradient(135deg, #3b82f620, #8b5cf620)',
                          border: '2px solid #3b82f6',
                          borderRadius: '8px',
                          cursor: projectId && onScenesUpdate ? 'pointer' : 'not-allowed',
                          opacity: projectId && onScenesUpdate ? 1 : 0.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6' }}>
                          Download & Save to Local Storage
                        </span>
                      </button>
                    )}

                    <p style={{
                      fontSize: '10px',
                      color: '#64748b',
                      margin: '12px 0 0 0',
                      textAlign: 'center'
                    }}>
                      Downloads stock videos to Supabase Storage for permanent access
                    </p>
                  </>
                )}
              </div>
            </Section>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          background: '#0f172a',
          borderTop: '1px solid #334155',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: '#22c55e',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Section component
const Section: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div style={{ marginBottom: '24px' }}>
    <h3 style={{
      fontSize: '14px',
      fontWeight: 600,
      color: '#f1f5f9',
      margin: '0 0 12px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <span>{icon}</span>
      {title}
    </h3>
    {children}
  </div>
);

// Model card component
const ModelCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  name: string;
  description: string;
  badge1: string;
  badge2: string;
}> = ({ selected, onClick, name, description, badge1, badge2 }) => (
  <button
    onClick={onClick}
    style={{
      padding: '12px',
      background: selected ? '#3b82f620' : '#0f172a',
      border: `2px solid ${selected ? '#3b82f6' : '#334155'}`,
      borderRadius: '8px',
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'all 0.2s'
    }}
  >
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '6px'
    }}>
      <div style={{
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        border: `2px solid ${selected ? '#3b82f6' : '#475569'}`,
        background: selected ? '#3b82f6' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {selected && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
      <span style={{
        fontSize: '13px',
        fontWeight: 600,
        color: selected ? '#3b82f6' : '#f1f5f9'
      }}>
        {name}
      </span>
    </div>
    <p style={{
      fontSize: '11px',
      color: '#64748b',
      margin: '0 0 8px 0'
    }}>
      {description}
    </p>
    <div style={{ display: 'flex', gap: '4px' }}>
      <span style={{
        padding: '2px 6px',
        background: '#334155',
        borderRadius: '4px',
        fontSize: '9px',
        color: '#94a3b8'
      }}>
        {badge1}
      </span>
      <span style={{
        padding: '2px 6px',
        background: badge2 === 'Ultra' ? '#8b5cf620' : badge2 === 'High' ? '#22c55e20' : '#f59e0b20',
        borderRadius: '4px',
        fontSize: '9px',
        color: badge2 === 'Ultra' ? '#8b5cf6' : badge2 === 'High' ? '#22c55e' : '#f59e0b'
      }}>
        {badge2}
      </span>
    </div>
  </button>
);

// Stock source card
const StockSourceCard: React.FC<{
  source: StockSource;
  name: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  logo?: string;
}> = ({ name, description, selected, onClick, logo }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      padding: '16px',
      background: selected ? '#f59e0b20' : '#0f172a',
      border: `2px solid ${selected ? '#f59e0b' : '#334155'}`,
      borderRadius: '8px',
      cursor: 'pointer',
      textAlign: 'center',
      transition: 'all 0.2s'
    }}
  >
    <div style={{
      width: '32px',
      height: '32px',
      margin: '0 auto 8px',
      background: '#334155',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {logo ? (
        <img src={logo} alt={name} style={{ width: '20px', height: '20px' }} onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }} />
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
      )}
    </div>
    <p style={{
      fontSize: '13px',
      fontWeight: 600,
      color: selected ? '#f59e0b' : '#f1f5f9',
      margin: '0 0 2px 0'
    }}>
      {name}
    </p>
    <p style={{
      fontSize: '11px',
      color: '#64748b',
      margin: 0
    }}>
      {description}
    </p>
  </button>
);

// Toggle switch
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      width: '44px',
      height: '24px',
      borderRadius: '12px',
      background: checked ? '#22c55e' : '#475569',
      border: 'none',
      cursor: 'pointer',
      position: 'relative',
      transition: 'background 0.2s'
    }}
  >
    <div style={{
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: '#fff',
      position: 'absolute',
      top: '3px',
      left: checked ? '23px' : '3px',
      transition: 'left 0.2s'
    }} />
  </button>
);

// Config summary
const ConfigSummary: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => (
  <div style={{
    padding: '12px',
    background: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #334155'
  }}>
    <p style={{
      fontSize: '11px',
      color: '#64748b',
      margin: '0 0 4px 0',
      textTransform: 'uppercase'
    }}>
      {label}
    </p>
    <p style={{
      fontSize: '14px',
      fontWeight: 600,
      color: color,
      margin: 0
    }}>
      {value}
    </p>
  </div>
);
