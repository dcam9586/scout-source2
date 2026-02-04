import { useCallback } from 'react';
import api from '../store/api';
import { SearchResult, SearchSource } from '../types';

export interface SearchParams {
  query: string;
  sources?: SearchSource[];
  bossMode?: boolean;
}

export interface SearchResponse {
  query: string;
  results: Record<SearchSource, SearchResult[]>;
  timestamp: string;
  duration: number;
  bossMode?: boolean;
  sources: {
    alibaba?: number;
    'made-in-china'?: number;
    'cj-dropshipping'?: number;
    total: number;
  };
  enhancement?: {
    puppeteerResults: number;
    jigsawEnhancements: number;
    message: string;
  };
}

export function useSearch() {
  const performSearch = useCallback(async (params: SearchParams): Promise<SearchResponse> => {
    try {
      const response = await api.post<SearchResponse>('/api/search', {
        query: params.query,
        sources: params.sources || ['alibaba', 'cj-dropshipping'],
        bossMode: params.bossMode || false,
      });
      return response.data;
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }, []);

  const searchCJ = useCallback(async (query: string, options?: {
    page?: number;
    limit?: number;
    warehouse?: string;
    freeShipping?: boolean;
  }) => {
    try {
      const params = new URLSearchParams({ q: query });
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.warehouse) params.append('warehouse', options.warehouse);
      if (options?.freeShipping) params.append('freeShipping', 'true');

      const response = await api.get(`/api/v1/cj/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('CJ search failed:', error);
      throw error;
    }
  }, []);

  const getCJWarehouses = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/cj/warehouses');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch CJ warehouses:', error);
      throw error;
    }
  }, []);

  const getCJCategories = useCallback(async () => {
    try {
      const response = await api.get('/api/v1/cj/categories');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch CJ categories:', error);
      throw error;
    }
  }, []);

  const getSearchHistory = useCallback(async (limit: number = 50) => {
    try {
      const response = await api.get('/api/search/history', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch search history:', error);
      throw error;
    }
  }, []);

  return {
    performSearch,
    searchCJ,
    getCJWarehouses,
    getCJCategories,
    getSearchHistory,
  };
}
