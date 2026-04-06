/* DATA STORAGE - MUNAQOSYAH DIGITAL */

let statePenilaian = {}; // Stores assessment results
let currentState = { studentId: null, kategori: null, surahNoEdit: null, surahNamaEdit: null, selectedUjianDate: null }; // Current state for UI interactions
let lembarState = Array(15).fill(0);
let selectedPeserta = [];

// Data lokal (activityLog, listKategori, listKelas, dataPeserta) telah dihapus.
// Variabel-variabel ini sekarang akan diisi sepenuhnya oleh data dari Firebase
// saat aplikasi dimuat melalui fungsi loadState() di script.js.
let activityLog = [];

let daftarSegmen = ["Semua", "Hafalan Baru", "Murojaah"];
let segmenAktif = "Semua";
let segmenYangDiedit = "";

let listKategori = [];

let listKelas = [];

// --- MOCK DATA PESERTA ---
let dataPeserta = {};

// --- DATA SURAT & MATERI ---
// Data materi ujian (masterSurat dan dataSurat) adalah bagian dari konfigurasi aplikasi
// dan bukan data dinamis pengguna, sehingga tetap disimpan secara lokal.
let masterSurat = [
    { no: "M1", nama: "Tartil", ayat: "Kelancaran Membaca" }, { no: "M2", nama: "Fashohah", ayat: "Kejelasan Makhorijul Huruf" },
    { no: "M3", nama: "Ghorib", ayat: "Bacaan Asing / Khusus" }, { no: "M4", nama: "Tajwid", ayat: "Penerapan Hukum Bacaan" },
    { no: 1, nama: "Al-Fatihah", ayat: 7 }, { no: 67, nama: "Al-Mulk", ayat: 30 }, { no: 68, nama: "Al-Qalam", ayat: 52 },
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
    { no: 111, nama: "Al-Lahab", ayat: 5 }, { no: 112, nama: "Al-Ikhlas", ayat: 4 }, { no: 113, nama: "Al-Falaq", ayat: 5 }, { no: 114, nama: "An-Nas", ayat: 6 }
];

for (let i = 1; i <= 20; i++) masterSurat.push({ no: `H${i}`, nama: `Halaman ${i}`, ayat: "15 Baris" });

let dataSurat = {
    "Juz 30 (Amma)": {
        "Tahfidz 1": masterSurat.filter(s => typeof s.no === 'number' && s.no >= 99 && s.no <= 114).reverse(),
        "Tahfidz 2": masterSurat.filter(s => typeof s.no === 'number' && s.no >= 89 && s.no <= 98).reverse(),
        "Tahfidz 3": masterSurat.filter(s => typeof s.no === 'number' && s.no >= 78 && s.no <= 88).reverse()
    },
    "Juz 29 (Tabarak)": {
        "Tahfidz 1": masterSurat.filter(s => typeof s.no === 'number' && s.no >= 75 && s.no <= 77).reverse(),
        "Tahfidz 2": masterSurat.filter(s => typeof s.no === 'number' && s.no >= 67 && s.no <= 68).reverse()
    },
    "Tartil Dasar": {
        "Materi Pokok": masterSurat.filter(s => typeof s.no === 'string' && s.no.startsWith('M')),
        "Surat Pilihan": [masterSurat.find(s => s.no === 1), ...masterSurat.filter(s => typeof s.no === 'number' && s.no >= 87 && s.no <= 114).reverse()]
    },
    "Juz 1": {
        "Hal 1-10": masterSurat.filter(s => typeof s.no === 'string' && s.no.startsWith('H') && parseInt(s.no.substring(1)) <= 10),
        "Hal 11-20": masterSurat.filter(s => typeof s.no === 'string' && s.no.startsWith('H') && parseInt(s.no.substring(1)) > 10 && parseInt(s.no.substring(1)) <= 20)
    }
};
