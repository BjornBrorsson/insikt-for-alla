-- Roles
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.anvandarroller (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.anvandarroller to authenticated;
grant all on public.anvandarroller to service_role;
alter table public.anvandarroller enable row level security;
create policy "Inloggade kan se roller" on public.anvandarroller for select to authenticated using (true);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.anvandarroller where user_id = _user_id and role = _role)
$$;

-- Partier
create table public.partier (
  kod text primary key,
  namn text not null,
  forkortning text not null,
  farg text,
  ordning int not null default 100
);
grant select on public.partier to anon, authenticated;
grant all on public.partier to service_role;
alter table public.partier enable row level security;
create policy "Partier är offentliga" on public.partier for select to anon, authenticated using (true);

insert into public.partier (kod, namn, forkortning, farg, ordning) values
  ('S','Socialdemokraterna','S','#E8112d',1),
  ('SD','Sverigedemokraterna','SD','#DDDD00',2),
  ('M','Moderaterna','M','#52BDEC',3),
  ('C','Centerpartiet','C','#009933',4),
  ('V','Vänsterpartiet','V','#DA291C',5),
  ('KD','Kristdemokraterna','KD','#000077',6),
  ('MP','Miljöpartiet de gröna','MP','#83CF39',7),
  ('L','Liberalerna','L','#006AB3',8),
  ('-','Partilös','-','#888888',99);

-- Ledamöter
create table public.ledamoter (
  id text primary key,
  sourceid text,
  fornamn text not null,
  efternamn text not null,
  sorteringsnamn text,
  parti text,
  valkrets text,
  kon text,
  fodd_ar int,
  status text,
  bild_url text,
  bild_url_liten text,
  kalla_url text,
  uppdaterad timestamptz not null default now()
);
create index on public.ledamoter (parti);
create index on public.ledamoter (valkrets);
grant select on public.ledamoter to anon, authenticated;
grant all on public.ledamoter to service_role;
alter table public.ledamoter enable row level security;
create policy "Ledamöter är offentliga" on public.ledamoter for select to anon, authenticated using (true);

create table public.uppdrag (
  id bigserial primary key,
  ledamot_id text not null references public.ledamoter(id) on delete cascade,
  organ_kod text,
  organ_namn text,
  roll text,
  typ text,
  status text,
  fran date,
  till date
);
create index on public.uppdrag (ledamot_id);
create index on public.uppdrag (organ_kod);
grant select on public.uppdrag to anon, authenticated;
grant all on public.uppdrag to service_role;
alter table public.uppdrag enable row level security;
create policy "Uppdrag är offentliga" on public.uppdrag for select to anon, authenticated using (true);

-- Ärenden
create table public.arenden (
  id text primary key,
  rm text,
  beteckning text,
  organ text,
  doktyp text,
  titel text,
  undertitel text,
  datum date,
  publicerad timestamptz,
  kalla_url_html text,
  kalla_url_text text,
  tidslinje jsonb,
  uppdaterad timestamptz not null default now()
);
create index on public.arenden (rm);
create index on public.arenden (organ);
create index on public.arenden (datum desc);
grant select on public.arenden to anon, authenticated;
grant all on public.arenden to service_role;
alter table public.arenden enable row level security;
create policy "Ärenden är offentliga" on public.arenden for select to anon, authenticated using (true);

create table public.beslutspunkter (
  id text primary key,
  arende_id text not null references public.arenden(id) on delete cascade,
  punkt text not null,
  rubrik text,
  forslag text,
  beslutstyp text,
  motforslag_nummer text,
  motforslag_partier text,
  vinnare text,
  voteringskrav text,
  votering_id text
);
create index on public.beslutspunkter (arende_id);
grant select on public.beslutspunkter to anon, authenticated;
grant all on public.beslutspunkter to service_role;
alter table public.beslutspunkter enable row level security;
create policy "Beslutspunkter är offentliga" on public.beslutspunkter for select to anon, authenticated using (true);

-- Voteringar
create table public.voteringar (
  id text primary key,
  arende_id text references public.arenden(id) on delete set null,
  beslutspunkt_id text references public.beslutspunkter(id) on delete set null,
  rm text,
  beteckning text,
  punkt text,
  avser text,
  typ text,
  rubrik text,
  gallde text,
  ja int not null default 0,
  nej int not null default 0,
  avstar int not null default 0,
  franvarande int not null default 0,
  vinnare text,
  datum date,
  kalla_url text,
  uppdaterad timestamptz not null default now()
);
create index on public.voteringar (rm);
create index on public.voteringar (datum desc);
create index on public.voteringar (arende_id);
grant select on public.voteringar to anon, authenticated;
grant all on public.voteringar to service_role;
alter table public.voteringar enable row level security;
create policy "Voteringar är offentliga" on public.voteringar for select to anon, authenticated using (true);

create table public.partitotaler (
  votering_id text not null references public.voteringar(id) on delete cascade,
  parti text not null,
  ja int not null default 0,
  nej int not null default 0,
  avstar int not null default 0,
  franvarande int not null default 0,
  primary key (votering_id, parti)
);
grant select on public.partitotaler to anon, authenticated;
grant all on public.partitotaler to service_role;
alter table public.partitotaler enable row level security;
create policy "Partitotaler är offentliga" on public.partitotaler for select to anon, authenticated using (true);

create table public.roster (
  votering_id text not null references public.voteringar(id) on delete cascade,
  ledamot_id text not null,
  parti text,
  valkrets text,
  rost text not null,
  avser text,
  primary key (votering_id, ledamot_id)
);
create index on public.roster (ledamot_id);
create index on public.roster (parti);
grant select on public.roster to anon, authenticated;
grant all on public.roster to service_role;
alter table public.roster enable row level security;
create policy "Röster är offentliga" on public.roster for select to anon, authenticated using (true);

-- Sakfrågor (Insikts egen kategorisering)
create table public.sakfragor (
  slug text primary key,
  namn text not null,
  beskrivning text,
  nyckelord text[] not null default '{}',
  utskott text[] not null default '{}',
  ordning int not null default 100
);
grant select on public.sakfragor to anon, authenticated;
grant all on public.sakfragor to service_role;
alter table public.sakfragor enable row level security;
create policy "Sakfrågor är offentliga" on public.sakfragor for select to anon, authenticated using (true);

insert into public.sakfragor (slug, namn, beskrivning, nyckelord, utskott, ordning) values
 ('klimat-och-miljo','Klimat och miljö','Ärenden om klimatpolitik, utsläpp, naturvård och miljöskydd.', array['klimat','miljö','utsläpp','naturvård','kemikalie'], array['MJU'],1),
 ('energi','Energi','Ärenden om elförsörjning, kärnkraft, förnybar energi och energipriser.', array['energi','el','kärnkraft','vindkraft','drivmedel'], array['NU'],2),
 ('skola','Skola och utbildning','Ärenden om förskola, skola, högskola och forskning.', array['skola','utbildning','elev','förskola','högskola','universitet','lärare'], array['UbU'],3),
 ('sjukvard','Hälsa och sjukvård','Ärenden om hälso- och sjukvård, tandvård och folkhälsa.', array['sjukvård','hälso','vård','patient','apotek','tandvård','folkhälsa'], array['SoU'],4),
 ('ekonomi','Ekonomi och skatter','Ärenden om statens budget, skatter och finansmarknad.', array['skatt','budget','finans','moms','statens','ekonomisk'], array['FiU','SkU'],5),
 ('arbetsmarknad','Arbetsmarknad','Ärenden om arbetsrätt, arbetsmiljö och sysselsättning.', array['arbetsmarknad','arbetsrätt','arbetsmiljö','anställning','a-kassa','jämställdhet'], array['AU'],6),
 ('migration','Migration','Ärenden om asyl, uppehållstillstånd och medborgarskap.', array['migration','asyl','uppehållstillstånd','medborgarskap','invandring'], array['SfU'],7),
 ('rattspolitik','Rättspolitik','Ärenden om brott, straff, polis och domstolar.', array['brott','straff','polis','domstol','kriminal','påföljd'], array['JuU'],8),
 ('forsvar','Försvar och beredskap','Ärenden om försvar, civil beredskap och säkerhetspolitik.', array['försvar','beredskap','militär','säkerhetspolitik','totalförsvar'], array['FöU','UU'],9),
 ('bostader','Bostäder och infrastruktur','Ärenden om bostadsbyggande, hyror, trafik och infrastruktur.', array['bostad','hyra','byggande','plan- och bygglagen','infrastruktur','trafik','järnväg'], array['CU','TU'],10);

create table public.arende_sakfragor (
  arende_id text not null references public.arenden(id) on delete cascade,
  sakfraga text not null references public.sakfragor(slug) on delete cascade,
  kalla text not null default 'insikt',
  primary key (arende_id, sakfraga)
);
grant select on public.arende_sakfragor to anon, authenticated;
grant all on public.arende_sakfragor to service_role;
alter table public.arende_sakfragor enable row level security;
create policy "Ämneskopplingar är offentliga" on public.arende_sakfragor for select to anon, authenticated using (true);

-- AI-sammanfattningar
create table public.ai_sammanfattningar (
  id uuid primary key default gen_random_uuid(),
  arende_id text not null unique references public.arenden(id) on delete cascade,
  sammanfattning text not null,
  modell text not null,
  underlag_url text,
  tillrackligt_underlag boolean not null default true,
  granskad boolean not null default false,
  skapad timestamptz not null default now()
);
grant select on public.ai_sammanfattningar to anon, authenticated;
grant all on public.ai_sammanfattningar to service_role;
alter table public.ai_sammanfattningar enable row level security;
create policy "Sammanfattningar är offentliga" on public.ai_sammanfattningar for select to anon, authenticated using (true);
create policy "Administratörer kan ändra sammanfattningar" on public.ai_sammanfattningar for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Inläsningar
create table public.inlasningar (
  id uuid primary key default gen_random_uuid(),
  typ text not null,
  status text not null,
  detalj text,
  antal int not null default 0,
  rm text,
  startad timestamptz not null default now(),
  avslutad timestamptz
);
create index on public.inlasningar (startad desc);
grant select on public.inlasningar to authenticated;
grant all on public.inlasningar to service_role;
alter table public.inlasningar enable row level security;
create policy "Administratörer ser inläsningar" on public.inlasningar for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- Felrapporter
create table public.felrapporter (
  id uuid primary key default gen_random_uuid(),
  sida text,
  beskrivning text not null,
  epost text,
  status text not null default 'ny',
  skapad timestamptz not null default now()
);
grant insert on public.felrapporter to anon, authenticated;
grant select, update on public.felrapporter to authenticated;
grant all on public.felrapporter to service_role;
alter table public.felrapporter enable row level security;
create policy "Vem som helst kan rapportera fel" on public.felrapporter for insert to anon, authenticated with check (true);
create policy "Administratörer ser felrapporter" on public.felrapporter for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "Administratörer hanterar felrapporter" on public.felrapporter for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Härledd majoritetsröst per parti och votering
create view public.v_partimajoritet as
select
  votering_id,
  parti,
  case
    when ja > nej and ja > avstar then 'Ja'
    when nej > ja and nej > avstar then 'Nej'
    when avstar > ja and avstar > nej then 'Avstår'
    else null
  end as majoritetsrost,
  ja, nej, avstar, franvarande
from public.partitotaler;
grant select on public.v_partimajoritet to anon, authenticated, service_role;