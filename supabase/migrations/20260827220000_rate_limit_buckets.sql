-- Durable rate-limit buckets for multi-instance / serverless deploys.
-- Used by apps/web checkRateLimit via RPC; in-memory fallback remains for unit tests.

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  hits timestamptz[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.rate_limit_buckets enable row level security;

-- No policies for authenticated/anon — service_role only via RPC security definer.

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer,
  p_cooldown_ms integer default 0
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval := make_interval(secs => greatest(p_window_ms, 1) / 1000.0);
  v_hits timestamptz[] := '{}';
  v_filtered timestamptz[] := '{}';
  v_last timestamptz;
  v_retry integer := 0;
begin
  if p_key is null or length(trim(p_key)) = 0 then
    return query select false, 1;
    return;
  end if;

  select hits into v_hits
  from public.rate_limit_buckets
  where bucket_key = p_key
  for update;

  if not found then
    v_hits := '{}';
  end if;

  foreach v_last in array coalesce(v_hits, '{}') loop
    if v_last > v_now - v_window then
      v_filtered := array_append(v_filtered, v_last);
    end if;
  end loop;

  if p_cooldown_ms > 0 and coalesce(array_length(v_filtered, 1), 0) > 0 then
    v_last := v_filtered[array_length(v_filtered, 1)];
    if v_last > v_now - make_interval(secs => p_cooldown_ms / 1000.0) then
      v_retry := greatest(1, ceil(extract(epoch from (v_last + make_interval(secs => p_cooldown_ms / 1000.0) - v_now)))::integer);
      insert into public.rate_limit_buckets (bucket_key, hits, updated_at)
      values (p_key, v_filtered, v_now)
      on conflict (bucket_key) do update
        set hits = excluded.hits, updated_at = excluded.updated_at;
      return query select false, v_retry;
      return;
    end if;
  end if;

  if coalesce(array_length(v_filtered, 1), 0) >= p_limit then
    v_last := v_filtered[1];
    v_retry := greatest(
      1,
      ceil(extract(epoch from (v_last + v_window - v_now)))::integer
    );
    insert into public.rate_limit_buckets (bucket_key, hits, updated_at)
    values (p_key, v_filtered, v_now)
    on conflict (bucket_key) do update
      set hits = excluded.hits, updated_at = excluded.updated_at;
    return query select false, v_retry;
    return;
  end if;

  v_filtered := array_append(v_filtered, v_now);
  insert into public.rate_limit_buckets (bucket_key, hits, updated_at)
  values (p_key, v_filtered, v_now)
  on conflict (bucket_key) do update
    set hits = excluded.hits, updated_at = excluded.updated_at;

  return query select true, 0;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer, integer) to service_role;
