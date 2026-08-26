create or replace function public.get_platform_stats()
returns table (
  buyers bigint,
  verified_agents bigint,
  live_listings bigint,
  secured_escrow bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.profiles where profile_type = 'buyer'),
    (select count(*) from public.profiles where profile_type in ('agent','builder') and kyc_verified),
    (select count(*) from public.properties where status in ('for_sale','for_rent','available')),
    (select coalesce(sum(total_payable), 0)::bigint from public.transactions where payment_status in ('secured','released'))
$$;

grant execute on function public.get_platform_stats() to anon, authenticated;