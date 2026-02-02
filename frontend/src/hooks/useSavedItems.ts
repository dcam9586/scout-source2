import { useCallback } from 'react';
import api from '../store/api';
import useAppStore from '../store/appStore';
import { SavedItem } from '../types';

export function useSavedItems() {
  const setSavedItems = useAppStore((state) => state.setSavedItems);
  const addSavedItem = useAppStore((state) => state.addSavedItem);
  const removeSavedItem = useAppStore((state) => state.removeSavedItem);

  const fetchSavedItems = useCallback(async () => {
    try {
      const response = await api.get<{ items: SavedItem[] }>(
        '/api/v1/saved-items'
      );
      setSavedItems(response.data.items);
      return response.data.items;
    } catch (error) {
      console.error('Failed to fetch saved items:', error);
      throw error;
    }
  }, [setSavedItems]);

  const createSavedItem = useCallback(
    async (item: Omit<SavedItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      try {
        const response = await api.post<{ item: SavedItem }>(
          '/api/v1/saved-items',
          item
        );
        addSavedItem(response.data.item);
        return response.data.item;
      } catch (error) {
        console.error('Failed to create saved item:', error);
        throw error;
      }
    },
    [addSavedItem]
  );

  const updateSavedItem = useCallback(
    async (
      id: number,
      updates: Partial<SavedItem>
    ): Promise<SavedItem> => {
      try {
        const response = await api.put<{ item: SavedItem }>(
          `/api/v1/saved-items/${id}`,
          updates
        );
        return response.data.item;
      } catch (error) {
        console.error('Failed to update saved item:', error);
        throw error;
      }
    },
    []
  );

  const deleteSavedItem = useCallback(
    async (id: number) => {
      try {
        await api.delete(`/api/v1/saved-items/${id}`);
        removeSavedItem(id);
      } catch (error) {
        console.error('Failed to delete saved item:', error);
        throw error;
      }
    },
    [removeSavedItem]
  );

  return {
    fetchSavedItems,
    createSavedItem,
    updateSavedItem,
    deleteSavedItem,
  };
}
