begin;

-- Keep existing accounts and aliases until their owners explicitly complete their names.
alter table public.profiles
  add column first_name text,
  add column last_name text;
alter table public.profiles drop constraint profiles_alias_check;
alter table public.profiles add constraint profiles_alias_check
  check(alias is null or char_length(btrim(alias)) between 2 and 160);
alter table public.profiles add constraint profiles_names_check check(
  (first_name is null and last_name is null) or
  (first_name is not null and last_name is not null and
   char_length(btrim(first_name)) between 1 and 60 and
   char_length(btrim(last_name)) between 1 and 80)
);
-- Human names are not unique; identity and all relations continue to use the UUID.
drop index public.profiles_alias_unique;
create index profiles_alias_search on public.profiles(lower(alias));

create function private.sync_reader_name() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.first_name is not null or new.last_name is not null then
    new.first_name := regexp_replace(btrim(new.first_name),'[[:space:]]+',' ','g');
    new.last_name := regexp_replace(btrim(new.last_name),'[[:space:]]+',' ','g');
    new.alias := new.first_name || ' ' || new.last_name;
  end if;
  return new;
end $$;
create trigger sync_reader_name before insert or update on public.profiles
  for each row execute function private.sync_reader_name();
revoke execute on function private.sync_reader_name() from public,anon,authenticated;

create function public.save_reader_profile(p_first_name text,p_last_name text,p_bio text default '') returns void
language plpgsql security definer set search_path='' as $$
declare
  first_name_clean text := regexp_replace(btrim(p_first_name),'[[:space:]]+',' ','g');
  last_name_clean text := regexp_replace(btrim(p_last_name),'[[:space:]]+',' ','g');
begin
  perform private.require_member();
  if first_name_clean is null or char_length(first_name_clean) not between 1 and 60 then
    raise exception 'Escribe tu nombre (hasta 60 caracteres).';
  end if;
  if last_name_clean is null or char_length(last_name_clean) not between 1 and 80 then
    raise exception 'Escribe tu apellido (hasta 80 caracteres).';
  end if;
  if p_bio is null or char_length(p_bio)>300 then raise exception 'La descripción admite hasta 300 caracteres.'; end if;
  update public.profiles set first_name=first_name_clean,last_name=last_name_clean,bio=btrim(p_bio)
    where id=auth.uid();
end $$;
revoke execute on function public.save_reader_profile(text,text,text) from public,anon;
grant execute on function public.save_reader_profile(text,text,text) to authenticated;

-- Individual finished-book records are private; the public sees only the aggregate below.
create table public.book_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,book_id)
);
create index book_reads_book on public.book_reads(book_id);
alter table public.book_reads enable row level security;
revoke all on public.book_reads from public,anon,authenticated;
grant select on public.book_reads to authenticated;
create policy book_reads_read on public.book_reads for select to authenticated using(
  private.is_admin() or (user_id=auth.uid() and private.is_member())
);

create function public.set_book_read(p_book_id uuid,p_read boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_member();
  if p_read is null then raise exception 'Indica si has leído el libro.'; end if;
  if not p_read then
    delete from public.book_reads where user_id=auth.uid() and book_id=p_book_id;
    return;
  end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and first_name is not null and last_name is not null) then
    raise exception 'Completa tu nombre y apellido antes de registrar lecturas.';
  end if;
  perform 1 from public.books where id=p_book_id and not archived for share;
  if not found then raise exception 'Este libro no está en el catálogo.'; end if;
  insert into public.book_reads(user_id,book_id) values(auth.uid(),p_book_id) on conflict do nothing;
end $$;
revoke execute on function public.set_book_read(uuid,boolean) from public,anon;
grant execute on function public.set_book_read(uuid,boolean) to authenticated;

-- Intentional privilege boundary: returns no user IDs or private reading records.
create function public.get_book_read_counts() returns table(book_id uuid,read_count bigint)
language sql stable security definer set search_path='' as $$
  select r.book_id,count(*)::bigint
  from public.book_reads r
  join public.books b on b.id=r.book_id and not b.archived
  join public.memberships m on m.user_id=r.user_id and not m.suspended
  group by r.book_id
$$;
revoke execute on function public.get_book_read_counts() from public;
grant execute on function public.get_book_read_counts() to anon,authenticated;

create function public.delete_book(p_book_id uuid,p_confirm_title text) returns void
language plpgsql security definer set search_path='' as $$
declare current_title text;
begin
  perform private.require_admin();
  select title into current_title from public.books where id=p_book_id for update;
  if not found then raise exception 'Libro no encontrado. Actualiza el catálogo.'; end if;
  if p_confirm_title is null or btrim(p_confirm_title)<>btrim(current_title) then
    raise exception 'Escribe el título actual del libro para confirmar la eliminación.';
  end if;
  -- Existing FKs cascade reflections/revisions/wishlists; book_reads cascades too.
  -- Storage objects are deliberately kept: another book may use the same image.
  delete from public.books where id=p_book_id;
end $$;
revoke execute on function public.delete_book(uuid,text) from public,anon;
grant execute on function public.delete_book(uuid,text) to authenticated;
commit;
