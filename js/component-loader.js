const components = [
    { id: 'view-dashboard', url: 'views/dashboard.html' },
    { id: 'view-peserta', url: 'views/peserta.html' },
    { id: 'view-ujian', url: 'views/ujian.html' },
    { id: 'view-penilaian-detail', url: 'views/penilaian-detail.html' },
    { id: 'view-laporan', url: 'views/laporan.html' },
    { id: 'view-pengaturan', url: 'views/pengaturan.html' },
    { id: 'modals-container', url: 'views/modals.html' }
];

const scriptsToLoad = [
    "data.js",
    "js/firebase-config.js",
    "js/app-settings.js",
    "js/dialogs-notifications.js",
    "js/navigation.js",
    "js/sidebar-toggle.js",
    "js/shared-logic.js",
    "js/settings-page-logic.js", // Defines applySettings, must be loaded before scripts that use it.
    "js/laporan-page-logic.js",
    "js/new-dashboard-logic.js",
    "js/assessment.js", // Defines functions called by initializeAppUI
    "js/management-utility-functions.js", // Defines functions called by initializeAppUI
    "js/end-token-pendaftaran-penguji-management.js", // Might be used by other logic
    "js/data-persistence.js", // Harus dimuat sebelum initialization karena menyediakan loadSettings dan loadState
    "js/initialization.js" // Defines initializeAppUI and startApp
];

async function loadApplication() {
    // Deteksi apakah file HTML masih menyatu utuh atau sudah di-split
    const dashboardEl = document.getElementById('view-dashboard');
    const isUiSplit = !dashboardEl || dashboardEl.innerHTML.trim() === '';

    // 1. Muat semua komponen HTML secara paralel
    await Promise.all(components.map(async (comp) => {
        const element = document.getElementById(comp.id);

        // Khusus untuk modals-container, jangan ambil (fetch) file terpisah jika UI belum di-split
        if (comp.id === 'modals-container' && !isUiSplit) {
            return;
        }

        // Hanya muat jika elemen tersebut kosong (memungkinkan fallback ke hardcoded HTML)
        if (element && element.innerHTML.trim() === '') {
            try {
                const response = await fetch(comp.url);
                if (response.ok) {
                    element.innerHTML = await response.text();
                } else {
                    console.warn(`[INFO] File ${comp.url} tidak ditemukan (404). Menggunakan bawaan index.html.`);
                }
            } catch (e) {
                console.warn(`[INFO] Gagal mengambil ${comp.url}.`);
            }
        }
    }));

    // 2. Unduh semua script secara paralel, tapi eksekusi berurutan
    const scriptPromises = scriptsToLoad.map(src => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // Menjamin eksekusi berurutan sesuai urutan append ke DOM
            script.onload = resolve;
            script.onerror = () => {
                console.warn(`[WARNING] Gagal memuat script: ${src}`);
                resolve(); // Jangan reject, agar script lain tetap dimuat
            };
            document.body.appendChild(script);
        });
    });
    
    await Promise.all(scriptPromises);

    // Memicu DOMContentLoaded secara manual agar script yang didefer/di-load dinamis
    // dan bergantung pada DOMContentLoaded tetap dapat tereksekusi.
    window.document.dispatchEvent(new Event('DOMContentLoaded', {
        bubbles: true,
        cancelable: true
    }));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadApplication);
} else {
    loadApplication();
}