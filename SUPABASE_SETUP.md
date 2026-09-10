# Supabase persistence

Konten RODI dan Wacawaci sekarang memakai Supabase agar tidak hilang saat Vercel mengganti serverless instance.

## 1. Buat project Supabase
Buat project baru di Supabase.

## 2. Buat tabel
Buka **SQL Editor**, lalu jalankan seluruh isi `supabase/schema.sql`.

## 3. Ambil credentials
Dari project Supabase, ambil:
- **Project URL**
- **service_role key** (jangan ditaruh di frontend/GitHub; hanya di environment Vercel)

## 4. Tambahkan Environment Variables di Vercel
Tambahkan untuk Production (dan Preview jika ingin mengetes Preview):

`SUPABASE_URL` = Project URL

`SUPABASE_SERVICE_ROLE_KEY` = service_role key

Lalu redeploy.

Setelah aktif:
- upload Wacawaci tersimpan permanen;
- soal RODI tersimpan permanen;
- refresh/keluar-masuk app tidak menghapus data;
- tombol hapus mentor tetap bekerja.

Jangan commit service_role key ke repository.
