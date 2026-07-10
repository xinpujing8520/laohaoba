-- Extend products for AccountBoy-style detail pages
ALTER TABLE products ADD COLUMN source_price REAL;
ALTER TABLE products ADD COLUMN image_url TEXT;
ALTER TABLE products ADD COLUMN detail_html TEXT;
ALTER TABLE products ADD COLUMN short_en TEXT;
ALTER TABLE products ADD COLUMN category_name TEXT;
