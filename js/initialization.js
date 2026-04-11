// --- Debounce function for performance ---
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// --- Initialization ---
function handleLogout(skipConfirm = false) {
    if (!skipConfirm) {
        if (typeof openConfirm === 'function') {
            openConfirm("Apakah Anda yakin ingin keluar dari aplikasi?", (confirmed) => {
                if (confirmed) {
                    performLogout();
                }
            });
        } else {
            if (confirm("Apakah Anda yakin ingin keluar?")) performLogout();
        }
        return;
    }
    performLogout();
}

function performLogout() {
    localStorage.removeItem('currentView');
    localStorage.removeItem('currentStudentId');
    localStorage.removeItem('currentKategori');
    localStorage.removeItem('isLoggedIn');
    window.location.replace('login.html');
}

function generateScoreRadioButtons(radioName) {
    let html = '';
    const scores = [];
    for (let i = 10; i >= 5; i -= 0.5) {
        scores.push(i);
    }
    const kkm = (typeof appSettings !== 'undefined' ? appSettings.kkm : 7) || 7;

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
    console.log("[INIT] Memulai startApp...");
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                currentUser = JSON.parse(savedUser);
            } catch(e) { console.error("Error parsing current user", e); }
        }
        
        if (!currentUser) {
            currentUser = { uid: 'admin-1', email: 'jayyidin@admin.com', name: 'Jayyidin', username: 'jayyidin', role: 'Admin Utama', profilePicUrl: null };
        }

        if (typeof loadSettings === 'function') {
            loadSettings(() => {
                if (typeof applySettings === 'function') applySettings();
                if (typeof applyUserContext === 'function') applyUserContext();
                if (typeof loadState === 'function') loadState();
                else {
                    console.error("[ERROR] loadState function is missing!");
                    hideLoaderFallback();
                }
            });
        } else {
            console.error("[ERROR] loadSettings function is missing!");
            hideLoaderFallback();
        }
    } else {
        window.location.replace('login.html');
    }
}

function hideLoaderFallback() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.classList.add('opacity-0', 'pointer-events-none');
    }
}

function initializeAppUI() {
    console.log("[INIT] Menjalankan initializeAppUI...");
    
    // --- Pull-to-Refresh Logic ---
    const dashMain = document.getElementById('dash-main');
    const dashContent = document.getElementById('dash-content');
    const ptrIndicator = document.getElementById('ptr-indicator');
    const ptrIcon = document.getElementById('ptr-icon');

    if (dashMain && dashContent && ptrIndicator && ptrIcon) {
        // ... (PTR logic omitted for brevity but I should keep it for the user)
        setupPullToRefresh(dashMain, dashContent, ptrIndicator, ptrIcon);
    }

    // --- Data Synchronization ---
    syncDataStructures();

    // --- Event Listeners and UI Population ---
    setupUIListeners();
    
    // --- Restore Settings Tab ---
    if (typeof switchSettingsTab === 'function') {
        const savedSettingsTab = localStorage.getItem('currentSettingsTab') || 'umum';
        switchSettingsTab(savedSettingsTab);
    }

    // --- Determine Active View ---
    let savedView = localStorage.getItem('currentView');
    const validViews = ['dashboard', 'peserta', 'laporan', 'ujian', 'pengaturan', 'penilaian-detail'];
    if (!savedView || !validViews.includes(savedView)) savedView = 'dashboard';

    if (typeof switchView === 'function') {
        switchView(savedView, null, null, true);
    }
}

function syncDataStructures() {
    if (typeof masterSurat === 'undefined' || typeof dataSurat === 'undefined') return;

    const defaultDataSurat = {
        "Juz 30 (Amma)": [masterSurat.find(s => s.no === 1), ...masterSurat.filter(s => typeof s.no === 'number' && s.no >= 78 && s.no <= 114).reverse()].filter(Boolean),
        "Juz 29 (Tabarak)": masterSurat.filter(s => typeof s.no === 'number' && s.no >= 67 && s.no <= 77).reverse().filter(Boolean),
        "Juz 28": masterSurat.filter(s => typeof s.no === 'number' && s.no >= 58 && s.no <= 66).reverse().filter(Boolean),
        "Juz 27": masterSurat.filter(s => typeof s.no === 'number' && s.no >= 51 && s.no <= 57).reverse().filter(Boolean),
        "Tartil Dasar": [...masterSurat.filter(s => typeof s.no === 'string' && s.no.startsWith('M')), masterSurat.find(s => s.no === 1), ...masterSurat.filter(s => typeof s.no === 'number' && s.no >= 87 && s.no <= 114).reverse()].filter(Boolean),
        "Juz 1": masterSurat.filter(s => typeof s.no === 'string' && s.no.startsWith('L') && parseInt(s.no.substring(1)) <= 11).filter(Boolean),
        "Juz 2": masterSurat.filter(s => typeof s.no === 'string' && s.no.startsWith('L') && parseInt(s.no.substring(1)) >= 12 && parseInt(s.no.substring(1)) <= 21).filter(Boolean),
        "Al-Baqarah (Utuh)": masterSurat.filter(s => typeof s.no === 'string' && s.no.startsWith('L') && parseInt(s.no.substring(1)) <= 25).filter(Boolean)
    };

    let isUpdated = false;
    Object.keys(defaultDataSurat).forEach(kat => {
        const currentKatData = dataSurat[kat];
        if (!currentKatData || !Array.isArray(currentKatData) || currentKatData.length === 0) {
            dataSurat[kat] = defaultDataSurat[kat];
            isUpdated = true;
        }
    });

    const defaultKategori = [
        { nama: "Juz 27", tipe: "standar", isSystem: false },
        { nama: "Juz 1", tipe: "lembar", isSystem: false },
        { nama: "Juz 2", tipe: "lembar", isSystem: false },
        { nama: "Al-Baqarah (Utuh)", tipe: "lembar", isSystem: false }
    ];
    
    let isKategoriUpdated = false;
    if (typeof listKategori !== 'undefined') {
        defaultKategori.forEach(newKat => {
            if (!listKategori.some(k => k.nama === newKat.nama)) {
                listKategori.push(newKat);
                isKategoriUpdated = true;
                isUpdated = true;
            }
        });
    }

    if (isUpdated && typeof window.saveLocalState === 'function') {
        window.saveLocalState();
    }
    if (isKategoriUpdated) {
        if (typeof renderKategoriDropdown === 'function') renderKategoriDropdown();
        if (typeof renderDashboardFilterOptions === 'function') renderDashboardFilterOptions();
    }
}

function setupUIListeners() {
    // --- Search Inputs ---
    const pairs = [
        ['search-peserta', typeof filterPeserta !== 'undefined' ? filterPeserta : null],
        ['search-ujian', typeof filterUjianPeserta !== 'undefined' ? filterUjianPeserta : null],
        ['search-surat', typeof renderDaftarSuratDetail !== 'undefined' ? renderDaftarSuratDetail : null],
        ['laporan-search', typeof renderLaporanPage !== 'undefined' ? renderLaporanPage : null]
    ];

    pairs.forEach(([id, func]) => {
        const el = document.getElementById(id);
        if (el && func) {
            el.addEventListener('input', debounce(func, 350));
        }
    });

    // --- Radio Buttons ---
    const containers = [
        ['nilai-radio-container-standar', 'nilai-standar'],
        ['nilai-radio-container-lembar', 'nilai-lembar']
    ];
    containers.forEach(([id, name]) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = generateScoreRadioButtons(name);
    });

    // --- Settings Nav ---
    ['umum', 'tampilan', 'data', 'bahaya'].forEach(tab => {
        const el = document.getElementById(`settings-nav-${tab}`);
        if (el && typeof switchSettingsTab === 'function') {
            el.addEventListener('click', (e) => { e.preventDefault(); switchSettingsTab(tab); });
        }
    });

    // --- Other ---
    const btnChangeLogo = document.getElementById('btn-change-logo');
    if (btnChangeLogo) {
        btnChangeLogo.addEventListener('click', () => {
            const input = document.getElementById('input-logo-file');
            if (input) input.click();
        });
    }
}

function setupPullToRefresh(dashMain, dashContent, ptrIndicator, ptrIcon) {
    let ptrStartY = 0;
    let ptrCurrentY = 0;
    let isPulling = false;
    const ptrThreshold = 70;

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
            if (e.cancelable) e.preventDefault();
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
            ptrIndicator.style.height = '60px';
            dashContent.style.transform = 'translateY(60px)';
            ptrIcon.innerText = 'refresh';
            ptrIcon.classList.add('animate-spin');
            if (typeof loadState === 'function') loadState();
            setTimeout(() => {
                ptrIndicator.style.height = '0px';
                ptrIndicator.style.opacity = '0';
                dashContent.style.transform = 'translateY(0px)';
                setTimeout(() => ptrIcon.classList.remove('animate-spin'), 300);
            }, 1000);
        } else {
            ptrIndicator.style.height = '0px';
            ptrIndicator.style.opacity = '0';
            dashContent.style.transform = 'translateY(0px)';
            ptrIcon.classList.remove('animate-spin');
        }
    });
}

// --- Entry Point ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
} else {
    setTimeout(startApp, 1);
}
