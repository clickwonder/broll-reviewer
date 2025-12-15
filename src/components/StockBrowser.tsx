import React, { useState, useEffect } from 'react';
import { StockSource } from '../types';

interface StockVideo {
  id: string;
  thumbnail: string;
  previewUrl: string;
  downloadUrl: string;
  duration: number;
  width: number;
  height: number;
  source: StockSource;
  author: string;
}

interface StockBrowserProps {
  source: StockSource;
  onSelect: (video: StockVideo) => void;
  onClose: () => void;
  initialQuery?: string;
}

// API response types
interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  user: { name: string };
  video_files: PexelsVideoFile[];
  image: string;
}

interface PexelsResponse {
  videos: PexelsVideo[];
  total_results: number;
  page: number;
  per_page: number;
}

interface PixabayVideoSize {
  url: string;
  width: number;
  height: number;
}

interface PixabayVideo {
  id: number;
  pageURL: string;
  type: string;
  duration: number;
  user: string;
  picture_id: string;  // Used for thumbnail URL construction
  videos: {
    large: PixabayVideoSize;
    medium: PixabayVideoSize;
    small: PixabayVideoSize;
    tiny: PixabayVideoSize;
  };
}

interface PixabayResponse {
  totalHits: number;
  hits: PixabayVideo[];
}

export const StockBrowser: React.FC<StockBrowserProps> = ({
  source,
  onSelect,
  onClose,
  initialQuery = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<StockVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<StockVideo | null>(null);
  const [previewVideo, setPreviewVideo] = useState<StockVideo | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;
  const PIXABAY_API_KEY = import.meta.env.VITE_PIXABAY_API_KEY;
  const PER_PAGE = 20;

  // Auto-search when initialQuery is provided
  useEffect(() => {
    if (initialQuery.trim()) {
      handleSearch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const searchPexels = async (searchQuery: string, pageNum: number): Promise<{ videos: StockVideo[], total: number }> => {
    // Direct API call - Pexels supports CORS
    const response = await fetch(
      `https://api.pexels.com/v1/videos/search?query=${encodeURIComponent(searchQuery)}&per_page=${PER_PAGE}&page=${pageNum}`,
      {
        headers: {
          'Authorization': PEXELS_API_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data: PexelsResponse = await response.json();

    const videos: StockVideo[] = data.videos.map(video => {
      // Get the best quality files
      const hdFile = video.video_files.find(f => f.quality === 'hd' && f.width >= 1920) ||
                     video.video_files.find(f => f.quality === 'hd') ||
                     video.video_files[0];
      const sdFile = video.video_files.find(f => f.quality === 'sd' && f.width >= 640) ||
                     video.video_files.find(f => f.quality === 'sd') ||
                     video.video_files[0];

      return {
        id: `pexels-${video.id}`,
        thumbnail: video.image,
        previewUrl: sdFile?.link || '',
        downloadUrl: hdFile?.link || '',
        duration: video.duration,
        width: hdFile?.width || video.width,
        height: hdFile?.height || video.height,
        source: 'pexels' as StockSource,
        author: video.user.name
      };
    });

    return { videos, total: data.total_results };
  };

  const searchPixabay = async (searchQuery: string, pageNum: number): Promise<{ videos: StockVideo[], total: number }> => {
    // Direct API call - Pixabay supports CORS
    const response = await fetch(
      `https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(searchQuery)}&per_page=${PER_PAGE}&page=${pageNum}`
    );

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data: PixabayResponse = await response.json();

    const videos: StockVideo[] = data.hits.map(video => {
      // Pixabay video thumbnail URLs - try multiple formats for reliability
      // Format: https://i.vimeocdn.com/video/{picture_id}_{size}.jpg
      const thumbnailUrl = video.picture_id
        ? `https://i.vimeocdn.com/video/${video.picture_id}_640x360.jpg`
        : ''; // Will fallback to video preview if empty

      return {
        id: `pixabay-${video.id}`,
        thumbnail: thumbnailUrl,
        previewUrl: video.videos.tiny?.url || video.videos.small?.url || '',
        downloadUrl: video.videos.large?.url || video.videos.medium?.url || '',
        duration: video.duration,
        width: video.videos.large?.width || video.videos.medium?.width || 1920,
        height: video.videos.large?.height || video.videos.medium?.height || 1080,
        source: 'pixabay' as StockSource,
        author: video.user
      };
    });

    return { videos, total: data.totalHits };
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setPage(1);
    setResults([]);

    try {
      const searchFn = source === 'pexels' ? searchPexels : searchPixabay;
      const { videos, total } = await searchFn(query, 1);

      setResults(videos);
      setTotalResults(total);
      setHasMore(videos.length < total);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Failed to search videos');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    const nextPage = page + 1;

    try {
      const searchFn = source === 'pexels' ? searchPexels : searchPixabay;
      const { videos } = await searchFn(query, nextPage);

      setResults(prev => [...prev, ...videos]);
      setPage(nextPage);
      setHasMore(results.length + videos.length < totalResults);
    } catch (err) {
      console.error('Load more error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more videos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = (video: StockVideo) => {
    setSelectedVideo(video);
  };

  const handleConfirmSelection = () => {
    if (selectedVideo) {
      onSelect(selectedVideo);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1100
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: '16px'
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px',
            background: 'transparent',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: source === 'pexels' ? '#05a081' : '#00ab6c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {source === 'pexels' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                <circle cx="12" cy="12" r="10"/>
              </svg>
            )}
          </div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
              Browse {source === 'pexels' ? 'Pexels' : 'Pixabay'} Videos
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              {totalResults > 0 ? `${totalResults.toLocaleString()} results` : 'Free stock videos for your B-roll'}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div style={{
          flex: 1,
          maxWidth: '500px',
          display: 'flex',
          gap: '8px'
        }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for videos... (e.g., medical, office, family)"
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            style={{
              padding: '10px 20px',
              background: source === 'pexels' ? '#05a081' : '#00ab6c',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !query.trim() ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search
          </button>
        </div>

        {selectedVideo && (
          <button
            onClick={handleConfirmSelection}
            style={{
              padding: '10px 20px',
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
            Use Selected Video
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px'
      }}>
        {/* Error state */}
        {error && (
          <div style={{
            padding: '16px',
            background: '#ef444420',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            color: '#ef4444',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {results.length === 0 && !loading && !error && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#64748b'
          }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p style={{ marginTop: '16px', fontSize: '16px' }}>
              Search for stock videos to use as B-roll
            </p>
            <p style={{ fontSize: '13px', marginTop: '4px' }}>
              Try searching for: medical, office, family, technology, nature
            </p>
          </div>
        )}

        {loading && results.length === 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #334155',
              borderTopColor: source === 'pexels' ? '#05a081' : '#00ab6c',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: '#94a3b8' }}>Searching {source === 'pexels' ? 'Pexels' : 'Pixabay'}...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px'
            }}>
              {results.map(video => (
                <div
                  key={video.id}
                  onClick={() => handleSelectVideo(video)}
                  onMouseEnter={() => setPreviewVideo(video)}
                  onMouseLeave={() => setPreviewVideo(null)}
                  style={{
                    background: '#1e293b',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: `2px solid ${selectedVideo?.id === video.id ? '#22c55e' : '#334155'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    position: 'relative',
                    aspectRatio: '16/9',
                    background: '#0f172a'
                  }}>
                    {previewVideo?.id === video.id ? (
                      <video
                        src={video.previewUrl}
                        autoPlay
                        muted
                        loop
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : video.thumbnail ? (
                      <>
                        <img
                          src={video.thumbnail}
                          alt={`Video by ${video.author}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            // Replace failed thumbnail with video poster
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            const fallback = img.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'block';
                          }}
                        />
                        {/* Video fallback when thumbnail fails - shows first frame */}
                        <video
                          src={video.previewUrl}
                          muted
                          playsInline
                          preload="metadata"
                          style={{
                            display: 'none',
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onLoadedMetadata={(e) => {
                            // Seek to 0.5 second to show a meaningful frame
                            const vid = e.target as HTMLVideoElement;
                            vid.currentTime = 0.5;
                          }}
                        />
                      </>
                    ) : (
                      // No thumbnail URL - show video directly as poster
                      <video
                        src={video.previewUrl}
                        muted
                        playsInline
                        preload="metadata"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        onLoadedMetadata={(e) => {
                          // Seek to 0.5 second to show a meaningful frame
                          const vid = e.target as HTMLVideoElement;
                          vid.currentTime = 0.5;
                        }}
                      />
                    )}

                    {/* Duration badge */}
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      padding: '4px 8px',
                      background: 'rgba(0,0,0,0.8)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#fff'
                    }}>
                      {formatDuration(video.duration)}
                    </div>

                    {/* Selected checkmark */}
                    {selectedVideo?.id === video.id && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '28px',
                        height: '28px',
                        background: '#22c55e',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}

                    {/* Source badge */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      padding: '4px 8px',
                      background: source === 'pexels' ? '#05a081' : '#00ab6c',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#fff',
                      textTransform: 'uppercase'
                    }}>
                      {source}
                    </div>
                  </div>

                  <div style={{ padding: '12px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        color: '#94a3b8'
                      }}>
                        by {video.author}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: '#64748b',
                        padding: '2px 6px',
                        background: '#0f172a',
                        borderRadius: '4px'
                      }}>
                        {video.width}x{video.height}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '24px'
              }}>
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  style={{
                    padding: '12px 32px',
                    background: '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #64748b',
                        borderTopColor: '#f1f5f9',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Loading...
                    </>
                  ) : (
                    `Load More (${results.length} of ${totalResults.toLocaleString()})`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Selected video preview footer */}
      {selectedVideo && (
        <div style={{
          padding: '16px 24px',
          background: '#1e293b',
          borderTop: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <video
            src={selectedVideo.previewUrl}
            autoPlay
            muted
            loop
            style={{
              width: '120px',
              height: '68px',
              objectFit: 'cover',
              borderRadius: '6px'
            }}
          />
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#f1f5f9',
              margin: 0
            }}>
              Selected: Video by {selectedVideo.author}
            </p>
            <p style={{
              fontSize: '12px',
              color: '#64748b',
              margin: '4px 0 0 0'
            }}>
              {selectedVideo.width}x{selectedVideo.height} | {formatDuration(selectedVideo.duration)} | {selectedVideo.source}
            </p>
          </div>
          <div style={{
            padding: '8px 12px',
            background: '#22c55e20',
            border: '1px solid #22c55e60',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#22c55e'
          }}>
            Free to use
          </div>
        </div>
      )}
    </div>
  );
};

export default StockBrowser;
