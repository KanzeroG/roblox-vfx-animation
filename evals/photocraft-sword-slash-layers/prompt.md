---
tags: [skill-creator]
max_turns: 60
timeout_seconds: 1800
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash, ToolSearch, mcp__photocraft__doc_new, mcp__photocraft__command_run, mcp__photocraft__command_batch, mcp__photocraft__command_list, mcp__photocraft__doc_inspect, mcp__photocraft__render_preview, mcp__photocraft__doc_render_preview, mcp__photocraft__doc_save, mcp__photocraft__doc_open, mcp__photocraft__doc_place, mcp__photocraft__doc_close]
---

Gunakan koneksi MCP PhotoCraft (headless) untuk menggambar aset VFX "Sword Slash" untuk game Roblox-ku. Jangan gunakan generator gambar raster datar—gambar setiap bentuk secara prosedural menggunakan daftar titik koordinat (polygon points) dan filter di PhotoCraft.

Ikuti aturan ketat ini:

1. SPESIFIKASI KANVAS & FLIPBOOK:
   - Buat spritesheet 4x4 grid (total 16 frame).
   - Ukuran per frame: 256x256 px (total kanvas 1024x1024 px), background transparan (gunakan background gelap sementara hanya saat kamu mengambil screenshot untuk mengecek hasil).
   - Siklus animasi 16 frame:
     * Frame 1-4 (Grow In): Slash baru muncul, busur masih pendek dan tajam.
     * Frame 5-8 (Peak/Live): Busur slash mencapai panjang dan ketebalan maksimal.
     * Frame 9-16 (Break Apart): Bagian ekor mulai pecah menjadi sobekan-sobekan tipis mengikuti arah ayunan hingga menghilang.

2. ATURAN GEOMETRI & BENTUK (ANTI-PISANG / ANTI-SIMETRIS):
   - DILARANG membuat bentuk bulan sabit yang simetris sempurna (jangan terlihat seperti pisang).
   - Buat "Thick Head" (bagian depan ayunan tebal) dan "Long Thin Tail" (ekor belakang memanjang dan sangat meruncing).
   - Tapered Ends: Kedua ujung di setiap frame WAJIB meruncing tajam ke satu titik (jangan pernah ada ujung yang terpotong rata/flat).
   - Torn Edges: Buat tepian luar yang robek/bergerigi tajam mengikuti arah aliran ayunan (tear along the flow), BUKAN potongan kotak-kotak (no square steps).
   - Inner Rips: Tambahkan celah/robekan tipis di bagian dalam body slash untuk memberi kesan kecepatan tinggi.

3. PEMISAHAN 4 WHITE LAYERS (WAJIB WARNA PUTIH #FFFFFF):
   Gambar seluruh bentuk hanya dengan warna PUTIH MURNI (#FFFFFF) dengan variasi opacity agar nanti bisa kuwarnai lewat script Luau di Roblox. Pisahkan menjadi 4 layer/file output berbeda:
   - Layer 1 (`slash_hot_core.png`): Inti terdalam paling terang, bentuk paling ramping dan tajam di area tengah kepala slash (Opacity 100%).
   - Layer 2 (`slash_body.png`): Isi utama slash dengan torn edges dan inner rips (Opacity 75-85%).
   - Layer 3 (`slash_rim.png`): Garis tepi luar yang tajam di sepanjang lengkungan depan slash (Opacity 95%).
   - Layer 4 (`slash_glow.png`): Duplikat dari body+core yang diberi Gaussian Blur lembut untuk pendaran cahaya (Opacity 50-60%).

4. QUALITY CONTROL & SAFE MARGIN (WAJIB DICEK):
   - Aturan 4-Pixel Margin: Pastikan TIDAK ADA satupun piksel (termasuk efek blur dari layer Glow) yang menyentuh batas pinggir tiap cell frame 256x256. Wajib ada jarak kosong minimal 4 piksel dari tepi setiap frame agar tidak muncul garis kotak (box artifact) di Roblox.
   - Setelah menggambar, ambil screenshot/render preview dari ke-4 layer, periksa sendiri apakah bentuknya sudah organik (tidak kaku seperti grafik N64 dan tidak melanggar batas 4px). Jika masih kaku atau menabrak tepi, perbaiki koordinatnya dan gambar ulang otomatis.
   - Export hasil akhirnya sebagai 4 file PNG transparan (1024x1024, 4x4 flipbook) di folder `./vfx_output/sword_slash/`.
