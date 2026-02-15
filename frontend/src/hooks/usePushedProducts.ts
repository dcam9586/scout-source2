/**
 * usePushedProducts Hook
 * Manages pushed products state and API operations
 */

import { useState, useCallback, useEffect } from 'react';
import api from '../store/api';
import { PushedProduct } from '../types';

interface UsePushedProductsReturn {
  products: PushedProduct[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  updateStatus: (shopifyProductId: string, status: 'draft' | 'active' | 'archived') => Promise<boolean>;
  deleteProduct: (shopifyProductId: string) => Promise<boolean>;
  stats: {
    total: number;
    draft: number;
    active: number;
    archived: number;
  };
}

export function usePushedProducts(): UsePushedProductsReturn {
  const [products, setProducts] = useState<PushedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate stats from products
  const stats = {
    total: products.length,
    draft: products.filter(p => p.push_status === 'draft').length,
    active: products.filter(p => p.push_status === 'active').length,
    archived: products.filter(p => p.push_status === 'archived').length,
  };

  /**
   * Fetch all pushed products
   */
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<{ products: PushedProduct[] }>('/api/v1/shopify/products');
      setProducts(response.data.products || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch products';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update product status
   */
  const updateStatus = useCallback(async (
    shopifyProductId: string,
    status: 'draft' | 'active' | 'archived'
  ): Promise<boolean> => {
    try {
      const response = await api.put(`/api/v1/shopify/products/${shopifyProductId}/status`, { status });
      
      if (response.data.success) {
        // Update local state
        setProducts(prev => prev.map(p => 
          p.shopify_product_id === shopifyProductId 
            ? { ...p, push_status: status }
            : p
        ));
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update status');
      return false;
    }
  }, []);

  /**
   * Delete product from Shopify
   */
  const deleteProduct = useCallback(async (shopifyProductId: string): Promise<boolean> => {
    try {
      const response = await api.delete(`/api/v1/shopify/products/${shopifyProductId}`);
      
      if (response.data.success) {
        // Remove from local state
        setProducts(prev => prev.filter(p => p.shopify_product_id !== shopifyProductId));
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete product');
      return false;
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    error,
    fetchProducts,
    updateStatus,
    deleteProduct,
    stats,
  };
}

export default usePushedProducts;
