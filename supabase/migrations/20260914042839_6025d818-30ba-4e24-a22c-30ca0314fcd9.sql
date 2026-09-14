-- Ledamotens röstsammanfattning
create or replace function public.ledamot_sammanfattning(
  _ledamot text, _fran date default null, _till date default null, _sakfraga text default null
) returns table (
  ja int, nej int, avstar int, franvarande int,
  jamforbara int, lika_med_partimajoritet int
) language sql stable set search_path = public as $$
  select
    count(*) filter (where r.rost = 'Ja')::int,
    count(*) filter (where r.rost = 'Nej')::int,
    count(*) filter (where r.rost = 'Avstår')::int,
    count(*) filter (where r.rost = 'Frånvarande')::int,
    count(*) filter (where r.rost in ('Ja','Nej','Avstår') and m.majoritetsrost is not null)::int,
    count(*) filter (where r.rost in ('Ja','Nej','Avstår') and m.majoritetsrost is not null and r.rost = m.majoritetsrost)::int
  from public.roster r
  join public.voteringar v on v.id = r.votering_id
  left join public.v_partimajoritet m on m.votering_id = r.votering_id and m.parti = r.parti
  where r.ledamot_id = _ledamot
    and (_fran is null or v.datum >= _fran)
    and (_till is null or v.datum <= _till)
    and (_sakfraga is null or exists (
      select 1 from public.arende_sakfragor s where s.arende_id = v.arende_id and s.sakfraga = _sakfraga));
$$;

-- Jämför två ledamöter
create or replace function public.jamfor_ledamoter(
  _a text, _b text, _fran date default null, _till date default null, _sakfraga text default null
) returns table (
  votering_id text, titel text, beteckning text, punkt text, datum date,
  rost_a text, rost_b text, jamforbar boolean, lika boolean
) language sql stable set search_path = public as $$
  select v.id, coalesce(a.titel, v.rubrik), v.beteckning, v.punkt, v.datum,
    ra.rost, rb.rost,
    (ra.rost in ('Ja','Nej','Avstår') and rb.rost in ('Ja','Nej','Avstår')),
    (ra.rost in ('Ja','Nej','Avstår') and ra.rost = rb.rost)
  from public.roster ra
  join public.roster rb on rb.votering_id = ra.votering_id and rb.ledamot_id = _b
  join public.voteringar v on v.id = ra.votering_id
  left join public.arenden a on a.id = v.arende_id
  where ra.ledamot_id = _a
    and (_fran is null or v.datum >= _fran)
    and (_till is null or v.datum <= _till)
    and (_sakfraga is null or exists (
      select 1 from public.arende_sakfragor s where s.arende_id = v.arende_id and s.sakfraga = _sakfraga))
  order by v.datum desc nulls last, v.beteckning, v.punkt;
$$;

-- Jämför två partiers majoritetsröster
create or replace function public.jamfor_partier(
  _a text, _b text, _fran date default null, _till date default null, _sakfraga text default null
) returns table (
  votering_id text, titel text, beteckning text, punkt text, datum date,
  majoritet_a text, majoritet_b text, jamforbar boolean, lika boolean
) language sql stable set search_path = public as $$
  select v.id, coalesce(a.titel, v.rubrik), v.beteckning, v.punkt, v.datum,
    ma.majoritetsrost, mb.majoritetsrost,
    (ma.majoritetsrost is not null and mb.majoritetsrost is not null),
    (ma.majoritetsrost is not null and ma.majoritetsrost = mb.majoritetsrost)
  from public.v_partimajoritet ma
  join public.v_partimajoritet mb on mb.votering_id = ma.votering_id and mb.parti = _b
  join public.voteringar v on v.id = ma.votering_id
  left join public.arenden a on a.id = v.arende_id
  where ma.parti = _a
    and (_fran is null or v.datum >= _fran)
    and (_till is null or v.datum <= _till)
    and (_sakfraga is null or exists (
      select 1 from public.arende_sakfragor s where s.arende_id = v.arende_id and s.sakfraga = _sakfraga))
  order by v.datum desc nulls last, v.beteckning, v.punkt;
$$;

-- Partiets sammanhållning: andel av partiets avgivna röster som följde majoritetsrösten
create or replace function public.parti_sammanhallning(
  _parti text, _fran date default null, _till date default null
) returns table (voteringar int, avgivna_roster int, enligt_majoritet int) language sql stable set search_path = public as $$
  select
    count(distinct r.votering_id)::int,
    count(*)::int,
    count(*) filter (where r.rost = m.majoritetsrost)::int
  from public.roster r
  join public.voteringar v on v.id = r.votering_id
  join public.v_partimajoritet m on m.votering_id = r.votering_id and m.parti = r.parti
  where r.parti = _parti
    and r.rost in ('Ja','Nej','Avstår')
    and m.majoritetsrost is not null
    and (_fran is null or v.datum >= _fran)
    and (_till is null or v.datum <= _till);
$$;

-- Röstlikhet mellan ett parti och alla andra partier
create or replace function public.parti_likhet(
  _parti text, _fran date default null, _till date default null
) returns table (parti text, gemensamma int, lika int) language sql stable set search_path = public as $$
  select mb.parti, count(*)::int, count(*) filter (where mb.majoritetsrost = ma.majoritetsrost)::int
  from public.v_partimajoritet ma
  join public.v_partimajoritet mb on mb.votering_id = ma.votering_id and mb.parti <> _parti
  join public.voteringar v on v.id = ma.votering_id
  where ma.parti = _parti
    and ma.majoritetsrost is not null and mb.majoritetsrost is not null
    and (_fran is null or v.datum >= _fran)
    and (_till is null or v.datum <= _till)
  group by mb.parti
  order by 3 desc;
$$;

grant execute on function public.ledamot_sammanfattning(text, date, date, text) to anon, authenticated, service_role;
grant execute on function public.jamfor_ledamoter(text, text, date, date, text) to anon, authenticated, service_role;
grant execute on function public.jamfor_partier(text, text, date, date, text) to anon, authenticated, service_role;
grant execute on function public.parti_sammanhallning(text, date, date) to anon, authenticated, service_role;
grant execute on function public.parti_likhet(text, date, date) to anon, authenticated, service_role;