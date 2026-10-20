# Piani Alti · demo prenotazioni

Demo full stack per la prenotazione di magliette: modulo cliente, scelta fra bonifico e contanti, riepilogo WhatsApp e dashboard per seguire produzione, consegne e pagamenti.

La demo Cloudflare è pubblicata su <https://piani-alti-demo.barberovignoladavide.workers.dev/>. Il prezzo, il prodotto e le coordinate bancarie sono dimostrativi; l'IBAN non è utilizzabile.

## Struttura

- `app/page.html`, `public/`: interfaccia e logica nel browser.
- `app/api/orders/`: creazione prenotazioni e API riservate della dashboard.
- `app/api/admin/`, `app/admin-auth.ts`: accesso con password, cookie firmato e logout.
- `db/`, `drizzle/`: schema e migrazione SQLite per Cloudflare D1.
- `wrangler.cloudflare.jsonc`: deploy autonomo su Cloudflare Workers.
- `.openai/hosting.json`: configurazione del precedente sito Sites, separata dal deploy Cloudflare.

## Avvio locale

Serve Node.js 22.13 o successivo. Dalla cartella del progetto:

```sh
npm ci
npm run dev
```

Per compilare:

```sh
npm run build
```

Il database di sviluppo è separato da quello online. Applicare la migrazione anche al database locale prima di provare le API delle prenotazioni.

## Pubblicazione su Cloudflare

Il progetto usa un Worker con asset statici e un database D1. Il database online di questa demo è `piani-alti-demo-db` e il binding nel codice si chiama `DB`.

Per un account Cloudflare diverso, creare un nuovo D1 e sostituire `database_id` in `wrangler.cloudflare.jsonc`. Applicare la migrazione una volta sola al nuovo database:

```sh
npx wrangler d1 execute piani-alti-demo-db --remote --config wrangler.cloudflare.jsonc --file drizzle/0000_sad_harpoon.sql
```

Compilare e pubblicare:

```sh
npm run build
npx wrangler deploy --config wrangler.cloudflare.jsonc
```

Configurare due segreti nel Worker, con valori lunghi e casuali. Non inserirli nei file Git:

```sh
npx wrangler secret put ADMIN_PASSWORD --config wrangler.cloudflare.jsonc
npx wrangler secret put ADMIN_SESSION_SECRET --config wrangler.cloudflare.jsonc
```

La dashboard è raggiungibile dalla voce “Vista interna”. La password apre una sessione di 12 ore; l'API degli ordini richiede il cookie firmato per leggere o cambiare gli stati. Il modulo cliente resta accessibile a chi ha il link.

## Prima dell'uso reale

In `public/app.js` sostituire il contatto WhatsApp dimostrativo e le coordinate bancarie. Allineare prezzo, taglie e prodotto tra `public/app.js`, `app/page.html` e `app/api/orders/route.ts`. La demo usa una password condivisa: per un gestionale operativo con più rappresentanti servono accessi individuali e una politica di gestione dei dati dei clienti.

Il sito Sites precedente e il Worker Cloudflare hanno database e pubblicazioni indipendenti. Per mantenere aggiornata la demo da condividere, pubblicare con `wrangler.cloudflare.jsonc`.
