/**
 * usePartnerExport Hook
 * Handles exporting products to partner platforms (Dropified, Syncee, CSV)
 */

import { useState, useCallback } from 'react';
import type { PartnerPlatform, PartnerConnection, ExportResult, ExportStats, ExportedProduct } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api/v1';

interface UsePartnerExportReturn {
  // State
  isLoading: boolean;
  error: string | null;
  connections: PartnerConnection[];
  exportHistory: ExportedProduct[];
  stats: ExportStats | null;

  // Actions
  fetchConnections: () => Promise<void>;
  connectPartner: (partner: PartnerPlatform, credentials: { apiKey?: string; accessToken?: string }) => Promise<boolean>;
  disconnectPartner: (partner: PartnerPlatform) => Promise<boolean>;
  exportToPartner: (partner: PartnerPlatform, savedItemIds: number[], options?: Record<string, any>) => Promise<ExportResult | null>;
  fetchExportHistory: () => Promise<void>;
}

export function usePartnerExport(): UsePartnerExportReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connections, setConnections] = useState<PartnerConnection[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportedProduct[]>([]);
  const [stats, setStats] = useState<ExportStats | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }, []);

  /**
   * Fetch all partner connections for the current user
   */
  const fetchConnections = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/partners`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch partner connections');
      }

      const data = await response.json();
      setConnections(data.connections || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch connections';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  /**
   * Connect to a partner platform
   */
  const connectPartner = useCallback(async (
    partner: PartnerPlatform,
    credentials: { apiKey?: string; accessToken?: string }
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/partners/${partner}/connect`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to connect to partner');
      }

      // Refresh connections list
      await fetchConnections();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, fetchConnections]);

  /**
   * Disconnect from a partner platform
   */
  const disconnectPartner = useCallback(async (partner: PartnerPlatform): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/partners/${partner}/disconnect`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect from partner');
      }

      // Remove from local state
      setConnections(prev => prev.filter(c => c.partner !== partner));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Disconnection failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  /**
   * Export products to a partner platform
   */
  const exportToPartner = useCallback(async (
    partner: PartnerPlatform,
    savedItemIds: number[],
    options?: Record<string, any>
  ): Promise<ExportResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/partners/${partner}/export`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ savedItemIds, options }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.needsConnection) {
          throw new Error(`Please connect your ${partner} account first`);
        }
        throw new Error(data.error || 'Export failed');
      }

      return data as ExportResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  /**
   * Fetch export history and statistics
   */
  const fetchExportHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/partners/exports/history`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch export history');
      }

      const data = await response.json();
      setExportHistory(data.exports || []);
      setStats(data.stats || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch history';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  return {
    isLoading,
    error,
    connections,
    exportHistory,
    stats,
    fetchConnections,
    connectPartner,
    disconnectPartner,
    exportToPartner,
    fetchExportHistory,
  };
}

export default usePartnerExport;
