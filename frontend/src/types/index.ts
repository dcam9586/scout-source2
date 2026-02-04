export interface User {
  id: number;
  shop_name: string;
  subscription_tier: 'free' | 'premium';
  searches_used: number;
  created_at: string;
  updated_at: string;
}

export interface SavedItem {
  id: number;
  user_id: number;
  product_name: string;
  supplier_name?: string;
  supplier_rating?: number;
  moq?: number;
  price?: number;
  source: string;
  source_url: string;
  product_image_url?: string;
  description?: string;
  notes?: string;
  shopify_product_id?: string;
  push_status?: 'draft' | 'active' | 'archived' | null;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  id?: string;
  product_name: string;
  supplier_name: string;
  supplier_rating: number;
  moq: number;
  price: number;
  source: 'alibaba' | 'made-in-china' | 'cj-dropshipping';
  source_url: string;
  product_image_url?: string;
  // CJ Dropshipping specific fields
  sku?: string;
  freeShipping?: boolean;
  warehouseStock?: number;
  deliveryDays?: string;
  categoryName?: string;
  discountPercent?: string;
  originalPrice?: number;
}

// Source type for search operations
export type SearchSource = 'alibaba' | 'made-in-china' | 'cj-dropshipping' | 'global-sources' | 'tradekorea' | 'wholesale-central';

// CJ Dropshipping specific types
export interface CJProduct {
  id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  minOrder: number;
  image_url: string;
  url: string;
  supplierName: string;
  source: 'cj-dropshipping';
  sku?: string;
  freeShipping?: boolean;
  warehouseStock?: number;
  deliveryDays?: string;
  categoryName?: string;
  discountPercent?: string;
}

export interface CJSearchResponse {
  success: boolean;
  query: string;
  source: 'cj-dropshipping';
  products: CJProduct[];
  pagination: {
    page: number;
    limit: number;
    count: number;
  };
  meta: {
    requestId: string;
    duration: number;
    timestamp: string;
  };
}

export interface Comparison {
  id: number;
  user_id: number;
  product_name: string;
  alibaba_item_id?: string;
  made_in_china_item_id?: string;
  alibaba_price?: number;
  made_in_china_price?: number;
  alibaba_moq?: number;
  made_in_china_moq?: number;
  alibaba_supplier?: string;
  made_in_china_supplier?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiUsage {
  tier: 'free' | 'premium';
  searchesUsed: number;
  searchLimit: number;
  searchesRemaining: number;
  resetDate: string;
}

// Push to Shopify types
export interface PushToShopifyData {
  savedItemId: number | string;
  customTitle: string;
  customDescription: string;
  priceMarkup: number;
  productType: string;
  tags: string[];
}

export interface PushResult {
  success: boolean;
  savedItemId: number;
  shopifyProductId?: number;
  shopifyHandle?: string;
  error?: string;
}

export interface BatchPushResult {
  total: number;
  successful: number;
  failed: number;
  results: PushResult[];
}

export interface PushedProduct {
  id: number;
  user_id: number;
  saved_item_id?: number;
  shopify_product_id: string;
  shopify_product_handle?: string;
  source_url?: string;
  push_status: 'draft' | 'active' | 'archived' | 'deleted';
  pushed_at: string;
  updated_at: string;
  product_name?: string;
  supplier_name?: string;
  cost_price?: number;
}

// Partner Integration Types
export type PartnerPlatform = 'dropified' | 'syncee' | 'csv';

export interface PartnerConnection {
  id: number;
  partner: PartnerPlatform;
  account_id?: string;
  account_name?: string;
  connection_status: 'pending' | 'connected' | 'disconnected' | 'error';
  last_sync_at?: string;
  sync_count: number;
  connected_at: string;
}

export interface ExportedProduct {
  id: number;
  saved_item_id?: number;
  partner: PartnerPlatform;
  partner_product_id?: string;
  export_status: 'pending' | 'exported' | 'synced' | 'error';
  error_message?: string;
  exported_at: string;
}

export interface ExportResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: {
    successful: number[];
    failed: { id: number; error: string }[];
  };
}

export interface ExportStats {
  totalExports: number;
  totalItems: number;
  successRate: number;
  byPartner: Record<string, number>;
}
