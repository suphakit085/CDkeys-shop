/* eslint-disable @next/next/no-img-element -- Admin previews render local uploads and admin-provided image URLs. */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL, BACKEND_URL, getUploadUrl } from '@/lib/config';
import {
  AdminAccessRequired,
  AdminNotice,
  AdminPageSkeleton,
  AdminPanel,
  AdminShell,
} from '@/components/admin/AdminUI';

type StoreSettings = {
  storeName: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
};

const defaultSettings: StoreSettings = {
  storeName: 'CDKeys Marketplace',
  tagline: 'Get your favorite games instantly',
  logoUrl: null,
  primaryColor: '#14b8a6',
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

export default function AdminSettingsPage() {
  const { token, isAdmin, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [storeName, setStoreName] = useState(defaultSettings.storeName);
  const [logoUrl, setLogoUrl] = useState(defaultSettings.logoUrl || '');
  const [tagline, setTagline] = useState(defaultSettings.tagline || '');
  const [primaryColor, setPrimaryColor] = useState(defaultSettings.primaryColor);

  const logoPreview = logoUrl ? getUploadUrl(logoUrl) : '';

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/settings`);
      if (!response.ok) {
        throw new Error(await readApiError(response, 'Unable to load settings'));
      }

      const data = (await response.json()) as Partial<StoreSettings>;
      setStoreName(data.storeName || defaultSettings.storeName);
      setLogoUrl(data.logoUrl || '');
      setTagline(data.tagline || '');
      setPrimaryColor(data.primaryColor || defaultSettings.primaryColor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadSettings();
    }
  }, [authLoading, isAdmin, loadSettings]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;

    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          storeName,
          logoUrl: logoUrl || null,
          tagline: tagline || null,
          primaryColor,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Unable to save settings'));
      }

      setSuccess('Settings saved.');
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`${API_URL}/settings/upload-logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Logo upload failed'));
      }

      const data = (await response.json()) as { url: string };
      setLogoUrl(normalizeUploadedUrl(data.url));
      setSuccess('Logo uploaded. Save settings to publish it.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  if (authLoading) {
    return <AdminPageSkeleton rows={2} />;
  }

  if (!isAdmin) {
    return <AdminAccessRequired />;
  }

  if (isLoading) {
    return <AdminPageSkeleton rows={2} />;
  }

  return (
    <AdminShell
      title="Store Settings"
      description="Control the storefront name, brand message, logo, and accent color used across the shop."
      maxWidth="standard"
      actions={
        <button
          type="button"
          onClick={loadSettings}
          className="btn-secondary px-4"
          disabled={isSaving || uploading}
        >
          Reload
        </button>
      }
    >
      {error && <AdminNotice tone="error">{error}</AdminNotice>}
      {success && <AdminNotice tone="success">{success}</AdminNotice>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <AdminPanel
          title="Brand details"
          description="These values appear in the header and customer-facing pages."
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="admin-form-grid">
              <label>
                <span className="admin-field-label">Store name</span>
                <input
                  type="text"
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  className="input"
                  required
                  placeholder={defaultSettings.storeName}
                />
              </label>

              <label>
                <span className="admin-field-label">Primary color</span>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(event) => setPrimaryColor(event.target.value)}
                    className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-[color:var(--border)] bg-transparent p-1"
                    aria-label="Primary color"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(event) => setPrimaryColor(event.target.value)}
                    className="input"
                    placeholder="#14b8a6"
                  />
                </div>
              </label>
            </div>

            <label>
              <span className="admin-field-label">Tagline</span>
              <input
                type="text"
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                className="input"
                placeholder={defaultSettings.tagline || ''}
              />
            </label>

            <label>
              <span className="admin-field-label">Logo URL</span>
              <input
                type="text"
                value={logoUrl}
                onChange={(event) => setLogoUrl(event.target.value)}
                className="input"
                placeholder="https://... or /uploads/logo.png"
              />
            </label>

            <div className="grid gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 sm:grid-cols-[96px_minmax(0,1fr)]">
              <div className="admin-preview-box aspect-square">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-full w-full object-contain p-3"
                  />
                ) : (
                  <span className="text-xl font-black text-[color:var(--foreground)]">
                    CK
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[color:var(--foreground)]">
                  Upload a new logo
                </p>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                  PNG, JPG, or WEBP files work best. The image will be shown in the
                  store header after saving.
                </p>
                <label className="btn-secondary mt-3 inline-flex cursor-pointer px-4">
                  {uploading ? 'Uploading...' : 'Upload logo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>

            <div className="admin-button-row pt-1">
              <button
                type="submit"
                disabled={isSaving || uploading}
                className="btn-primary px-6 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </form>
        </AdminPanel>

        <AdminPanel
          title="Header preview"
          description="A compact preview of the storefront brand block."
        >
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)]">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt=""
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-sm font-black text-[color:var(--foreground)]">
                    CK
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-[color:var(--foreground)]">
                  {storeName || defaultSettings.storeName}
                </p>
                <p className="truncate text-sm text-[color:var(--text-muted)]">
                  {tagline || defaultSettings.tagline}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] p-3">
              <span className="font-bold text-[color:var(--text-muted)]">
                Brand color
              </span>
              <span className="flex items-center gap-2 font-black text-[color:var(--foreground)]">
                <span
                  className="h-4 w-4 rounded-full border border-[color:var(--border)]"
                  style={{ backgroundColor: primaryColor }}
                />
                {primaryColor}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] p-3">
              <span className="font-bold text-[color:var(--text-muted)]">
                Logo source
              </span>
              <span className="truncate text-right font-black text-[color:var(--foreground)]">
                {logoUrl ? 'Custom logo' : 'Initial mark'}
              </span>
            </div>
          </div>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
