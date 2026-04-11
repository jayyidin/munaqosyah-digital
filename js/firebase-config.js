// --- Firebase Configuration ---

// Konfigurasi Default / Bawaan Aplikasi
let firebaseConfig = {
    apiKey: "API_KEY_ANDA", // Ganti dengan yang asli
    authDomain: "munaqosyah-sditalfityan.firebaseapp.com",
    projectId: "munaqosyah-sditalfityan",
    storageBucket: "munaqosyah-sditalfityan.appspot.com",
    messagingSenderId: "SENDER_ID_ANDA", // Ganti dengan yang asli
    appId: "APP_ID_ANDA" // Ganti dengan yang asli
};

// FITUR MULTI-TENANT: Timpa konfigurasi bawaan dengan konfigurasi kustom (sekolah lain)
const customConfigStr = localStorage.getItem('customFirebaseConfig');
if (customConfigStr) {
    try {
        const customConfig = JSON.parse(customConfigStr);
        if (customConfig && customConfig.projectId) {
            firebaseConfig = customConfig;
            console.log("Munaqosyah berjalan pada database kustom: " + firebaseConfig.projectId);
        }
    } catch (e) {
        console.error("Gagal memuat konfigurasi kustom Firebase:", e);
    }
}

// Inisialisasi Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Deklarasikan db secara global agar bisa dibaca file JS lain
window.db = firebase.firestore();
window.storage = firebase.storage();

// MENGAKTIFKAN PENYIMPANAN OFFLINE (Sangat penting agar data tidak hilang jika pengguna me-refresh halaman terlalu cepat)
try {
    window.db.enablePersistence({ synchronizeTabs: true }).catch(function(err) {
        console.warn('Firebase Persistence Error:', err.code);
    });
} catch(e) {}

let listSemester = [];
let currentSemester = null;

let pesertaPagination = { currentPage: 1, itemsPerPage: 10, totalItems: 0, totalPages: 0 };
let dashboardSiswaPagination = { currentPage: 1, itemsPerPage: 5, totalItems: 0, totalPages: 0 };
let dashboardSiswaPerhatianPagination = { currentPage: 1, itemsPerPage: 5, totalItems: 0, totalPages: 0 };
let laporanPagination = { currentPage: 1, itemsPerPage: 10, totalItems: 0, totalPages: 0 };
