/* MAIN LOGIC - MUNAQOSYAH DIGITAL */

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyDxGG3pzQU_5IAhC-ozTnjayTdzVFaYZqY",
    authDomain: "munaqosyah-sditalfityan.firebaseapp.com",
    databaseURL: "https://munaqosyah-sditalfityan-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "munaqosyah-sditalfityan",
    storageBucket: "munaqosyah-sditalfityan.firebasestorage.app",
    messagingSenderId: "729297832237",
    appId: "1:729297832237:web:0c992e31e330ab7813eba4"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
const storage = firebase.storage();

let ujianPagination = { currentPage: 1, itemsPerPage: 8, totalItems: 0, totalPages: 0 };
let pesertaPagination = { currentPage: 1, itemsPerPage: 10, totalItems: 0, totalPages: 0 };
let dashboardSiswaPagination = { currentPage: 1, itemsPerPage: 5, totalItems: 0, totalPages: 0 };
let dashboardSiswaPerhatianPagination = { currentPage: 1, itemsPerPage: 5, totalItems: 0, totalPages: 0 };
let laporanPagination = { currentPage: 1, itemsPerPage: 10, totalItems: 0, totalPages: 0 };

// --- App Settings ---
let appSettings = {
    appName: "",
    schoolName: "",
    theme: "light",
    logoUrl: null,
    registrationToken: null,
    examDates: [], // Array of exam dates
    kkm: 7
};

let progressDonutChart, avgBarChart; // For Chart.js instances

let currentUser = { name: 'Pengguna', role: 'Tidak Dikenal' };
let dashboardStats = {}; // To cache dashboard calculations
let isAppInitialized = false; // Penanda agar UI hanya diinisialisasi sekali

// --- Data Persistence ---

function seedInitialData() {
    console.log("Melakukan seeding data awal untuk struktur aplikasi.");
    const initialAppState = {
        statePenilaian: {},
        dataPeserta: {},
        listKategori: [],
        activityLog: [],
        listKelas: []
    };

    db.ref('appState').set(initialAppState).then(() => {
        console.log("Seeding data awal berhasil. Aplikasi sekarang akan menggunakan data dari Firebase.");
    }).catch(error => {
        console.error("Gagal melakukan seeding data awal:", error);
        openAlert("PENTING: Gagal membuat struktur data awal di Firebase. Periksa aturan keamanan database Anda.");
    });
}

function loadState() {
    const loader = document.getElementById('loading-overlay');
    if (loader && !isAppInitialized) {
        loader.classList.remove('opacity-0', 'pointer-events-none');
        loader.classList.add('opacity-100');
    }

    db.ref('appState').on('value', (snapshot) => {
        if (snapshot.exists()) {
            const appState = snapshot.val();
            statePenilaian = appState.statePenilaian || {};
            dataPeserta = appState.dataPeserta || {};
            listKategori = appState.listKategori || [];
            activityLog = appState.activityLog || [];
            listKelas = appState.listKelas || [];
            console.log("Data aplikasi berhasil dimuat dari Firebase.");
        } else {
            console.log("Tidak ada data 'appState' di Firebase.");
            if (currentUser.role === 'Admin Utama') {
                seedInitialData();
            } else {
                console.warn("Bukan Admin Utama, seeding data tidak dilakukan. Aplikasi akan menggunakan state kosong. Beberapa fitur mungkin tidak berfungsi sampai Admin login pertama kali.");
                // Initialize with empty data to prevent errors on first load for non-admins
                statePenilaian = {}, dataPeserta = {}, listKategori = [], activityLog = [], listKelas = [];
            }
        }

        if (!isAppInitialized) {
            initializeAppUI();
            isAppInitialized = true;
            if (loader) {
                loader.classList.remove('opacity-100');
                loader.classList.add('opacity-0');
                loader.classList.add('pointer-events-none');
                setTimeout(() => {
                    loader.classList.replace('bg-surface', 'bg-white/50');
                    loader.classList.add('backdrop-blur-sm');
                }, 300);
            }
        } else {
            // Perbarui data di layar secara real-time tanpa me-reset UI
            const activeView = getCurrentVisibleView();
            if (activeView === 'dashboard') renderDashboard();
            else if (activeView === 'peserta') renderTablePeserta();
            else if (activeView === 'ujian') renderPesertaUjian();
            else if (activeView === 'laporan') renderLaporanPage();
            else if (activeView === 'penilaian-detail') renderDaftarSuratDetail();
        }
    }, (error) => {
        console.error("Gagal memuat state dari Firebase:", error);
        openAlert("Gagal memuat data dari server. Silakan muat ulang halaman.");
        if (loader && !isAppInitialized) {
            loader.classList.remove('opacity-100');
            loader.classList.add('opacity-0');
            loader.classList.add('pointer-events-none');
        }
    });
}

function saveSettings() {
    localStorage.setItem('munaqosyahSettings', JSON.stringify(appSettings));
    db.ref('appSettings').update(appSettings).catch(error => {
        console.error("Gagal menyimpan pengaturan:", error);
        openAlert("Gagal menyimpan pengaturan. Error: " + error.message);
    });
}
function loadSettings(callback) {
    db.ref('appSettings').once('value', (snapshot) => {
        if (snapshot.exists()) {
            const loaded = snapshot.val();
            if (loaded.examStartDate && !loaded.examDates) {
                loaded.examDates = [loaded.examStartDate];
                delete loaded.examStartDate;
            }
            appSettings = { ...appSettings, ...loaded };
            localStorage.setItem('munaqosyahSettings', JSON.stringify(appSettings));
        } else {
            // If no settings, save the default ones
            saveSettings();
        }
        if (callback) callback();
    });
}


// --- Dialogs & Notifications ---
let promptCallback = null, confirmCallback = null;
function openPrompt(t, d, c) { document.getElementById('prompt-title').innerText = t; document.getElementById('prompt-input').value = d; promptCallback = c; document.getElementById('modal-prompt').classList.replace('hidden', 'flex'); setTimeout(() => document.getElementById('prompt-input').focus(), 100); }
function closePrompt() { document.getElementById('modal-prompt').classList.replace('flex', 'hidden'); promptCallback = null; }
function submitPrompt() { if (promptCallback) promptCallback(document.getElementById('prompt-input').value); closePrompt(); }
function openConfirm(m, c) { document.getElementById('confirm-message').innerText = m; confirmCallback = c; document.getElementById('modal-confirm').classList.replace('hidden', 'flex'); }
function closeConfirm() { document.getElementById('modal-confirm').classList.replace('flex', 'hidden'); confirmCallback = null; }
function submitConfirm() { if (confirmCallback) confirmCallback(true); closeConfirm(); }
function openAlert(m) { document.getElementById('alert-message').innerText = m; document.getElementById('modal-alert').classList.replace('hidden', 'flex'); }
function closeAlert() { document.getElementById('modal-alert').classList.replace('flex', 'hidden'); }

function applySettings() {
    document.getElementById('app-name-sidebar').innerHTML = appSettings.appName;
    const schoolNameSidebar = document.getElementById('school-name-sidebar');
    if (schoolNameSidebar) schoolNameSidebar.innerText = appSettings.schoolName || '';

    let title = appSettings.appName.replace(/<br\s*\/?>/gi, ' ');
    if (appSettings.schoolName) title += ` - ${appSettings.schoolName}`;
    document.title = title;

    const logoUrl = appSettings.logoUrl;
    const sidebarLogoImg = document.getElementById('app-logo-sidebar');
    const sidebarLogoIcon = document.getElementById('app-logo-icon-sidebar');
    const loaderLogoImg = document.getElementById('app-logo-loader');
    const loaderLogoIcon = document.getElementById('app-logo-icon-loader');
    const loaderAppName = document.getElementById('app-name-loader');
    const loaderSchoolName = document.getElementById('school-name-loader');

    if (loaderAppName) loaderAppName.innerHTML = appSettings.appName;
    if (loaderSchoolName) loaderSchoolName.innerText = appSettings.schoolName || '';

    if (logoUrl && sidebarLogoImg && sidebarLogoIcon) {
        sidebarLogoImg.src = logoUrl;
        sidebarLogoImg.classList.remove('hidden');
        sidebarLogoIcon.classList.add('hidden');

        if (loaderLogoImg && loaderLogoIcon) {
            loaderLogoImg.src = logoUrl;
            loaderLogoImg.classList.remove('hidden');
            loaderLogoIcon.classList.add('hidden');
        }
    } else if (sidebarLogoImg && sidebarLogoIcon) {
        sidebarLogoImg.classList.add('hidden');
        sidebarLogoIcon.classList.remove('hidden');

        if (loaderLogoImg && loaderLogoIcon) {
            loaderLogoImg.classList.add('hidden');
            loaderLogoIcon.classList.remove('hidden');
        }
    }

    const viewPengaturan = document.getElementById('view-pengaturan');
    if (viewPengaturan && !viewPengaturan.classList.contains('hidden')) {
        document.getElementById('setting-input-app-name').value = appSettings.appName.replace('<br>', ' ');
        document.getElementById('setting-input-school-name').value = appSettings.schoolName || '';

        const settingsPreviewImg = document.getElementById('setting-logo-preview');
        const settingsPreviewIcon = document.getElementById('setting-logo-icon-preview');
        if (logoUrl && settingsPreviewImg && settingsPreviewIcon) {
            settingsPreviewImg.src = logoUrl;
            settingsPreviewImg.classList.remove('hidden');
            settingsPreviewIcon.classList.add('hidden');
        } else if (settingsPreviewImg && settingsPreviewIcon) {
            settingsPreviewImg.classList.add('hidden');
            settingsPreviewIcon.classList.remove('hidden');
        }
    }
}

function applyUserContext() {
    const userNameHeader = document.getElementById('user-name-header');
    const userUsernameHeader = document.getElementById('user-username-header');

    const avatarElements = [
        document.getElementById('user-avatar-header'),
        document.getElementById('user-avatar-laporan'),
        document.getElementById('user-avatar-pengaturan')
    ].filter(Boolean);

    const avatarSrc = currentUser.profilePicUrl || `https://ui-avatars.com/api/?name=${currentUser.name || 'P'}&background=003336&color=fff`;
    avatarElements.forEach(img => img.src = avatarSrc);

    if (userNameHeader) userNameHeader.innerText = currentUser.name;
    if (userUsernameHeader) userUsernameHeader.innerText = currentUser.username ? `@${currentUser.username}` : '';

    // Show/hide settings nav based on role
    const navPengaturan = document.getElementById('nav-pengaturan');
    if (navPengaturan) {
        navPengaturan.style.display = (currentUser.role === 'Admin Utama') ? 'flex' : 'none';
    }

    // Show/hide participant management buttons based on role
    const isAdmin = currentUser.role === 'Admin Utama';
    const btnTambahPeserta = document.getElementById('btn-buka-modal-tambah-peserta');
    const thAksi = document.getElementById('th-aksi-peserta');
    const bulkActionBar = document.getElementById('bulk-action-bar');

    if (btnTambahPeserta) btnTambahPeserta.style.display = isAdmin ? 'flex' : 'none';
    if (thAksi) thAksi.style.display = isAdmin ? '' : 'none';
    if (bulkActionBar && !isAdmin) {
        bulkActionBar.classList.replace('flex', 'hidden');
    }
}
// --- Navigation ---
// --- Sidebar Toggle ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarNavLinks = sidebar.querySelectorAll('nav a'); // All navigation links
    const sidebarLogoArea = sidebar.querySelector('.mb-6'); // Logo and app name area
    const logoutText = document.getElementById('logout-text'); // Logout text
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
    const sidebarToggleText = document.getElementById('sidebar-toggle-text');
    const sidebarFooter = sidebar.querySelector('.mt-auto'); // The div containing toggle and logout
    const sidebarFooterLinks = sidebarFooter.querySelectorAll('a');
    const backdrop = document.getElementById('sidebar-backdrop');

    const isMobile = window.innerWidth < 768;

    if (isMobile) {
        // Mobile behavior: toggle slide-over transform and backdrop
        if (sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.remove('-translate-x-full');
            if (backdrop) {
                backdrop.classList.remove('hidden');
                setTimeout(() => backdrop.classList.remove('opacity-0'), 10);
            }
        } else {
            sidebar.classList.add('-translate-x-full');
            if (backdrop) {
                backdrop.classList.add('opacity-0');
                setTimeout(() => backdrop.classList.add('hidden'), 300);
            }
        }
        return;
    }

    // Desktop behavior: Collapse/Expand width
    if (sidebar.classList.contains('w-64')) {
        // Collapse sidebar
        sidebar.classList.remove('w-64', 'px-4');
        sidebar.classList.add('w-16', 'px-2');

        // Hide text elements and adjust alignment
        if (sidebarLogoArea) sidebarLogoArea.classList.add('hidden');
        if (logoutText) logoutText.classList.add('hidden');
        sidebarNavLinks.forEach(link => {
            const textSpan = link.querySelector('span:not(.material-symbols-outlined)');
            if (textSpan) textSpan.classList.add('hidden');
            link.classList.remove('justify-start', 'gap-3', 'px-4');
            link.classList.add('justify-center', 'px-2');
        });

        if (sidebarToggleIcon) sidebarToggleIcon.textContent = 'chevron_right';
        if (sidebarToggleText) sidebarToggleText.classList.add('hidden');
        if (sidebarFooter) {
            sidebarFooter.classList.remove('pt-4');
            sidebarFooter.classList.add('pt-2');
            sidebarFooterLinks.forEach(link => {
                link.classList.remove('gap-3', 'px-4');
                link.classList.add('justify-center', 'px-2');
            });
        }
    } else {
        // Expand sidebar
        sidebar.classList.remove('w-16', 'px-2');
        sidebar.classList.add('w-64', 'px-4');

        // Show text elements and adjust alignment
        if (sidebarLogoArea) sidebarLogoArea.classList.remove('hidden');
        if (logoutText) logoutText.classList.remove('hidden');
        sidebarNavLinks.forEach(link => {
            const textSpan = link.querySelector('span:not(.material-symbols-outlined)');
            if (textSpan) textSpan.classList.remove('hidden');
            link.classList.remove('justify-center', 'px-2');
            link.classList.add('justify-start', 'gap-3', 'px-4');
        });

        if (sidebarToggleIcon) sidebarToggleIcon.textContent = 'chevron_left';
        if (sidebarToggleText) sidebarToggleText.classList.remove('hidden');
        if (sidebarFooter) {
            sidebarFooter.classList.remove('pt-2');
            sidebarFooter.classList.add('pt-4');
            sidebarFooterLinks.forEach(link => {
                link.classList.remove('justify-center', 'px-2');
                link.classList.add('gap-3', 'px-4');
            });
        }
    }
}

function getCurrentVisibleView() {
    const views = ['dashboard', 'peserta', 'ujian', 'laporan', 'pengaturan', 'penilaian-detail'];
    for (const v of views) { if (document.getElementById(`view-${v}`) && !document.getElementById(`view-${v}`).classList.contains('hidden')) return v; }
    return null;
}

function switchView(viewName, studentId = null, kategori = null, forceRender = false) {
    // Access Control for Settings Page
    if (viewName === 'pengaturan' && currentUser.role !== 'Admin Utama') {
        openAlert("Anda tidak memiliki hak akses untuk membuka halaman Pengaturan.");
        return;
    }

    if (!forceRender && getCurrentVisibleView() === viewName) return;
    const loader = document.getElementById('loading-overlay');
    loader.classList.remove('opacity-0', 'pointer-events-none');
    loader.classList.add('opacity-100');

    // Tutup menu sidebar saat berpindah tampilan jika sedang di mode ponsel
    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.add('-translate-x-full');
            if (backdrop) {
                backdrop.classList.add('opacity-0');
                setTimeout(() => backdrop.classList.add('hidden'), 300);
            }
        }
    }

    setTimeout(() => {
        localStorage.setItem('currentView', viewName);
        ['dashboard', 'peserta', 'ujian', 'laporan', 'pengaturan', 'penilaian-detail'].forEach(v => {
            if (document.getElementById(`view-${v}`)) document.getElementById(`view-${v}`).classList.add('hidden');
        });
        if (document.getElementById(`view-${viewName}`)) document.getElementById(`view-${viewName}`).classList.remove('hidden');

        const navs = ['dashboard', 'peserta', 'ujian', 'laporan', 'pengaturan'];
        navs.forEach(n => {
            const el = document.getElementById('nav-' + n);
            if (el) {
                const isActive = viewName === n;
                el.className = isActive ? "flex items-center gap-3 px-4 py-3 rounded-lg text-teal-950 font-bold border-l-4 border-tertiary-container bg-white shadow-sm transition-all" : "flex items-center gap-3 px-4 py-3 rounded-lg text-teal-700/60 hover:bg-black/5 transition-all";
                if (el.querySelector('.material-symbols-outlined')) el.querySelector('.material-symbols-outlined').style.color = isActive ? 'var(--tertiary-container)' : '';
            }
        });

        if (viewName === 'peserta') {
            pesertaPagination.currentPage = 1;
            if (document.getElementById('search-peserta')) document.getElementById('search-peserta').value = '';
            selectedPeserta = [];
            updateBulkActionBar();
            renderTablePeserta();
            updateQuickStats();
        }
        else if (viewName === 'dashboard') { renderDashboard(); }
        else if (viewName === 'ujian') {
            if (document.getElementById('search-ujian')) document.getElementById('search-ujian').value = '';

            // Reset pagination when switching to this view
            ujianPagination.currentPage = 1;

            // Display exam date from settings
            renderUjianDateDisplay();
            renderPesertaUjian();
        }
        else if (viewName === 'laporan') {
            laporanPagination.currentPage = 1;
            if (document.getElementById('laporan-search')) document.getElementById('laporan-search').value = '';
            setupLaporanFilters();
            renderLaporanPage();
        }
        else if (viewName === 'penilaian-detail' && studentId && kategori) { _renderPenilaianDetail(studentId, kategori); }
        else if (viewName === 'pengaturan') {
            applySettings(); // Populate inputs when view is switched to
            switchSettingsTab('umum'); // Reset to default tab
        }

        loader.classList.remove('opacity-100');
        loader.classList.add('opacity-0', 'pointer-events-none');
    }, 300);
}

// --- NEW DASHBOARD LOGIC ---

function calculateDashboardStats(filterKategori = "") {
    let stats = {
        totalPeserta: 0,
        selesai: 0,
        sedang: 0,
        belum: 0,
        leaderboard: [],
        progresPerKategori: [],
        rataRataPerKategori: []
    };

    const kategoriUntukProses = filterKategori ? [listKategori.find(k => k.nama === filterKategori)] : listKategori;
    let semuaPesertaDenganNilai = [];

    kategoriUntukProses.forEach(kategori => {
        if (!kategori) return;
        const namaKategori = kategori.nama;
        const pesertaDiKategori = dataPeserta[namaKategori] || [];
        if (pesertaDiKategori.length === 0 && !filterKategori) return;

        let katStats = {
            nama: namaKategori,
            total: pesertaDiKategori.length,
            selesai: 0,
            sedang: 0,
            totalNilai: 0,
            jumlahPenilaian: 0
        };

        pesertaDiKategori.forEach(p => {
            stats.totalPeserta++;
            const status = getStatusPeserta(p.id, namaKategori);
            if (status.progress === 100) katStats.selesai++;
            else if (status.progress > 0) katStats.sedang++;

            let totalNilaiPeserta = 0;
            let jumlahPenilaianPeserta = 0;
            Object.keys(statePenilaian).forEach(key => {
                if (key.startsWith(p.id + '_')) {
                    const keyKategori = findKategoriOfSurah(key.split('_')[1]);
                    if (keyKategori === namaKategori) {
                        totalNilaiPeserta += statePenilaian[key].nilai;
                        jumlahPenilaianPeserta++;
                    }
                }
            });

            if (jumlahPenilaianPeserta > 0) {
                const avg = totalNilaiPeserta / jumlahPenilaianPeserta;
                semuaPesertaDenganNilai.push({ ...p, avg: parseFloat(avg.toFixed(1)), kategori: namaKategori });
                katStats.totalNilai += avg;
                katStats.jumlahPenilaian++;
            }
        });

        stats.selesai += katStats.selesai;
        stats.sedang += katStats.sedang;

        const progressSelesai = katStats.total > 0 ? Math.round((katStats.selesai / katStats.total) * 100) : 0;
        stats.progresPerKategori.push({ ...katStats, progressSelesai });

        if (katStats.jumlahPenilaian > 0) {
            stats.rataRataPerKategori.push({
                nama: namaKategori,
                avg: parseFloat((katStats.totalNilai / katStats.jumlahPenilaian).toFixed(1))
            });
        }
    });

    stats.belum = stats.totalPeserta - stats.selesai - stats.sedang;

    semuaPesertaDenganNilai.sort((a, b) => b.avg - a.avg);
    stats.leaderboard = semuaPesertaDenganNilai.slice(0, 5);

    return stats;
}

function findKategoriOfSurah(surahNo) {
    for (const kat in dataSurat) {
        const sList = dataSurat[kat];
        const items = Object.values(sList).flat();
        if (items.some(s => String(s.no) === String(surahNo))) {
            return kat;
        }
    }
    return null;
}

function renderDashboard() {
    const filter = document.getElementById('dash-filter-kategori').value;
    const stats = calculateDashboardStats(filter);

    renderProgresDetail(stats);
    renderAktivitasTerbaru();
    renderRingkasanGrafik(stats);
    renderPapanPeringkat(stats);
    renderGuruPengujiDashboard();
    renderGrafikRataRata(stats);
    renderSiswaPerluPerhatianDashboard(); // Call the new function
}

function renderProgresDetail(stats) {
    const container = document.getElementById('dash-progres-kategori');
    if (!container) return;
    let html = '';
    if (stats.progresPerKategori.length === 0) {
        html = '<p class="text-center text-sm text-gray-400 py-4 italic">Tidak ada data progres untuk ditampilkan.</p>';
    } else {
        stats.progresPerKategori.forEach(kat => {
            html += `
            <div>
                <div class="flex justify-between mb-1">
                    <span class="text-sm font-bold text-teal-950">${kat.nama}</span>
                    <span class="text-xs font-bold text-gray-500">${kat.selesai} / ${kat.total} Selesai</span>
                </div>
                <div class="flex h-3 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div class="bg-emerald-500 h-full transition-all duration-500" style="width: ${kat.progressSelesai}%" title="Selesai"></div>
                </div>
            </div>`;
        });
    }
    container.innerHTML = html;
}

function renderAktivitasTerbaru() {
    const container = document.getElementById('dash-aktivitas-penilaian');
    if (!container) return;
    let html = '';
    const penilaianLog = activityLog.filter(log => log.type === 'penilaian').slice(0, 5);

    if (penilaianLog.length === 0) {
        html = '<p class="text-center text-sm text-gray-400 py-4 italic">Belum ada aktivitas penilaian hari ini.</p>';
    } else {
        penilaianLog.forEach(log => {
            html += `
            <div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-lg">edit_note</span>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-teal-950 leading-tight">${log.data.nama}</p>
                        <p class="text-[11px] text-gray-500">Dinilai pada materi <span class="font-semibold text-gray-600">${log.data.materi}</span> oleh ${log.data.penguji}.</p>
                    </div>
                </div>
                <div class="text-right shrink-0 ml-4">
                    <span class="text-lg font-black text-primary">${log.data.nilai}</span>
                    <p class="text-[10px] text-gray-400">${log.waktu}</p>
                </div>
            </div>`;
        });
    }
    container.innerHTML = html;
}

function renderRingkasanGrafik(stats) {
    const ctx = document.getElementById('dash-chart-donut');
    if (!ctx) return;
    if (progressDonutChart) progressDonutChart.destroy();
    progressDonutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Selesai', 'Sedang Ujian', 'Belum Mulai'],
            datasets: [{
                label: 'Status Peserta',
                data: [stats.selesai, stats.sedang, stats.belum],
                backgroundColor: ['rgb(16, 185, 129)', 'rgb(251, 191, 36)', 'rgb(229, 231, 235)'],
                borderColor: '#fff',
                borderWidth: 4,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20, font: { family: 'Inter', weight: '600' } } },
                tooltip: { callbacks: { label: (c) => `${c.label}: ${c.parsed} Peserta` } }
            }
        }
    });
}

function renderPapanPeringkat(stats) {
    const container = document.getElementById('dash-leaderboard');
    if (!container) return;
    let html = '';
    if (stats.leaderboard.length === 0) {
        html = '<p class="text-center text-xs py-4 text-gray-400 italic">Belum ada data nilai.</p>';
    } else {
        stats.leaderboard.forEach((p, i) => {
            html += `<div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs shrink-0">${i + 1}</div><div><p class="text-sm font-bold text-teal-950 leading-tight">${p.nama}</p><p class="text-[10px] text-gray-500">${p.kelas} • ${p.kategori}</p></div></div><div class="text-right"><span class="text-lg font-black text-primary">${p.avg}</span></div></div>`;
        });
    }
    container.innerHTML = html;
}

function renderGuruPengujiDashboard() {
    const container = document.getElementById('dash-guru-penguji');
    if (!container) return;

    container.innerHTML = '<p class="text-center text-xs text-gray-400 italic">Memuat data...</p>';

    db.ref('users').once('value').then(snapshot => {
        if (!snapshot.exists()) {
            container.innerHTML = '<p class="text-center text-xs text-gray-400 italic">Tidak ada data pengguna.</p>';
            return;
        }

        const users = snapshot.val();
        const pengujiList = [];
        for (const uid in users) {
            if (users[uid].role === 'Guru Penguji') {
                pengujiList.push({
                    uid: uid,
                    ...users[uid]
                });
            }
        }

        if (pengujiList.length === 0) {
            container.innerHTML = '<p class="text-center text-xs text-gray-400 italic">Belum ada guru penguji yang terdaftar.</p>';
            return;
        }

        let html = '';
        pengujiList.forEach(user => {
            const avatarSrc = user.profilePicUrl || `https://ui-avatars.com/api/?name=${user.name || 'P'}&background=cfe6f2&color=071e27`;
            html += `
            <div class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                <img src="${avatarSrc}" alt="Avatar" class="w-9 h-9 rounded-full object-cover bg-gray-200">
                <div>
                    <p class="text-sm font-bold text-teal-950 leading-tight">${user.name}</p>
                    <p class="text-[11px] text-gray-500">${user.username}</p>
                </div>
            </div>`;
        });
        container.innerHTML = html;

    }).catch(error => {
        console.error("Error fetching users for dashboard:", error);
        container.innerHTML = '<p class="text-center text-xs text-red-500 italic">Gagal memuat data guru.</p>';
    });
}

function renderGrafikRataRata(stats) {
    const ctx = document.getElementById('dash-chart-bar');
    if (!ctx) return;
    if (avgBarChart) avgBarChart.destroy();
    avgBarChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: stats.rataRataPerKategori.map(k => k.nama),
            datasets: [{
                label: 'Nilai Rata-rata',
                data: stats.rataRataPerKategori.map(k => k.avg),
                backgroundColor: 'rgba(0, 51, 54, 0.7)',
                borderColor: 'rgba(0, 51, 54, 1)',
                borderWidth: 1,
                borderRadius: 6,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, grid: { display: false } }, y: { grid: { display: false } } }
        }
    });
}

function renderSiswaPerluPerhatianDashboard() {
    const container = document.getElementById('dash-siswa-perhatian');
    if (!container) return;

    const allData = getLaporanData();
    const perluPerhatian = allData.filter(s => !s.lulus && s.progress > 0).sort((a, b) => a.avg - b.avg);

    dashboardSiswaPerhatianPagination.totalItems = perluPerhatian.length;
    dashboardSiswaPerhatianPagination.totalPages = Math.ceil(dashboardSiswaPerhatianPagination.totalItems / dashboardSiswaPerhatianPagination.itemsPerPage);
    if (dashboardSiswaPerhatianPagination.currentPage > dashboardSiswaPerhatianPagination.totalPages) {
        dashboardSiswaPerhatianPagination.currentPage = dashboardSiswaPerhatianPagination.totalPages || 1;
    }

    const startIndex = (dashboardSiswaPerhatianPagination.currentPage - 1) * dashboardSiswaPerhatianPagination.itemsPerPage;
    const paginatedData = perluPerhatian.slice(startIndex, startIndex + dashboardSiswaPerhatianPagination.itemsPerPage);

    let html = '';
    if (paginatedData.length === 0) {
        html = '<p class="text-center text-sm text-gray-400 py-4 italic">Tidak ada siswa yang perlu perhatian saat ini. Kerja bagus!</p>';
    } else {
        paginatedData.forEach(p => {
            html += `
            <div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full ${p.warna} flex items-center justify-center font-bold text-xs shrink-0">${p.inisial}</div>
                    <div>
                        <p class="text-sm font-bold text-teal-950 leading-tight">${p.nama}</p>
                        <p class="text-[11px] text-gray-500">Kategori: <span class="font-semibold text-gray-600">${p.kategori}</span></p>
                    </div>
                </div>
                <div class="text-right shrink-0 ml-4">
                    <span class="text-lg font-black text-red-600">${p.avg}</span>
                    <p class="text-[10px] text-gray-400">Nilai Rata-rata</p>
                </div>
            </div>`;
        });
    }
    container.innerHTML = html;
    renderPaginationDashSiswaPerhatian();
}

function renderPaginationDashSiswaPerhatian() {
    const container = document.getElementById('pagination-dash-siswa');
    if (!container) return;
    const { currentPage, totalPages } = dashboardSiswaPerhatianPagination;

    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    for (let i = 1; i <= totalPages; i++) { // Changed to dashboardSiswaPerhatianPagination
        html += `<button onclick="changeDashSiswaPage(${i})" class="w-6 h-6 text-xs font-bold rounded-md ${currentPage === i ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}">${i}</button>`;
    }
    container.innerHTML = html;
}

function changeDashSiswaPage(page) {
    if (page < 1 || page > dashboardSiswaPagination.totalPages) return;
    dashboardSiswaPerhatianPagination.currentPage = page;
    renderSiswaPerluPerhatianDashboard();
}

function renderDashboardFilterOptions() {
    const select = document.getElementById('dash-filter-kategori');
    if (!select) return;
    let html = '<option value="">Semua Kategori</option>';
    listKategori.forEach(k => { html += `<option value="${k.nama}">${k.nama}</option>`; });
    select.innerHTML = html;
}

function getStatusPeserta(studentId, kategori) {
    const items = dataSurat[kategori]; if (!items) return { text: "Belum Ujian", color: "bg-gray-100", progress: 0, completed: 0, total: 0 };
    let total = 0; const nos = [];
    if (Array.isArray(items)) { total = items.length; nos.push(...items.map(i => String(i.no))); }
    else { Object.values(items).forEach(seg => { total += seg.length; nos.push(...seg.map(i => String(i.no))); }); }
    let comp = 0;
    Object.keys(statePenilaian).forEach(k => { if (k.startsWith(studentId + '_') && nos.includes(k.split('_')[1])) comp++; });
    if (comp === 0) return { text: "Belum Ujian", color: "text-gray-500 border-gray-200", progress: 0, completed: 0, total: total };
    if (comp >= total && total > 0) return { text: "Selesai", color: "text-emerald-700 border-emerald-200 bg-emerald-50", progress: 100, completed: comp, total: total };
    return { text: "Sedang Ujian", color: "text-amber-700 border-amber-200 bg-amber-50", progress: Math.round(comp / total * 100), completed: comp, total: total };
}

function filterPeserta() {
    pesertaPagination.currentPage = 1;
    renderTablePeserta();
}

function renderTablePeserta() {
    const tbody = document.getElementById('tbody-peserta'); if (!tbody) return;
    const filterKat = document.getElementById('filter-tabel-kategori')?.value || "";
    const searchTerm = document.getElementById('search-peserta')?.value.toLowerCase() || "";

    // 1. Flatten and filter data
    let flatPesertaList = [];
    Object.keys(dataPeserta).forEach(kat => {
        if (!filterKat || filterKat === kat) {
            dataPeserta[kat].forEach(p => {
                flatPesertaList.push({ ...p, kategori: kat });
            });
        }
    });

    if (searchTerm) {
        flatPesertaList = flatPesertaList.filter(p =>
            p.nama.toLowerCase().includes(searchTerm) ||
            p.id.toLowerCase().includes(searchTerm)
        );
    }

    // 2. Pagination logic
    pesertaPagination.totalItems = flatPesertaList.length;
    pesertaPagination.totalPages = Math.ceil(pesertaPagination.totalItems / pesertaPagination.itemsPerPage);
    if (pesertaPagination.currentPage > pesertaPagination.totalPages && pesertaPagination.totalPages > 0) {
        pesertaPagination.currentPage = pesertaPagination.totalPages;
    } else if (pesertaPagination.totalPages === 0) {
        pesertaPagination.currentPage = 1;
    }

    const startIndex = (pesertaPagination.currentPage - 1) * pesertaPagination.itemsPerPage;
    const endIndex = startIndex + pesertaPagination.itemsPerPage;
    const paginatedList = flatPesertaList.slice(startIndex, endIndex);

    // 3. Render rows
    let html = '';
    if (paginatedList.length === 0) {
        const colspan = currentUser.role === 'Admin Utama' ? 6 : 5;
        const emptyMessage = searchTerm ? `Tidak ada hasil untuk pencarian "${searchTerm}".` : 'Tidak ada peserta untuk ditampilkan.';
        html = `<tr><td colspan="${colspan}" class="text-center py-12 text-gray-400 italic">${emptyMessage}</td></tr>`;
    } else {
        const isAdmin = currentUser.role === 'Admin Utama';
        paginatedList.forEach(p => {
            const s = getStatusPeserta(p.id, p.kategori);
            const tanggalUjianFormatted = p.tanggalUjian
                ? new Date(p.tanggalUjian + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : '-';
            const actionCell = isAdmin ? `<td class="px-4 py-4 text-center"><div class="flex items-center justify-center gap-2">
                <button class="text-gray-400 hover:text-blue-500 transition-colors" onclick="event.stopPropagation(); bukaModalEditPeserta('${p.id}', '${p.kategori}')" title="Edit"><span class="material-symbols-outlined text-lg">edit</span></button>
                <button class="text-gray-400 hover:text-red-500 transition-colors" onclick="event.stopPropagation(); hapusPesertaTunggal('${p.id}', '${p.kategori}')" title="Hapus"><span class="material-symbols-outlined text-lg">delete</span></button>
            </div></td>` : '';

            html += `<tr class="hover:bg-gray-50 border-b border-gray-50 transition-colors cursor-pointer" onclick="bukaProfilSiswa('${p.id}', '${p.kategori}')">
                <td class="px-4 py-4"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full ${p.warna} flex items-center justify-center font-bold text-[10px]">${p.inisial}</div><div><span class="text-sm font-bold text-teal-950 block leading-tight">${p.nama}</span><span class="text-[9px] text-gray-500">${p.id}</span></div></div></td>
                <td class="px-4 py-4"><span class="px-2 py-0.5 text-[10px] font-bold rounded-md border ${s.color}">${s.text}</span></td>
                <td class="px-4 py-4"><span class="text-[11px] font-bold text-primary">${p.kategori}</span></td>
                <td class="px-4 py-4 text-xs text-gray-600 font-medium">${tanggalUjianFormatted}</td>
                <td class="px-4 py-4 text-xs text-gray-600">${p.pembimbing || '-'}</td>
                ${actionCell}
            </tr>`;
        });
    }
    tbody.innerHTML = html;

    // 4. Render pagination controls
    renderPesertaPaginationControls();
}

function updateQuickStats() {
    const container = document.getElementById('peserta-quick-stats');
    const totalPesertaEl = document.getElementById('stat-total-peserta');
    if (!container || !totalPesertaEl) return;

    let totalPeserta = 0;
    const kategoriCounts = listKategori.map(kat => {
        const count = dataPeserta[kat.nama]?.length || 0;
        totalPeserta += count;
        return { nama: kat.nama, count: count };
    }).sort((a, b) => b.count - a.count);

    totalPesertaEl.innerText = totalPeserta;

    let html = '';
    const colors = ['#f3e8ff', '#ecfdf5', '#eff6ff', '#fff7ed'];
    const textColors = ['#6b21a8', '#065f46', '#1d4ed8', '#9a3412'];
    const icons = ['book_2', 'auto_stories', 'menu_book', 'import_contacts'];

    kategoriCounts.slice(0, 3).forEach((kat, index) => {
        if (kat.count > 0) {
            html += `
            <div class="bg-white p-6 rounded-2xl border border-outline-variant/20 shadow-sm">
                <div class="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style="background-color: ${colors[index % colors.length]};">
                    <span class="material-symbols-outlined" style="color: ${textColors[index % textColors.length]};">${icons[index % icons.length]}</span>
                </div>
                <p class="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1 truncate">Kategori ${kat.nama}</p>
                <h3 class="text-4xl font-extrabold text-teal-950 font-headline">${kat.count}</h3>
            </div>`;
        }
    });

    container.innerHTML = html || '<p class="md:col-span-3 text-center text-sm text-gray-400 py-8 italic">Belum ada data peserta di kategori manapun.</p>';
}

function togglePesertaSelection(id, chk) {
    if (chk) { if (!selectedPeserta.includes(id)) selectedPeserta.push(id); }
    else { selectedPeserta = selectedPeserta.filter(i => i !== id); }
    updateBulkActionBar(); renderTablePeserta();
}

function updateBulkActionBar() {
    const bar = document.getElementById('bulk-action-bar'); if (!bar) return;
    if (selectedPeserta.length > 0) { document.getElementById('bulk-count').innerText = selectedPeserta.length; bar.classList.replace('hidden', 'flex'); }
    else { bar.classList.replace('flex', 'hidden'); }
}

function changePesertaPage(page) {
    const { totalPages } = pesertaPagination;
    if (page < 1 || page > totalPages) return;
    pesertaPagination.currentPage = page;
    renderTablePeserta();
    document.getElementById('view-peserta')?.querySelector('main')?.scrollTo(0, 0);
}

function renderPesertaPaginationControls() {
    const container = document.getElementById('pagination-peserta');
    if (!container) return;

    const { currentPage, totalPages } = pesertaPagination;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button onclick="changePesertaPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm">Sebelumnya</button>`;

    const maxPagesToShow = 5;
    let startPage, endPage;
    if (totalPages <= maxPagesToShow) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
        const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
        if (currentPage <= maxPagesBeforeCurrent) {
            startPage = 1;
            endPage = maxPagesToShow;
        } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
            startPage = totalPages - maxPagesToShow + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - maxPagesBeforeCurrent;
            endPage = currentPage + maxPagesAfterCurrent;
        }
    }

    if (startPage > 1) {
        html += `<button onclick="changePesertaPage(1)" class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">1</button>`;
        if (startPage > 2) html += `<span class="px-4 py-2 text-sm font-bold text-gray-400">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += (i === currentPage) ? `<span class="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white border border-primary shadow-sm">${i}</span>` : `<button onclick="changePesertaPage(${i})" class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="px-4 py-2 text-sm font-bold text-gray-400">...</span>`;
        html += `<button onclick="changePesertaPage(${totalPages})" class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">${totalPages}</button>`;
    }

    html += `<button onclick="changePesertaPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm">Berikutnya</button>`;
    container.innerHTML = html;
}

function hapusPesertaTunggal(id, kat) {
    openConfirm(`Hapus santri ${id}? Tindakan ini akan menghapus data peserta dari database.`, (yes) => {
        if (yes) {
            const newPesertaList = dataPeserta[kat].filter(p => p.id !== id);
            db.ref(`appState/dataPeserta/${kat}`).set(newPesertaList)
                .catch(error => openAlert("Gagal menghapus peserta. Error: " + error.message));
            // UI akan diperbarui secara otomatis oleh listener Firebase.
        }
    });
}

function eksporDataPeserta() {
    const filterKat = document.getElementById('filter-tabel-kategori')?.value || "";
    const searchTerm = document.getElementById('search-peserta')?.value.toLowerCase() || "";

    // 1. Gather filtered data (ignoring pagination)
    let flatPesertaList = [];
    Object.keys(dataPeserta).forEach(kat => {
        if (!filterKat || filterKat === kat) {
            dataPeserta[kat].forEach(p => {
                flatPesertaList.push({ ...p, kategori: kat });
            });
        }
    });

    if (searchTerm) {
        flatPesertaList = flatPesertaList.filter(p =>
            p.nama.toLowerCase().includes(searchTerm) ||
            p.id.toLowerCase().includes(searchTerm)
        );
    }

    if (flatPesertaList.length === 0) {
        openAlert("Tidak ada data untuk diekspor berdasarkan filter saat ini.");
        return;
    }

    // 2. Prepare CSV content
    const headers = ['ID', 'Nama Siswa', 'Kelas', 'Kategori', 'Status Ujian', 'Tanggal Ujian', 'Pembimbing'];
    const csvRows = [headers.join(',')];

    const escapeCsvCell = (cell) => {
        if (cell === null || cell === undefined) {
            return '';
        }
        const cellStr = String(cell);
        // If the cell contains a comma, a double quote, or a newline, enclose it in double quotes.
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            // Escape existing double quotes by doubling them
            return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
    };

    flatPesertaList.forEach(p => {
        const status = getStatusPeserta(p.id, p.kategori);
        const tanggalUjianFormatted = p.tanggalUjian
            ? new Date(p.tanggalUjian + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : '-';

        const row = [p.id, p.nama, p.kelas, p.kategori, status.text, tanggalUjianFormatted, p.pembimbing || '-'].map(escapeCsvCell);

        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');

    // 3. Trigger download
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `data-peserta-${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
// --- LAPORAN PAGE LOGIC ---

function getPredicate(score) {
    if (score >= 90) return { text: 'Mumtaz', color: 'text-orange-500', icon: 'stars' };
    if (score >= 80) return { text: 'Jayyid Jiddan', color: 'text-teal-600', icon: '' };
    if (score >= 70) return { text: 'Jayyid', color: 'text-blue-600', icon: '' };
    if (score >= 60) return { text: 'Maqbul', color: 'text-gray-500', icon: '' };
    return { text: 'Rasib', color: 'text-red-600', icon: '' };
}

function getLaporanData() {
    let allStudents = [];
    Object.keys(dataPeserta).forEach(kategori => {
        dataPeserta[kategori].forEach(peserta => {
            const status = getStatusPeserta(peserta.id, kategori);
            let totalNilai = 0;
            let jumlahPenilaian = 0;

            Object.keys(statePenilaian).forEach(key => {
                if (key.startsWith(peserta.id + '_')) {
                    const keyKategori = findKategoriOfSurah(key.split('_')[1]);
                    if (keyKategori === kategori) {
                        totalNilai += statePenilaian[key].nilai;
                        jumlahPenilaian++;
                    }
                }
            });

            const avg = jumlahPenilaian > 0 ? parseFloat((totalNilai / jumlahPenilaian).toFixed(1)) : 0;
            const score100 = avg * 10;
            const predikat = getPredicate(score100);
            const lulus = avg >= (appSettings.kkm || 7);

            allStudents.push({
                ...peserta,
                kategori,
                avg,
                predikat,
                lulus,
                progress: status.progress
            });
        });
    });
    return allStudents;
}

function renderLaporanPage() {
    const allData = getLaporanData();

    // --- Update Quick Stats ---
    const totalSiswa = allData.length;
    const selesai = allData.filter(s => s.progress === 100).length;
    const lulus = allData.filter(s => s.lulus).length;
    const mumtaz = allData.filter(s => s.predikat.text === 'Mumtaz').length;
    const totalAvg = totalSiswa > 0 ? (allData.reduce((acc, s) => acc + s.avg, 0) / totalSiswa).toFixed(1) : '0.0';
    const persentaseLulus = totalSiswa > 0 ? Math.round((lulus / totalSiswa) * 100) : 0;

    document.getElementById('laporan-stat-selesai').innerHTML = `${selesai} <span class="text-sm font-medium text-gray-400">/ ${totalSiswa}</span>`;
    document.getElementById('laporan-stat-rata-rata').textContent = totalAvg;
    document.getElementById('laporan-stat-lulus').innerHTML = `${lulus} <span class="text-sm font-medium text-emerald-500 text-[10px]">(${persentaseLulus}%)</span>`;
    document.getElementById('laporan-stat-mumtaz').textContent = `${mumtaz} Santri`;

    // --- Filter Data ---
    const filterKat = document.getElementById('laporan-filter-kategori').value;
    const filterKelas = document.getElementById('laporan-filter-kelas').value;
    const filterStatus = document.getElementById('laporan-filter-status').value;
    const searchTerm = document.getElementById('laporan-search').value.toLowerCase();

    let filteredData = allData;
    if (filterKat) filteredData = filteredData.filter(s => s.kategori === filterKat);
    if (filterKelas) filteredData = filteredData.filter(s => s.kelas === filterKelas);
    if (filterStatus === 'lulus') {
        filteredData = filteredData.filter(s => s.lulus);
    } else if (filterStatus === 'tidak-lulus') {
        // Hanya tampilkan yang tidak lulus dan sudah memulai ujian
        filteredData = filteredData.filter(s => !s.lulus && s.progress > 0);
    }
    if (searchTerm) filteredData = filteredData.filter(s => s.nama.toLowerCase().includes(searchTerm) || s.id.toLowerCase().includes(searchTerm));

    // --- Paginate Data ---
    laporanPagination.totalItems = filteredData.length;
    laporanPagination.totalPages = Math.ceil(laporanPagination.totalItems / laporanPagination.itemsPerPage);
    if (laporanPagination.currentPage > laporanPagination.totalPages) laporanPagination.currentPage = laporanPagination.totalPages || 1;

    const startIndex = (laporanPagination.currentPage - 1) * laporanPagination.itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + laporanPagination.itemsPerPage);

    // --- Render Table ---
    const tbody = document.getElementById('laporan-table-body');
    let html = '';
    if (paginatedData.length === 0) {
        html = `<tr><td colspan="7" class="text-center py-12 text-gray-400 italic">Tidak ada data laporan untuk ditampilkan.</td></tr>`;
    } else {
        paginatedData.forEach((s, index) => {
            let avgHtml, predikatHtml, statusHtml, syahadahButton;

            if (s.progress === 0) {
                const emptyState = `<span class="text-xs text-gray-400 italic">-</span>`;
                avgHtml = emptyState;
                predikatHtml = emptyState;
                statusHtml = `<span class="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-md border border-gray-200">Belum Ujian</span>`;
                syahadahButton = `<button disabled class="p-2 bg-gray-100 text-gray-300 rounded-lg cursor-not-allowed border border-gray-200"><span class="material-symbols-outlined text-[18px]">workspace_premium</span></button>`;
            } else {
                const statusClass = s.lulus ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200";
                const predikatIcon = s.predikat.icon ? `<span class="material-symbols-outlined text-[14px]">${s.predikat.icon}</span>` : '';
                avgHtml = `<span class="text-lg font-headline font-black ${s.avg < 7 ? 'text-red-600' : 'text-teal-950'}">${s.avg}</span>`;
                predikatHtml = `<span class="text-xs font-bold ${s.predikat.color} flex items-center gap-1">${predikatIcon} ${s.predikat.text}</span>`;
                statusHtml = `<span class="inline-block px-3 py-1 ${statusClass} text-[10px] font-bold uppercase tracking-widest rounded-md border">${s.lulus ? 'Lulus' : 'Remedial'}</span>`;
                syahadahButton = `<button ${!s.lulus ? 'disabled' : ''} class="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors border border-amber-200 shadow-sm disabled:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed disabled:border-gray-200"><span class="material-symbols-outlined text-[18px]">workspace_premium</span></button>`;
            }

            html += `
            <tr class="hover:bg-gray-50/50 transition-colors group">
                <td class="px-6 py-4 text-sm font-semibold text-gray-400 text-center">${startIndex + index + 1}</td>
                <td class="px-6 py-4 cursor-pointer" onclick="bukaModalLaporanDetail('${s.id}', '${s.kategori}')">
                    <h4 class="text-sm font-bold text-teal-950 group-hover:text-primary group-hover:underline">${s.nama}</h4>
                    <p class="text-[11px] text-gray-500 font-medium">${s.kelas} • ${s.id}</p>
                </td>
                <td class="px-6 py-4"><span class="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700">${s.kategori}</span></td>
                <td class="px-6 py-4 text-center">${avgHtml}</td>
                <td class="px-6 py-4">${predikatHtml}</td>
                <td class="px-6 py-4 text-center">${statusHtml}</td>
                <td class="px-6 py-4 text-right">${syahadahButton}</td>
            </tr>`;
        });
    }
    tbody.innerHTML = html;

    // --- Render Pagination ---
    renderLaporanPagination();
}

function renderLaporanPagination() {
    const container = document.getElementById('pagination-laporan');
    if (!container) return;

    const { currentPage, totalPages } = laporanPagination;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';
    html += `<button onclick="changeLaporanPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm">Sebelumnya</button>`;

    const maxPagesToShow = 5;
    let startPage, endPage;
    if (totalPages <= maxPagesToShow) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
        const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
        if (currentPage <= maxPagesBeforeCurrent) {
            startPage = 1;
            endPage = maxPagesToShow;
        } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
            startPage = totalPages - maxPagesToShow + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - maxPagesBeforeCurrent;
            endPage = currentPage + maxPagesAfterCurrent;
        }
    }

    if (startPage > 1) {
        html += `<button onclick="changeLaporanPage(1)" class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">1</button>`;
        if (startPage > 2) html += `<span class="px-4 py-2 text-sm font-bold text-gray-400">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += (i === currentPage) ? `<span class="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white border border-primary shadow-sm">${i}</span>` : `<button onclick="changeLaporanPage(${i})" class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="px-4 py-2 text-sm font-bold text-gray-400">...</span>`;
        html += `<button onclick="changeLaporanPage(${totalPages})" class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">${totalPages}</button>`;
    }

    html += `<button onclick="changeLaporanPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm">Berikutnya</button>`;
    container.innerHTML = html;
}

function changeLaporanPage(page) {
    if (page < 1 || page > laporanPagination.totalPages) return;
    laporanPagination.currentPage = page;
    renderLaporanPage();
    document.getElementById('view-laporan')?.querySelector('main')?.scrollTo(0, 0);
}

function setupLaporanFilters() {
    const katFilter = document.getElementById('laporan-filter-kategori');
    const kelasFilter = document.getElementById('laporan-filter-kelas');

    katFilter.innerHTML = '<option value="">Semua Kategori</option>' + listKategori.map(k => `<option value="${k.nama}">${k.nama}</option>`).join('');
    kelasFilter.innerHTML = '<option value="">Semua Kelas</option>' + listKelas.map(k => `<option value="${k}">${k}</option>`).join('');
}

function bukaModalLaporanDetail(studentId, kategori) {
    const peserta = dataPeserta[kategori]?.find(p => p.id === studentId);
    if (!peserta) {
        openAlert("Data peserta tidak ditemukan.");
        return;
    }

    document.getElementById('laporan-detail-title').innerText = `Rincian Nilai: ${peserta.nama}`;
    document.getElementById('laporan-detail-subtitle').innerText = `${peserta.id} • ${kategori}`;

    const contentContainer = document.getElementById('laporan-detail-content');
    const sList = dataSurat[kategori] || {};
    let items = [];

    if (Array.isArray(sList)) {
        items = sList;
    } else {
        items = Object.values(sList).flat();
    }

    let html = '';
    if (items.length === 0) {
        html = '<p class="text-center text-sm text-gray-400 py-8 italic">Tidak ada materi ujian yang terdefinisi untuk kategori ini.</p>';
    } else {
        items.forEach(item => {
            const penilaian = statePenilaian[`${studentId}_${item.no}`];
            const nilai = penilaian?.nilai;
            const isDinilai = nilai !== undefined;

            html += `
            <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div><p class="font-bold text-sm text-teal-950">${item.nama}</p><p class="text-xs text-gray-500">${typeof item.ayat === 'number' ? item.ayat + ' Ayat' : item.ayat}</p></div>
                ${isDinilai ? `<span class="text-xl font-black font-headline ${nilai < 7 ? 'text-red-600' : 'text-primary'}">${nilai}</span>` : `<span class="text-xs font-bold text-gray-400 italic">Belum Dinilai</span>`}
            </div>`;
        });
    }

    contentContainer.innerHTML = html;
    document.getElementById('modal-laporan-detail').classList.replace('hidden', 'flex');
}

function tutupModalLaporanDetail() {
    document.getElementById('modal-laporan-detail').classList.replace('flex', 'hidden');
}

function bukaProfilSiswa(id, kat) {
    const p = dataPeserta[kat].find(x => x.id === id); if (!p) return;
    const s = getStatusPeserta(id, kat);

    let tanggalUjianHtml = '';
    if (p.tanggalUjian) {
        const date = new Date(p.tanggalUjian + 'T00:00:00');
        const formatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        tanggalUjianHtml = `<div class="mt-2 bg-teal-50 text-teal-700 border border-teal-100 inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full">
            <span class="material-symbols-outlined text-sm">calendar_month</span>
            <span>${formatted}</span>
        </div>`;
    }

    document.getElementById('slideover-content').innerHTML = `
        <div class="text-center">
            <div class="w-20 h-20 rounded-full ${p.warna} mx-auto flex items-center justify-center text-2xl font-bold mb-4 shadow-lg">${p.inisial}</div>
            <h3 class="font-headline font-black text-teal-950 text-xl">${p.nama}</h3>
            <p class="text-xs text-gray-500">${p.id} • ${p.kelas}</p>
            ${tanggalUjianHtml}
        </div>
        <div class="mt-8 space-y-4"><div class="bg-gray-50 p-4 rounded-2xl"><p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Progress Ujian</p><div class="flex justify-between mb-2"><span class="text-xs font-bold text-teal-950">${s.progress}%</span><span class="text-[10px] text-gray-400 font-bold">${s.completed}/${s.total} Materi</span></div><div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden"><div class="bg-primary h-full transition-all duration-1000" style="width: ${s.progress}%"></div></div></div></div>`;
    currentState.studentId = id; currentState.kategori = kat;
    document.getElementById('slideover-backdrop').classList.replace('hidden', 'flex');
    document.getElementById('slideover-panel').classList.remove('translate-x-full');
}

function tambahCatatanModal(catatan) {
    const textarea = document.getElementById('modal-input-catatan');
    if (textarea.value) {
        textarea.value += ', ' + catatan;
    } else {
        textarea.value = catatan;
    }
    textarea.focus();
}

function hitungTotalTartil() {
    const tajwid = Math.min(3, parseFloat(document.getElementById('score-tajwid').value) || 0);
    const kalimah = Math.min(3, parseFloat(document.getElementById('score-kalimah').value) || 0);
    const kelancaran = Math.min(2, parseFloat(document.getElementById('score-kelancaran').value) || 0);
    const nafas = Math.min(1, parseFloat(document.getElementById('score-nafas').value) || 0);
    const waqf = Math.min(1, parseFloat(document.getElementById('score-waqf').value) || 0);
    const total = tajwid + kalimah + kelancaran + nafas + waqf;
    document.getElementById('total-tartil-display').innerText = total.toFixed(1);
}

function hitungTotalFashohah() {
    const huruf = Math.min(4, parseFloat(document.getElementById('score-huruf').value) || 0);
    const harokah = Math.min(3, parseFloat(document.getElementById('score-harokah').value) || 0);
    const sifat = Math.min(2, parseFloat(document.getElementById('score-sifat').value) || 0);
    const volume = Math.min(1, parseFloat(document.getElementById('score-volume').value) || 0);
    const total = huruf + harokah + sifat + volume;
    document.getElementById('total-fashohah-display').innerText = total.toFixed(1);
}

function hitungTotalGhorib() {
    const s1 = Math.min(2, parseFloat(document.getElementById('ghorib-s1-nilai').value) || 0);
    const s2 = Math.min(2, parseFloat(document.getElementById('ghorib-s2-nilai').value) || 0);
    const s3 = Math.min(2, parseFloat(document.getElementById('ghorib-s3-nilai').value) || 0);
    const e1 = Math.min(1, parseFloat(document.getElementById('ghorib-e1').value) || 0);
    const e2 = Math.min(1, parseFloat(document.getElementById('ghorib-e2').value) || 0);
    const e3 = Math.min(1, parseFloat(document.getElementById('ghorib-e3').value) || 0);
    const e4 = Math.min(1, parseFloat(document.getElementById('ghorib-e4').value) || 0);
    const total = s1 + s2 + s3 + e1 + e2 + e3 + e4;
    document.getElementById('total-ghorib-display').innerText = total.toFixed(1);
}

function hitungTotalTajwid() {
    let total = 0;
    for (let i = 1; i <= 5; i++) {
        total += Math.min(1, parseFloat(document.getElementById(`tajwid-t${i}`).value) || 0);
        total += Math.min(1, parseFloat(document.getElementById(`tajwid-u${i}`).value) || 0);
    }
    document.getElementById('total-tajwid-display').innerText = total.toFixed(1);
}

function renderLembarGrid(surahNo) {
    const grid = document.getElementById('lembar-grid');
    const key = `${currentState.studentId}_${surahNo}_lembar`;
    lembarState = statePenilaian[key] || Array(15).fill(0); // 0: lancar, 1: khafi, 2: jali
    let html = '';
    for (let i = 0; i < 15; i++) {
        let bgColor = 'bg-gray-100 hover:bg-gray-200';
        if (lembarState[i] === 1) bgColor = 'bg-amber-100 border border-amber-300 hover:bg-amber-200';
        if (lembarState[i] === 2) bgColor = 'bg-red-100 border border-red-300 hover:bg-red-200';
        html += `<div onclick="toggleLembarState(${i}, '${surahNo}')" class="w-10 h-10 rounded-md cursor-pointer transition-colors ${bgColor}"></div>`;
    }
    grid.innerHTML = html;
}

function toggleLembarState(index, surahNo) {
    lembarState[index] = (lembarState[index] + 1) % 3; // Cycle 0 -> 1 -> 2 -> 0
    const key = `${currentState.studentId}_${surahNo}_lembar`;
    statePenilaian[key] = lembarState;

    // Update Firebase directly instead of calling saveState()
    db.ref(`appState/statePenilaian/${key}`).set(lembarState)
        .catch(error => {
            console.error("Gagal menyimpan lembar state:", error);
            openAlert("Gagal menyimpan perubahan. Periksa koneksi internet Anda. Error: " + error.message);
            // Note: UI has already updated optimistically. A more robust solution would revert the change.
        });

    renderLembarGrid(surahNo);
}

function tutupProfilSiswa() {
    document.getElementById('slideover-panel').classList.add('translate-x-full');
    setTimeout(() => document.getElementById('slideover-backdrop').classList.replace('flex', 'hidden'), 300);
}

function bukaPenilaianDariProfil() {
    tutupProfilSiswa(); switchView('penilaian-detail', currentState.studentId, currentState.kategori);
}

function bukaModal(surahNo) {
    // Access Control: Check if the user is allowed to assess based on the date
    if (currentUser.role === 'Guru Penguji') {
        const todayString = new Date().toISOString().split('T')[0];
        if (!appSettings.examDates || appSettings.examDates.length === 0) {
            openAlert("Tanggal ujian belum diatur oleh Admin. Penilaian belum bisa dimulai.");
            return;
        }
        if (!appSettings.examDates.includes(todayString)) {
            openAlert(`Penilaian hanya bisa dilakukan pada tanggal yang telah ditentukan. Hari ini tidak termasuk jadwal ujian.`);
            return;
        }
    }

    const kategoriData = listKategori.find(k => k.nama === currentState.kategori);
    const peserta = dataPeserta[currentState.kategori].find(p => p.id === currentState.studentId);

    const sList = dataSurat[currentState.kategori] || {};
    const items = Object.values(sList).flat();
    const surat = items.find(s => String(s.no) === String(surahNo)) || masterSurat.find(s => String(s.no) === String(surahNo));

    if (!kategoriData || !peserta || !surat) {
        openAlert("Gagal memuat data penilaian. Data tidak lengkap.");
        return;
    }

    currentState.surahNoEdit = surahNo;
    currentState.surahNamaEdit = surat.nama;

    // NEW: Display KKM in the modal
    const kkm = appSettings.kkm || 7;
    const kkmText = `KKM: ${kkm}`;
    ['standar', 'lembar', 'tartil', 'fashohah', 'ghorib', 'tajwid'].forEach(type => {
        const el = document.getElementById(`kkm-info-${type}`);
        if (el) el.innerText = kkmText;
    });

    // Reset form
    document.getElementById('modal-penilaian').querySelectorAll('input, select, textarea').forEach(el => {
        if (el.type !== 'button' && el.type !== 'submit' && el.type !== 'radio') el.value = '';
        if (el.type === 'radio' || el.type === 'checkbox') el.checked = false;
    });

    document.getElementById('modal-title').innerText = `Penilaian: ${surat.nama}`;
    document.getElementById('modal-subtitle').innerText = `Siswa: ${peserta.nama}`;

    document.getElementById('modal-input-penguji').value = currentUser.name;

    const existingData = statePenilaian[`${currentState.studentId}_${surahNo}`];
    if (existingData) {
        document.getElementById('modal-input-catatan').value = existingData.catatan || '';
        if (existingData.nilai !== undefined) {
            const score = existingData.nilai;
            const scoreIdStandar = `nilai-standar-${score.toString().replace('.', '_')}`;
            const scoreIdLembar = `nilai-lembar-${score.toString().replace('.', '_')}`;
            const radioStandar = document.getElementById(scoreIdStandar);
            const radioLembar = document.getElementById(scoreIdLembar);
            if (radioStandar) radioStandar.checked = true;
            if (radioLembar) radioLembar.checked = true;
        }
    }

    const tipe = kategoriData.tipe;
    const isTartil = tipe === 'tartil';

    ['area-nilai-standar', 'area-nilai-lembar', 'area-nilai-tartil', 'area-nilai-fashohah', 'area-nilai-ghorib', 'area-nilai-tajwid'].forEach(id => document.getElementById(id).classList.add('hidden'));

    if (isTartil) {
        if (surahNo === 'M1') document.getElementById('area-nilai-tartil').classList.remove('hidden');
        else if (surahNo === 'M2') document.getElementById('area-nilai-fashohah').classList.remove('hidden');
        else if (surahNo === 'M3') document.getElementById('area-nilai-ghorib').classList.remove('hidden');
        else if (surahNo === 'M4') document.getElementById('area-nilai-tajwid').classList.remove('hidden');
        else document.getElementById('area-nilai-standar').classList.remove('hidden');
    } else if (tipe === 'lembar') {
        renderLembarGrid(surahNo);
        document.getElementById('area-nilai-lembar').classList.remove('hidden');
    } else {
        document.getElementById('area-nilai-standar').classList.remove('hidden');
    }

    document.getElementById('modal-penilaian').classList.replace('hidden', 'flex');
}

function tutupModal() {
    document.getElementById('modal-penilaian').classList.replace('flex', 'hidden');
}

function simpanNilaiModal() {
    const { studentId, kategori, surahNoEdit, surahNamaEdit } = currentState;
    if (!studentId || !kategori || !surahNoEdit) return;

    const kategoriData = listKategori.find(k => k.nama === kategori);
    if (!kategoriData) return;
    const tipe = kategoriData.tipe;

    let nilai; // Determine nilai based on category type and material
    if (tipe === 'tartil' && ['M1', 'M2', 'M3', 'M4'].includes(surahNoEdit)) {
        if (surahNoEdit === 'M1') nilai = parseFloat(document.getElementById('total-tartil-display').innerText);
        else if (surahNoEdit === 'M2') nilai = parseFloat(document.getElementById('total-fashohah-display').innerText);
        else if (surahNoEdit === 'M3') nilai = parseFloat(document.getElementById('total-ghorib-display').innerText);
        else if (surahNoEdit === 'M4') nilai = parseFloat(document.getElementById('total-tajwid-display').innerText);
    } else if (tipe === 'lembar') {
        const selectedRadio = document.querySelector('input[name="nilai-lembar"]:checked');
        nilai = selectedRadio ? parseFloat(selectedRadio.value) : undefined;
    } else { // This covers 'standar' type and standard surahs within 'tartil' type
        const selectedRadio = document.querySelector('input[name="nilai-standar"]:checked');
        nilai = selectedRadio ? parseFloat(selectedRadio.value) : undefined;
    }

    const penguji = currentUser.name;
    const catatan = document.getElementById('modal-input-catatan').value;

    if (nilai === undefined || isNaN(nilai)) {
        openAlert("Nilai belum dipilih atau tidak valid. Silakan periksa kembali input Anda.");
        return;
    }

    statePenilaian[`${studentId}_${surahNoEdit}`] = {
        nilai: nilai,
        penguji: penguji,
        catatan: catatan
    };

    // Log activity for dashboard
    const peserta = dataPeserta[kategori].find(p => p.id === studentId);
    if (peserta) {
        activityLog.unshift({
            type: 'penilaian',
            waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            data: { nama: peserta.nama, materi: surahNamaEdit, nilai: parseFloat(nilai), penguji: penguji }
        });
        if (activityLog.length > 20) activityLog.pop(); // Keep log size manageable
    }

    // --- ATOMIC UPDATE TO FIREBASE ---
    const updates = {};
    updates[`statePenilaian/${studentId}_${surahNoEdit}`] = statePenilaian[`${studentId}_${surahNoEdit}`];
    updates['activityLog'] = activityLog;

    db.ref('appState').update(updates)
        .catch(error => {
            console.error("Gagal menyimpan penilaian:", error);
            openAlert("Gagal menyimpan penilaian. Periksa koneksi internet Anda. Error: " + error.message);
        });

    tutupModal(); // Optimistic UI update
    renderDaftarSuratDetail(); // Optimistic UI update
}

function updateUjianDate(newDate) {
    currentState.selectedUjianDate = newDate;
}

function filterUjianPeserta() {
    ujianPagination.currentPage = 1;
    renderPesertaUjian();
}

function changeUjianPage(page) {
    const { totalPages } = ujianPagination;
    if (page < 1 || page > totalPages) return;
    ujianPagination.currentPage = page;
    renderPesertaUjian();
    document.getElementById('view-ujian')?.querySelector('main')?.scrollTo(0, 0);
}

function renderUjianPaginationControls() {
    const container = document.getElementById('pagination-ujian');
    if (!container) return;

    const { currentPage, totalPages } = ujianPagination;
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `<button onclick="changeUjianPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm">Sebelumnya</button>`;

    // Page numbers logic
    const maxPagesToShow = 5;
    let startPage, endPage;
    if (totalPages <= maxPagesToShow) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const maxPagesBeforeCurrent = Math.floor(maxPagesToShow / 2);
        const maxPagesAfterCurrent = Math.ceil(maxPagesToShow / 2) - 1;
        if (currentPage <= maxPagesBeforeCurrent) {
            startPage = 1;
            endPage = maxPagesToShow;
        } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
            startPage = totalPages - maxPagesToShow + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - maxPagesBeforeCurrent;
            endPage = currentPage + maxPagesAfterCurrent;
        }
    }

    if (startPage > 1) {
        html += `<button onclick="changeUjianPage(1)" class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">1</button>`;
        if (startPage > 2) {
            html += `<span class="px-4 py-2 text-sm font-bold text-gray-400">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += (i === currentPage)
            ? `<span class="px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white border border-primary shadow-sm">${i}</span>`
            : `<button onclick="changeUjianPage(${i})" class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span class="px-4 py-2 text-sm font-bold text-gray-400">...</span>`;
        }
        html += `<button onclick="changeUjianPage(${totalPages})" class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">${totalPages}</button>`;
    }

    // Next button
    html += `<button onclick="changeUjianPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-4 py-2 rounded-lg text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm">Berikutnya</button>`;

    container.innerHTML = html;
}

// --- Assessment ---
function renderPesertaUjian() {
    const kat = document.getElementById('kategori-select').value;
    const searchTerm = document.getElementById('search-ujian')?.value.toLowerCase() || "";
    let list = dataPeserta[kat] || [];

    if (searchTerm) {
        list = list.filter(p => p.nama.toLowerCase().includes(searchTerm));
    }

    // --- PAGINATION LOGIC ---
    ujianPagination.totalItems = list.length;
    ujianPagination.totalPages = Math.ceil(ujianPagination.totalItems / ujianPagination.itemsPerPage);
    if (ujianPagination.currentPage > ujianPagination.totalPages && ujianPagination.totalPages > 0) {
        ujianPagination.currentPage = ujianPagination.totalPages;
    } else if (ujianPagination.totalPages === 0) {
        ujianPagination.currentPage = 1;
    }

    const startIndex = (ujianPagination.currentPage - 1) * ujianPagination.itemsPerPage;
    const endIndex = startIndex + ujianPagination.itemsPerPage;
    const paginatedList = list.slice(startIndex, endIndex);
    // --- END PAGINATION LOGIC ---

    let html = '';
    paginatedList.forEach(p => {
        const s = getStatusPeserta(p.id, kat);
        let progressIndicator;

        if (s.progress === 100) {
            progressIndicator = `
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                    <span class="text-xs font-bold text-emerald-600">Selesai (${s.completed}/${s.total})</span>
                </div>
            `;
        } else if (s.progress > 0) {
            progressIndicator = `
                <div class="flex items-center gap-2">
                    <div class="w-full bg-gray-200 h-1.5 rounded-full flex-1">
                        <div class="bg-amber-500 h-full rounded-full" style="width: ${s.progress}%"></div>
                    </div>
                    <span class="text-xs font-bold text-gray-500">${s.progress}%</span>
                 </div>
            `;
        } else {
            progressIndicator = `
                <div>
                     <span class="text-xs font-medium text-gray-400">Belum memulai</span>
                </div>
            `;
        }

        html += `
        <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all flex flex-col cursor-pointer group" onclick="switchView('penilaian-detail', '${p.id}', '${kat}')">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full ${p.warna} flex items-center justify-center font-bold text-xs shrink-0">${p.inisial}</div><div><h4 class="font-bold text-teal-950 text-sm group-hover:text-primary leading-tight">${p.nama}</h4><p class="text-[10px] text-gray-500">${p.id} • ${p.kelas}</p></div></div>
                <span class="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">arrow_forward_ios</span>
            </div>
            <div class="pt-3 mt-3 border-t border-gray-100"><p class="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Progress</p>${progressIndicator}</div>
        </div>`;
    });

    const emptyMessage = searchTerm ? `Tidak ada hasil untuk pencarian "${searchTerm}".` : 'Tidak ada peserta dalam kategori ini.';
    document.getElementById('container-peserta-ujian').innerHTML = html || `<p class="col-span-full text-center py-8 text-gray-400 italic">${emptyMessage}</p>`;

    renderUjianPaginationControls();
}

function renderUjianDateDisplay() {
    const displayTanggal = document.getElementById('display-tanggal-ujian');
    if (!displayTanggal) return;

    if (appSettings.examDates && appSettings.examDates.length > 0) {
        const sortedDates = [...appSettings.examDates].sort();
        const dateElements = sortedDates.map(d => {
            const date = new Date(d + 'T00:00:00');
            const formatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            return `<span class="bg-teal-100 text-teal-800 text-xs font-bold px-2 py-1 rounded-md">${formatted}</span>`;
        }).join('');
        displayTanggal.innerHTML = dateElements;
    } else {
        displayTanggal.innerHTML = `<span class="text-sm text-gray-500 italic">Belum diatur</span>`;
    }
}

function _renderPenilaianDetail(id, kat) {
    // Defensive check for stale localStorage data
    if (!dataPeserta[kat] || !dataPeserta[kat].find(p => p.id === id)) {
        console.error(`Data tidak valid untuk penilaian: id=${id}, kategori=${kat}. Mengalihkan.`);
        openAlert("Data peserta atau kategori yang diminta tidak ditemukan. Mengalihkan ke daftar ujian.");
        switchView('ujian');
        return;
    }

    const p = dataPeserta[kat].find(x => x.id === id); if (!p) return;
    const s = getStatusPeserta(id, kat);

    currentState.studentId = id; currentState.kategori = kat;
    localStorage.setItem('currentStudentId', id); localStorage.setItem('currentKategori', kat);
    document.getElementById('detail-student-header').innerHTML = `
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-outline-variant/20 flex items-center gap-4">
            <div class="w-16 h-16 rounded-xl ${p.warna} flex items-center justify-center text-2xl font-bold shadow-sm shrink-0">${p.inisial}</div>
            <div class="flex-1 min-w-0">
                 <div class="flex justify-between items-start">
                    <div>
                        <h2 class="text-xl font-headline font-black text-teal-950 truncate">${p.nama}</h2>
                        <p class="text-xs text-gray-500 font-medium truncate">ID: ${p.id} • ${p.kelas} • ${kat}</p>
                    </div>
                    <div class="text-right shrink-0 ml-4 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1">
                        <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">KKM</p>
                        <p class="text-xl font-headline font-black text-teal-950">${appSettings.kkm || 7}</p>
                    </div>
                 </div>
                 <div class="flex items-center gap-3 mt-2">
                    <div class="w-full bg-gray-200 h-2 rounded-full overflow-hidden flex-1">
                        <div class="bg-primary h-full transition-all duration-500" style="width: ${s.progress}%"></div>
                    </div>
                    <span class="text-xs font-bold text-primary">${s.progress}%</span>
                </div>
            </div>
        </div>`;

    // Generate segments dynamically based on the category's data structure
    const sList = dataSurat[kat] || {};
    if (typeof sList === 'object' && !Array.isArray(sList) && Object.keys(sList).length > 0) {
        daftarSegmen = ["Semua", ...Object.keys(sList)];
        document.getElementById('container-segmen-tabs').style.display = 'flex';
    } else {
        daftarSegmen = ["Semua"];
        document.getElementById('container-segmen-tabs').style.display = 'none';
    }
    segmenAktif = "Semua"; // Always reset to "Semua" on view load

    if (document.getElementById('search-surat')) {
        document.getElementById('search-surat').value = '';
    }

    renderSegmenTabs();
    renderDaftarSuratDetail();
}

function renderDaftarSuratDetail() {
    const sList = dataSurat[currentState.kategori] || {};
    let items;

    if (Array.isArray(sList)) {
        items = sList;
    } else {
        if (segmenAktif === 'Semua' || !sList[segmenAktif]) {
            items = Object.values(sList).flat();
        } else {
            items = sList[segmenAktif];
        }
    }

    const searchTerm = document.getElementById('search-surat')?.value.toLowerCase() || "";
    if (searchTerm) {
        items = items.filter(surat =>
            surat.nama.toLowerCase().includes(searchTerm) ||
            String(surat.no).toLowerCase().includes(searchTerm)
        );
    }

    document.getElementById('detail-surah-count').innerText = `${items.length} Item`;

    let html = '';
    if (items.length === 0 && searchTerm) {
        html = `<p class="text-center text-sm text-gray-500 py-8 italic">Tidak ada materi yang cocok dengan pencarian "${searchTerm}".</p>`;
    } else if (items.length === 0) {
        html = `<p class="text-center text-sm text-gray-500 py-8 italic">Tidak ada materi ujian di segmen ini.</p>`;
    } else {
        items.forEach(surat => {
            const h = statePenilaian[`${currentState.studentId}_${surat.no}`];
            const isDinilai = h && h.nilai !== undefined;

            let actionHtml;
            if (isDinilai) {
                actionHtml = `<div class="text-right cursor-pointer" onclick="bukaModal('${surat.no}')"><p class="text-xl font-black text-primary leading-none">${h.nilai}</p><p class="text-[9px] text-gray-400 mt-1">${h.penguji || '...'}</p></div>`;
            } else {
                actionHtml = `<button onclick="bukaModal('${surat.no}')" class="bg-primary/10 text-primary px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-primary hover:text-white transition-all">NILAI</button>`;
            }

            html += `<div class="bg-white p-4 rounded-xl shadow-sm border border-gray-50 flex items-center justify-between mb-3">
                <div class="flex items-center gap-4">
                    <div class="w-8 h-8 rounded-full ${isDinilai ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'} flex items-center justify-center font-bold text-[10px] shrink-0">${surat.no}</div>
                    <div>
                        <h4 class="font-bold text-teal-950 text-sm">${surat.nama}</h4>
                        <p class="text-[10px] text-gray-400">${typeof surat.ayat === 'number' ? surat.ayat + ' Ayat' : surat.ayat}</p>
                    </div>
                </div>
                ${actionHtml}
            </div>`;
        });
    }
    document.getElementById('container-surat-ujian').innerHTML = html;
}

// --- Management & Utility Functions ---
function renderKategoriDropdown() {
    const select = document.getElementById('kategori-select'); if (!select) return;
    let html = '';
    listKategori.forEach(k => { html += `<option value="${k.nama}" ${currentState.kategori === k.nama ? 'selected' : ''}>${k.nama}</option>`; });
    select.innerHTML = html;

    // Also update the filter dropdown on the peserta page
    const filterSelect = document.getElementById('filter-tabel-kategori');
    if (filterSelect) filterSelect.innerHTML = `<option value="">Semua Kategori</option>` + listKategori.map(k => `<option value="${k.nama}">${k.nama}</option>`).join('');
}

function resetFormKategori() {
    document.getElementById('modal-kategori-title').innerText = 'Kelola Kategori Ujian';
    document.getElementById('input-kategori-original-nama').value = '';
    document.getElementById('input-kategori-baru').value = '';
    document.getElementById('input-tipe-kategori').value = 'standar';
    document.getElementById('btn-simpan-kategori-icon').innerText = 'add';
}

function bukaModalKategori() {
    resetFormKategori(); // Reset to "add" mode
    renderKategoriEditList();
    document.getElementById('modal-kategori').classList.replace('hidden', 'flex');
}

function tutupModalKategori() {
    document.getElementById('modal-kategori').classList.replace('flex', 'hidden');
    renderKategoriDropdown();
    if (getCurrentVisibleView() === 'peserta') {
        renderTablePeserta();
    }
    resetFormKategori(); // Also reset on close
}

function bukaFormEditKategori(nama) {
    const kategori = listKategori.find(k => k.nama === nama);
    if (!kategori) return;

    document.getElementById('modal-kategori-title').innerText = 'Edit Kategori';
    document.getElementById('input-kategori-original-nama').value = nama;
    document.getElementById('input-kategori-baru').value = nama;
    document.getElementById('input-tipe-kategori').value = kategori.tipe;
    document.getElementById('btn-simpan-kategori-icon').innerText = 'save';
    document.getElementById('input-kategori-baru').focus();
}

function renderKategoriEditList() {
    const container = document.getElementById('list-kategori-edit');
    if (!container) return;

    let html = '';
    listKategori.forEach(k => {
        const isSystem = k.isSystem || false;
        const editButton = `<button onclick="bukaFormEditKategori('${k.nama}')" class="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="Edit Kategori"><span class="material-symbols-outlined text-base">edit</span></button>`;
        const deleteButton = isSystem
            ? `<button disabled class="p-2 text-gray-300 cursor-not-allowed" title="Kategori sistem tidak bisa dihapus"><span class="material-symbols-outlined text-base">lock</span></button>`
            : `<button onclick="hapusKategori('${k.nama}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Hapus Kategori"><span class="material-symbols-outlined text-base">delete</span></button>`;

        html += `
        <div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
            <span class="text-sm font-bold text-teal-950 pl-2">${k.nama}</span>
            <div class="flex items-center">
                ${editButton}
                ${deleteButton}
            </div>
        </div>`;
    });
    container.innerHTML = html || '<p class="text-center text-xs text-gray-400">Belum ada kategori.</p>';
}

function simpanKategori() {
    const originalNama = document.getElementById('input-kategori-original-nama').value;
    const isEditing = !!originalNama;

    const namaInput = document.getElementById('input-kategori-baru');
    const tipeInput = document.getElementById('input-tipe-kategori');
    const nama = namaInput.value.trim();
    const tipe = tipeInput.value;

    if (!nama) {
        openAlert("Nama kategori tidak boleh kosong.");
        return;
    }

    // Check for name collision
    if (listKategori.some(k => k.nama.toLowerCase() === nama.toLowerCase() && k.nama !== originalNama)) {
        openAlert("Nama kategori sudah ada.");
        return;
    }

    if (isEditing) {
        // --- EDIT LOGIC ---
        const kategoriIndex = listKategori.findIndex(k => k.nama === originalNama);
        if (kategoriIndex === -1) {
            openAlert("Kategori yang akan diedit tidak ditemukan.");
            return;
        }

        const updates = {};
        const newKategoriList = [...listKategori];
        newKategoriList[kategoriIndex] = { ...newKategoriList[kategoriIndex], nama: nama, tipe: tipe };
        updates['appState/listKategori'] = newKategoriList;

        // If name changed, we need to migrate data
        if (originalNama !== nama) {
            // Migrate dataPeserta
            if (dataPeserta[originalNama]) {
                updates[`appState/dataPeserta/${nama}`] = dataPeserta[originalNama];
                updates[`appState/dataPeserta/${originalNama}`] = null; // Delete old key
            }
            // Migrate local dataSurat
            if (dataSurat[originalNama]) {
                dataSurat[nama] = dataSurat[originalNama];
                delete dataSurat[originalNama];
            }
        }

        db.ref().update(updates)
            .then(() => {
                openAlert(`Kategori "${originalNama}" berhasil diperbarui menjadi "${nama}".`);
                resetFormKategori();
                // UI will update via listener
            })
            .catch(error => openAlert("Gagal memperbarui kategori. Error: " + error.message));

    } else {
        // --- ADD LOGIC ---
        const newKategori = { nama, tipe, isSystem: false };
        const newKategoriList = [...listKategori, newKategori];

        db.ref('appState/listKategori').set(newKategoriList)
            .then(() => {
                if (!dataSurat[nama]) dataSurat[nama] = [];
                namaInput.value = '';
                namaInput.focus();
                // UI will update via listener
            })
            .catch(error => openAlert("Gagal menambah kategori. Error: " + error.message));
    }
}

function hapusKategori(nama) {
    const kategori = listKategori.find(k => k.nama === nama);
    if (!kategori) return;
    if (kategori.isSystem) { openAlert("Kategori sistem tidak dapat dihapus."); return; }
    if (dataPeserta[nama] && dataPeserta[nama].length > 0) { openAlert(`Kategori tidak dapat dihapus karena masih memiliki ${dataPeserta[nama].length} peserta.`); return; }

    openConfirm(`Anda yakin ingin menghapus kategori "${nama}"? Ini juga akan menghapus materi ujian terkait.`, (confirmed) => {
        if (confirmed) {
            const newKategoriList = listKategori.filter(k => k.nama !== nama);

            const updates = {};
            updates[`listKategori`] = newKategoriList;
            updates[`dataPeserta/${nama}`] = null; // Deletes the key

            db.ref('appState').update(updates).catch(error => openAlert("Gagal menghapus kategori. Error: " + error.message));

            // Local dataSurat is not in Firebase, so update it locally.
            delete dataPeserta[nama];
            delete dataSurat[nama];
            // The 'on' listener will update the UI.
        }
    });
}

function resetFormKelas() {
    document.getElementById('modal-kelas-title').innerText = 'Kelola Daftar Kelas';
    document.getElementById('input-kelas-original-nama').value = '';
    document.getElementById('input-kelas-baru').value = '';
    document.getElementById('btn-simpan-kelas-icon').innerText = 'add';
}

function bukaFormEditKelas(nama) {
    document.getElementById('modal-kelas-title').innerText = 'Edit Kelas';
    document.getElementById('input-kelas-original-nama').value = nama;
    document.getElementById('input-kelas-baru').value = nama;
    document.getElementById('btn-simpan-kelas-icon').innerText = 'save';
    document.getElementById('input-kelas-baru').focus();
}

function bukaModalKelas() {
    resetFormKelas();
    renderKelasEditList();
    document.getElementById('modal-kelas').classList.replace('hidden', 'flex');
}

function tutupModalKelas() {
    document.getElementById('modal-kelas').classList.replace('flex', 'hidden');
    // Update dropdown in the (potentially hidden) add participant modal
    const kelasSelect = document.getElementById('tambah-kelas');
    if (kelasSelect) {
        kelasSelect.innerHTML = listKelas.map(k => `<option value="${k}">${k}</option>`).join('');
    }
    resetFormKelas();
}

function renderKelasEditList() {
    const container = document.getElementById('list-kelas-edit');
    if (!container) return;

    let html = '';
    listKelas.sort().forEach(namaKelas => {
        html += `
        <div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200 group">
            <span class="text-sm font-bold text-teal-950 pl-2">${namaKelas}</span>
            <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="bukaFormEditKelas('${namaKelas}')" class="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="Edit Kelas"><span class="material-symbols-outlined text-base">edit</span></button>
                <button onclick="hapusKelas('${namaKelas}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Hapus Kelas"><span class="material-symbols-outlined text-base">delete</span></button>
            </div>
        </div>`;
    });
    container.innerHTML = html || '<p class="text-center text-xs text-gray-400">Belum ada kelas.</p>';
}

async function simpanKelas() {
    const originalNama = document.getElementById('input-kelas-original-nama').value;
    const isEditing = !!originalNama;

    const namaInput = document.getElementById('input-kelas-baru');
    const nama = namaInput.value.trim();

    if (!nama) {
        openAlert("Nama kelas tidak boleh kosong.");
        return;
    }

    // Check for name collision
    if (listKelas.some(k => k.toLowerCase() === nama.toLowerCase() && k !== originalNama)) {
        openAlert("Nama kelas sudah ada.");
        return;
    }

    if (isEditing) {
        // --- EDIT LOGIC ---
        const updates = {};

        // 1. Update listKelas
        const newKelasList = listKelas.map(k => k === originalNama ? nama : k).sort();
        updates['appState/listKelas'] = newKelasList;

        // 2. Update dataPeserta
        for (const kategori in dataPeserta) {
            const pesertaDiKategori = dataPeserta[kategori];
            let kategoriPerluUpdate = false;
            const updatedPesertaDiKategori = pesertaDiKategori.map(p => {
                if (p.kelas === originalNama) {
                    kategoriPerluUpdate = true;
                    return { ...p, kelas: nama };
                }
                return p;
            });

            if (kategoriPerluUpdate) {
                updates[`appState/dataPeserta/${kategori}`] = updatedPesertaDiKategori;
            }
        }

        try {
            await db.ref().update(updates);
            openAlert(`Kelas "${originalNama}" berhasil diperbarui menjadi "${nama}".`);
            resetFormKelas();
            // UI will update via listener
        } catch (error) {
            openAlert("Gagal memperbarui kelas. Error: " + error.message);
        }

    } else {
        // --- ADD LOGIC ---
        const newKelasList = [...listKelas, nama].sort();
        db.ref('appState/listKelas').set(newKelasList)
            .then(() => {
                namaInput.value = '';
                namaInput.focus();
                // UI will update via listener
            })
            .catch(error => openAlert("Gagal menambah kelas. Error: " + error.message));
    }
}

function hapusKelas(namaKelas) {
    const isUsed = Object.values(dataPeserta).flat().some(p => p.kelas === namaKelas);
    if (isUsed) { openAlert(`Kelas "${namaKelas}" tidak dapat dihapus karena masih digunakan oleh peserta.`); return; }

    openConfirm(`Anda yakin ingin menghapus kelas "${namaKelas}"?`, (confirmed) => {
        if (confirmed) {
            const newKelasList = listKelas.filter(k => k !== namaKelas);
            db.ref('appState/listKelas').set(newKelasList)
                .catch(error => openAlert("Gagal menghapus kelas. Error: " + error.message));
            // UI will be updated by the 'on' listener.
        }
    });
}

// --- KKM Management ---
function bukaModalKkm() {
    const kkmInput = document.getElementById('setting-input-kkm');
    if (kkmInput) {
        kkmInput.value = appSettings.kkm;
    }
    document.getElementById('modal-kkm').classList.replace('hidden', 'flex');
}

function tutupModalKkm() {
    document.getElementById('modal-kkm').classList.replace('flex', 'hidden');
}

function simpanKkm() {
    const kkmInput = document.getElementById('setting-input-kkm');
    let newKkm = parseFloat(kkmInput.value);
    if (isNaN(newKkm) || newKkm < 0 || newKkm > 10) {
        openAlert("Nilai KKM tidak valid. Harap masukkan angka antara 0 dan 10.");
        return;
    }
    appSettings.kkm = newKkm;
    saveSettings();
    tutupModalKkm();
    openAlert(`Nilai KKM berhasil disimpan menjadi ${newKkm}.`);
}

// --- Exam Date Management ---
function bukaModalTanggalUjian() {
    renderTanggalUjianList();
    document.getElementById('modal-tanggal-ujian').classList.replace('hidden', 'flex');
}

function tutupModalTanggalUjian() {
    document.getElementById('modal-tanggal-ujian').classList.replace('flex', 'hidden');
    if (getCurrentVisibleView() === 'ujian') {
        renderUjianDateDisplay();
    }
}

function renderTanggalUjianList() {
    const container = document.getElementById('list-tanggal-ujian-edit');
    if (!container) return;
    let html = '';
    appSettings.examDates.sort().forEach(dateStr => {
        const date = new Date(dateStr + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        html += `<div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200"><span class="text-sm font-bold text-teal-950 pl-2">${formattedDate}</span><button onclick="hapusTanggalUjian('${dateStr}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><span class="material-symbols-outlined text-base">delete</span></button></div>`;
    });
    container.innerHTML = html || '<p class="text-center text-xs text-gray-400 py-4 italic">Belum ada tanggal ujian yang ditambahkan.</p>';
}

function tambahTanggalUjian() {
    const dateInput = document.getElementById('setting-input-exam-date');
    const newDate = dateInput.value;
    if (!newDate) { openAlert("Silakan pilih tanggal terlebih dahulu."); return; }
    if (appSettings.examDates.includes(newDate)) { openAlert("Tanggal ini sudah ditambahkan."); return; }
    appSettings.examDates.push(newDate);
    saveSettings();
    renderTanggalUjianList();
    dateInput.value = '';
}

function hapusTanggalUjian(dateStr) {
    appSettings.examDates = appSettings.examDates.filter(d => d !== dateStr);
    saveSettings();
    renderTanggalUjianList();
}

// --- Token Pendaftaran Penguji Management ---
function bukaModalTokenPendaftaran() {
    renderTokenPendaftaran();
    document.getElementById('modal-token-pendaftaran').classList.replace('hidden', 'flex');
}

function tutupModalTokenPendaftaran() {
    document.getElementById('modal-token-pendaftaran').classList.replace('flex', 'hidden');
}

function renderTokenPendaftaran() {
    const tokenDisplayInput = document.getElementById('token-display');
    const tokenDisplayContainer = document.getElementById('token-display-container');
    const noTokenMessage = document.getElementById('no-token-message');
    const currentToken = appSettings.registrationToken;

    if (currentToken) {
        tokenDisplayInput.value = currentToken;
        tokenDisplayContainer.classList.remove('hidden');
        noTokenMessage.classList.add('hidden');
    } else {
        tokenDisplayInput.value = '';
        tokenDisplayContainer.classList.add('hidden');
        noTokenMessage.classList.remove('hidden');
    }
}

function generateNewToken() {
    // Generate a simple alphanumeric token
    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    appSettings.registrationToken = newToken;
    saveSettings();
    renderTokenPendaftaran();
    openAlert("Token pendaftaran baru berhasil dibuat!");
}

function copyTokenToClipboard() {
    const tokenDisplayInput = document.getElementById('token-display');
    if (tokenDisplayInput && tokenDisplayInput.value) {
        navigator.clipboard.writeText(tokenDisplayInput.value)
            .then(() => openAlert("Token berhasil disalin ke clipboard!"))
            .catch(err => console.error('Gagal menyalin token:', err));
    } else {
        openAlert("Tidak ada token untuk disalin.");
    }
}

// --- End Token Pendaftaran Penguji Management ---

function bukaModalAkunPenguji() {
    renderAkunPengujiList();
    resetFormAkun(); // Sembunyikan form edit saat modal pertama kali dibuka
    document.getElementById('modal-akun-penguji').classList.replace('hidden', 'flex');
}

function tutupModalAkunPenguji() {
    document.getElementById('modal-akun-penguji').classList.replace('flex', 'hidden');
}

function renderAkunPengujiList() {
    const container = document.getElementById('list-akun-penguji-edit');
    if (!container) return;
    container.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Memuat daftar akun...</p>';

    db.ref('users').once('value').then(snapshot => {
        const users = snapshot.val() || {};
        const pengujiUsers = Object.values(users).filter(u => u.role === 'Guru Penguji');

        if (pengujiUsers.length === 0) {
            container.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Belum ada akun penguji yang terdaftar.</p>';
            return;
        }

        let html = '';
        pengujiUsers.sort((a, b) => a.name.localeCompare(b.name)).forEach(u => {
            if (u.role === 'Admin Utama') return;

            html += `
            <div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200 group">
                <div>
                    <p class="text-sm font-bold text-teal-950 pl-2">${u.name}</p>
                    <p class="text-[10px] text-gray-500 pl-2">${u.username}</p>
                </div>
                <div class="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="bukaFormEditAkun('${u.username}')" class="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="Edit Akun">
                        <span class="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button onclick="hapusAkunPenguji('${u.username}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Hapus Akun">
                        <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                </div>
            </div>`;
        });
        container.innerHTML = html || '<p class="text-center text-xs text-gray-400 py-4">Belum ada akun penguji yang terdaftar.</p>';
    }).catch(error => {
        container.innerHTML = '<p class="text-center text-xs text-red-500 py-4 italic">Gagal memuat daftar akun.</p>';
        console.error("Error fetching users for management:", error);
    });
}

function resetFormAkun() {
    document.getElementById('form-akun-penguji').classList.add('hidden');
    document.getElementById('input-akun-username-original').value = '';
    document.getElementById('input-akun-nama').value = '';
    document.getElementById('input-akun-username').value = '';
}

function bukaFormEditAkun(username) {
    db.ref('usernames/' + username.toLowerCase()).once('value')
        .then(snapshot => {
            if (!snapshot.exists()) throw new Error("Username tidak ditemukan.");
            const uid = snapshot.val();
            return db.ref('users/' + uid).once('value');
        })
        .then(userSnapshot => {
            if (!userSnapshot.exists()) throw new Error("Data pengguna tidak ditemukan.");
            const user = userSnapshot.val();

            const form = document.getElementById('form-akun-penguji');
            form.classList.remove('hidden');

            document.getElementById('form-akun-title').innerText = 'Edit Akun Penguji';
            document.getElementById('input-akun-username-original').value = user.username;
            document.getElementById('input-akun-nama').value = user.name;
            document.getElementById('input-akun-username').value = user.username;
            document.getElementById('input-akun-username').disabled = true;

            document.getElementById('input-akun-nama').focus();
        }).catch(error => {
            openAlert("Gagal memuat data akun untuk diedit. " + error.message);
        });
}

async function simpanAkunPenguji() {
    const originalUsername = document.getElementById('input-akun-username-original').value;
    const name = document.getElementById('input-akun-nama').value.trim();

    if (!name || !originalUsername) {
        openAlert("Nama tidak boleh kosong.");
        return;
    }

    try {
        const usernameSnapshot = await db.ref('usernames/' + originalUsername.toLowerCase()).once('value');
        if (!usernameSnapshot.exists()) throw new Error("Pengguna tidak ditemukan.");
        const uid = usernameSnapshot.val();

        await db.ref('users/' + uid).update({ name: name });

        openAlert(`Nama untuk ${originalUsername} berhasil diperbarui.`);
        renderAkunPengujiList();
        resetFormAkun();
    } catch (error) {
        openAlert(`Gagal memperbarui akun: ${error.message}`);
        console.error("Error updating user name:", error);
    }
}

function hapusAkunPenguji(username) {
    openConfirm(`Anda yakin ingin menghapus akun penguji "${username}"? Tindakan ini akan menghapus data mereka dari database, tetapi TIDAK akan menghapus kredensial login mereka. Mereka tidak akan bisa login ke aplikasi ini lagi.`, (confirmed) => {
        if (confirmed) {
            db.ref('usernames/' + username.toLowerCase()).once('value').then(snapshot => {
                if (!snapshot.exists()) {
                    throw new Error(`Username ${username} tidak ditemukan.`);
                }
                const uid = snapshot.val();
                return Promise.all([
                    db.ref('users/' + uid).remove(),
                    db.ref('usernames/' + username.toLowerCase()).remove()
                ]);
            }).then(() => {
                openAlert(`Akun untuk ${username} berhasil dihapus dari database.`);
                renderAkunPengujiList();
            }).catch(error => {
                openAlert(`Gagal menghapus akun: ${error.message}`);
                console.error("Error deleting user db entries:", error);
            });
        }
    });
}

function switchTabTambah(tabName) {
    const isManual = tabName === 'manual';

    // Toggle tab styles
    document.getElementById('tab-input-manual').className = isManual
        ? 'flex-1 py-3 text-sm font-bold text-primary border-b-2 border-primary bg-primary/5 transition-colors'
        : 'flex-1 py-3 text-sm font-bold text-gray-500 border-b-2 border-transparent hover:bg-gray-50 transition-colors';

    document.getElementById('tab-import-excel').className = !isManual
        ? 'flex-1 py-3 text-sm font-bold text-primary border-b-2 border-primary bg-primary/5 transition-colors'
        : 'flex-1 py-3 text-sm font-bold text-gray-500 border-b-2 border-transparent hover:bg-gray-50 transition-colors';

    // Toggle form visibility
    document.getElementById('form-tambah-manual').classList.toggle('hidden', !isManual);
    document.getElementById('form-import-excel').classList.toggle('hidden', isManual);

    // Toggle button visibility
    document.getElementById('btn-simpan-manual').classList.toggle('hidden', !isManual);
    document.getElementById('btn-impor-data').classList.toggle('hidden', isManual);
}

function bukaModalTambahPeserta() {
    if (currentUser.role !== 'Admin Utama') {
        openAlert("Hanya Admin Utama yang dapat menambah data peserta.");
        return;
    }

    document.getElementById('tambah-kategori').innerHTML = listKategori.map(k => `<option value="${k.nama}">${k.nama}</option>`).join('');
    const kelasSelect = document.getElementById('tambah-kelas');
    if (kelasSelect) {
        kelasSelect.innerHTML = listKelas.sort().map(k => `<option value="${k}">${k}</option>`).join('');
    }

    // Populate date dropdowns for both manual and import tabs
    const tanggalSelectManual = document.getElementById('tambah-tanggal-ujian');
    const tanggalSelectImport = document.getElementById('import-tanggal-ujian');
    const selects = [tanggalSelectManual, tanggalSelectImport].filter(Boolean);

    if (selects.length > 0) {
        if (appSettings.examDates && appSettings.examDates.length > 0) {
            const sortedDates = [...appSettings.examDates].sort();
            const optionsHtml = sortedDates.map(d => {
                const date = new Date(d + 'T00:00:00');
                const formatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                return `<option value="${d}">${formatted}</option>`;
            }).join('');
            selects.forEach(sel => {
                sel.innerHTML = optionsHtml;
                sel.disabled = false;
            });
        } else {
            selects.forEach(sel => {
                sel.innerHTML = '<option value="">Belum ada tanggal diatur</option>';
                sel.disabled = true;
            });
        }
    }

    document.getElementById('modal-tambah-peserta').classList.replace('hidden', 'flex');
}
function tutupModalTambahPeserta() { document.getElementById('modal-tambah-peserta').classList.replace('flex', 'hidden'); }

function simpanPesertaBaru() {
    const nama = document.getElementById('tambah-nama').value.trim();
    const kategori = document.getElementById('tambah-kategori').value;
    const kelas = document.getElementById('tambah-kelas').value;
    const tanggalUjian = document.getElementById('tambah-tanggal-ujian').value;
    const pembimbing = document.getElementById('tambah-pembimbing').value.trim();
    if (!nama || !kelas || !kategori || !tanggalUjian) {
        openAlert("Semua kolom (Nama, Kelas, Kategori, Tanggal) wajib diisi.");
        return;
    }

    const id = generateUniqueId(kategori);

    if (!dataPeserta[kategori]) {
        dataPeserta[kategori] = [];
    }

    const inisial = nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const warna = ["bg-blue-100 text-blue-700", "bg-teal-100 text-teal-700", "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700", "bg-red-100 text-red-700"];
    const randomWarna = warna[Math.floor(Math.random() * warna.length)];

    const newPeserta = {
        id,
        inisial, warna: randomWarna, nama, kelas,
        pembimbing: pembimbing || "Belum Ditentukan",
        tanggalUjian: tanggalUjian || null
    };

    const currentPesertaList = dataPeserta[kategori] || [];
    const newPesertaList = [...currentPesertaList, newPeserta];

    db.ref(`appState/dataPeserta/${kategori}`).set(newPesertaList)
        .then(() => {
            tutupModalTambahPeserta();
            // UI will be updated by the 'on' listener.
        })
        .catch(error => openAlert("Gagal menyimpan peserta baru. Error: " + error.message));
}

function generateUniqueId(kategori, existingIds = []) {
    // Create a prefix from the category name, e.g., "Juz 30 (Amma)" -> "J30"
    const prefix = (kategori.match(/\d+|[A-Z]/g) || []).join('');
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const fullPrefix = `${prefix}-${year}${month}-`;

    const allIds = [...Object.values(dataPeserta).flat().map(p => p.id), ...existingIds];

    let maxSeq = 0;
    allIds.forEach(id => {
        if (id.startsWith(fullPrefix)) {
            const seqPart = parseInt(id.substring(fullPrefix.length), 10);
            if (!isNaN(seqPart) && seqPart > maxSeq) {
                maxSeq = seqPart;
            }
        }
    });

    const newSeq = (maxSeq + 1).toString().padStart(3, '0');
    return `${fullPrefix}${newSeq}`;
}

function findBestMatch(query, list) {
    if (!query || !list || list.length === 0) return null;
    const lowerQuery = query.toLowerCase().trim();

    // 1. Exact match (case-insensitive)
    let found = list.find(item => item.toLowerCase() === lowerQuery);
    if (found) return found;

    // 2. Partial match (item includes query)
    found = list.find(item => item.toLowerCase().includes(lowerQuery));
    if (found) return found;

    return null;
}

function imporPesertaDariTeks() {
    const textarea = document.getElementById('import-textarea');
    const text = textarea.value.trim();
    const tanggalUjian = document.getElementById('import-tanggal-ujian').value;

    if (!text) {
        openAlert("Kolom isian tidak boleh kosong. Salin data dari Excel dan tempel di sini.");
        return;
    }

    if (!tanggalUjian && appSettings.examDates && appSettings.examDates.length > 0) {
        openAlert("Tanggal ujian untuk peserta impor wajib dipilih.");
        return;
    }

    const lines = text.split('\n').filter(line => line.trim() !== '');
    let berhasil = 0;
    const newPesertaList = [];
    const importErrors = [];

    lines.forEach((line, index) => {
        const cols = line.split('\t');
        if (cols.length < 3) {
            importErrors.push(`Baris ${index + 1} dilewati: Kurang dari 3 kolom.`);
            return;
        }

        const [nama, kelasText, kategoriText] = cols.map(c => c.trim());

        if (!nama || !kelasText || !kategoriText) {
            importErrors.push(`Baris ${index + 1} dilewati: Data tidak lengkap.`);
            return;
        }

        const matchedKelas = findBestMatch(kelasText, listKelas);
        if (!matchedKelas) {
            importErrors.push(`Baris ${index + 1}: Kelas "${kelasText}" tidak ditemukan.`);
            return;
        }

        const matchedKategori = findBestMatch(kategoriText, listKategori.map(k => k.nama));
        if (!matchedKategori) {
            importErrors.push(`Baris ${index + 1}: Kategori "${kategoriText}" tidak ditemukan.`);
            return;
        }

        newPesertaList.push({ nama, kelas: matchedKelas, kategori: matchedKategori });
    });

    if (newPesertaList.length > 0) {
        // Gunakan multi-path update untuk menghindari penimpaan seluruh node 'dataPeserta'
        // yang bisa gagal karena aturan keamanan. Ini membangun objek 'updates'
        // yang hanya menargetkan kategori yang terpengaruh.
        const updates = {};
        const allCurrentIds = Object.values(dataPeserta).flat().map(p => p.id);
        const warna = ["bg-blue-100 text-blue-700", "bg-teal-100 text-teal-700", "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700", "bg-red-100 text-red-700"];

        newPesertaList.forEach(p => {
            const id = generateUniqueId(p.kategori, allCurrentIds);
            allCurrentIds.push(id);
            const inisial = p.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const randomWarna = warna[Math.floor(Math.random() * warna.length)];

            // Siapkan path untuk update
            const path = `dataPeserta/${p.kategori}`;
            if (!updates[path]) {
                // Jika path ini belum ada di 'updates', inisialisasi dengan data yang ada saat ini
                updates[path] = [...(dataPeserta[p.kategori] || [])];
            }
            updates[path].push({ id, inisial, warna: randomWarna, nama: p.nama, kelas: p.kelas, pembimbing: "Belum Ditentukan", tanggalUjian: tanggalUjian || null });
            berhasil++;
        });

        db.ref('appState').update(updates)
            .catch(error => {
                importErrors.push(`Gagal menyimpan ke database: ${error.message}`);
                berhasil = 0; // Reset success count on DB error
            });
    }

    textarea.value = '';
    tutupModalTambahPeserta();
    const gagal = lines.length - berhasil;
    if (importErrors.length > 0) {
        const errorMessage = `Impor selesai. Berhasil: ${berhasil}, Gagal: ${gagal}.\n\nDetail Kesalahan:\n- ${importErrors.join('\n- ')}`;
        openAlert(errorMessage);
    } else if (berhasil > 0) {
        openAlert(`Impor berhasil! ${berhasil} peserta baru telah ditambahkan.`);
    } else {
        // This case handles when there are no lines to import.
        // No message needed, or a specific one if desired.
    }
}

function bukaModalEditPeserta(id, kategori) {
    const p = dataPeserta[kategori].find(x => x.id === id);
    if (!p) return;

    document.getElementById('edit-id-peserta').value = p.id;
    document.getElementById('edit-kategori-hidden').value = kategori;
    document.getElementById('edit-kategori-display').value = kategori;
    document.getElementById('edit-nama').value = p.nama;

    const kelasSelect = document.getElementById('edit-kelas');
    kelasSelect.innerHTML = listKelas.sort().map(k => `<option value="${k}" ${k === p.kelas ? 'selected' : ''}>${k}</option>`).join('');

    const tanggalSelect = document.getElementById('edit-tanggal-ujian');
    if (appSettings.examDates && appSettings.examDates.length > 0) {
        const sortedDates = [...appSettings.examDates].sort();
        tanggalSelect.innerHTML = '<option value="">Pilih Tanggal</option>' + sortedDates.map(d => {
            const date = new Date(d + 'T00:00:00');
            const formatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            return `<option value="${d}" ${d === p.tanggalUjian ? 'selected' : ''}>${formatted}</option>`;
        }).join('');
        tanggalSelect.disabled = false;
    } else {
        tanggalSelect.innerHTML = '<option value="">Belum ada tanggal diatur</option>';
        tanggalSelect.disabled = true;
    }

    document.getElementById('edit-pembimbing').value = p.pembimbing === 'Belum Ditentukan' ? '' : p.pembimbing;
    document.getElementById('modal-edit-peserta').classList.replace('hidden', 'flex');
}

function tutupModalEditPeserta() {
    document.getElementById('modal-edit-peserta').classList.replace('flex', 'hidden');
}

function simpanEditPeserta() {
    const id = document.getElementById('edit-id-peserta').value;
    const kategori = document.getElementById('edit-kategori-hidden').value;
    const nama = document.getElementById('edit-nama').value.trim();
    const kelas = document.getElementById('edit-kelas').value;
    const tanggalUjian = document.getElementById('edit-tanggal-ujian').value;
    const pembimbing = document.getElementById('edit-pembimbing').value.trim() || "Belum Ditentukan";

    if (!nama || !kelas || !tanggalUjian) { openAlert("Nama, Kelas, dan Tanggal Ujian wajib diisi."); return; }

    const pList = dataPeserta[kategori];
    const pIndex = pList.findIndex(x => x.id === id);
    if (pIndex === -1) { openAlert("Data peserta tidak ditemukan!"); return; }

    pList[pIndex].nama = nama; pList[pIndex].kelas = kelas; pList[pIndex].tanggalUjian = tanggalUjian; pList[pIndex].pembimbing = pembimbing;
    pList[pIndex].inisial = nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    db.ref(`appState/dataPeserta/${kategori}`).set(pList)
        .then(() => { tutupModalEditPeserta(); })
        .catch(error => openAlert("Gagal menyimpan perubahan. Error: " + error.message));
}

function renderSegmenTabs() {
    const container = document.getElementById('container-segmen-tabs'); if (!container) return;
    let html = '';
    daftarSegmen.forEach((seg, idx) => {
        const active = seg === segmenAktif;
        html += `<button onclick="pilihSegmen(${idx})" class="px-4 py-1.5 text-xs font-bold ${active ? 'bg-white text-teal-950 rounded-md shadow-sm' : 'text-gray-500 hover:text-teal-950'} transition-all">${seg}</button>`;
    });
    container.innerHTML = html;
}
function pilihSegmen(idx) { segmenAktif = daftarSegmen[idx]; renderSegmenTabs(); renderDaftarSuratDetail(); }

// --- Settings Page Logic ---
function switchSettingsTab(tabName) {
    const navs = ['umum', 'tampilan', 'data', 'bahaya'];
    navs.forEach(nav => {
        document.getElementById(`settings-nav-${nav}`).className = "flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-500 hover:bg-gray-100 font-semibold text-sm";
        document.getElementById(`settings-content-${nav}`).classList.add('hidden');
    });

    document.getElementById(`settings-nav-${tabName}`).className = "flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/10 text-primary font-bold text-sm";
    document.getElementById(`settings-content-${tabName}`).classList.remove('hidden');
}

function downloadBackup() {
    const backupData = {
        settings: appSettings,
        state: { statePenilaian, dataPeserta, listKategori, activityLog }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `munaqosyah_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    openAlert("Data cadangan berhasil diunduh.");
}

function resetApplicationData() {
    openConfirm("Anda yakin ingin mereset SEMUA data aplikasi? Tindakan ini tidak dapat diurungkan dan akan menghapus semua data peserta, nilai, dan pengaturan.", (confirmed) => {
        if (confirmed) {
            localStorage.removeItem('munaqosyahState');
            localStorage.removeItem('munaqosyahSettings');
            handleLogout(true);
        }
    });
}

// --- Initialization ---
function handleLogout(skipConfirm = false) {
    if (!skipConfirm) {
        openConfirm("Apakah Anda yakin ingin keluar dari aplikasi?", (confirmed) => {
            if (confirmed) {
                localStorage.removeItem('currentView');
                localStorage.removeItem('currentStudentId');
                localStorage.removeItem('currentKategori');
                localStorage.removeItem('isLoggedIn');
                auth.signOut().catch((error) => console.error('Sign out error', error));
            }
        });
        return;
    }

    localStorage.removeItem('currentView');
    localStorage.removeItem('currentStudentId');
    localStorage.removeItem('currentKategori');
    localStorage.removeItem('isLoggedIn');
    auth.signOut().catch((error) => console.error('Sign out error', error));
}

function generateScoreRadioButtons(radioName) {
    let html = '';
    const scores = [];
    for (let i = 10; i >= 5; i -= 0.5) {
        scores.push(i);
    }
    const kkm = appSettings.kkm || 7; // Get KKM

    scores.forEach(score => {
        const id = `${radioName}-${score.toString().replace('.', '_')}`;

        let labelClasses = "block cursor-pointer select-none rounded-lg p-2 text-center w-12 font-bold border transition-colors ";
        if (score < kkm) {
            labelClasses += "border-red-200 bg-white text-red-600 hover:bg-red-50 peer-checked:bg-red-600 peer-checked:text-white peer-checked:border-red-600";
        } else {
            labelClasses += "border-gray-200 bg-white text-teal-950 hover:bg-gray-50 peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary";
        }

        html += `
        <div>
            <input type="radio" name="${radioName}" id="${id}" value="${score}" class="hidden peer">
            <label for="${id}" class="${labelClasses}">
                ${score}
            </label>
        </div>`;
    });
    return html;
}

function startApp() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Penanganan khusus untuk akun Admin Utama yang di-hardcode
            if (user.email === "jayyidin.admin@munaqosyah.app") {
                currentUser = {
                    uid: user.uid,
                    email: user.email,
                    name: 'Jayyidin',
                    username: 'jayyidin',
                    role: 'Admin Utama',
                    profilePicUrl: null // Default, bisa diupdate nanti
                };

                // Pastikan profil admin utama tersinkronisasi ke dalam database
                db.ref('users/' + user.uid).update({
                    name: 'Jayyidin',
                    email: user.email,
                    role: 'Admin Utama',
                    username: 'jayyidin'
                }).catch(e => console.warn("Peringatan sinkronisasi admin:", e));

                // Coba ambil foto profil jika ada
                db.ref('users/' + user.uid).once('value').then(snapshot => {
                    if (snapshot.exists() && snapshot.val().profilePicUrl) {
                        currentUser.profilePicUrl = snapshot.val().profilePicUrl;
                        applyUserContext();
                    }
                });

                // Lanjutkan inisialisasi aplikasi
                loadSettings(() => {
                    applySettings();
                    applyUserContext();
                    loadState(); // Ini akan memicu initializeAppUI()
                });
                return; // Hentikan eksekusi lebih lanjut untuk admin utama
            }

            // User is signed in. Fetch user role from our database.
            db.ref('users/' + user.uid).once('value').then((snapshot) => {
                if (snapshot.exists()) {
                    const dbUser = snapshot.val();
                    currentUser = {
                        uid: user.uid,
                        email: user.email,
                        name: dbUser.name || 'Pengguna',
                        username: dbUser.username || '',
                        role: dbUser.role || 'Tidak Dikenal',
                        profilePicUrl: dbUser.profilePicUrl || null
                    };
                } else {
                    // MENGGUNAKAN FALLBACK SISTEM: Agar aplikasi tetap berjalan meskipun Firebase Rules bermasalah.
                    console.warn("Data pengguna tidak ditemukan di Database. Menggunakan fallback darurat...");

                    const pendingStr = localStorage.getItem('munaqosyah_pending_user_' + user.uid);
                    let fallbackUsername = user.email ? user.email.split('@')[0] : 'penguji';
                    let fallbackName = fallbackUsername;

                    if (pendingStr) {
                        try {
                            const pendingData = JSON.parse(pendingStr);
                            fallbackName = pendingData.name || fallbackName;
                            fallbackUsername = pendingData.username || fallbackUsername;
                        } catch (e) { }
                    }

                    currentUser = {
                        uid: user.uid,
                        email: user.email,
                        name: fallbackName,
                        username: fallbackUsername,
                        role: 'Guru Penguji',
                        profilePicUrl: null
                    };

                    // Coba perbaiki database di latar belakang
                    db.ref('users/' + user.uid).update({
                        name: currentUser.name,
                        username: currentUser.username,
                        email: currentUser.email,
                        role: currentUser.role
                    }).then(() => {
                        localStorage.removeItem('munaqosyah_pending_user_' + user.uid);
                        db.ref('usernames/' + currentUser.username).set(user.uid).catch(() => { });
                    }).catch(e => console.warn("Pemulihan DB tertunda karena aturan keamanan.", e));
                }

                // Now that we have the user, load settings and then the main app state
                loadSettings(() => {
                    applySettings();
                    applyUserContext();
                    loadState(); // This function now triggers the UI rendering via initializeAppUI()
                });
            }).catch(error => {
                console.error("Akses baca Firebase terblokir:", error);
                // FALLBACK EKSTREM jika akses baca di-deny
                let fallbackUsername = user.email ? user.email.split('@')[0] : 'penguji';
                currentUser = { uid: user.uid, email: user.email, name: fallbackUsername, username: fallbackUsername, role: 'Guru Penguji', profilePicUrl: null };
                loadSettings(() => { applySettings(); applyUserContext(); loadState(); });
            });
        } else {
            // User is signed out. Redirect to login.
            localStorage.removeItem('isLoggedIn');
            window.location.replace('login.html');
        }
    });
}

function initializeAppUI() {
    // --- Pull-to-Refresh Logic untuk Dasbor ---
    const dashMain = document.getElementById('dash-main');
    const dashContent = document.getElementById('dash-content');
    const ptrIndicator = document.getElementById('ptr-indicator');
    const ptrIcon = document.getElementById('ptr-icon');

    let ptrStartY = 0;
    let ptrCurrentY = 0;
    let isPulling = false;
    const ptrThreshold = 70; // Jarak tarik untuk memicu refresh

    if (dashMain && dashContent && ptrIndicator && ptrIcon) {
        dashMain.addEventListener('touchstart', (e) => {
            if (dashMain.scrollTop === 0) {
                ptrStartY = e.touches[0].clientY;
                isPulling = true;
                dashContent.style.transition = 'none';
                ptrIndicator.style.transition = 'none';
            }
        }, { passive: true });

        dashMain.addEventListener('touchmove', (e) => {
            if (!isPulling) return;
            ptrCurrentY = e.touches[0].clientY;
            const pullDistance = ptrCurrentY - ptrStartY;

            if (pullDistance > 0 && dashMain.scrollTop === 0) {
                if (e.cancelable) e.preventDefault(); // Mencegah overscroll bawaan browser
                const visualDistance = Math.min(pullDistance * 0.4, ptrThreshold + 30);

                ptrIndicator.style.height = `${visualDistance}px`;
                ptrIndicator.style.opacity = Math.min(visualDistance / ptrThreshold, 1).toString();
                dashContent.style.transform = `translateY(${visualDistance}px)`;

                if (visualDistance >= ptrThreshold) {
                    ptrIcon.innerText = 'refresh';
                    ptrIcon.classList.add('animate-spin');
                } else {
                    ptrIcon.innerText = 'arrow_downward';
                    ptrIcon.classList.remove('animate-spin');
                }
            } else {
                isPulling = false;
            }
        }, { passive: false });

        dashMain.addEventListener('touchend', () => {
            if (!isPulling) return;
            isPulling = false;
            const pullDistance = ptrCurrentY - ptrStartY;

            dashContent.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
            ptrIndicator.style.transition = 'height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s';

            if (pullDistance >= ptrThreshold && dashMain.scrollTop === 0) {
                // Trigger refresh
                ptrIndicator.style.height = '60px';
                dashContent.style.transform = 'translateY(60px)';
                ptrIcon.innerText = 'refresh';
                ptrIcon.classList.add('animate-spin');

                // Ambil data terbaru dari Firebase
                loadState();

                // Kembalikan tampilan setelah jeda singkat
                setTimeout(() => {
                    ptrIndicator.style.height = '0px';
                    ptrIndicator.style.opacity = '0';
                    dashContent.style.transform = 'translateY(0px)';
                    setTimeout(() => ptrIcon.classList.remove('animate-spin'), 300);
                }, 1000);
            } else {
                // Batal tarik (tidak mencapai threshold)
                ptrIndicator.style.height = '0px';
                ptrIndicator.style.opacity = '0';
                dashContent.style.transform = 'translateY(0px)';
                ptrIcon.classList.remove('animate-spin');
            }
        });
    }

    // Populate score radio buttons
    const radioContainerStandar = document.getElementById('nilai-radio-container-standar');
    if (radioContainerStandar) {
        radioContainerStandar.innerHTML = generateScoreRadioButtons('nilai-standar');
    }
    const radioContainerLembar = document.getElementById('nilai-radio-container-lembar');
    if (radioContainerLembar) {
        radioContainerLembar.innerHTML = generateScoreRadioButtons('nilai-lembar');
    }

    // Initialize Settings Page Event Listeners
    document.getElementById('settings-nav-umum').addEventListener('click', (e) => { e.preventDefault(); switchSettingsTab('umum'); });
    document.getElementById('settings-nav-tampilan').addEventListener('click', (e) => { e.preventDefault(); switchSettingsTab('tampilan'); });
    document.getElementById('settings-nav-data').addEventListener('click', (e) => { e.preventDefault(); switchSettingsTab('data'); });
    document.getElementById('settings-nav-bahaya').addEventListener('click', (e) => { e.preventDefault(); switchSettingsTab('bahaya'); });

    document.getElementById('btn-change-logo').addEventListener('click', () => {
        document.getElementById('input-logo-file').click();
    });

    document.getElementById('input-logo-file').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { openAlert('Harap pilih file gambar (PNG, JPG, SVG).'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            appSettings.logoUrl = e.target.result;
            saveSettings();
            applySettings();
            openAlert('Logo berhasil diperbarui.');
        };
        reader.readAsDataURL(file);
    });

    // Profile Picture Change Logic
    const changePicButtons = [
        document.getElementById('btn-change-profile-pic'),
        document.getElementById('btn-change-profile-pic-laporan'),
        document.getElementById('btn-change-profile-pic-pengaturan')
    ].filter(Boolean);
    const profilePicInput = document.getElementById('input-profile-pic');

    changePicButtons.forEach(btn => {
        btn.addEventListener('click', () => profilePicInput.click());
    });

    profilePicInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { openAlert('Harap pilih file gambar (PNG, JPG).'); return; }

        const reader = new FileReader();
        reader.onload = (e) => {
            const newPicUrl = e.target.result;
            // Upload to Firebase Storage
            const filePath = `profile_pics/${currentUser.uid}/${file.name}`;
            const fileRef = storage.ref(filePath);
            fileRef.putString(newPicUrl, 'data_url').then(() => {
                fileRef.getDownloadURL().then(url => {
                    // Update URL in Realtime Database
                    db.ref('users/' + currentUser.uid).update({ profilePicUrl: url }).then(() => {
                        currentUser.profilePicUrl = url;
                        applyUserContext();
                        openAlert('Foto profil berhasil diperbarui.');
                    });
                });
            }).catch(error => {
                console.error("Upload failed:", error);
                openAlert("Gagal mengunggah foto profil.");
            });
        };
        reader.readAsDataURL(file);
    });

    // Sidebar toggle event listener
    const sidebarToggleButton = document.getElementById('sidebar-toggle');
    if (sidebarToggleButton) {
        sidebarToggleButton.addEventListener('click', (event) => {
            event.preventDefault();
            toggleSidebar();
        });
    }

    // Event listeners for Token Management
    document.getElementById('btn-generate-token')?.addEventListener('click', generateNewToken);
    document.getElementById('btn-copy-token')?.addEventListener('click', copyTokenToClipboard);
    document.getElementById('btn-clear-token')?.addEventListener('click', () => {
        openConfirm("Anda yakin ingin menghapus token pendaftaran? Ini akan menonaktifkan pendaftaran penguji baru.", (confirmed) => {
            if (confirmed) {
                appSettings.registrationToken = null;
                saveSettings();
                renderTokenPendaftaran();
                openAlert("Token pendaftaran berhasil dihapus.");
            }
        });
    });

    document.getElementById('btn-save-settings').addEventListener('click', () => {
        appSettings.appName = document.getElementById('setting-input-app-name').value.replace(' ', '<br>');
        appSettings.schoolName = document.getElementById('setting-input-school-name').value.trim();
        saveSettings();
        applySettings();
        openAlert("Pengaturan berhasil disimpan.");
    });
    document.getElementById('btn-backup-data').addEventListener('click', downloadBackup);
    document.getElementById('btn-reset-data').addEventListener('click', resetApplicationData);

    renderKategoriDropdown();
    renderDashboardFilterOptions();

    document.getElementById('dash-filter-kategori')?.addEventListener('change', renderDashboard);

    let view = localStorage.getItem('currentView') || 'dashboard';
    let studentId = localStorage.getItem('currentStudentId');
    let kategori = localStorage.getItem('currentKategori');

    // Validate access before switching view
    if (view === 'pengaturan' && currentUser.role !== 'Admin Utama') {
        console.warn("Akses tidak sah ke halaman Pengaturan ditolak. Mengalihkan ke dasbor.");
        view = 'dashboard';
        localStorage.setItem('currentView', 'dashboard');
    }

    // Validate the state from localStorage before attempting to render a complex view.
    // If the state is invalid for 'penilaian-detail', reset to a safe default ('ujian' view).
    if (view === 'penilaian-detail') {
        if (!studentId || !kategori || !dataPeserta[kategori] || !dataPeserta[kategori].find(p => p.id === studentId)) {
            console.warn("Mencoba memuat detail penilaian dengan data usang dari localStorage. Mengalihkan ke daftar ujian.");
            view = 'ujian';
            studentId = null;
            kategori = null;
            // Clean up localStorage to prevent this from happening again on next reload
            localStorage.setItem('currentView', 'ujian');
            localStorage.removeItem('currentStudentId');
            localStorage.removeItem('currentKategori');
        }
    }

    // Panggil switchView dengan forceRender = true untuk render paksa pada saat load awal
    switchView(view, studentId, kategori, true);
}

document.addEventListener('DOMContentLoaded', () => {
    startApp();
});
