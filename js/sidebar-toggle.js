// --- Sidebar Toggle ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
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
    } else {
        const texts = sidebar.querySelectorAll('.sidebar-text');
        const toggleIcon = document.getElementById('sidebar-toggle-icon');
        const navLinks = sidebar.querySelectorAll('nav a, .p-4 a');

        if (sidebar.classList.contains('w-64')) {
            sidebar.classList.remove('w-64');
            sidebar.classList.add('w-20');
            
            texts.forEach(t => t.classList.add('hidden'));
            navLinks.forEach(link => {
                link.classList.remove('px-3');
                link.classList.add('justify-center');
            });

            if (toggleIcon) toggleIcon.textContent = 'menu';
        } else {
            sidebar.classList.remove('w-20');
            sidebar.classList.add('w-64');
            
            texts.forEach(t => t.classList.remove('hidden'));
            navLinks.forEach(link => {
                link.classList.remove('justify-center');
                link.classList.add('px-3');
            });

            if (toggleIcon) toggleIcon.textContent = 'menu_open';
        }
    }
}

function getCurrentVisibleView() {
    const views = ['dashboard', 'peserta', 'ujian', 'laporan', 'pengaturan', 'penilaian-detail'];
    for (const v of views) { if (document.getElementById(`view-${v}`) && !document.getElementById(`view-${v}`).classList.contains('hidden')) return v; }
    return null;
}

function refreshRealtimeUI() {
    applySettings();
    applyUserContext();
    renderKategoriDropdown();
    renderDashboardFilterOptions();

    const activeView = getCurrentVisibleView();

    if (activeView === 'dashboard') {
        renderDashboard();
    } else if (activeView === 'peserta') {
        updateBulkActionBar();
        updateQuickStats();
        renderTablePeserta();
    } else if (activeView === 'ujian') {
                if (typeof window.filterUjianPeserta === 'function') {
                    window.filterUjianPeserta();
                }
    } else if (activeView === 'penilaian-detail') {
        window.renderPenilaianDetailHeader();
        window.renderDaftarSuratDetail();
    } else if (activeView === 'laporan') {
        setupLaporanFilters();
        renderLaporanPage();
    } else if (activeView === 'pengaturan') {
        switchSettingsTab(localStorage.getItem('currentSettingsTab') || 'umum');
    }

    if (!document.getElementById('modal-kategori')?.classList.contains('hidden')) {
        renderKategoriEditList();
    }
    if (!document.getElementById('modal-kelas')?.classList.contains('hidden')) {
        renderKelasEditList();
    }
    if (!document.getElementById('modal-tanggal-ujian')?.classList.contains('hidden')) {
        renderTanggalUjianList();
    }
    if (!document.getElementById('modal-token-pendaftaran')?.classList.contains('hidden')) {
        renderTokenPendaftaran();
    }
    if (!document.getElementById('modal-akun-penguji')?.classList.contains('hidden')) {
        renderAkunPengujiList();
    }
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
            if (backdrop) backdrop.classList.replace('block', 'hidden');
        }
    }

    setTimeout(() => {
        try {
            localStorage.setItem('currentView', viewName);
            ['dashboard', 'peserta', 'ujian', 'laporan', 'pengaturan', 'penilaian-detail'].forEach(v => {
                if (document.getElementById(`view-${v}`)) document.getElementById(`view-${v}`).classList.add('hidden');
            });
            if (document.getElementById(`view-${viewName}`)) document.getElementById(`view-${viewName}`).classList.remove('hidden');

            const navs = ['dashboard', 'peserta', 'ujian', 'laporan', 'pengaturan'];
            navs.forEach(n => {
                const el = document.getElementById('nav-' + n);
                if (el) {
                    const isActive = viewName === n || (viewName === 'penilaian-detail' && n === 'ujian');
                    const isCollapsed = document.getElementById('sidebar')?.classList.contains('w-20');
                    let baseClass = isActive 
                        ? "flex items-center gap-3 py-2.5 rounded-xl bg-primary text-white shadow-md shadow-primary/20 transition-all group relative" 
                        : "flex items-center gap-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-teal-950 transition-all group";
                    
                    baseClass += isCollapsed ? " justify-center" : " px-3";
                    el.className = baseClass;
                }

                const mobileEl = document.getElementById('mobile-nav-' + n);
                if (mobileEl) {
                    const isActive = viewName === n || (viewName === 'penilaian-detail' && n === 'ujian');
                    if (isActive) {
                        mobileEl.className = "flex flex-col items-center p-2 text-primary transition-all min-w-[60px] scale-110";
                        if (mobileEl.querySelector('.material-symbols-outlined')) mobileEl.querySelector('.material-symbols-outlined').style.fontVariationSettings = "'FILL' 1, 'wght' 600";
                        const spanTxt = mobileEl.querySelector('span:last-child');
                        if (spanTxt) spanTxt.className = "text-[10px] font-bold";
                    } else {
                        mobileEl.className = "flex flex-col items-center p-2 text-gray-400 hover:text-teal-700 transition-all min-w-[60px]";
                        if (mobileEl.querySelector('.material-symbols-outlined')) mobileEl.querySelector('.material-symbols-outlined').style.fontVariationSettings = "";
                        const spanTxt = mobileEl.querySelector('span:last-child');
                        if (spanTxt) spanTxt.className = "text-[10px] font-semibold";
                    }
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
                    if (listKategori.length > 0 && !currentState.kategori) {
                        currentState.kategori = listKategori[0].nama;
                    }
                    renderKategoriDropdown();
                    
                    if (typeof window.filterUjianPeserta === 'function') {
                        window.filterUjianPeserta();
                    }
            }
            else if (viewName === 'penilaian-detail') {
                currentState.studentId = studentId;
                currentState.kategori = kategori;
                localStorage.setItem('currentStudentId', studentId);
                localStorage.setItem('currentKategori', kategori);
                if (typeof window.renderPenilaianDetailHeader === 'function') window.renderPenilaianDetailHeader();
                segmenAktif = 'Semua';
                renderSegmenTabs();
                if (typeof window.renderDaftarSuratDetail === 'function') window.renderDaftarSuratDetail();
            }
            else if (viewName === 'laporan') {
                laporanPagination.currentPage = 1;
                if (document.getElementById('laporan-search')) document.getElementById('laporan-search').value = '';
                setupLaporanFilters();
                renderLaporanPage();
            }
            else if (viewName === 'pengaturan') {
                applySettings(); // Populate inputs when view is switched to
                switchSettingsTab(localStorage.getItem('currentSettingsTab') || 'umum'); // Kembalikan ke tab terakhir
            }
        } catch (error) {
            console.error("Error during switchView:", error);
        } finally {
            loader.classList.remove('opacity-100');
            loader.classList.add('opacity-0', 'pointer-events-none');
        }
    }, 300);
    }
