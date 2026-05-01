/* eslint-disable @next/next/no-img-element -- Admin previews render local uploads and admin-provided image URLs. */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, BACKEND_URL, getUploadUrl } from '@/lib/config';
import {
  AdminAccessRequired,
  AdminEmpty,
  AdminNotice,
  AdminPageSkeleton,
  AdminPanel,
  AdminShell,
  AdminStatCard,
  cx,
} from '@/components/admin/AdminUI';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  bgColor: string;
  link: string;
  buttonText: string;
  isActive: boolean;
  order: number;
}

const defaultBgColors = [
  { name: 'Teal / Blue', value: 'from-teal-500 via-cyan-600 to-blue-700' },
  { name: 'Indigo / Violet', value: 'from-indigo-600 via-violet-600 to-purple-700' },
  { name: 'Amber / Rose', value: 'from-amber-500 via-orange-600 to-rose-700' },
  { name: 'Green / Slate', value: 'from-emerald-500 via-teal-700 to-slate-900' },
  { name: 'Neutral / Silver', value: 'from-slate-600 via-slate-800 to-zinc-950' },
];

const defaultBanner = {
  title: '',
  subtitle: '',
  description: '',
  imageUrl: '',
  bgColor: defaultBgColors[0].value,
  link: '/store',
  buttonText: 'Shop now',
  isActive: true,
  order: 0,
};

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message || fallback;
  } catch {
    return fallback;
  }
}

function normalizeUploadedUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${BACKEND_URL}${url}`;
}

export default function AdminBannersPage() {
  const { token, isAdmin, isLoading: authLoading } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [title, setTitle] = useState(defaultBanner.title);
  const [subtitle, setSubtitle] = useState(defaultBanner.subtitle);
  const [description, setDescription] = useState(defaultBanner.description);
  const [imageUrl, setImageUrl] = useState(defaultBanner.imageUrl);
  const [bgColor, setBgColor] = useState(defaultBanner.bgColor);
  const [link, setLink] = useState(defaultBanner.link);
  const [buttonText, setButtonText] = useState(defaultBanner.buttonText);
  const [isActive, setIsActive] = useState(defaultBanner.isActive);
  const [order, setOrder] = useState(defaultBanner.order);

  const activeCount = banners.filter((banner) => banner.isActive).length;
  const nextOrder = banners.reduce((max, banner) => Math.max(max, banner.order), -1) + 1;
  const imagePreview = imageUrl ? getUploadUrl(imageUrl) : '';

  const loadBanners = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/banners/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Unable to load banners'));
      }

      const data = (await response.json()) as Banner[];
      setBanners(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load banners');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadBanners();
    }
  }, [authLoading, isAdmin, loadBanners]);

  const resetForm = useCallback(() => {
    setTitle(defaultBanner.title);
    setSubtitle(defaultBanner.subtitle);
    setDescription(defaultBanner.description);
    setImageUrl(defaultBanner.imageUrl);
    setBgColor(defaultBanner.bgColor);
    setLink(defaultBanner.link);
    setButtonText(defaultBanner.buttonText);
    setIsActive(defaultBanner.isActive);
    setOrder(nextOrder);
    setEditingBanner(null);
  }, [nextOrder]);

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || '');
    setDescription(banner.description || '');
    setImageUrl(banner.imageUrl || '');
    setBgColor(banner.bgColor);
    setLink(banner.link);
    setButtonText(banner.buttonText);
    setIsActive(banner.isActive);
    setOrder(banner.order);
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const response = await fetch(
        editingBanner ? `${API_URL}/banners/${editingBanner.id}` : `${API_URL}/banners`,
        {
          method: editingBanner ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            subtitle: subtitle || null,
            description: description || null,
            imageUrl: imageUrl || null,
            bgColor,
            link,
            buttonText,
            isActive,
            order,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Unable to save banner'));
      }

      setSuccess(editingBanner ? 'Banner updated.' : 'Banner created.');
      setShowForm(false);
      resetForm();
      await loadBanners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save banner');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !window.confirm('Delete this banner?')) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/banners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Unable to delete banner'));
      }

      setSuccess('Banner deleted.');
      await loadBanners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete banner');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_URL}/banners/upload-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Image upload failed'));
      }

      const data = (await response.json()) as { url: string };
      setImageUrl(normalizeUploadedUrl(data.url));
      setSuccess('Image uploaded. Save the banner to publish it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (authLoading) {
    return <AdminPageSkeleton rows={3} />;
  }

  if (!isAdmin) {
    return <AdminAccessRequired />;
  }

  if (isLoading) {
    return <AdminPageSkeleton rows={3} />;
  }

  return (
    <AdminShell
      title="Homepage Banners"
      description="Manage storefront hero promotions, campaign copy, images, and display order."
      actions={
        <>
          <button
            type="button"
            onClick={loadBanners}
            className="btn-secondary px-4"
            disabled={isSaving || uploading}
          >
            Refresh
          </button>
          <button type="button" onClick={openCreateForm} className="btn-primary px-4">
            Add banner
          </button>
        </>
      }
    >
      {error && <AdminNotice tone="error">{error}</AdminNotice>}
      {success && <AdminNotice tone="success">{success}</AdminNotice>}

      <section className="admin-stat-grid">
        <AdminStatCard label="Total banners" value={banners.length} helper="All campaigns" />
        <AdminStatCard label="Active" value={activeCount} helper="Shown on homepage" tone="green" />
        <AdminStatCard
          label="Inactive"
          value={banners.length - activeCount}
          helper="Hidden from customers"
          tone="amber"
        />
        <AdminStatCard label="Next order" value={nextOrder} helper="Suggested sort value" tone="blue" />
      </section>

      {showForm && (
        <AdminPanel
          title={editingBanner ? 'Edit banner' : 'New banner'}
          description="Use focused campaign copy and a clear destination link."
          actions={
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="btn-secondary px-4"
            >
              Close
            </button>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                <div className="admin-form-grid">
                  <label>
                    <span className="admin-field-label">Title</span>
                    <input
                      type="text"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      className="input"
                      required
                      placeholder="Winter Sale"
                    />
                  </label>

                  <label>
                    <span className="admin-field-label">Subtitle</span>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(event) => setSubtitle(event.target.value)}
                      className="input"
                      placeholder="Digital game keys"
                    />
                  </label>
                </div>

                <label>
                  <span className="admin-field-label">Description</span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="input min-h-[105px]"
                    placeholder="Short campaign description for the homepage hero."
                  />
                </label>

                <div className="admin-form-grid">
                  <label>
                    <span className="admin-field-label">Destination link</span>
                    <input
                      type="text"
                      value={link}
                      onChange={(event) => setLink(event.target.value)}
                      className="input"
                      placeholder="/store"
                    />
                  </label>

                  <label>
                    <span className="admin-field-label">Button text</span>
                    <input
                      type="text"
                      value={buttonText}
                      onChange={(event) => setButtonText(event.target.value)}
                      className="input"
                      placeholder="Shop now"
                    />
                  </label>
                </div>

                <div className="admin-form-grid">
                  <label>
                    <span className="admin-field-label">Sort order</span>
                    <input
                      type="number"
                      value={order}
                      onChange={(event) => setOrder(parseInt(event.target.value, 10) || 0)}
                      className="input"
                    />
                  </label>

                  <label>
                    <span className="admin-field-label">Gradient fallback</span>
                    <select
                      value={bgColor}
                      onChange={(event) => setBgColor(event.target.value)}
                      className="input"
                    >
                      {defaultBgColors.map((color) => (
                        <option key={color.value} value={color.value}>
                          {color.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  <span className="admin-field-label">Image URL</span>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    className="input"
                    placeholder="https://... or /uploads/banner.jpg"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="btn-secondary cursor-pointer px-4">
                    {uploading ? 'Uploading...' : 'Upload image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>

                  <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 text-sm font-bold text-[color:var(--foreground)]">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                      className="h-4 w-4 accent-teal-400"
                    />
                    Active on homepage
                  </label>
                </div>
              </div>

              <div>
                <span className="admin-field-label">Live preview</span>
                <div
                  className={cx(
                    'relative aspect-[16/10] overflow-hidden rounded-lg border border-[color:var(--border)] bg-gradient-to-r p-5 text-white',
                    bgColor,
                  )}
                >
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/45" />
                  <div className="relative z-10 flex h-full flex-col justify-end">
                    <p className="text-xs font-black uppercase text-teal-200">
                      {subtitle || 'Campaign'}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-2xl font-black">
                      {title || 'Banner title'}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-white/78">
                      {description || 'Short campaign description appears here.'}
                    </p>
                    <span className="mt-4 inline-flex h-10 w-fit items-center rounded-lg bg-teal-300 px-4 text-sm font-black text-slate-950">
                      {buttonText || 'Shop now'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-button-row">
              <button
                type="submit"
                disabled={isSaving || uploading}
                className="btn-primary px-6 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingBanner ? 'Save banner' : 'Create banner'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="btn-secondary px-6"
              >
                Cancel
              </button>
            </div>
          </form>
        </AdminPanel>
      )}

      {banners.length === 0 ? (
        <AdminEmpty
          title="No banners yet"
          description="Create a homepage banner to highlight promotions and featured games."
          action={
            <button type="button" onClick={openCreateForm} className="btn-primary px-5">
              Add banner
            </button>
          }
        />
      ) : (
        <section className="admin-banner-grid">
          {banners.map((banner) => (
            <article key={banner.id} className="admin-item-card">
              <div
                className={cx(
                  'relative aspect-[16/8] overflow-hidden bg-gradient-to-r',
                  banner.bgColor,
                )}
              >
                {banner.imageUrl ? (
                  <img
                    src={getUploadUrl(banner.imageUrl)}
                    alt={banner.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center px-4 text-center text-sm font-black text-white">
                    {banner.title}
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <span className={cx('badge', banner.isActive ? 'badge-available' : 'badge-reserved')}>
                    {banner.isActive ? 'Active' : 'Hidden'}
                  </span>
                </div>
              </div>

              <div className="admin-item-card-body">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-lg font-black text-[color:var(--foreground)]">
                      {banner.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[color:var(--text-muted)]">
                      {banner.subtitle || banner.description || 'No supporting copy'}
                    </p>
                  </div>
                  <span className="badge badge-epic">#{banner.order}</span>
                </div>

                <div className="admin-meta-row mb-4">
                  <span className="truncate">{banner.link}</span>
                  <span>{banner.buttonText}</span>
                </div>

                <div className="admin-button-row">
                  <button
                    type="button"
                    onClick={() => handleEdit(banner)}
                    className="btn-secondary flex-1 px-4"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(banner.id)}
                    className="admin-danger-button flex-1 px-4"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </AdminShell>
  );
}
