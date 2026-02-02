/**
 * usePushToShopify Hook
 * Handles pushing saved items to Shopify store
 */

import { useState, useCallback } from 'react';
import api from '../store/api';
import { PushResult, BatchPushResult, PushToShopifyData } from '../types';

interface UsePushToShopifyReturn {
  isPushing: boolean;
  error: string | null;
  lastResult: PushResult | null;
  pushProduct: (data: PushToShopifyData) => Promise<PushResult>;
  pushMultiple: (savedItemIds: number[], options?: Partial<PushToShopifyData>) => Promise<BatchPushResult>;
  previewProduct: (savedItemId: number, options?: Partial<PushToShopifyData>) => Promise<any>;
  clearError: () => void;
}

export function usePushToShopify(): UsePushToShopifyReturn {
  const [isPushing, setIsPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<PushResult | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Push a single product to Shopify
   */
  const pushProduct = useCallback(async (data: PushToShopifyData): Promise<PushResult> => {
    setIsPushing(true);
    setError(null);

    try {
      const response = await api.post<{ success: boolean; data: PushResult; error?: string }>(
        '/api/v1/shopify/products',
        {
          savedItemId: data.savedItemId,
          priceMarkup: data.priceMarkup,
          productType: data.productType,
          tags: data.tags,
          customTitle: data.customTitle,
          customDescription: data.customDescription,
        }
      );

      if (response.data.success) {
        const result: PushResult = {
          success: true,
          savedItemId: Number(data.savedItemId),
          shopifyProductId: response.data.data.shopifyProductId,
          shopifyHandle: response.data.data.shopifyHandle,
        };
        setLastResult(result);
        return result;
      } else {
        const result: PushResult = {
          success: false,
          savedItemId: Number(data.savedItemId),
          error: response.data.error || 'Failed to push product',
        };
        setError(result.error || 'Unknown error');
        setLastResult(result);
        return result;
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to push product';
      setError(errorMessage);
      
      const result: PushResult = {
        success: false,
        savedItemId: Number(data.savedItemId),
        error: errorMessage,
      };
      setLastResult(result);
      return result;
    } finally {
      setIsPushing(false);
    }
  }, []);

  /**
   * Push multiple products to Shopify
   */
  const pushMultiple = useCallback(async (
    savedItemIds: number[],
    options: Partial<PushToShopifyData> = {}
  ): Promise<BatchPushResult> => {
    setIsPushing(true);
    setError(null);

    try {
      const response = await api.post<{ success: boolean; data: BatchPushResult; error?: string }>(
        '/api/v1/shopify/products/batch',
        {
          savedItemIds,
          priceMarkup: options.priceMarkup || 2.0,
          productType: options.productType || 'General',
          tags: options.tags || [],
        }
      );

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Batch push failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Batch push failed';
      setError(errorMessage);
      
      return {
        total: savedItemIds.length,
        successful: 0,
        failed: savedItemIds.length,
        results: savedItemIds.map(id => ({
          success: false,
          savedItemId: id,
          error: errorMessage,
        })),
      };
    } finally {
      setIsPushing(false);
    }
  }, []);

  /**
   * Preview product before pushing
   */
  const previewProduct = useCallback(async (
    savedItemId: number,
    options: Partial<PushToShopifyData> = {}
  ): Promise<any> => {
    try {
      const response = await api.post('/api/v1/shopify/products/preview', {
        savedItemId,
        priceMarkup: options.priceMarkup || 2.0,
        productType: options.productType || 'General',
        tags: options.tags || [],
        customTitle: options.customTitle,
        customDescription: options.customDescription,
      });

      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'Failed to generate preview');
    }
  }, []);

  return {
    isPushing,
    error,
    lastResult,
    pushProduct,
    pushMultiple,
    previewProduct,
    clearError,
  };
}

export default usePushToShopify;
