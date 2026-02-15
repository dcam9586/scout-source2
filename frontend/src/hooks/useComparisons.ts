import { useCallback } from 'react';
import api from '../store/api';
import useAppStore from '../store/appStore';
import { Comparison } from '../types';

export function useComparisons() {
  const setComparisons = useAppStore((state) => state.setComparisons);
  const addComparison = useAppStore((state) => state.addComparison);
  const removeComparison = useAppStore((state) => state.removeComparison);

  const fetchComparisons = useCallback(async () => {
    try {
      const response = await api.get<{ comparisons: Comparison[] }>(
        '/api/comparisons'
      );
      setComparisons(response.data.comparisons);
      return response.data.comparisons;
    } catch (error) {
      console.error('Failed to fetch comparisons:', error);
      throw error;
    }
  }, [setComparisons]);

  const createComparison = useCallback(
    async (
      comparison: Omit<Comparison, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    ) => {
      try {
        const response = await api.post<{ comparison: Comparison }>(
          '/api/comparisons',
          comparison
        );
        addComparison(response.data.comparison);
        return response.data.comparison;
      } catch (error) {
        console.error('Failed to create comparison:', error);
        throw error;
      }
    },
    [addComparison]
  );

  const updateComparison = useCallback(
    async (
      id: number,
      updates: Partial<Comparison>
    ): Promise<Comparison> => {
      try {
        const response = await api.put<{ comparison: Comparison }>(
          `/api/comparisons/${id}`,
          updates
        );
        return response.data.comparison;
      } catch (error) {
        console.error('Failed to update comparison:', error);
        throw error;
      }
    },
    []
  );

  const deleteComparison = useCallback(
    async (id: number) => {
      try {
        await api.delete(`/api/comparisons/${id}`);
        removeComparison(id);
      } catch (error) {
        console.error('Failed to delete comparison:', error);
        throw error;
      }
    },
    [removeComparison]
  );

  return {
    fetchComparisons,
    createComparison,
    updateComparison,
    deleteComparison,
  };
}
