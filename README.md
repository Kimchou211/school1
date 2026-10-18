# ប្រព័ន្ធតាមដានការអានរបស់សិស្ស (Reading Assessment System)

ប្រព័ន្ធ Web Application ពេញលេញសម្រាប់លោកគ្រូ អ្នកគ្រូ ក្នុងការតាមដាន និងវាស់ស្ទង់សមត្ថភាពអានឮៗរបស់សិស្ស គាំទ្រការសម្គាល់ពាក្យខុស រំលង ចេញរបាយការណ៍វិភាគពាក្យ ចំណាត់ថ្នាក់សមត្ថភាព និងផ្ទាំង Projector View សម្រាប់បញ្ចាំងក្តារខៀន។

---

## ១. បច្ចេកវិទ្យាប្រើប្រាស់ (Tech Stack)

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Framer Motion (Animation)
- **Backend**: Express + Node.js (API Routes ជាមួយ Zod Validation)
- **Database**: **Neon (neon.tech) PostgreSQL** ជាមួយ Drizzle ORM / pg pool
- **Authentication**: JWT Session Token + bcryptjs Password Hashing (ទិន្នន័យគ្រូម្នាក់ៗឯកជន)
- **Khmer Typography**: Font **Kantumruy Pro** ជាមួយ `line-height: 1.8+` មិនដាច់ជើងអក្សរ
- **Exporting**: Excel (.xlsx) តាមរយៈ `xlsx` (SheetJS) និង High-Fidelity PDF តាម Print Preview

---

## ២. របៀបតំឡើង និងភ្ជាប់ជាមួយ Neon PostgreSQL (neon.tech)

### ជំហានទី ១៖ បង្កើត Database លើ Neon
1. ចូលទៅកាន់គេហទំព័រ [https://neon.tech](https://neon.tech) ហើយចុះឈ្មោះគណនី (ឥតគិតថ្លៃ)
2. ចុចបង្កើត **Project ថ្មី** (ជ្រើសរើស Region ដែលជិតកម្ពុជាបំផុត ឧ. `ap-southeast-1` Singapore)
3. ពេលបង្កើតរួច ចម្លងយក **Connection string** (PostgreSQL URI) ដែលមានទម្រង់៖
   ```env
   postgresql://username:password@ep-cool-flower-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

### ជំហានទី ២៖ កំណត់បរិស្ថាន (Environment Variables)
បង្កើត ឬកែសម្រួលឯកសារ `.env` នៅ root directory៖

```env
# Neon PostgreSQL Connection String
DATABASE_URL="postgresql://username:password@ep-cool-flower-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# Auth Secret Key
AUTH_SECRET="reading-assessment-khmer-secret-key-2026"
```

**សំខាន់៖** ត្រូវបង្កើតឯកសារ `.env` នៅ root folder (កម្រិតដូច `package.json`) ហើយដាក់ `DATABASE_URL` ពិតពី Neon។ បើ `DATABASE_URL` ទទេ ឬ connection ខុស ប្រព័ន្ធនឹងបង្ហាញ `Local DB` ហើយទិន្នន័យថ្មីនឹងមិនទៅ Neon ទេ។ Local fallback នេះជាទិន្នន័យក្នុង memory ហើយអាចបាត់នៅពេល server restart។ ការកែនេះធានាថា `.env` ត្រូវបាន load មុន DatabaseManager ចាប់ផ្តើម និង server រង់ចាំលទ្ធផល connection មុនទទួល requests។

### ជំហានទី ៣៖ ដំឡើង Packages និងដំណើរការ
```bash
# ដំឡើង dependencies
npm install

# ដំណើរការ Development Server
npm run dev
```

បើក Browser ចូលទៅកាន់ `http://localhost:3000`

---

## ៣. គណនីគំរូសម្រាប់សាកល្បងភ្លាមៗ (Local Development ប៉ុណ្ណោះ)

- **អ៊ីមែល (Email)**: `teacher@school.edu.kh`
- **ពាក្យសម្ងាត់ (Password)**: `123456`

*(គណនីខាងលើសម្រាប់ Local Development ប៉ុណ្ណោះ។ Production មិនបង្កើត Demo Accounts ទេ។ គ្រូអាចចុះឈ្មោះគណនីថ្មី និងរង់ចាំ Admin អនុម័ត។)*

---

## ៤. មុខងារចម្បងៗក្នុងប្រព័ន្ធ

1. **ទំព័រដើម (Overview)**៖
   - ស្ថិតិសង្ខេបចំនួនសិស្ស ចំនួនអត្ថបទ ចំនួនវគ្គអាន និងពិន្ទុមធ្យម
   - ប៊ូតុងរហ័ស "ចាប់ផ្ដើមវគ្គអានថ្មី" និងបញ្ជីវគ្គអានចុងក្រោយ
2. **បញ្ជីសិស្ស (Student Management)**៖
   - តារាងមាន៖ លេខរៀង, ថ្នាក់, ឈ្មោះ, អាយុ, ភេទ
   - បន្ថែម, កែសម្រួល, លុប (មានប្រអប់បញ្ជាក់ Confirmation Dialog)
   - ស្វែងរកតាមឈ្មោះ និង filter តាមថ្នាក់ / ភេទ
   - Export ជា Excel (.xlsx) និង PDF (អក្សរខ្មែរស្អាតត្រឹមត្រូវ)
3. **បណ្ណាល័យអត្ថបទ (Passage Library)**៖
   - បញ្ចូលអត្ថបទដោយដៃផ្ទាល់ (វាយ ឬ Paste) ដើម្បីធានាអក្ខរាវិរុទ្ធ
   - បង្ហាញចំនួនពាក្យ, កម្រិត (ស្រួល / មធ្យម / ពិបាក), កំណត់ចំណាំ
   - មើលអត្ថបទជាមុន (Preview) និងចាប់ផ្ដើមអានភ្លាមៗ
4. **វគ្គអាន (Reading Session - មុខងារស្នូល)**៖
   - **គ្មានកំណត់ពេលវេលា (No Timer)**៖ សិស្សអានឮៗតាមសម្រួល
   - **Intl.Segmenter ('km')**៖ បំបែកពាក្យខ្មែរស្វ័យប្រវត្តិច្បាស់លាស់
   - **ជំហានកែពាក្យ (Pre-session Review)**៖ គ្រូអាចបញ្ចូលពាក្យ (Merge) ឬកាត់ពាក្យ (Split) បានមុនពេលចាប់ផ្ដើម
   - **ការចុចសម្គាល់ពាក្យ**៖
     - ចុច ១ ដង = ពណ៌ក្រហម (អានខុស)
     - ចុច ២ ដង = ពណ៌ទឹកក្រូច (រំលងពាក្យ)
     - ចុច ៣ ដង = ត្រឡប់មកធម្មតា
   - **Undo & Redo**៖ ដកថយការចុចច្រឡំភ្លាមៗ
   - **Projector / Display View**៖ បញ្ចាំងអត្ថបទអក្សរធំលើក្តារខៀន ដោយ **មិនបង្ហាញពណ៌ក្រហម/ទឹកក្រូច** ឡើយ ដើម្បីកុំឲ្យសិស្សបាត់បង់ទំនុកចិត្ត
   - **Sync តាម BroadcastChannel API**៖ Sync ទំហំអក្សរ និងស្ថានភាពរវាង ២ ផ្ទាំង
   - **ការដាក់ពិន្ទុដោយដៃ**៖ គ្រូជាអ្នកកំណត់ពិន្ទុ និងសរសេរមតិដោយដៃផ្ទាល់ រួចមានចលនា Confetti អបអរពេលរក្សាទុក
5. **ប្រវត្តិការអាន (Reading History)**៖
   - មើលឡើងវិញនូវអត្ថបទដែលមានពណ៌ក្រហម/ទឹកក្រូចតាមការចុចជាក់ស្ដែង
   - Export ជា Excel និង PDF
6. **ការវាស់ស្ទង់សមត្ថភាពសិស្ស (Rankings & Podium)**៖
   - គណនាចំណាត់ថ្នាក់តាមពិន្ទុដែលគ្រូបានផ្ដល់
   - បង្ហាញ Top 3 លើ Podium មាស ប្រាក់ សំរិទ្ធ ស្អាតប្លែកភ្នែក
   - ក្រាហ្វវឌ្ឍនភាពពិន្ទុរបស់សិស្សតាមពេលវេលា
7. **របាយការណ៍វិភាគពាក្យ (Reports)**៖
   - តម្រៀបពាក្យដែលសិស្សទូទាំងថ្នាក់អានខុស ឬរំលងពីច្រើនទៅតិច ជួយឲ្យគ្រូដឹងថាត្រូវបង្រៀនពាក្យអ្វីបន្ថែម

---

## ៥. របៀប Deploy ទៅកាន់ Production (ឧ. Vercel ឬ Render)

### Option A: Deploy ទៅកាន់ Render / Railway / Cloud Run (Fullstack Node.js)
1. រុញកូដទៅកាន់ GitHub Repository របស់អ្នក
2. បង្កើត Web Service ថ្មីលើ [Render](https://render.com)
3. កំណត់ Build Command:
   ```bash
   npm install && npm run build
   ```
4. កំណត់ Start Command:
   ```bash
   npm run start
   ```
5. បញ្ចូល Environment Variables ក្នុង Dashboard៖
   - `DATABASE_URL`: Connection string ពី Neon
   - `AUTH_SECRET`: កូនសោសម្ងាត់សម្រាប់ JWT
   - `NODE_ENV`: `production`

---

## ៦. រចនាសម្ព័ន្ធ Database Schema (PostgreSQL)

ឯកសារ DDL ពេញលេញមាននៅក្នុង `src/db/schema.sql` រួមមានតារាង៖
- `teachers` (គណនីគ្រូ)
- `students` (ព័ត៌មានសិស្ស)
- `passages` (បណ្ណាល័យអត្ថបទ)
- `reading_sessions` (វគ្គអាន ពិន្ទុ មតិ)
- `word_marks` (ការសម្គាល់ពាក្យខុស/រំលង)
- Indexes៖ `word_marks(word)`, `reading_sessions(student_id)`, `students(teacher_id, class_name)`


## ៧. Deploy Frontend + Backend ទៅ Cloudflare Workers និង Neon

កម្មវិធីមាន Cloudflare Worker entry point (`src/worker.ts`), Hyperdrive binding (`wrangler.jsonc`) និង deploy command សម្រាប់ Frontend + Backend ក្នុង deployment តែមួយ។ Neon PostgreSQL នៅតែជាទីតាំងរក្សាទុកទិន្នន័យ។ មិនចាំបាច់មាន GitHub Repository ទេ។

សូមអនុវត្តតាមឯកសារ **[DEPLOY-CLOUDFLARE-KH.md](./DEPLOY-CLOUDFLARE-KH.md)** ជាជំហានៗ។ មុន Deploy ត្រូវបញ្ចូល Hyperdrive ID ពិត និងកំណត់ `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` ជា Cloudflare Worker Secrets។ កុំ upload `.env` ទៅ Cloudflare។

Production មិនបន្ថែមគណនី Demo ដែលប្រើ `123456` ទេ ហើយ API នឹងមិនប្រើ in-memory fallback ប្រសិនបើ Neon មិនភ្ជាប់។
