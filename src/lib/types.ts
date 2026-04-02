export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  display_order: number;
  document_count?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  category_id: string;
  document_count: number;
  category?: Category;
}

export interface Document {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category_id: string | null;
  brand_id: string | null;
  price: number;
  file_path: string;
  file_size: number | null;
  page_count: number | null;
  preview_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_tags: string[] | null;
  language: string;
  active: boolean;
  featured: boolean;
  download_count: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  brand?: Brand;
}

export interface Order {
  id: string;
  document_id: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  customer_email: string;
  amount: number;
  currency: string;
  download_token: string;
  download_expires_at: string;
  downloaded_at: string | null;
  download_count: number;
  created_at: string;
  document?: Document;
}
