create table if not exists public.ederito_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 80),
  business_name text check (business_name is null or char_length(trim(business_name)) between 2 and 120),
  email text not null check (
    char_length(trim(email)) between 5 and 160
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  rating smallint not null check (rating between 1 and 5),
  review text not null check (char_length(trim(review)) between 20 and 1200),
  is_visible boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  created_date date generated always as ((created_at at time zone 'utc')::date) stored
);

comment on table public.ederito_reviews is
  'Public Ederito reviews. Reviewer email addresses are private and never exposed to anonymous readers.';

create unique index if not exists ederito_reviews_one_email_per_day_idx
  on public.ederito_reviews (lower(email), created_date);

create index if not exists ederito_reviews_visible_created_at_idx
  on public.ederito_reviews (is_visible, created_at desc);

alter table public.ederito_reviews enable row level security;

drop policy if exists "Anyone can read visible Ederito reviews" on public.ederito_reviews;
create policy "Anyone can read visible Ederito reviews"
  on public.ederito_reviews
  for select
  to anon, authenticated
  using (is_visible = true);

revoke all on table public.ederito_reviews from anon, authenticated;
grant select (id, name, business_name, rating, review, created_at)
  on public.ederito_reviews to anon, authenticated;

create or replace function public.submit_ederito_review(
  p_name text,
  p_business_name text,
  p_email text,
  p_rating integer,
  p_review text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_review public.ederito_reviews;
begin
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'Please enter a valid name.';
  end if;

  if p_business_name is not null and char_length(trim(p_business_name)) > 120 then
    raise exception using errcode = '22023', message = 'Business name is too long.';
  end if;

  if char_length(trim(coalesce(p_email, ''))) not between 5 and 160
     or p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception using errcode = '22023', message = 'Please enter a valid email address.';
  end if;

  if p_rating not between 1 and 5 then
    raise exception using errcode = '22023', message = 'Please choose a rating from 1 to 5.';
  end if;

  if char_length(trim(coalesce(p_review, ''))) not between 20 and 1200 then
    raise exception using errcode = '22023', message = 'Your review must be between 20 and 1200 characters.';
  end if;

  insert into public.ederito_reviews (name, business_name, email, rating, review)
  values (
    trim(p_name),
    nullif(trim(coalesce(p_business_name, '')), ''),
    lower(trim(p_email)),
    p_rating,
    trim(p_review)
  )
  returning * into v_review;

  return jsonb_build_object(
    'id', v_review.id,
    'name', v_review.name,
    'business_name', v_review.business_name,
    'rating', v_review.rating,
    'review', v_review.review,
    'created_at', v_review.created_at
  );
exception
  when unique_violation then
    raise exception using errcode = 'P0001', message = 'A review from this email address was already submitted today.';
end;
$$;

revoke all on function public.submit_ederito_review(text, text, text, integer, text) from public;
grant execute on function public.submit_ederito_review(text, text, text, integer, text)
  to anon, authenticated;
