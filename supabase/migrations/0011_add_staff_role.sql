-- New enum value must live in its own migration/transaction, separate from
-- any statement that uses it (Postgres restriction on ALTER TYPE ADD VALUE).
alter type public.user_role add value 'staff';
