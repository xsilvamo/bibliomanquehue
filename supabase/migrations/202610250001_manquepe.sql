begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.invitations (
  email text primary key check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text check (alias is null or char_length(btrim(alias)) between 2 and 40),
  bio text not null default '' check (char_length(bio) <= 300),
  created_at timestamptz not null default now()
);
create unique index profiles_alias_unique on public.profiles(lower(alias)) where alias is not null;
create table public.memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'reader' check(role in ('reader','admin')),
  suspended boolean not null default false
);
create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check(char_length(btrim(title)) between 1 and 200),
  author text not null check(char_length(btrim(author)) between 1 and 200),
  category text not null check(category in ('Espiritualidad','Biblia y lectio divina','Vida cristiana y formación','Testimonios','Oración y vida monástica')),
  description text not null check(char_length(btrim(description)) between 1 and 3000),
  isbn text not null default '' check(char_length(isbn)<=32),
  cover_url text check(cover_url is null or cover_url ~ '^https://'),
  featured boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.reading_list (
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(user_id,book_id)
);
create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text check (body is null or char_length(body) between 1 and 1500),
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.reflection_submissions (
  id uuid primary key default gen_random_uuid(),
  reflection_id uuid not null references public.reflections(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check(char_length(body) between 1 and 1500),
  flags text[] not null default '{}',
  status text not null default 'pending' check(status in ('pending','approved','rejected','superseded')),
  rejection_reason text not null default '',
  moderated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index one_pending_revision on public.reflection_submissions(reflection_id) where status='pending';
create index reflections_book on public.reflections(book_id);
create index reflections_author on public.reflections(author_id);
create index submissions_author on public.reflection_submissions(author_id);
create index submissions_queue on public.reflection_submissions(status,created_at);
create index reading_book on public.reading_list(book_id);

-- These helpers bypass RLS only to read membership. Caller IDs come from auth.uid().
create function private.is_member(p_id uuid default auth.uid()) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships where user_id=p_id and not suspended)
$$;
create function private.is_admin() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships where user_id=auth.uid() and role='admin' and not suspended)
$$;
create function private.require_member() returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_member() then raise exception 'Acceso reservado a lectores invitados activos.' using errcode='42501'; end if;
end $$;
create function private.require_admin() returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.is_admin() then raise exception 'Acceso reservado a los encargados.' using errcode='42501'; end if;
end $$;

-- The trigger is an additional guard, even if the Auth hook is misconfigured.
create function private.create_invited_member() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.invitations where email=lower(new.email) and active) then
    raise exception 'Esta cuenta necesita una invitación.' using errcode='42501';
  end if;
  insert into public.profiles(id) values(new.id);
  insert into public.memberships(user_id) values(new.id);
  return new;
end $$;
create trigger on_invited_user_created after insert on auth.users for each row execute function private.create_invited_member();

-- Configure this function as the Before User Created hook in Supabase Auth.
create function public.before_user_created(event jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if exists(select 1 from public.invitations where email=lower(event->'user'->>'email') and active) then return '{}'::jsonb; end if;
  return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','Esta cuenta necesita una invitación. Contacta a los encargados.'));
end $$;

alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.books enable row level security;
alter table public.reading_list enable row level security;
alter table public.reflections enable row level security;
alter table public.reflection_submissions enable row level security;

create policy profiles_read on public.profiles for select to anon,authenticated
using ((alias is not null and private.is_member(id)) or id=auth.uid() or private.is_admin());
create policy memberships_read on public.memberships for select to authenticated using(user_id=auth.uid() or private.is_admin());
create policy invitations_read on public.invitations for select to anon,authenticated using(private.is_admin());
create policy books_read on public.books for select to anon,authenticated using(not archived or private.is_admin());
create policy books_insert on public.books for insert to authenticated with check(private.is_admin());
create policy books_update on public.books for update to authenticated using(private.is_admin()) with check(private.is_admin());
create policy reading_read on public.reading_list for select to anon,authenticated using(
  private.is_admin() or (private.is_member(user_id) and exists(select 1 from public.profiles where id=user_id and alias is not null) and exists(select 1 from public.books where id=book_id and not archived))
);
create policy reflections_read on public.reflections for select to anon,authenticated using(
  private.is_admin() or (author_id=auth.uid() and private.is_member()) or
  (body is not null and private.is_member(author_id) and exists(select 1 from public.profiles where id=author_id and alias is not null) and exists(select 1 from public.books where id=book_id and not archived))
);
create policy reflections_feature on public.reflections for update to authenticated using(private.is_admin()) with check(private.is_admin());
create policy submissions_read on public.reflection_submissions for select to authenticated using(private.is_admin() or (author_id=auth.uid() and private.is_member()));

-- Remove default Supabase grants. Participation writes go exclusively through checked RPCs.
revoke all on public.profiles,public.memberships,public.invitations,public.books,public.reading_list,public.reflections,public.reflection_submissions from anon,authenticated;
grant select on public.profiles,public.invitations,public.books,public.reading_list,public.reflections to anon,authenticated;
grant select on public.memberships,public.reflection_submissions to authenticated;
grant insert,update on public.books to authenticated;
grant update(featured) on public.reflections to authenticated;

create function public.save_profile(p_alias text,p_bio text default '') returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_member();
  if p_alias is null or char_length(btrim(p_alias)) not between 2 and 40 then raise exception 'El alias debe tener entre 2 y 40 caracteres.'; end if;
  if p_bio is null or char_length(p_bio)>300 then raise exception 'La descripción admite hasta 300 caracteres.'; end if;
  update public.profiles set alias=btrim(p_alias),bio=btrim(p_bio) where id=auth.uid();
end $$;
create function public.manage_invitation(p_email text,p_active boolean default true) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_admin();
  if p_email is null or p_active is null then raise exception 'Indica un correo y estado válidos.'; end if;
  insert into public.invitations(email,active) values(lower(btrim(p_email)),p_active) on conflict(email) do update set active=excluded.active;
end $$;
create function public.set_member_suspended(p_user_id uuid,p_suspended boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_admin();
  if p_user_id=auth.uid() or p_suspended is null then raise exception 'No puedes suspender tu propia cuenta.'; end if;
  update public.memberships set suspended=p_suspended where user_id=p_user_id;
  if not found then raise exception 'Lector no encontrado.'; end if;
end $$;
create function public.set_want_to_read(p_book_id uuid,p_saved boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_member();
  if p_saved is null then raise exception 'Indica si quieres guardar el libro.'; end if;
  if not p_saved then delete from public.reading_list where user_id=auth.uid() and book_id=p_book_id; return; end if;
  if not exists(select 1 from public.books where id=p_book_id and not archived) then raise exception 'Este libro no está en el catálogo.'; end if;
  insert into public.reading_list(user_id,book_id) values(auth.uid(),p_book_id) on conflict do nothing;
end $$;
create function public.submit_reflection(p_book_id uuid,p_body text,p_reflection_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare rid uuid; flags text[]; clean text := regexp_replace(p_body,'^\s+|\s+$','','g');
begin
  perform private.require_member();
  if clean is null or char_length(clean) not between 1 and 1500 then raise exception 'Escribe entre 1 y 1500 caracteres.'; end if;
  if not exists(select 1 from public.profiles where id=auth.uid() and alias is not null) then raise exception 'Elige tu alias antes de participar.'; end if;
  if not exists(select 1 from public.books where id=p_book_id and not archived) then raise exception 'Este libro no está en el catálogo.'; end if;
  if p_reflection_id is null then
    insert into public.reflections(book_id,author_id) values(p_book_id,auth.uid()) returning id into rid;
  else
    select id into rid from public.reflections where id=p_reflection_id and author_id=auth.uid() and book_id=p_book_id for update;
    if not found then raise exception 'No puedes editar esta reflexión.' using errcode='42501'; end if;
  end if;
  select coalesce(array_agg(word),'{}') into flags from unnest(array['mierda','puta','puto','weon','weón','huevon','huevón','culiao','culia','conchetumare','conchesumadre']) as word
    where lower(clean) ~ ('\m'||word||'\M');
  update public.reflection_submissions set status='superseded' where reflection_id=rid and status='pending';
  insert into public.reflection_submissions(reflection_id,author_id,body,flags) values(rid,auth.uid(),clean,flags);
  return rid;
end $$;
create function public.moderate_submission(p_submission_id uuid,p_approve boolean,p_reason text default '') returns void
language plpgsql security definer set search_path='' as $$
declare s public.reflection_submissions; rid uuid;
begin
  perform private.require_admin();
  select reflection_id into rid from public.reflection_submissions where id=p_submission_id;
  perform 1 from public.reflections where id=rid for update;
  select * into s from public.reflection_submissions where id=p_submission_id for update;
  if not found or s.status<>'pending' then raise exception 'Esta versión ya no está pendiente. Actualiza la lista.'; end if;
  if p_approve is null then raise exception 'Selecciona una decisión.'; end if;
  if p_approve and (not private.is_member(s.author_id) or not exists(select 1 from public.books b join public.reflections r on r.book_id=b.id where r.id=rid and not b.archived)) then raise exception 'El lector está suspendido o el libro está archivado.'; end if;
  if not p_approve and coalesce(char_length(btrim(p_reason)),0)=0 then raise exception 'Indica un motivo de rechazo.'; end if;
  if char_length(p_reason)>500 then raise exception 'El motivo admite hasta 500 caracteres.'; end if;
  update public.reflection_submissions set status=case when p_approve then 'approved' else 'rejected' end,
    rejection_reason=case when p_approve then '' else btrim(p_reason) end,moderated_by=auth.uid() where id=p_submission_id;
  if p_approve then update public.reflections set body=s.body,published_at=now() where id=rid; end if;
end $$;
create function public.delete_reflection(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  perform private.require_member();
  delete from public.reflections where id=p_id and (author_id=auth.uid() or private.is_admin());
  if not found then raise exception 'No puedes eliminar esta reflexión.' using errcode='42501'; end if;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('covers','covers',true,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy covers_read on storage.objects for select to anon,authenticated using(bucket_id='covers');
create policy covers_insert on storage.objects for insert to authenticated with check(bucket_id='covers' and private.is_admin());
create policy covers_update on storage.objects for update to authenticated using(bucket_id='covers' and private.is_admin()) with check(bucket_id='covers' and private.is_admin());
create policy covers_delete on storage.objects for delete to authenticated using(bucket_id='covers' and private.is_admin());

revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_member(uuid),private.is_admin() to anon,authenticated;
revoke execute on function public.before_user_created(jsonb) from public,anon,authenticated;
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.save_profile(text,text),public.manage_invitation(text,boolean),public.set_member_suspended(uuid,boolean),public.set_want_to_read(uuid,boolean),public.submit_reflection(uuid,text,uuid),public.moderate_submission(uuid,boolean,text),public.delete_reflection(uuid) from public,anon;
grant execute on function public.save_profile(text,text),public.manage_invitation(text,boolean),public.set_member_suspended(uuid,boolean),public.set_want_to_read(uuid,boolean),public.submit_reflection(uuid,text,uuid),public.moderate_submission(uuid,boolean,text),public.delete_reflection(uuid) to authenticated;
create unique index books_edition_unique on public.books(lower(btrim(title)),lower(btrim(author)),isbn);
create function public.import_books(p_books jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare amount integer;
begin
  perform private.require_admin();
  if p_books is null or jsonb_typeof(p_books)<>'array' then raise exception 'El inventario debe ser una lista.'; end if;
  amount := jsonb_array_length(p_books);
  if amount not between 1 and 500 then raise exception 'Importa entre 1 y 500 libros por archivo.'; end if;
  insert into public.books(title,author,category,description,isbn,cover_url)
    select btrim(x.title),btrim(x.author),x.category,btrim(x.description),coalesce(x.isbn,''),x.cover_url
    from jsonb_to_recordset(p_books) as x(title text,author text,category text,description text,isbn text,cover_url text);
  return amount;
end $$;
revoke execute on function public.import_books(jsonb) from public,anon;
grant execute on function public.import_books(jsonb) to authenticated;
commit;
