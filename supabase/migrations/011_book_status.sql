-- 011_book_status.sql
-- Adds an explicit "feature as a book" flag so the homepage Books carousel
-- only shows posts the CEO has curated. Replaces the previous auto-derive-
-- from-all-posts behaviour that was showing every published post as a book.
--
-- Allowed values:
--   'free' → published as a free book/article in the Books carousel
--   'sold' → published as a paid book in the Books carousel
--   NULL  → not a book (default — never appears in the Books carousel)

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS book_status TEXT;

CREATE INDEX IF NOT EXISTS posts_book_status_idx
  ON posts (book_status)
  WHERE book_status IS NOT NULL;
