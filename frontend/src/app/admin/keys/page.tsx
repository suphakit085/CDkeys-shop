'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { gamesApi, keysApi, Game, CdKey } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  AdminEmpty,
  AdminNotice,
  AdminPageSkeleton,
  AdminPanel,
  AdminShell,
  AdminStatCard,
} from '@/components/admin/AdminUI';

export default function AdminKeys() {
  const { user, token, isAdmin, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [keys, setKeys] = useState<CdKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bulkKeys, setBulkKeys] = useState('');
  const [addResult, setAddResult] = useState<{
    added: number;
    duplicates: number;
  } | null>(null);
  const [error, setError] = useState('');

  const loadGames = useCallback(async () => {
    try {
      const data = await gamesApi.getAll();
      setGames(data);
      if (data.length > 0) {
        setSelectedGame((current) => current || data[0].id);
      }
    } catch (err) {
      console.error('Failed to load games:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadKeys = useCallback(async () => {
    if (!token || !selectedGame) return;
    try {
      const data = await keysApi.getByGame(selectedGame, token);
      setKeys(data);
    } catch (err) {
      console.error('Failed to load keys:', err);
    }
  }, [selectedGame, token]);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        router.push('/');
        return;
      }
      loadGames();
    }
  }, [user, isAdmin, authLoading, router, loadGames]);

  useEffect(() => {
    if (selectedGame && token) {
      loadKeys();
    }
  }, [selectedGame, token, loadKeys]);

  const handleBulkAdd = async () => {
    if (!token || !selectedGame || !bulkKeys.trim()) return;
    setError('');

    const keyList = bulkKeys
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keyList.length === 0) return;

    try {
      const result = await keysApi.addKeys({ gameId: selectedGame, keys: keyList }, token);
      setAddResult(result);
      setBulkKeys('');
      await loadKeys();
      await loadGames();
    } catch (err) {
      console.error('Failed to add keys:', err);
      setError(err instanceof Error ? err.message : 'Unable to add keys');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!token || !confirm('Delete this key?')) return;
    setError('');
    try {
      await keysApi.delete(keyId, token);
      await loadKeys();
      await loadGames();
    } catch (err) {
      console.error('Failed to delete key:', err);
      setError(err instanceof Error ? err.message : 'Unable to delete key');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      AVAILABLE: 'badge-available',
      RESERVED: 'badge-reserved',
      SOLD: 'badge-sold',
    };
    return styles[status] || '';
  };

  if (authLoading || isLoading) {
    return <AdminPageSkeleton rows={3} />;
  }

  const selectedGameData = games.find((g) => g.id === selectedGame);
  const available = keys.filter((k) => k.status === 'AVAILABLE').length;
  const reserved = keys.filter((k) => k.status === 'RESERVED').length;
  const sold = keys.filter((k) => k.status === 'SOLD').length;

  return (
    <AdminShell
      title="Key Inventory"
      description="Add, audit, and remove unsold product keys by game."
    >
      {error && <AdminNotice tone="error">{error}</AdminNotice>}
      {addResult && (
        <AdminNotice tone="success">
          Added {addResult.added} keys. Skipped {addResult.duplicates} duplicates.
        </AdminNotice>
      )}

      <section className="admin-stat-grid">
        <AdminStatCard label="Total keys" value={keys.length} helper="Selected game" />
        <AdminStatCard
          label="Available"
          value={available}
          helper="Ready to sell"
          tone="green"
        />
        <AdminStatCard label="Reserved" value={reserved} helper="Pending orders" tone="amber" />
        <AdminStatCard label="Sold" value={sold} helper="Delivered" tone="rose" />
      </section>

      <AdminPanel title="Game selection" description="Choose a product before adding keys.">
        {games.length > 0 ? (
          <div className="admin-toolbar">
            <select
              value={selectedGame}
              onChange={(e) => {
                setSelectedGame(e.target.value);
                setAddResult(null);
                setError('');
              }}
              className="input md:max-w-xl"
            >
              {games.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.title} ({game.platform}) - {game.availableKeys} available
                </option>
              ))}
            </select>
            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--text-muted)]">
              {selectedGameData?.platform || '-'} / {selectedGameData?.genre || '-'}
            </div>
          </div>
        ) : (
          <AdminEmpty title="No games yet" description="Create a game before adding keys." />
        )}
      </AdminPanel>

      <AdminPanel
        title="Bulk add keys"
        description="Paste one key per line or separate keys with commas."
        actions={
          <button
            onClick={handleBulkAdd}
            disabled={!selectedGame || !bulkKeys.trim()}
            className="btn-primary px-5 disabled:opacity-40"
          >
            Add keys
          </button>
        }
      >
        <textarea
          value={bulkKeys}
          onChange={(e) => setBulkKeys(e.target.value)}
          placeholder="XXXX-XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY-YYYY"
          className="input min-h-[160px] font-mono text-sm"
        />
      </AdminPanel>

      <AdminPanel
        title={`Keys for ${selectedGameData?.title || 'selected game'}`}
        description={`${keys.length} keys loaded`}
      >
        {keys.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Key code</th>
                  <th>Status</th>
                  <th>Buyer</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="font-mono text-sm">{key.keyCode}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(key.status)}`}>
                        {key.status}
                      </span>
                    </td>
                    <td className="text-[color:var(--text-muted)]">
                      {key.orderItem?.order?.user?.email || '-'}
                    </td>
                    <td>
                      {key.status === 'AVAILABLE' ? (
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className="admin-danger-button min-h-0 px-3 py-2 text-sm"
                        >
                          Delete
                        </button>
                      ) : (
                        <span className="text-sm text-[color:var(--text-dim)]">
                          Locked
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty title="No keys for this game" description="Use bulk add to stock inventory." />
        )}
      </AdminPanel>
    </AdminShell>
  );
}
