-- current_role()/current_retailer_id()/current_customer_id() are used inside
-- RLS policies on many tables (profiles, retailers, customers, services,
-- applications, etc). Each queries its own table directly (profiles,
-- retailers, customers respectively) as SECURITY INVOKER, which means that
-- inner query is itself subject to that table's RLS policy -- and each of
-- those policies also calls current_role(), which queries profiles again,
-- whose policy calls current_role() again, and so on. This is a genuine
-- self-referential recursion, confirmed live by a real
-- "stack depth limit exceeded" (54001) error when a real authenticated
-- session loaded /customer.
--
-- Fix: SECURITY DEFINER so each function's internal lookup bypasses RLS
-- entirely, breaking the cycle. Each function is hardcoded to auth.uid()
-- with no parameters, so it can only ever return the CALLER's own role/
-- customer id/retailer id -- never anyone else's -- so bypassing RLS here
-- cannot leak another user's data. search_path was already pinned to
-- 'public' in the earlier advisor-hardening migration.
alter function public.current_role() security definer;
alter function public.current_retailer_id() security definer;
alter function public.current_customer_id() security definer;
