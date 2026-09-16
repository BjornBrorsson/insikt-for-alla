-- AI-sammanfattningar per votering (klartext för allmänheten)
create table public.ai_voteringssammanfattningar (
  id uuid primary key default gen_random_uuid(),
  votering_id text not null unique references public.voteringar(id) on delete cascade,
  sammanfattning text not null,
  modell text not null,
  tillrackligt_underlag boolean not null default true,
  granskad boolean not null default false,
  skapad timestamptz not null default now()
);
grant select on public.ai_voteringssammanfattningar to anon, authenticated;
grant all on public.ai_voteringssammanfattningar to service_role;
alter table public.ai_voteringssammanfattningar enable row level security;
create policy "Voteringssammanfattningar är offentliga" on public.ai_voteringssammanfattningar for select to anon, authenticated using (true);
create policy "Administratörer kan ändra voteringssammanfattningar" on public.ai_voteringssammanfattningar for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
