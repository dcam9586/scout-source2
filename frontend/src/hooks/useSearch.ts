import { useCallback, useState, useEffect } from 'react';
import useAppStore from '../store/appStore';
import { SearchSource } from '../types';
import { ProductCardProps } from '../components/ProductCard';

export interface SearchParams {
  query: string;
  sources?: SearchSource[];
  bossMode?: boolean;
  moq?: number;
  verifiedOnly?: boolean;
  minRating?: number;
  excludeNoAddress?: boolean;
  page?: number;
  limit?: number;
}

export function useSearch() {
  const [debouncedParams, setDebouncedParams] = useState<SearchParams | null>(null);
  const setSearchState = useAppStore((state) => state.setSearchState);
  const setIsLoading = useAppStore((state) => state.setIsLoading);
  const setError = useAppStore((state) => state.setError);

  const performSearch = useCallback(async (params: SearchParams) => {
    if (!params.query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/v1/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: params.query,
          sources: params.sources || ['alibaba', 'made-in-china', 'cj-dropshipping'],
          bossMode: params.bossMode || false,
          moq: params.moq,
          verifiedOnly: params.verifiedOnly,
          minRating: params.minRating,
          excludeNoAddress: params.excludeNoAddress,
          page: params.page || 1,
          limit: params.limit || 20,
        })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      const allResults: ProductCardProps[] = [];
      const stats: Record<string, number> = {};
      const sources = params.sources || ['alibaba', 'made-in-china', 'cj-dropshipping'];
      
      if (data.results) {
        for (const source of sources) {
          const sourceResults = data.results[source] || [];
          stats[source] = sourceResults.length;
          
          sourceResults.forEach((product: any) => {
            allResults.push({
              ...product,
              image: product.image_url || product.image || product.bigImage,
              source_url: product.url || product.source_url,
              rating: product.supplierRating || 0,
              reviews: product.supplierReviews || 0,
              supplier: product.supplierName || 'Verified Supplier',
              supplierVerified: product.supplierVerified,
              supplierAddress: product.supplierAddress,
              source: source as SearchSource
            });
          });
        }
      }

      setSearchState({
        query: params.query,
        results: allResults,
        sources: sources,
        sourceStats: data.sources || stats,
        timestamp: Date.now(),
        page: data.page || params.page || 1,
        pageSize: data.limit || 20,
        totalResults: data.totalResults || allResults.length,
        bossMode: params.bossMode,
        filters: {
          moq: params.moq,
          verifiedOnly: params.verifiedOnly,
          minRating: params.minRating,
          excludeNoAddress: params.excludeNoAddress
        }
      });

      return data;
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch results. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [setSearchState, setIsLoading, setError]);

  // Debounced search logic
  useEffect(() => {
    if (!debouncedParams) return;

    const timer = setTimeout(() => {
      performSearch(debouncedParams);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [debouncedParams, performSearch]);

  const searchWithDebounce = useCallback((params: SearchParams) => {
    setDebouncedParams(params);
  }, []);

  return {
    performSearch,
    searchWithDebounce
  };
}
