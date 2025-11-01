-- Remove user_id filtering so all data is shared across browsers
-- This makes it work like a personal app where you see all YOUR data everywhere
-- Perfect for single-user roadmap managers

-- Make user_id optional (not required)
ALTER TABLE features ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE timeline_items ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE linked_items ALTER COLUMN user_id DROP NOT NULL;

-- Set a default user_id for all data (use 'default' for everyone)
ALTER TABLE features ALTER COLUMN user_id SET DEFAULT 'default';
ALTER TABLE timeline_items ALTER COLUMN user_id SET DEFAULT 'default';
ALTER TABLE linked_items ALTER COLUMN user_id SET DEFAULT 'default';

-- Update existing data to use 'default' user_id
UPDATE features SET user_id = 'default';
UPDATE timeline_items SET user_id = 'default';
UPDATE linked_items SET user_id = 'default';
