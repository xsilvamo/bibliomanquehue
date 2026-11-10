begin;

-- Publish the reader/book relation without exposing private record timestamps.
-- Direct access and writes to book_reads keep their existing restrictions.
create function public.get_public_book_reads() returns table(user_id uuid,book_id uuid)
language sql stable security definer set search_path='' as $$
  select r.user_id,r.book_id
  from public.book_reads r
  join public.profiles p on p.id=r.user_id and p.alias is not null
  join public.memberships m on m.user_id=r.user_id and not m.suspended
  join public.books b on b.id=r.book_id and not b.archived
$$;
revoke execute on function public.get_public_book_reads() from public;
grant execute on function public.get_public_book_reads() to anon,authenticated;

commit;
