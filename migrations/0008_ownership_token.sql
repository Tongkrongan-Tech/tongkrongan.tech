ALTER TABLE subdomains ADD COLUMN ownership_token TEXT;
UPDATE subdomains SET ownership_token = lower(hex(randomblob(32))) WHERE ownership_token IS NULL;
