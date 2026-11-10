begin;

alter table public.memberships drop constraint memberships_role_check;
alter table public.memberships add constraint memberships_role_check check(role in ('reader','helper','admin'));
alter table public.memberships alter column role set default 'reader';

create function private.can_edit_catalog() returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.memberships where user_id=auth.uid() and role in ('helper','admin') and not suspended)
$$;
revoke execute on function private.can_edit_catalog() from public;
grant execute on function private.can_edit_catalog() to authenticated;

-- Serialize permission changes and recheck the actor after taking the lock.
-- Self-demotion and self-suspension are forbidden, preserving an active administrator.
create function public.set_member_role(p_user_id uuid,p_role text) returns void
language plpgsql security definer set search_path='' as $$
begin
  lock table public.memberships in share row exclusive mode;
  perform private.require_admin();
  if p_role is null or p_role not in ('reader','helper','admin') then raise exception 'Rol no válido.'; end if;
  if p_user_id=auth.uid() then raise exception 'No puedes cambiar tu propio rol.'; end if;
  update public.memberships set role=p_role where user_id=p_user_id;
  if not found then raise exception 'Lector no encontrado.'; end if;
end $$;
revoke execute on function public.set_member_role(uuid,text) from public,anon;
grant execute on function public.set_member_role(uuid,text) to authenticated;

create or replace function public.set_member_suspended(p_user_id uuid,p_suspended boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  lock table public.memberships in share row exclusive mode;
  perform private.require_admin();
  if p_user_id=auth.uid() or p_suspended is null then raise exception 'No puedes suspender tu propia cuenta.'; end if;
  update public.memberships set suspended=p_suspended where user_id=p_user_id;
  if not found then raise exception 'Lector no encontrado.'; end if;
end $$;

-- Helpers use this allowlist, never direct table writes or administrative RPCs.
create function public.save_catalog_book(p_book jsonb,p_book_id uuid default null) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not private.can_edit_catalog() then raise exception 'Acceso reservado a ayudantes y administradores activos.' using errcode='42501'; end if;
  if p_book is null or jsonb_typeof(p_book)<>'object' then raise exception 'Indica los datos del libro.'; end if;
  if p_book_id is null then
    insert into public.books(title,author,category,description,isbn,cover_url)
    values(btrim(p_book->>'title'),btrim(p_book->>'author'),p_book->>'category',btrim(p_book->>'description'),coalesce(btrim(p_book->>'isbn'),''),nullif(p_book->>'cover_url',''));
  else
    update public.books set title=btrim(p_book->>'title'),author=btrim(p_book->>'author'),category=p_book->>'category',description=btrim(p_book->>'description'),isbn=coalesce(btrim(p_book->>'isbn'),''),cover_url=nullif(p_book->>'cover_url','')
      where id=p_book_id and not archived;
    if not found then raise exception 'Este libro no está en el catálogo activo.'; end if;
  end if;
end $$;
revoke execute on function public.save_catalog_book(jsonb,uuid) from public,anon;
grant execute on function public.save_catalog_book(jsonb,uuid) to authenticated;

-- New unique cover objects only. Replacing/deleting existing objects remains admin-only.
create policy covers_catalog_insert on storage.objects for insert to authenticated
with check(bucket_id='covers' and private.can_edit_catalog());

commit;
