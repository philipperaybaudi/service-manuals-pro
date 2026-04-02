-- Categories table
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon_url text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Brands table
CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  document_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_brands_category ON brands(category_id);

-- Documents table
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES brands(id) ON DELETE SET NULL,
  price integer NOT NULL DEFAULT 990, -- in cents
  file_path text NOT NULL,
  file_size bigint,
  page_count integer,
  preview_url text,
  seo_title text,
  seo_description text,
  seo_tags text[],
  language text DEFAULT 'en',
  active boolean DEFAULT true,
  featured boolean DEFAULT false,
  download_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_brand ON documents(brand_id);
CREATE INDEX idx_documents_active ON documents(active) WHERE active = true;
CREATE INDEX idx_documents_featured ON documents(featured) WHERE featured = true;
CREATE INDEX idx_documents_slug ON documents(slug);

-- Full-text search index
ALTER TABLE documents ADD COLUMN fts tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(seo_tags, ' '), '')), 'C')
  ) STORED;

CREATE INDEX idx_documents_fts ON documents USING gin(fts);

-- Orders table
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  stripe_session_id text UNIQUE,
  stripe_payment_intent text,
  customer_email text NOT NULL,
  amount integer NOT NULL,
  currency text DEFAULT 'usd',
  download_token text UNIQUE NOT NULL,
  download_expires_at timestamptz NOT NULL,
  downloaded_at timestamptz,
  download_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_orders_token ON orders(download_token);
CREATE INDEX idx_orders_email ON orders(customer_email);
CREATE INDEX idx_orders_document ON orders(document_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Public read policies for catalog
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can view brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Public can view active documents" ON documents FOR SELECT USING (active = true);

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('previews', 'previews', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);
