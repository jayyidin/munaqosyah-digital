/* DATA STORAGE - MUNAQOSYAH DIGITAL */

let statePenilaian = {}; // Stores assessment results
let currentState = { studentId: null, kategori: null, surahNoEdit: null, surahNamaEdit: null, selectedUjianDate: null }; // Current state for UI interactions
let lembarState = Array(30).fill(0);
let selectedPeserta = [];

// Data lokal (activityLog, listKategori, listKelas, dataPeserta) telah dihapus.
// Variabel-variabel ini sekarang akan diisi sepenuhnya oleh data dari Firebase
// saat aplikasi dimuat melalui fungsi loadState() di script.js.
let activityLog = [];

let daftarSegmen = ["Semua", "Hafalan Baru", "Murojaah"];
let segmenAktif = "Semua";
let segmenYangDiedit = "";
 
let listKategori = [
    { nama: "Juz 30 (Amma)", tipe: "standar", isSystem: false },
    { nama: "Juz 29 (Tabarak)", tipe: "standar", isSystem: false },
    { nama: "Juz 28", tipe: "standar", isSystem: false },
    { nama: "Juz 27", tipe: "standar", isSystem: false },
    { nama: "Tartil Dasar", tipe: "tartil", isSystem: false },
    { nama: "Juz 1", tipe: "lembar", isSystem: false },
    { nama: "Juz 2", tipe: "lembar", isSystem: false }
];
 
let listKelas = ["7 A", "8 B"];
let listPembimbing = [];

// --- MOCK DATA PESERTA ---
let dataPeserta = {
    "Juz 30 (Amma)": [
        {
            id: "J30-2604-001",
            inisial: "BS",
            warna: "bg-blue-100 text-blue-700",
            nama: "Budi Santoso",
            kelas: "7 A",
            pembimbing: "Ust. Ahmad",
            tanggalUjian: "2026-04-10"
        }
    ],
    "Juz 29 (Tabarak)": [
        {
            id: "J29-2604-001",
            inisial: "SA",
            warna: "bg-teal-100 text-teal-700",
            nama: "Siti Aminah",
            kelas: "8 B",
            pembimbing: "Usth. Fatimah",
            tanggalUjian: "2026-04-11"
        }
    ],
    "Tartil Dasar": [
        { id: "TD-2604-001", inisial: "JS", warna: "bg-purple-100 text-purple-700", nama: "Joko Susilo", kelas: "7 A", pembimbing: "Ust. Budi", tanggalUjian: "2026-04-12" }
    ]
};

// --- DATA SURAT & MATERI ---
// Data materi ujian (masterSurat dan dataSurat) adalah bagian dari konfigurasi aplikasi
// dan bukan data dinamis pengguna, sehingga tetap disimpan secara lokal.
let masterSurat = [
    { no: "M1", nama: "Tartil", ayat: "Kelancaran Membaca" }, { no: "M2", nama: "Fashohah", ayat: "Kejelasan Makhorijul Huruf" },
    { no: "M3", nama: "Ghorib", ayat: "Bacaan Asing / Khusus" }, { no: "M4", nama: "Tajwid", ayat: "Penerapan Hukum Bacaan" },
    { no: 1, nama: "Al-Fatihah", ayat: 7 }, { no: 67, nama: "Al-Mulk", ayat: 30 }, { no: 68, nama: "Al-Qalam", ayat: 52 },
    { no: 58, nama: "Al-Mujadilah", ayat: 22 }, { no: 59, nama: "Al-Hashr", ayat: 24 },
    { no: 60, nama: "Al-Mumtahanah", ayat: 13 }, { no: 61, nama: "As-Saff", ayat: 14 },
    { no: 62, nama: "Al-Jumu'ah", ayat: 11 }, { no: 63, nama: "Al-Munafiqun", ayat: 11 }, { no: 64, nama: "At-Taghabun", ayat: 18 }, { no: 65, nama: "At-Talaq", ayat: 12 }, { no: 66, nama: "At-Tahrim", ayat: 12 },
    { no: 69, nama: "Al-Haqqah", ayat: 52 }, { no: 70, nama: "Al-Ma'arij", ayat: 44 }, { no: 71, nama: "Nuh", ayat: 28 },
    { no: 72, nama: "Al-Jinn", ayat: 28 }, { no: 73, nama: "Al-Muzzammil", ayat: 20 }, { no: 74, nama: "Al-Muddaththir", ayat: 56 },
    { no: 75, nama: "Al-Qiyamah", ayat: 40 }, { no: 76, nama: "Al-Insan", ayat: 31 }, { no: 77, nama: "Al-Mursalat", ayat: 50 },
    { no: 78, nama: "An-Naba", ayat: 40 }, { no: 79, nama: "An-Nazi'at", ayat: 46 }, { no: 80, nama: "'Abasa", ayat: 42 },
    { no: 81, nama: "At-Takwir", ayat: 29 }, { no: 82, nama: "Al-Infitar", ayat: 19 }, { no: 83, nama: "Al-Mutaffifin", ayat: 36 },
    { no: 84, nama: "Al-Inshiqaq", ayat: 25 }, { no: 85, nama: "Al-Buruj", ayat: 22 }, { no: 86, nama: "At-Tariq", ayat: 17 },
    { no: 87, nama: "Al-A'la", ayat: 19 }, { no: 88, nama: "Al-Ghashiyah", ayat: 26 }, { no: 89, nama: "Al-Fajr", ayat: 30 },
    { no: 90, nama: "Al-Balad", ayat: 20 }, { no: 91, nama: "Ash-Shams", ayat: 15 }, { no: 92, nama: "Al-Lail", ayat: 21 },
    { no: 93, nama: "Ad-Duha", ayat: 11 }, { no: 94, nama: "Ash-Sharh", ayat: 8 }, { no: 95, nama: "At-Tin", ayat: 8 },
    { no: 96, nama: "Al-'Alaq", ayat: 19 }, { no: 97, nama: "Al-Qadr", ayat: 5 }, { no: 98, nama: "Al-Bayyinah", ayat: 8 },
    { no: 99, nama: "Az-Zalzalah", ayat: 8 }, { no: 100, nama: "Al-'Adiyat", ayat: 11 }, { no: 101, nama: "Al-Qari'ah", ayat: 11 },
    { no: 102, nama: "At-Takasur", ayat: 8 }, { no: 103, nama: "Al-'Asr", ayat: 3 }, { no: 104, nama: "Al-Humazah", ayat: 9 },
    { no: 105, nama: "Al-Fil", ayat: 5 }, { no: 106, nama: "Quraysh", ayat: 4 }, { no: 107, nama: "Al-Ma'un", ayat: 7 },
    { no: 108, nama: "Al-Kausar", ayat: 3 }, { no: 109, nama: "Al-Kafirun", ayat: 6 }, { no: 110, nama: "An-Nasr", ayat: 3 },
    { no: 111, nama: "Al-Lahab", ayat: 5 }, { no: 112, nama: "Al-Ikhlas", ayat: 4 }, { no: 113, nama: "Al-Falaq", ayat: 5 }, { no: 114, nama: "An-Nas", ayat: 6 },
    { no: 51, nama: "Adh-Dhariyat", ayat: 60 }, { no: 52, nama: "At-Tur", ayat: 49 }, { no: 53, nama: "An-Najm", ayat: 62 }, { no: 54, nama: "Al-Qamar", ayat: 55 }, { no: 55, nama: "Ar-Rahman", ayat: 78 }, { no: 56, nama: "Al-Waqi'ah", ayat: 96 }, { no: 57, nama: "Al-Hadid", ayat: 29 }
];

masterSurat.push(
    { no: "L1", nama: "Lembar 1", ayat: "Al-Fatihah 1 - Al-Baqarah 5" },
    { no: "L2", nama: "Lembar 2", ayat: "Al-Baqarah 6 - 24" },
    { no: "L3", nama: "Lembar 3", ayat: "Al-Baqarah 25 - 37" },
    { no: "L4", nama: "Lembar 4", ayat: "Al-Baqarah 38 - 57" },
    { no: "L5", nama: "Lembar 5", ayat: "Al-Baqarah 58 - 69" },
    { no: "L6", nama: "Lembar 6", ayat: "Al-Baqarah 70 - 83" },
    { no: "L7", nama: "Lembar 7", ayat: "Al-Baqarah 84 - 93" },
    { no: "L8", nama: "Lembar 8", ayat: "Al-Baqarah 94 - 105" },
    { no: "L9", nama: "Lembar 9", ayat: "Al-Baqarah 106 - 119" },
    { no: "L10", nama: "Lembar 10", ayat: "Al-Baqarah 120 - 134" },
    { no: "L11", nama: "Lembar 11", ayat: "Al-Baqarah 135 - 145" },
    { no: "L12", nama: "Lembar 12", ayat: "Al-Baqarah 146 - 163" },
    { no: "L13", nama: "Lembar 13", ayat: "Al-Baqarah 164 - 176" },
    { no: "L14", nama: "Lembar 14", ayat: "Al-Baqarah 177 - 186" },
    { no: "L15", nama: "Lembar 15", ayat: "Al-Baqarah 187 - 196" },
    { no: "L16", nama: "Lembar 16", ayat: "Al-Baqarah 197 - 210" },
    { no: "L17", nama: "Lembar 17", ayat: "Al-Baqarah 211 - 219" },
    { no: "L18", nama: "Lembar 18", ayat: "Al-Baqarah 220 - 230" },
    { no: "L19", nama: "Lembar 19", ayat: "Al-Baqarah 231 - 237" },
    { no: "L20", nama: "Lembar 20", ayat: "Al-Baqarah 238 - 248" },
    { no: "L21", nama: "Lembar 21", ayat: "Al-Baqarah 249 - 256" },
    { no: "L22", nama: "Lembar 22", ayat: "Al-Baqarah 257 - 264" },
    { no: "L23", nama: "Lembar 23", ayat: "Al-Baqarah 265 - 274" },
    { no: "L24", nama: "Lembar 24", ayat: "Al-Baqarah 275 - 281" },
    { no: "L25", nama: "Lembar 25", ayat: "Al-Baqarah 282 - Ali 'Imran 9" }
);

let dataSurat = {
    "Juz 30 (Amma)": [masterSurat.find(s => s.no === 1), ...masterSurat.filter(s => typeof s.no === 'number' && s.no >= 78 && s.no <= 114).reverse()].filter(Boolean),
    "Juz 29 (Tabarak)": masterSurat.filter(s => typeof s.no === 'number' && s.no >= 67 && s.no <= 77).reverse().filter(Boolean),
    "Juz 28": masterSurat.filter(s => typeof s.no === 'number' && s.no >= 58 && s.no <= 66).reverse().filter(Boolean),
    "Juz 27": masterSurat.filter(s => typeof s.no === 'number' && s.no >= 51 && s.no <= 57).reverse().filter(Boolean),
    "Tartil Dasar": [...masterSurat.filter(s => typeof s.no === 'string' && s.no.startsWith('M')), masterSurat.find(s => s.no === 1), ...masterSurat.filter(s => typeof s.no === 'number' && s.no >= 87 && s.no <= 114).reverse()].filter(Boolean),
    "Juz 1": masterSurat.filter(s => typeof s.no === 'string' && s.no.startsWith('L') && parseInt(s.no.substring(1)) <= 11).filter(Boolean),
    "Juz 2": masterSurat.filter(s => typeof s.no === 'string' && s.no.startsWith('L') && parseInt(s.no.substring(1)) >= 12 && parseInt(s.no.substring(1)) <= 21).filter(Boolean),
    "Al-Baqarah (Utuh)": masterSurat.filter(s => typeof s.no === 'string' && s.no.startsWith('L') && parseInt(s.no.substring(1)) <= 25).filter(Boolean)
};
