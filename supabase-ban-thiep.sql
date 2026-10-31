-- =====================================================================
-- NÂNG CẤP BÁN THIỆP THEO MÃ — chạy 1 lần SAU file supabase-setup.sql
-- Supabase → SQL Editor → New query → dán toàn bộ → Run
--
-- Khách tự đăng ký tài khoản → nhập mã kích hoạt do admin cấp → được tạo
-- đúng 1 thiệp và chỉ sửa được thiệp đó (không tạo thêm, không xoá,
-- không đổi tên link). Admin vẫn toàn quyền.
-- =====================================================================

-- Chủ thiệp
alter table public.invitations add column if not exists owner_id uuid references auth.users on delete set null;
alter table public.invitations add column if not exists owner_email text;
-- mỗi tài khoản khách chỉ có 1 thiệp
create unique index if not exists invitations_one_per_owner on public.invitations (owner_id) where owner_id is not null;

-- Mã kích hoạt (mỗi mã dùng 1 lần)
create table if not exists public.codes (
  code text primary key,
  note text not null default '',
  created_at timestamptz not null default now(),
  used_by uuid references auth.users on delete set null,
  used_email text,
  used_at timestamptz,
  invitation_id uuid references public.invitations on delete set null
);
alter table public.codes enable row level security;
drop policy if exists "admin quan ly ma" on public.codes;
create policy "admin quan ly ma" on public.codes for all using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.codes to authenticated;

-- Thiệp: khách xem/sửa được thiệp của mình; chỉ admin tạo & xoá
drop policy if exists "xem thiep cong khai" on public.invitations;
create policy "xem thiep cong khai" on public.invitations
  for select using (published or public.is_admin() or owner_id = auth.uid());
drop policy if exists "admin sua thiep" on public.invitations;
create policy "admin sua thiep" on public.invitations
  for update using (public.is_admin() or owner_id = auth.uid())
  with check (public.is_admin() or owner_id = auth.uid());

-- Khách không được đổi tên link / chủ thiệp (chặn ngay trong database)
create or replace function public.guard_invitation() returns trigger
language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if new.slug is distinct from old.slug
       or new.owner_id is distinct from old.owner_id
       or new.owner_email is distinct from old.owner_email then
      raise exception 'Không được đổi tên link của thiệp. Liên hệ admin nếu cần đổi.';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists guard_invitation on public.invitations;
create trigger guard_invitation before update on public.invitations
  for each row execute function public.guard_invitation();

-- Lời chúc: chủ thiệp cũng xem & xoá được lời chúc của thiệp mình
drop policy if exists "xem loi chuc" on public.wishes;
create policy "xem loi chuc" on public.wishes
  for select using (exists (select 1 from public.invitations i where i.id = invitation_id
                            and (i.published or public.is_admin() or i.owner_id = auth.uid())));
drop policy if exists "admin xoa loi chuc" on public.wishes;
create policy "admin xoa loi chuc" on public.wishes
  for delete using (public.is_admin() or exists (select 1 from public.invitations i where i.id = invitation_id and i.owner_id = auth.uid()));

-- Ảnh/nhạc: khách chỉ tải vào thư mục của thiệp mình (tên thư mục = id thiệp)
create or replace function public.owns_folder(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.invitations
                 where owner_id = auth.uid() and id::text = split_part(p_name, '/', 1));
$$;
grant execute on function public.owns_folder(text) to authenticated;
drop policy if exists "admin tai file" on storage.objects;
create policy "admin tai file" on storage.objects
  for insert to authenticated with check (bucket_id = 'invites' and (public.is_admin() or public.owns_folder(name)));
drop policy if exists "admin sua file" on storage.objects;
create policy "admin sua file" on storage.objects
  for update to authenticated using (bucket_id = 'invites' and (public.is_admin() or public.owns_folder(name)));
drop policy if exists "admin xoa file" on storage.objects;
create policy "admin xoa file" on storage.objects
  for delete to authenticated using (bucket_id = 'invites' and (public.is_admin() or public.owns_folder(name)));

-- Kích hoạt mã: kiểm tra mã → tạo thiệp cho tài khoản đang đăng nhập → đánh dấu mã đã dùng
create or replace function public.redeem_code(p_code text, p_slug text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_code public.codes%rowtype;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
  v_id uuid;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập trước.'; end if;
  if exists (select 1 from public.invitations where owner_id = v_uid) then
    raise exception 'Tài khoản này đã có thiệp rồi. Mỗi tài khoản chỉ được 1 thiệp.';
  end if;
  select * into v_code from public.codes where code = upper(btrim(coalesce(p_code, ''))) for update;
  if not found then raise exception 'Mã kích hoạt không đúng.'; end if;
  if v_code.used_by is not null or v_code.used_at is not null then raise exception 'Mã này đã được sử dụng.'; end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 60 then
    raise exception 'Tên link chỉ gồm chữ thường không dấu, số và dấu gạch ngang.';
  end if;
  if exists (select 1 from public.invitations where slug = v_slug) then
    raise exception 'Tên link này đã có người dùng, hãy chọn tên khác.';
  end if;
  select email into v_email from auth.users where id = v_uid;
  insert into public.invitations (slug, title, data, published, owner_id, owner_email)
    values (v_slug, '', '{}'::jsonb, true, v_uid, v_email)
    returning id into v_id;
  update public.codes set used_by = v_uid, used_email = v_email, used_at = now(), invitation_id = v_id
    where code = v_code.code;
  return v_id;
end; $$;
revoke all on function public.redeem_code(text, text) from public, anon;
grant execute on function public.redeem_code(text, text) to authenticated;
