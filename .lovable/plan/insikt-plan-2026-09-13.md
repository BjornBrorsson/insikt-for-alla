# Insikt — plan

En svenskspråkig plattform som gör riksdagens arbete begripligt: från fråga till verifierbart svar, alltid med länk till originalkällan.

## Vad som byggs

**Start** — rubrik "Förstå besluten. Granska dina folkvalda.", stor sökruta, senaste beslut och voteringar, "Hitta dina representanter" via valkrets, ingångar till sakfrågor, kort om datakällan och när uppgifterna senast uppdaterades.

**Ledamöter** — katalog med kort- och tabellvy, porträtt, parti, valkrets, tjänstgöringsstatus. Sök på namn, filter för parti, valkrets, utskott, riksmöte och aktuell/historisk, sortering, återställning av filter. Filter och sökning ligger i länken så vyer kan delas.

**Ledamotsprofil** — uppdrag och tjänstgöringsperioder, utskott, länk till officiell profil, voteringshistorik med datum, ärende och röst, motioner/interpellationer/skriftliga frågor där de finns. Sammanfattning för vald period: Ja, Nej, Avstår, Frånvarande, samt hur ofta personen röstat lika som partiets majoritetsröst — med metoden redovisad. Frånvaro i voteringar beskrivs aldrig som mått på arbetsinsats.

**Valkretsar** — egen vy per valkrets med dess ledamöter och partifördelning.

**Partier** — översikt och sida per parti: mandat med tidsreferens, ledamöter, röstfördelning, sammanhållning, vilka partier man oftast röstat lika som. Partilösa ledamöter och historiska förändringar stöds; antalet partier är inte hårdkodat. Beräknad linje kallas "partiets majoritetsröst".

**Voteringar & beslut** — sökbart arkiv med filter för period, riksmöte, sakfråga och utskott. Ärendesida med officiell titel och beteckning, kort beskrivning, utskott, status, förslag/betänkande/reservationer, beslutspunkter, utfall, tidslinje, relaterade ärenden och länkar till officiella dokument. Ärende, beslutspunkt och votering hålls åtskilda; beslut utan registrerad votering får inga individuella röster.

**Voteringsdetalj** — vad omröstningen gällde, vad Ja respektive Nej innebar, vilka alternativ som stod mot varandra, utfallet. Ja/Nej/Avstår/Frånvarande för kammaren, per parti och per ledamot, med diagram som fungerar utan färgseende plus fullständig tabell med sök och filter. Avvikelse från partiets majoritetsröst markeras sakligt.

**Sakfrågor** — ämnessidor (klimat, energi, skola, sjukvård, ekonomi, arbetsmarknad, migration, rättspolitik, försvar, bostäder) med relevanta ärenden, senaste voteringar, berörda utskott och partiernas röster. Märks tydligt som Insikts egen kategorisering.

**Jämför** — ledamot mot ledamot och parti mot parti: gemensamma voteringar, respektive röst, andel lika. Filter för period och sakfråga, antal jämförda voteringar synligt och underlaget öppningsbart. Frånvaro och saknade uppgifter redovisas separat. Beskrivs som röstlikhet, inte ideologisk likhet.

**Sök och delning** — global sökning med grupperade träffar för ledamöter, partier och ärenden, kontext i varje träff, hjälpsamma tomlägen, kopiera länk och export av synliga voterings- och jämförelsedata till CSV med källreferens och urval.

**Mina bevakningar** — byggs nu utan konto: bevakningar sparas i besökarens egen webbläsare, med personligt flöde över nya händelser för det man följer. Sidan förklarar tydligt att bevakningarna bara finns på den enheten. Konto, inloggning, notisinställningar, e-postsammanställning och radering av personuppgifter dokumenteras som nästa steg och byggs när du vill.

**Om Insikt, Källor & metod, Ordlista, Rapportera fel** — metodsidan beskriver datakällor, uppdateringsprinciper, ämneskategorisering och definitionen av varje mått. Ordlistan förklarar motion, proposition, betänkande, reservation, utskott, riksmöte och votering, med korta hjälptexter där orden används.

**Administration** — skyddad vy för inläsningsstatus, senaste lyckade körning, fel med möjlighet att köra om, datatäckning över tid, rapporterade fel samt granskning av egna sammanfattningar och kategoriseringar.

## Data

Uppgifterna hämtas från Riksdagens öppna data och lagras i en egen databas (Lovable Cloud, sätts upp i första steget): ledamöter, uppdrag, dokument, ärenden, voteringar och enskilda röster. Regelbunden uppdatering plus möjlighet att läsa in historik bakåt.

Varje sida visar källa och länk till originalet, senaste lyckade uppdatering, vilken period uppgifterna täcker, om något saknas, och vilka sammanställningar som är Insikts egna beräkningar. Noll, saknad uppgift, frånvaro och ej tillämpligt hålls åtskilda. Inga påhittade politiska uppgifter förekommer.

## AI-sammanfattningar

Ärenden och beslut får korta sammanfattningar, märkta "AI-genererad sammanfattning", enbart baserade på tillgänglig källtext, med länk till underlaget och originaltexten alltid nåbar. När underlaget inte räcker sägs det. AI används aldrig för röster, utfall, partitillhörighet eller motiv, och produkten är fullt användbar utan dem.

## Design

Ljusa neutrala ytor, mörk tydlig typografi, gott om luft, en återhållsam accentfärg och partifärger enbart som orientering. Diagram läsbara utan färgseende. Byggs för mobil och dator, all text på svenska, datum i svenskt format.

## Teknik

TanStack Start med serverfunktioner mot Lovable Cloud (Postgres). Inläsning från Riksdagens öppna data (`data.riksdagen.se`) körs som ett schemalagt jobb mot en publik endpoint; härledda mått (majoritetsröst, sammanhållning, röstlikhet) beräknas i databasen och läses via publika, RLS-begränsade vyer. Admin skyddas av roll i separat rolltabell. AI-sammanfattningar via Lovable AI Gateway, lagrade och versionerade i databasen.

## Ordning

1. Databas och inläsning från riksdagen, källvisning
2. Ledamöter, valkretsar, partier, sök
3. Voteringar, ärenden, voteringsdetalj
4. Sakfrågor och jämförelser
5. Bevakningar (utan konto), CSV-export, ordlista, metod
6. AI-sammanfattningar och administration

## Kvarstår efter detta

Konto med inloggning samt e-postsammanställning — inget e-postlöfte visas förrän det finns.
