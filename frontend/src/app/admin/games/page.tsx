/* eslint-disable @next/next/no-img-element -- Admin previews render local uploads and admin-provided image URLs. */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { gamesApi, Game, Platform, CreateGameDto, PaginationMeta } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, getUploadUrl } from '@/lib/config';
import { formatMoney } from '@/lib/currency';
import {
  AdminEmpty,
  AdminPageSkeleton,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminUI';

const platforms: Platform[] = [
  'STEAM',
  'PLAYSTATION',
  'XBOX',
  'NINTENDO',
  'ORIGIN',
  'UPLAY',
  'EPIC',
];
const pageSize = 12;
const textToList = (value: string) =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
const listToText = (value?: string[]) => (value || []).join('\n');

const emptyForm: CreateGameDto = {
  title: '',
  description: '',
  platform: 'STEAM',
  genre: '',
  price: 0,
  imageUrl: '',
  developer: '',
  publisher: '',
  releaseDate: '',
  systemRequirements: '',
  minimumSystemRequirements: '',
  recommendedSystemRequirements: '',
  features: [],
  supportedLanguages: [],
  activationRegion: '',
  ageRating: '',
  screenshots: [],
};

export default function AdminGames() {
  const { user, token, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<CreateGameDto>(emptyForm);

  const loadGames = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await gamesApi.getPage({
        search: search.trim() || undefined,
        page,
        limit: pageSize,
      });
      setGames(result.data);
      setPagination(result.meta);
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        router.push('/');
        return;
      }
      loadGames();
    }
  }, [user, isAdmin, authLoading, router, loadGames]);

  const resetForm = () => {
    setShowForm(false);
    setEditingGame(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const payload: CreateGameDto = {
      ...formData,
      releaseDate: formData.releaseDate || undefined,
    };

    try {
      if (editingGame) {
        await gamesApi.update(editingGame.id, payload, token);
      } else {
        await gamesApi.create(payload, token);
      }

      if (page !== 1) {
        setPage(1);
      } else {
        await loadGames();
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save game:', error);
      alert(error instanceof Error ? error.message : 'Unable to save game');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this game?')) return;

    try {
      await gamesApi.delete(id, token);
      if (games.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await loadGames();
      }
    } catch (error) {
      console.error('Failed to delete game:', error);
      alert(error instanceof Error ? error.message : 'Unable to delete game');
    }
  };

  const startEdit = (game: Game) => {
    setEditingGame(game);
    setFormData({
      title: game.title,
      description: game.description || '',
      platform: game.platform,
      genre: game.genre,
      price: Number(game.price),
      imageUrl: game.imageUrl || '',
      developer: game.developer || '',
      publisher: game.publisher || '',
      releaseDate: game.releaseDate ? game.releaseDate.slice(0, 10) : '',
      systemRequirements: game.systemRequirements || '',
      minimumSystemRequirements: game.minimumSystemRequirements || '',
      recommendedSystemRequirements: game.recommendedSystemRequirements || '',
      features: game.features || [],
      supportedLanguages: game.supportedLanguages || [],
      activationRegion: game.activationRegion || '',
      ageRating: game.ageRating || '',
      screenshots: game.screenshots || [],
    });
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const response = await fetch(`${API_URL}/upload/image?folder=games`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      } else {
        alert('Image upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || isLoading) {
    return <AdminPageSkeleton rows={4} />;
  }

  return (
    <AdminShell
      title="Game Catalog"
      description="Create product pages with pricing, metadata, activation details, and system requirements."
      actions={
        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
          className="btn-primary px-4"
        >
          {showForm ? 'Close form' : 'Add game'}
        </button>
      }
    >
      {showForm && (
        <AdminPanel
          title={editingGame ? 'Edit game' : 'New game'}
          description="Keep product information complete so the store page feels trustworthy."
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="admin-preview-box aspect-square">
                  {formData.imageUrl ? (
                    <img
                      src={getUploadUrl(formData.imageUrl)}
                      alt="Game preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-[color:var(--text-muted)]">
                      No image
                    </span>
                  )}
                </div>
                <label className="btn-secondary w-full cursor-pointer px-4">
                  {uploading ? 'Uploading...' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="space-y-5">
                <div className="admin-form-grid">
                  <label>
                    <span className="admin-field-label">Title</span>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="input"
                      required
                    />
                  </label>
                  <label>
                    <span className="admin-field-label">Platform</span>
                    <select
                      value={formData.platform}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          platform: e.target.value as Platform,
                        })
                      }
                      className="input"
                    >
                      {platforms.map((platform) => (
                        <option key={platform} value={platform}>
                          {platform}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="admin-field-label">Genre</span>
                    <input
                      type="text"
                      value={formData.genre}
                      onChange={(e) =>
                        setFormData({ ...formData, genre: e.target.value })
                      }
                      className="input"
                      required
                    />
                  </label>
                  <label>
                    <span className="admin-field-label">Price</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input"
                      required
                    />
                  </label>
                </div>

                <label>
                  <span className="admin-field-label">Image URL</span>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    className="input"
                    placeholder="https://..."
                  />
                </label>

                <label>
                  <span className="admin-field-label">Description</span>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input min-h-[110px]"
                  />
                </label>
              </div>
            </div>

            <div className="admin-form-grid-3">
              <label>
                <span className="admin-field-label">Developer</span>
                <input
                  type="text"
                  value={formData.developer || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, developer: e.target.value })
                  }
                  className="input"
                />
              </label>
              <label>
                <span className="admin-field-label">Publisher</span>
                <input
                  type="text"
                  value={formData.publisher || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, publisher: e.target.value })
                  }
                  className="input"
                />
              </label>
              <label>
                <span className="admin-field-label">Release date</span>
                <input
                  type="date"
                  value={formData.releaseDate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, releaseDate: e.target.value })
                  }
                  className="input"
                />
              </label>
              <label>
                <span className="admin-field-label">Region</span>
                <input
                  type="text"
                  value={formData.activationRegion || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      activationRegion: e.target.value,
                    })
                  }
                  className="input"
                  placeholder="Global"
                />
              </label>
              <label>
                <span className="admin-field-label">Age rating</span>
                <input
                  type="text"
                  value={formData.ageRating || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, ageRating: e.target.value })
                  }
                  className="input"
                  placeholder="Teen"
                />
              </label>
              <label>
                <span className="admin-field-label">Languages</span>
                <textarea
                  value={listToText(formData.supportedLanguages)}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      supportedLanguages: textToList(e.target.value),
                    })
                  }
                  className="input min-h-[88px]"
                  placeholder="English&#10;Thai"
                />
              </label>
            </div>

            <label>
              <span className="admin-field-label">Key features</span>
              <textarea
                value={listToText(formData.features)}
                onChange={(e) =>
                  setFormData({ ...formData, features: textToList(e.target.value) })
                }
                className="input min-h-[100px]"
                placeholder="One feature per line"
              />
            </label>

            <div className="admin-form-grid">
              <label>
                <span className="admin-field-label">Minimum requirements</span>
                <textarea
                  value={formData.minimumSystemRequirements || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minimumSystemRequirements: e.target.value,
                    })
                  }
                  className="input min-h-[145px]"
                />
              </label>
              <label>
                <span className="admin-field-label">Recommended requirements</span>
                <textarea
                  value={formData.recommendedSystemRequirements || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recommendedSystemRequirements: e.target.value,
                    })
                  }
                  className="input min-h-[145px]"
                />
              </label>
            </div>

            <label>
              <span className="admin-field-label">Extra requirement notes</span>
              <textarea
                value={formData.systemRequirements || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    systemRequirements: e.target.value,
                  })
                }
                className="input min-h-[90px]"
              />
            </label>

            <div className="admin-button-row">
              <button type="submit" className="btn-primary px-6">
                {editingGame ? 'Save changes' : 'Create game'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary px-6">
                Cancel
              </button>
            </div>
          </form>
        </AdminPanel>
      )}

      <AdminPanel>
        <div className="admin-toolbar">
          <div>
            <p className="admin-eyebrow">Catalog</p>
            <h2 className="admin-panel-title">
              {pagination ? `${pagination.total} games` : `${games.length} games`}
            </h2>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input md:max-w-sm"
            placeholder="Search games"
          />
        </div>
      </AdminPanel>

      {games.length > 0 ? (
        <section className="admin-game-grid">
          {games.map((game) => (
            <article key={game.id} className="admin-item-card">
              <img
                src={game.imageUrl ? getUploadUrl(game.imageUrl) : '/placeholder-game.jpg'}
                alt={game.title}
                className="admin-thumb"
              />
              <div className="admin-item-card-body">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-lg font-black text-[color:var(--foreground)]">
                      {game.title}
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                      {game.genre}
                    </p>
                  </div>
                  <span className="badge badge-available">{game.availableKeys}</span>
                </div>

                <div className="admin-meta-row mb-4">
                  <span>{game.platform}</span>
                  <span>{formatMoney(game.price)}</span>
                  <span>{game.activationRegion || 'Global'}</span>
                </div>

                <div className="admin-button-row">
                  <button
                    onClick={() => startEdit(game)}
                    className="btn-secondary flex-1 px-4"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="admin-danger-button flex-1 px-4"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <AdminEmpty
          title="No games found"
          description="Add a new game or adjust the search term."
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={!pagination.hasPrevious}
            className="btn-secondary px-4 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm font-semibold text-[color:var(--text-muted)]">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((current) => current + 1)}
            disabled={!pagination.hasNext}
            className="btn-secondary px-4 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </AdminShell>
  );
}
