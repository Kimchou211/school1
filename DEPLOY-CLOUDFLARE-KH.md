# Reading Assessment System — Cloudflare Workers + Neon

ឯកសារនេះណែនាំការដាក់ Frontend React/Vite និង Backend Express API ទៅ Cloudflare Workers ហើយរក្សា Neon PostgreSQL ជា Database ដដែល។ មិនចាំបាច់មាន GitHub Repository ទេ។ អាច Deploy ដោយផ្ទាល់ពី PowerShell លើកុំព្យូទ័រ។

## ការរៀបចំក្នុង ZIP នេះ

- `src/worker.ts`: Cloudflare Worker entry point សម្រាប់ `/api/*`។
- `src/server/app.ts`: Express API routes ដែលប្រើរួមគ្នាជាមួយ Local development និង Cloudflare។
- `wrangler.jsonc`: Worker + static frontend assets + Neon Hyperdrive binding។
- `npm run deploy`: Build Frontend រួច Deploy Frontend និង Backend ក្នុង deployment តែមួយ។
- Production ទាមទារការតភ្ជាប់ Neon ជោគជ័យ។ បើ Database មិនដំណើរការ API នឹងត្រឡប់ `503` ជំនួសការរក្សាទុកទិន្នន័យក្នុង memory។
- Production មិនបង្កើត Demo accounts ដែលមាន password `123456` ឡើយ។ Demo accounts ចាស់ដែលស្គាល់ពី seed data នឹងត្រូវ suspend ដោយមិនលុបទិន្នន័យពាក់ព័ន្ធ។

## ត្រូវមានជាមុន

1. [Cloudflare account](https://dash.cloudflare.com/)
2. [Neon project](https://console.neon.tech/) ដែលមាន Database PostgreSQL
3. Node.js LTS និង npm នៅលើកុំព្យូទ័រ
4. Neon connection string ពី role ដែលមានសិទ្ធិ `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, `SELECT`, `INSERT`, `UPDATE`, `DELETE`។ កម្មវិធីបង្កើតតារាង និង migration ដោយស្វ័យប្រវត្តិពេលចាប់ផ្តើម។

> កុំដាក់ `DATABASE_URL`, database password ឬ `AUTH_SECRET` ក្នុង source code, Git repository ឬ Chat។ ដាក់ connection string ក្នុង Cloudflare Hyperdrive និង credential ផ្សេងៗជា Worker Secrets។

## ជំហាន ១ — Extract និងដំឡើង

Extract ZIP ទៅ Folder ថ្មី ហើយបើក PowerShell ក្នុង Folder ដែលមាន `package.json` និង `wrangler.jsonc`៖

```powershell
npm install
npx wrangler login
```

Browser នឹងបើកឱ្យអ្នក Login និងអនុញ្ញាត Wrangler ចូល Cloudflare account។

## ជំហាន ២ — បង្កើត Cloudflare Hyperdrive ដែលភ្ជាប់ Neon

1. ចូល [Neon Console](https://console.neon.tech/) ហើយជ្រើស Project, Branch និង Database ដែលអ្នកចង់ប្រើ។
2. ក្នុង Connection Details ចម្លង connection string របស់ role ដែលមានសិទ្ធិគ្រប់គ្រាន់ក្នុង database គោលដៅ។
3. ចូល [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Hyperdrive** → **Create configuration**។
4. បញ្ចូល Neon connection string ក្នុង Cloudflare Dashboard ហើយបង្កើត Configuration។ កុំ paste connection string ក្នុង Chat ឬ source code។
5. ចម្លង Hyperdrive Configuration ID ដែល Cloudflare បង្ហាញ។
6. បើក `wrangler.jsonc` ហើយរក `REPLACE_WITH_YOUR_HYPERDRIVE_ID` រួចជំនួសដោយ ID ពិត។ រក្សា binding name `HYPERDRIVE` ដដែល។ **កុំដាក់ connection string នៅក្នុង `wrangler.jsonc`។**

ត្រូវពិនិត្យឱ្យប្រាកដថា Hyperdrive ភ្ជាប់ Neon Branch/Database ត្រឹមត្រូវ ព្រោះកម្មវិធីនឹងបង្កើតតារាងដែលខ្វះក្នុង database នោះ។

## ជំហាន ៣ — កំណត់ Worker Secrets

Secrets ចាំបាច់៖

- `AUTH_SECRET`: អក្សរសម្ងាត់ចៃដន្យវែងយ៉ាងតិច 32 តួអក្សរ សម្រាប់ JWT។
- `ADMIN_EMAIL`: អ៊ីមែល Admin ដែលអ្នកនឹងប្រើចូលប្រព័ន្ធ។
- `ADMIN_PASSWORD`: ពាក្យសម្ងាត់ Admin ដំបូងយ៉ាងតិច 12 តួអក្សរ។

បង្កើតតម្លៃចៃដន្យនៅ PowerShell៖

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

ចម្លងតម្លៃដែលបង្ហាញ រួចកំណត់ជា Secret៖

```powershell
npx wrangler secret put AUTH_SECRET
```

ពេល CLI សួរ សូម paste តម្លៃ ហើយចុច Enter។ បន្ទាប់មកកំណត់ Admin៖

```powershell
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
```

បញ្ចូលតម្លៃនីមួយៗនៅពេល CLI សួរ។ កុំបញ្ចូលតម្លៃ secret ជាអាគុយម៉ង់ក្រោយ command ព្រោះអាចត្រូវបានរក្សាទុកក្នុង terminal history។

`GEMINI_API_KEY` ជា optional ហើយប្រើតែបើផ្នែក Gemini ត្រូវការ៖

```powershell
npx wrangler secret put GEMINI_API_KEY
```

## ជំហាន ៤ — Deploy Frontend និង Backend

ពិនិត្យថា `wrangler.jsonc` មាន Hyperdrive ID ពិត និង Secrets ទាំងបីខាងលើបានកំណត់រួច។ បន្ទាប់មករត់៖

```powershell
npm run deploy
```

វានឹង៖

1. Build React/Vite Frontend ទៅ `dist/`។
2. Bundle Backend API Worker ពី `src/worker.ts`។
3. Deploy Worker និង Frontend static assets រួមគ្នា។

នៅចុងបញ្ចប់ Wrangler នឹងបង្ហាញ URL ពិតរបស់អ្នក ដែលជាទូទៅមានទម្រង់ `https://reading-assessment-system.<your-subdomain>.workers.dev`។ សូមប្រើ URL ដែល Wrangler បង្ហាញជាក់ស្ដែង។

## ជំហាន ៥ — ផ្ទៀងផ្ទាត់ Neon Database

1. បើក URL របស់ Worker ដើម្បីពិនិត្យ Frontend។
2. បើក URL ដដែលបន្ថែម `/api/status` ឧទាហរណ៍ `https://YOUR-WORKER-URL/api/status`។
3. ពិនិត្យថា `isNeonConnected` និង `hasDatabaseUrl` មានតម្លៃ `true`។
4. ចូលដោយ Admin Email និង Password ដែលអ្នកបានកំណត់ជា Secret។
5. បង្កើតសិស្សសាកល្បងម្នាក់ រួចពិនិត្យ table `students` ក្នុង Neon SQL Editor ហើយលុបសិស្សសាកល្បងចេញក្រោយពេលបញ្ជាក់ថាទិន្នន័យត្រូវបានរក្សាទុក។

បើ API ត្រឡប់ `503` សូមមើល Logs៖

```powershell
npx wrangler tail reading-assessment-system
```

បន្ទាប់មកពិនិត្យ Hyperdrive ID, Neon database/branch និងសិទ្ធិ database role ព្រមទាំង Worker secrets។ នៅ Production API នឹងមិនបន្តដោយ Local/in-memory Database ទេ ប្រសិនបើ Neon មិនភ្ជាប់។

## Update ពេលក្រោយ

- ក្រោយកែ Source Code រត់ `npm run deploy` ម្តងទៀត។
- ក្រោយកែ Secret រត់ `npx wrangler secret put SECRET_NAME` ហើយបញ្ចូលតម្លៃថ្មី។
- `ADMIN_EMAIL` និង `ADMIN_PASSWORD` ត្រូវបានប្រើសម្រាប់បង្កើត Admin ដំបូងប៉ុណ្ណោះ។ បន្ទាប់ពីបង្កើតរួច ការកែគណនីតាម Admin UI នឹងត្រូវរក្សាទុកក្នុង Neon ហើយមិនត្រូវបានសរសេរជំនួសរាល់ពេល Worker ចាប់ផ្តើមឡើងវិញទេ។ ប្រសិនបើបាត់ពាក្យសម្ងាត់ ត្រូវប្រើដំណើរការ reset ពាក្យសម្ងាត់/Database ដែលបានកំណត់ជាក់លាក់ មិនមែនគ្រាន់តែប្តូរ Secret ហើយរំពឹងថា account ដែលមានស្រាប់នឹងត្រូវបានសរសេរជំនួសទេ។
- កុំប្តូរ Hyperdrive ទៅ Neon database/branch ផ្សេងដោយមិនប្រាកដថាចង់ប្រើទិន្នន័យនោះ។

## ឯកសារផ្លូវការ

- Cloudflare React + Vite: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Cloudflare Express on Workers: https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/
- Cloudflare Hyperdrive + Neon: https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/
