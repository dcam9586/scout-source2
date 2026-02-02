import { create } from 'zustand';
import { User, SavedItem, Comparison, ApiUsage } from '../types';
import { ProductCardProps } from '../components/ProductCard';

interface AppStore {
  // Auth
  token: string | null;
  user: User | null;
  setToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;

  // Saved Items
  savedItems: SavedItem[];
  setSavedItems: (items: SavedItem[]) => void;
  addSavedItem: (item: SavedItem) => void;
  removeSavedItem: (id: number) => void;

  // Comparisons
  comparisons: Comparison[];
  setComparisons: (comparisons: Comparison[]) => void;
  addComparison: (comparison: Comparison) => void;
  removeComparison: (id: number) => void;
  
  // Quick Compare (for comparing products from search)
  compareItems: ProductCardProps[];
  addToCompare: (item: ProductCardProps) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;

  // API Usage
  usage: ApiUsage | null;
  setUsage: (usage: ApiUsage) => void;

  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const useAppStore = create<AppStore>((set) => ({
  // Auth
  token: localStorage.getItem('token'),
  user: null,
  setToken: (token: string) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  setUser: (user: User) => set({ user }),
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, savedItems: [], comparisons: [] });
  },

  // Saved Items
  savedItems: [],
  setSavedItems: (items: SavedItem[]) => set({ savedItems: items }),
  addSavedItem: (item: SavedItem) =>
    set((state) => ({ savedItems: [item, ...state.savedItems] })),
  removeSavedItem: (id: number) =>
    set((state) => ({
      savedItems: state.savedItems.filter((item) => item.id !== id),
    })),

  // Comparisons
  comparisons: [],
  setComparisons: (comparisons: Comparison[]) => set({ comparisons }),
  addComparison: (comparison: Comparison) =>
    set((state) => ({ comparisons: [comparison, ...state.comparisons] })),
  removeComparison: (id: number) =>
    set((state) => ({
      comparisons: state.comparisons.filter((c) => c.id !== id),
    })),
    
  // Quick Compare
  compareItems: [],
  addToCompare: (item: ProductCardProps) =>
    set((state) => {
      // Prevent duplicates and limit to 4 items
      if (state.compareItems.find((i) => i.id === item.id)) {
        return state;
      }
      if (state.compareItems.length >= 4) {
        return state;
      }
      return { compareItems: [...state.compareItems, item] };
    }),
  removeFromCompare: (id: string) =>
    set((state) => ({
      compareItems: state.compareItems.filter((item) => item.id !== id),
    })),
  clearCompare: () => set({ compareItems: [] }),

  // API Usage
  usage: null,
  setUsage: (usage: ApiUsage) => set({ usage }),

  // UI State
  isLoading: false,
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  error: null,
  setError: (error: string | null) => set({ error }),
}));

export default useAppStore;
