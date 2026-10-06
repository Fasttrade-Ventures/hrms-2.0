-- Migration: Mileage Claims & Custom Employee OT Rates

-- 1. claim_types enhancements for mileage calculation
alter table public.claim_types
  add column if not exists is_mileage boolean not null default false,
  add column if not exists rate_per_km numeric(10,4) default null;

-- 2. claims enhancements for trip and mileage details
alter table public.claims
  add column if not exists is_mileage boolean not null default false,
  add column if not exists distance_km numeric(10,2) default null,
  add column if not exists rate_per_km numeric(10,4) default null,
  add column if not exists origin text default null,
  add column if not exists destination text default null;

-- 3. employee_compensation enhancement for optional hourly OT rate override
alter table public.employee_compensation
  add column if not exists ot_hourly_rate numeric(14,4) default null;
