-- =====================================================================
-- CHẠY FILE NÀY 1 LẦN trong Supabase → SQL Editor → New query → Run
-- Tạo bảng thiệp, bảng lời chúc, kho ảnh và phân quyền.
-- =====================================================================

-- Danh sách tài khoản được sửa thiệp
create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.admins enable row level security;
-- (không mở policy nào: không ai đọc/sửa bảng này qua web được)

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Thiệp
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.invitations enable row level security;

drop policy if exists "xem thiep cong khai" on public.invitations;
create policy "xem thiep cong khai" on public.invitations
  for select using (published or public.is_admin());
drop policy if exists "admin them thiep" on public.invitations;
create policy "admin them thiep" on public.invitations
  for insert with check (public.is_admin());
drop policy if exists "admin sua thiep" on public.invitations;
create policy "admin sua thiep" on public.invitations
  for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin xoa thiep" on public.invitations;
create policy "admin xoa thiep" on public.invitations
  for delete using (public.is_admin());

-- Lời chúc
create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.invitations on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  message text not null check (char_length(btrim(message)) between 1 and 600),
  created_at timestamptz not null default now()
);
create index if not exists wishes_invitation_idx on public.wishes (invitation_id, created_at desc);
alter table public.wishes enable row level security;

drop policy if exists "xem loi chuc" on public.wishes;
create policy "xem loi chuc" on public.wishes
  for select using (exists (select 1 from public.invitations i where i.id = invitation_id and (i.published or public.is_admin())));
drop policy if exists "khach gui loi chuc" on public.wishes;
create policy "khach gui loi chuc" on public.wishes
  for insert with check (exists (select 1 from public.invitations i where i.id = invitation_id and i.published));
drop policy if exists "admin xoa loi chuc" on public.wishes;
create policy "admin xoa loi chuc" on public.wishes
  for delete using (public.is_admin());

-- Khách không được tự đặt giờ gửi
create or replace function public.wishes_set_time() returns trigger language plpgsql as $$
begin new.created_at := now(); return new; end; $$;
drop trigger if exists wishes_set_time on public.wishes;
create trigger wishes_set_time before insert on public.wishes
  for each row execute function public.wishes_set_time();

-- Cho web được gọi tới các bảng (quyền chi tiết vẫn do các policy ở trên quyết định)
grant usage on schema public to anon, authenticated;
grant select on public.invitations to anon, authenticated;
grant insert, update, delete on public.invitations to authenticated;
grant select, insert on public.wishes to anon, authenticated;
grant delete on public.wishes to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
revoke all on public.admins from anon, authenticated;

-- Kho ảnh / nhạc (ai cũng xem được, chỉ admin tải lên / xóa)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('invites', 'invites', true, 15728640,
        array['image/jpeg','image/png','image/webp','image/gif','audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','audio/wav'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin tai file" on storage.objects;
create policy "admin tai file" on storage.objects
  for insert to authenticated with check (bucket_id = 'invites' and public.is_admin());
drop policy if exists "admin sua file" on storage.objects;
create policy "admin sua file" on storage.objects
  for update to authenticated using (bucket_id = 'invites' and public.is_admin());
drop policy if exists "admin xoa file" on storage.objects;
create policy "admin xoa file" on storage.objects
  for delete to authenticated using (bucket_id = 'invites' and public.is_admin());


-- =====================================================================
-- BƯỚC SAU (chạy riêng, SAU KHI đã tạo tài khoản ở Authentication → Users):
-- đổi email bên dưới thành email của bạn rồi chạy để cấp quyền admin.
-- =====================================================================
-- insert into public.admins (user_id)
-- select id from auth.users where email = 'email-cua-ban@gmail.com'
-- on conflict do nothing;
