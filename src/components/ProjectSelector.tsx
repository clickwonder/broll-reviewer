import { useState, useEffect } from 'react';
import type { DBProject } from '../services/databaseService';
import { getAllProjects, deleteProject, isDatabaseEnabled } from '../services/databaseService';

interface ProjectSelectorProps {
  onSelectProject: (project: DBProject) => void;
  onCreateProject: (name: string, description: string) => void;
}

export function ProjectSelector({ onSelectProject, onCreateProject }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    if (!isDatabaseEnabled()) {
      setError('Database not configured. Check your Supabase connection.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const projectList = await getAllProjects();
      setProjects(projectList);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim(), newProjectDescription.trim());
    setNewProjectName('');
    setNewProjectDescription('');
    setShowCreateForm(false);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? All assets will be deleted.')) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        background: '#1e293b',
        borderRadius: '16px',
        border: '1px solid #334155',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          padding: '32px',
          textAlign: 'center'
        }}>
          <h1 style={{
            color: '#fff',
            fontSize: '28px',
            fontWeight: 700,
            margin: 0,
            marginBottom: '8px'
          }}>
            B-Roll Reviewer
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '14px',
            margin: 0
          }}>
            Select a project or create a new one
          </p>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Error Message */}
          {error && (
            <div style={{
              background: '#7f1d1d',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px'
            }}>
              <p style={{ color: '#fca5a5', margin: 0, fontSize: '14px' }}>
                {error}
              </p>
              <button
                onClick={loadProjects}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  background: '#ef4444',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '48px',
              color: '#94a3b8'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #334155',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p>Loading projects...</p>
            </div>
          )}

          {/* Projects List */}
          {!loading && !showCreateForm && (
            <>
              {projects.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '48px',
                  color: '#94a3b8'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    background: '#334155',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    fontSize: '28px'
                  }}>
                    📁
                  </div>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>No projects yet</p>
                  <p style={{ fontSize: '14px', opacity: 0.7 }}>
                    Create your first project to get started
                  </p>
                </div>
              ) : (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{
                    color: '#f1f5f9',
                    fontSize: '14px',
                    fontWeight: 500,
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Your Projects
                  </h3>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {projects.map(project => (
                      <div
                        key={project.id}
                        onClick={() => onSelectProject(project)}
                        style={{
                          background: '#0f172a',
                          borderRadius: '8px',
                          padding: '16px',
                          border: '1px solid #334155',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.background = '#1e293b';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#334155';
                          e.currentTarget.style.background = '#0f172a';
                        }}
                      >
                        <div>
                          <h4 style={{
                            color: '#f1f5f9',
                            fontSize: '16px',
                            fontWeight: 500,
                            margin: 0,
                            marginBottom: '4px'
                          }}>
                            {project.name}
                          </h4>
                          {project.description && (
                            <p style={{
                              color: '#94a3b8',
                              fontSize: '13px',
                              margin: 0,
                              marginBottom: '8px'
                            }}>
                              {project.description}
                            </p>
                          )}
                          <div style={{
                            display: 'flex',
                            gap: '16px',
                            fontSize: '12px',
                            color: '#64748b'
                          }}>
                            <span>Created: {formatDate(project.created_at)}</span>
                            <span>Updated: {formatDate(project.updated_at)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={(e) => handleDeleteProject(project.id, e)}
                            disabled={deletingId === project.id}
                            style={{
                              padding: '8px 12px',
                              background: 'transparent',
                              border: '1px solid #ef4444',
                              borderRadius: '6px',
                              color: '#ef4444',
                              fontSize: '12px',
                              cursor: deletingId === project.id ? 'wait' : 'pointer',
                              opacity: deletingId === project.id ? 0.5 : 1
                            }}
                          >
                            {deletingId === project.id ? '...' : 'Delete'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectProject(project);
                            }}
                            style={{
                              padding: '8px 16px',
                              background: '#3b82f6',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: 500
                            }}
                          >
                            Open
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Project Button */}
              <button
                onClick={() => setShowCreateForm(true)}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '20px' }}>+</span>
                Create New Project
              </button>
            </>
          )}

          {/* Create Project Form */}
          {showCreateForm && (
            <div>
              <h3 style={{
                color: '#f1f5f9',
                fontSize: '18px',
                fontWeight: 500,
                marginBottom: '20px'
              }}>
                Create New Project
              </h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  color: '#94a3b8',
                  fontSize: '13px',
                  marginBottom: '6px'
                }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g., Medical Debt Video"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#334155'}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  color: '#94a3b8',
                  fontSize: '13px',
                  marginBottom: '6px'
                }}>
                  Description (optional)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={e => setNewProjectDescription(e.target.value)}
                  placeholder="Brief description of the project..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#334155'}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                  }}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#94a3b8',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  style={{
                    padding: '12px 24px',
                    background: newProjectName.trim() ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: newProjectName.trim() ? 'pointer' : 'not-allowed',
                    opacity: newProjectName.trim() ? 1 : 0.5
                  }}
                >
                  Create Project
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
