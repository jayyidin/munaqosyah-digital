// --- NEW DASHBOARD LOGIC ---
window.pesertaPagination = window.pesertaPagination || { currentPage: 1, itemsPerPage: 12, totalPages: 0, totalItems: 0 };
window.dashboardSiswaPerhatianPagination = window.dashboardSiswaPerhatianPagination || { currentPage: 1, itemsPerPage: 5, totalPages: 0, totalItems: 0 };
window.selectedPeserta = window.selectedPeserta || [];

// Penyesuaian Global untuk Kalkulasi Status dan Laporan
window.getStatusPeserta = function (id, kategori, semesterOverride) {
    window.pulihkanCurrentState();
    const semester = semesterOverride || window.currentState.semester;
    let progress = 0, completed = 0, total = 0;
    let items = typeof window.getMateriList === 'function' ? window.getMateriList(kategori) : [];

    if (items && items.length > 0) {
        total = items.length;
        items.forEach(item => {
            const keyBaru = `${semester}_${id}_${item.no}`;
            const keyLama = `${id}_${item.no}`;
            if ((typeof statePenilaian !== 'undefined') && (statePenilaian[keyBaru] !== undefined || statePenilaian[keyLama] !== undefined)) {
                completed++;
            }
        });
        progress = Math.round((completed / total) * 100);
    }
    let color = progress === 0 ? 'border-gray-200 bg-gray-50 text-gray-500' : (progress === 100 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-primary bg-primary/10 text-primary');
    let text = progress === 0 ? 'Belum Ujian' : (progress === 100 ? 'Selesai' : 'Sedang Ujian');
    return { progress, completed, total, color, text };
};

window.getLaporanData = function (semesterOverride = null) {
    window.pulihkanCurrentState();
    const semester = semesterOverride || window.currentState.semester;
    if (!semester || typeof dataPeserta === 'undefined') return [];

    let allData = [];
    const kkm = (typeof appSettings !== 'undefined' && appSettings.kkm) ? parseFloat(appSettings.kkm) : 7.0;

    Object.keys(dataPeserta).forEach(key => {
        let kat = key;
        let studentDocSemester = null;
        if (key.includes('_')) {
            const firstUnderscore = key.indexOf('_');
            studentDocSemester = key.substring(0, firstUnderscore);
            kat = key.substring(firstUnderscore + 1);
        }
        if (studentDocSemester && studentDocSemester !== semester) return; // Abaikan data semester lain

        let list = dataPeserta[key];
        if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
        if (!Array.isArray(list)) list = [];

        list.forEach(p => {
            if (!p || typeof p !== 'object' || !p.nama) return;
            if (!p.id) p.id = `FIX-${Math.random().toString(36).substring(2, 9)}`;
            // Mencegah duplikasi data siswa jika ada format key lama & baru sekaligus
            if (allData.some(existing => existing.id === p.id && existing.kategori === kat)) return;

            const status = window.getStatusPeserta(p.id, kat, semester);
            let totalNilai = 0, jumlahPenilaian = 0;
            let adaNilaiDiBawahKKM = false;

            Object.keys(statePenilaian || {}).forEach(key => {
                const keyBaru = `${semester}_${p.id}_`;
                const keyLama = `${p.id}_`;
                if (key.startsWith(keyBaru) || (!key.includes(semester) && key.startsWith(keyLama))) {
                    // Lewati data peta kesalahan (array) lembaran agar kalkulasi nilai tidak menjadi NaN (Not a Number)
                    if (key.endsWith('_lembar')) return;
                    const surahNo = key.startsWith(keyBaru) ? key.split('_')[2] : key.split('_')[1];
                    if (window.getMateriList(kat).some(i => String(i.no) === String(surahNo))) {
                        const n = statePenilaian[key].nilai;
                        if (n !== undefined) {
                            totalNilai += n;
                            jumlahPenilaian++;
                            if (n < kkm) adaNilaiDiBawahKKM = true;
                        }
                    }
                }
            });

            const avg = jumlahPenilaian > 0 ? parseFloat((totalNilai / jumlahPenilaian).toFixed(1)) : 0;

            // Syarat lulus baru: Semua materi tuntas diuji (100%) dan tidak ada nilai di bawah KKM
            const lulus = status.progress === 100 && !adaNilaiDiBawahKKM;

            let predikat = { text: 'Belum Lulus', color: 'text-gray-500', icon: '' };
            if (status.progress > 0) {
                if (!lulus) {
                    if (adaNilaiDiBawahKKM) predikat = { text: 'Remedial', color: 'text-red-500', icon: 'warning' };
                    else predikat = { text: 'Belum Selesai', color: 'text-gray-500', icon: 'hourglass_empty' };
                } else {
                    if (avg >= 9) predikat = { text: 'Mumtaz', color: 'text-amber-500', icon: 'workspace_premium' };
                    else if (avg >= 8) predikat = { text: 'Jayyid Jiddan', color: 'text-emerald-500', icon: 'verified' };
                    else if (avg >= 7) predikat = { text: 'Jayyid', color: 'text-blue-500', icon: 'thumb_up' };
                    else if (avg >= 6) predikat = { text: 'Maqbul', color: 'text-orange-400', icon: 'check_circle' };
                    else predikat = { text: 'Rasib', color: 'text-red-500', icon: 'cancel' };
                }
            }
            allData.push({ ...p, kategori: kat, semester: semester, progress: status.progress, completed: status.completed, totalMateri: status.total, totalNilai, jumlahPenilaian, avg, lulus, predikat, adaNilaiDiBawahKKM });
        });
    });
    return allData;
};

function calculateDashboardStats(semester, filterKategori = "") {
    if (!semester || !dataPeserta) return null;

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

        let pesertaDiKategori = [];
        Object.keys(dataPeserta).forEach(key => {
            let studentDocSemester = null;
            let kat = key;
            if (key.includes('_')) {
                const firstUnderscore = key.indexOf('_');
                studentDocSemester = key.substring(0, firstUnderscore);
                kat = key.substring(firstUnderscore + 1);
            }

            if (studentDocSemester && studentDocSemester !== semester) return;

            if (kat === namaKategori) {
                let list = dataPeserta[key];
                if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
                if (Array.isArray(list)) list.forEach(p => { if (p && p.nama) pesertaDiKategori.push(p); });
            }
        });
        // Deduplicate locally for statistics accuracy just in case
        pesertaDiKategori = pesertaDiKategori.filter((p, index, self) => index === self.findIndex(t => (t.id || t.nama) === (p.id || p.nama)));

        if (pesertaDiKategori.length === 0 && !filterKategori) return;

        let katStats = {
            nama: namaKategori,
            total: pesertaDiKategori.length,
            selesai: 0,
            sedang: 0,
            totalSemuaNilai: 0,
            jumlahSemuaPenilaian: 0
        };

        pesertaDiKategori.forEach(p => {
            stats.totalPeserta++;
            const status = getStatusPeserta(p.id, namaKategori, semester);
            if (status.progress === 100) katStats.selesai++;
            else if (status.progress > 0) katStats.sedang++;

            let totalNilaiPeserta = 0;
            let jumlahPenilaianPeserta = 0;
            Object.keys(statePenilaian).forEach(key => {
                if (key.startsWith(`${semester}_${p.id}_`)) {
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
                katStats.totalSemuaNilai += totalNilaiPeserta;
                katStats.jumlahSemuaPenilaian += jumlahPenilaianPeserta;
            }
        });

        stats.selesai += katStats.selesai;
        stats.sedang += katStats.sedang;

        const progressSelesai = katStats.total > 0 ? Math.round((katStats.selesai / katStats.total) * 100) : 0;
        stats.progresPerKategori.push({ ...katStats, progressSelesai });

        if (katStats.jumlahSemuaPenilaian > 0) {
            stats.rataRataPerKategori.push({
                nama: namaKategori,
                avg: parseFloat((katStats.totalSemuaNilai / katStats.jumlahSemuaPenilaian).toFixed(1))
            });
        }
    });

    stats.belum = stats.totalPeserta - stats.selesai - stats.sedang;

    semuaPesertaDenganNilai.sort((a, b) => b.avg - a.avg);
    stats.leaderboard = semuaPesertaDenganNilai.slice(0, 5);

    return stats;
}

function updateDashboardGreeting() {
    const greetingEl = document.getElementById('dash-greeting');
    if (!greetingEl) return;
    const hour = new Date().getHours();
    let sapaan = 'Selamat Malam';
    if (hour >= 4 && hour < 11) sapaan = 'Selamat Pagi';
    else if (hour >= 11 && hour < 15) sapaan = 'Selamat Siang';
    else if (hour >= 15 && hour < 18) sapaan = 'Selamat Sore';

    const nama = typeof currentUser !== 'undefined' && currentUser ? (currentUser.name || currentUser.username) : 'Pengguna';
    const namaPanggilan = nama.split(' ')[0]; // Hanya ambil nama depan

    greetingEl.innerHTML = `${sapaan}, <span class="text-primary">${namaPanggilan}</span>! 👋`;
}

function renderDashboard() {
    window.pulihkanCurrentState();
    const filter = document.getElementById('dash-filter-kategori').value;
    const semester = window.currentState.semester;
    const stats = calculateDashboardStats(semester, filter);

    updateDashboardGreeting();
    renderProgresDetail(stats);
    renderAktivitasTerbaru();
    renderRingkasanGrafik(stats);
    renderPapanPeringkat(stats);
    renderGuruPengujiDashboard();
    renderGrafikRataRata(stats);
    renderSiswaPerluPerhatianDashboard(semester, filter);
}

function renderProgresDetail(stats) {
    const container = document.getElementById('dash-progres-kategori');
    if (!container) return;
    if (!stats) { container.innerHTML = '<p class="text-center text-sm text-gray-400 py-4 italic">Pilih semester untuk melihat data.</p>'; return; }
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

    if (typeof window.activityLog === 'undefined') window.activityLog = [];
    // Menyimpan index asli (agar tidak salah hapus) sebelum di-filter
    const penilaianLog = window.activityLog
        .map((log, index) => ({ ...log, originalIndex: index }))
        .filter(log => log.type === 'penilaian')
        .slice(0, 5);

    if (penilaianLog.length === 0) {
        html = '<p class="text-center text-sm text-gray-400 py-4 italic">Belum ada aktivitas penilaian hari ini.</p>';
    } else {
        const isAdmin = typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'Admin Utama';

        penilaianLog.forEach(log => {
            const deleteBtn = isAdmin ? `<button onclick="event.stopPropagation(); window.hapusAktivitas(${log.originalIndex})" class="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0" title="Hapus Aktivitas"><span class="material-symbols-outlined text-base">delete</span></button>` : '';

            html += `
            <div class="flex items-center justify-between p-2 hover:bg-gray-50 active:scale-[0.98] active:bg-gray-100 rounded-xl transition-all duration-200 cursor-pointer group">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-lg">edit_note</span>
                    </div>
                    <div>
                        <p class="text-sm font-bold text-teal-950 leading-tight">${log.data.nama}</p>
                        <p class="text-[11px] text-gray-500">Dinilai pada materi <span class="font-semibold text-gray-600">${log.data.materi}</span> oleh ${log.data.penguji}.</p>
                    </div>
                </div>
                <div class="flex items-center">
                    <div class="text-right shrink-0 ml-2">
                        <span class="text-lg font-black text-primary">${log.data.nilai}</span>
                        <p class="text-[10px] text-gray-400">${log.waktu}</p>
                    </div>
                    ${deleteBtn}
                </div>
            </div>`;
        });
    }
    container.innerHTML = html;
}

window.hapusAktivitas = function (index) {
    const proceed = () => {
        if (typeof window.activityLog === 'undefined') window.activityLog = [];
        if (index > -1 && index < window.activityLog.length) {
            window.activityLog.splice(index, 1);
            db.collection('appData').doc('activityLog').set({ log: window.activityLog }, { merge: true })
                .then(() => renderAktivitasTerbaru())
                .catch(err => { if (typeof openAlert !== 'undefined') openAlert("Gagal menghapus aktivitas: " + err.message); });
        }
    };

    if (typeof openConfirm !== 'undefined') {
        openConfirm("Apakah Anda yakin ingin menghapus log aktivitas ini?", (yes) => { if (yes) proceed(); });
    } else if (confirm("Apakah Anda yakin ingin menghapus log aktivitas ini?")) {
        proceed();
    }
};

function renderRingkasanGrafik(stats) {
    const ctx = document.getElementById('dash-chart-donut');
    if (!ctx) return;
    if (!stats) { if (window.progressDonutChart) window.progressDonutChart.destroy(); return; }
    if (window.progressDonutChart) window.progressDonutChart.destroy();
    window.progressDonutChart = new Chart(ctx, {
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
    if (!stats) { container.innerHTML = '<p class="text-center text-xs py-4 text-gray-400 italic">Pilih semester.</p>'; return; }
    let html = '';
    if (stats.leaderboard.length === 0) {
        html = '<p class="text-center text-xs py-4 text-gray-400 italic">Belum ada data nilai.</p>';
    } else {
        stats.leaderboard.forEach((p, index) => {
            const medalColors = ['text-amber-400', 'text-gray-400', 'text-orange-400'];
            const rankIcon = index < 3
                ? `<span class="material-symbols-outlined ${medalColors[index]}">military_tech</span>`
                : `<span class="w-6 text-center font-bold text-gray-400">${index + 1}</span>`;

            html += `
            <div class="flex items-center gap-3 p-2 hover:bg-gray-50 active:scale-[0.98] active:bg-gray-100 rounded-lg transition-all duration-200 cursor-pointer">
                <div class="w-6 flex justify-center">${rankIcon}</div>
                <div class="w-9 h-9 rounded-full ${p.warna} flex items-center justify-center font-bold text-xs shrink-0">${p.inisial}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-bold text-teal-950 truncate">${p.nama}</p>
                    <p class="text-[11px] text-gray-500">${p.kategori}</p>
                </div>
                <span class="text-lg font-black text-primary">${p.avg}</span>
            </div>`;
        });
    }
    container.innerHTML = html;
}

function renderGuruPengujiDashboard() {
    const container = document.getElementById('dash-guru-penguji');
    if (!container) return;
    container.innerHTML = '<p class="text-center text-xs text-gray-400 italic">Memuat data guru...</p>';

    const localUsersStr = localStorage.getItem('localUsers');
    let pengujiList = [];

    if (typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'Guru Penguji') {
        pengujiList.push(currentUser);
    }

    if (localUsersStr) {
        const localUsers = JSON.parse(localUsersStr);
        for (const uid in localUsers) {
            if (localUsers[uid].role === 'Guru Penguji' && (!currentUser || localUsers[uid].username !== currentUser.username)) {
                pengujiList.push(localUsers[uid]);
            }
        }
    }

    let html = '';
    if (pengujiList.length === 0) {
        html = '<p class="text-center text-xs text-gray-400 py-4 italic">Belum ada guru penguji yang terdaftar.</p>';
    } else {
        pengujiList.forEach(user => {
            const avatarSrc = user.profilePicUrl || `https://ui-avatars.com/api/?name=${user.name || 'P'}&background=cfe6f2&color=071e27`;
            html += `
                <div class="flex items-center gap-3 p-2 hover:bg-gray-50 active:scale-[0.98] active:bg-gray-100 rounded-lg transition-all duration-200 cursor-pointer">
                    <img src="${avatarSrc}" alt="Avatar" class="w-9 h-9 rounded-full object-cover bg-gray-200">
                    <div>
                        <p class="text-sm font-bold text-teal-950 leading-tight">${user.name}</p>
                        <p class="text-[11px] text-gray-500">${user.username}</p>
                    </div>
                </div>`;
        });
    }
    container.innerHTML = html;
}

function renderGrafikRataRata(stats) {
    const ctx = document.getElementById('dash-chart-bar');
    if (!ctx) return;
    if (!stats) { if (window.avgBarChart) window.avgBarChart.destroy(); return; }
    if (window.avgBarChart) window.avgBarChart.destroy();
    window.avgBarChart = new Chart(ctx, {
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

function renderSiswaPerluPerhatianDashboard(semester, filterKategori = "") {
    const container = document.getElementById('dash-siswa-perhatian');
    if (!container) return;
    if (!semester) { container.innerHTML = '<p class="text-center text-sm text-gray-400 py-4 italic">Pilih semester.</p>'; return; }

    const allData = getLaporanData(semester);
    // Tampilkan siswa yang punya materi di bawah KKM
    let perluPerhatian = allData.filter(s => s.adaNilaiDiBawahKKM && s.progress > 0);
    if (filterKategori) {
        perluPerhatian = perluPerhatian.filter(s => s.kategori === filterKategori);
    }
    perluPerhatian.sort((a, b) => a.avg - b.avg);

    dashboardSiswaPerhatianPagination.totalItems = perluPerhatian.length;
    dashboardSiswaPerhatianPagination.totalPages = Math.ceil(dashboardSiswaPerhatianPagination.totalItems / dashboardSiswaPerhatianPagination.itemsPerPage);
    if (dashboardSiswaPerhatianPagination.currentPage > dashboardSiswaPerhatianPagination.totalPages) {
        dashboardSiswaPerhatianPagination.currentPage = dashboardSiswaPerhatianPagination.totalPages || 1;
    }

    const startIndex = (dashboardSiswaPerhatianPagination.currentPage - 1) * dashboardSiswaPerhatianPagination.itemsPerPage;
    const paginatedData = perluPerhatian.slice(startIndex, startIndex + dashboardSiswaPerhatianPagination.itemsPerPage);

    const kkm = (typeof appSettings !== 'undefined' && appSettings.kkm) ? parseFloat(appSettings.kkm) : 7.0;

    let html = '';
    if (paginatedData.length === 0) {
        html = '<p class="text-center text-sm text-gray-400 py-4 italic">Tidak ada siswa yang perlu perhatian saat ini. Kerja bagus!</p>';
    } else {
        paginatedData.forEach(p => {
            const selisihInfo = p.adaNilaiDiBawahKKM ? `<p class="text-[9px] text-red-400 mt-0.5 font-bold">Ada nilai remedial</p>` : '';

            html += `
            <div class="flex items-center justify-between p-2 hover:bg-gray-50 active:scale-[0.98] active:bg-gray-100 rounded-xl transition-all duration-200 cursor-pointer">
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
                    ${selisihInfo}
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
    if (page < 1 || page > dashboardSiswaPerhatianPagination.totalPages) return;
    dashboardSiswaPerhatianPagination.currentPage = page;
    const filter = document.getElementById('dash-filter-kategori')?.value || "";
    const semester = window.currentState.semester;
    renderSiswaPerluPerhatianDashboard(semester, filter);
}

window.renderDashboardFilterOptions = function () {
    const select = document.getElementById('dash-filter-kategori');
    if (!select) return;
    let html = '<option value="">Semua Kategori</option>';
    listKategori.forEach(k => { html += `<option value="${k.nama}">${k.nama}</option>`; });
    select.innerHTML = html;
}

window.filterPeserta = function () {
    pesertaPagination.currentPage = 1;
    if (typeof window.renderTablePeserta === 'function') window.renderTablePeserta();
    if (typeof window.updateQuickStats === 'function') window.updateQuickStats(); // Sinkronisasi gaya kartu jika filter diubah manual
}

// Helper untuk selalu mengupdate dropdown kelas sesuai master data
function populateFiltersPeserta() {
    const filterKelas = document.getElementById('filter-tabel-kelas');
    const semester = window.currentState.semester;

    if (filterKelas && typeof listKelas !== 'undefined') {
        const currentVal = filterKelas.value;
        filterKelas.innerHTML = '<option value="">Semua Kelas</option>' + listKelas.sort().map(k => `<option value="${k}">${k}</option>`).join('');
        filterKelas.value = currentVal;
    }

    const filterPembimbing = document.getElementById('filter-tabel-pembimbing');
    if (filterPembimbing && typeof dataPeserta !== 'undefined' && semester) {
        const currentVal = filterPembimbing.value;
        const pembimbingSet = new Set();
        listKategori.forEach(k => {
            let list = dataPeserta[`${semester}_${k.nama}`] || dataPeserta[k.nama];
            if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
            if (!Array.isArray(list)) list = [];
            list.forEach(p => { if (p.pembimbing) pembimbingSet.add(p.pembimbing); });
        });
        const pembimbingList = Array.from(pembimbingSet).sort();
        filterPembimbing.innerHTML = '<option value="">Semua Pembimbing</option>' + pembimbingList.map(k => `<option value="${k}">${k}</option>`).join('');
        filterPembimbing.value = currentVal;
    }
}

window.renderTablePeserta = function (skipSkeleton = false) {
    if (typeof window.pulihkanCurrentState === 'function') window.pulihkanCurrentState();
    const container = document.getElementById('container-peserta-cards');
    let semester = window.currentState?.semester || localStorage.getItem('currentSemester');
    if (!container) return;

    // 1. Render Skeleton UI immediately
    let skeletonHtml = '';
    // Batasi skeleton maksimal 12 agar tidak memberatkan DOM jika user memilih 50/100 baris per halaman
    const skeletonCount = pesertaPagination.itemsPerPage > 0 ? Math.min(pesertaPagination.itemsPerPage, 12) : 8;
    for (let i = 0; i < skeletonCount; i++) {
        skeletonHtml += `
        <div class="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm animate-pulse flex flex-col h-[200px]">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-11 h-11 rounded-2xl bg-gray-100"></div>
                    <div>
                        <div class="h-4 bg-gray-100 rounded w-32 mb-2"></div>
                        <div class="h-3 bg-gray-100 rounded w-24"></div>
                    </div>
                </div>
                <div class="w-5 h-5 bg-gray-100 rounded-md"></div>
            </div>
            <div class="mt-auto space-y-4">
                <div class="bg-gray-50 rounded-[16px] p-3 h-12 w-full"></div>
                <div class="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div class="h-4 bg-gray-100 rounded w-20"></div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-xl bg-gray-100"></div>
                        <div class="w-8 h-8 rounded-xl bg-gray-100"></div>
                    </div>
                </div>
            </div>
        </div>`;
    }
    if (!skipSkeleton) {
        container.innerHTML = skeletonHtml;
        document.getElementById('pagination-peserta').innerHTML = ''; // Clear pagination while loading
    }

    // Batalkan render sebelumnya jika ada data masuk bertubi-tubi (Mencegah Race Condition)
    if (window.renderPesertaTimeout) clearTimeout(window.renderPesertaTimeout);

    // 2. Defer data processing and rendering to allow skeleton to paint
    window.renderPesertaTimeout = setTimeout(() => {
        try {
            if (!semester || semester === 'null') {
                container.innerHTML = `<div class="sm:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-16 bg-white rounded-2xl border border-dashed"><p class="text-gray-400 italic">Silakan pilih semester terlebih dahulu.</p></div>`;
                return;
            }

            populateFiltersPeserta();
            const filterKat = document.getElementById('filter-tabel-kategori')?.value || "";
            const filterKelas = document.getElementById('filter-tabel-kelas')?.value || "";
            const filterPembimbing = document.getElementById('filter-tabel-pembimbing')?.value || "";
            const filterStatus = document.getElementById('filter-tabel-status')?.value || "";
            const sortMode = document.getElementById('sort-tabel-peserta')?.value || "nama_asc";
            const searchEl = document.getElementById('search-peserta');
            const searchTerm = searchEl ? searchEl.value.toLowerCase() : "";

            let flatPesertaList = [];

            // Ambil langsung dari sumber data (Firestore -> dataPeserta) agar selalu sinkron        
            Object.keys(dataPeserta).forEach(key => {
                let studentDocSemester = null;
                let kat = key;

                if (key.includes('_')) {
                    const firstUnderscore = key.indexOf('_');
                    studentDocSemester = key.substring(0, firstUnderscore);
                    kat = key.substring(firstUnderscore + 1);
                }

                if (studentDocSemester && studentDocSemester !== semester) {
                    return; // Abaikan data dari semester lain secara eksplisit
                }

                if (!filterKat || filterKat === kat) {
                    let list = dataPeserta[key];
                    if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
                    if (!Array.isArray(list)) list = [];
                    list.forEach(p => {
                        if (p && typeof p === 'object' && p.nama && (!filterKelas || filterKelas === p.kelas) && (!filterPembimbing || filterPembimbing === p.pembimbing)) {
                            if (!p.id) p.id = `FIX-${Math.random().toString(36).substring(2, 9)}`;
                            const studentDisplaySemester = studentDocSemester || semester;
                            flatPesertaList.push({ ...p, kategori: kat, semester: studentDisplaySemester });
                        }
                    });
                }
            });

            // Cache status dan progress ke objek untuk fitur filter & render (semester harus dilewatkan)
            flatPesertaList.forEach(p => {
                p._status = typeof window.getStatusPeserta === 'function' ? window.getStatusPeserta(p.id, p.kategori, semester) : { progress: 0, text: 'Belum Ujian' };
            });

            if (filterStatus) {
                flatPesertaList = flatPesertaList.filter(p => {
                    if (filterStatus === 'belum') return p._status.progress === 0;
                    if (filterStatus === 'sedang') return p._status.progress > 0 && p._status.progress < 100;
                    if (filterStatus === 'selesai') return p._status.progress === 100;
                    return true;
                });
            }

            if (searchTerm) {
                flatPesertaList = flatPesertaList.filter(p =>
                    (p.nama && p.nama.toLowerCase().includes(searchTerm)) || (p.id && p.id.toLowerCase().includes(searchTerm))
                );
            }

            flatPesertaList.sort((a, b) => {
                const nameA = a.nama || "";
                const nameB = b.nama || "";
                if (sortMode === 'nama_asc') return nameA.localeCompare(nameB);
                if (sortMode === 'nama_desc') return nameB.localeCompare(nameA);
                if (sortMode === 'tgl_asc' || sortMode === 'tgl_desc') {
                    const dateA = a.tanggalUjian ? new Date(a.tanggalUjian) : new Date(8640000000000000);
                    const dateB = b.tanggalUjian ? new Date(b.tanggalUjian) : new Date(8640000000000000);
                    return sortMode === 'tgl_asc' ? dateA - dateB : dateB - dateA;
                }
                return 0;
            });

            pesertaPagination.totalItems = flatPesertaList.length;
            pesertaPagination.totalPages = Math.ceil(pesertaPagination.totalItems / pesertaPagination.itemsPerPage);
            if (pesertaPagination.currentPage > pesertaPagination.totalPages && pesertaPagination.totalPages > 0) {
                pesertaPagination.currentPage = pesertaPagination.totalPages;
            } else if (pesertaPagination.totalPages === 0) {
                pesertaPagination.currentPage = 1;
            }

            const startIndex = (pesertaPagination.currentPage - 1) * pesertaPagination.itemsPerPage;
            const paginatedList = flatPesertaList.slice(startIndex, startIndex + pesertaPagination.itemsPerPage);

            let html = '';
            if (paginatedList.length === 0) {
                const emptyTitle = searchTerm ? 'Pencarian Tidak Ditemukan' : 'Belum Ada Peserta';
                const emptyMessage = searchTerm
                    ? `Tidak ada siswa yang cocok dengan pencarian "<strong>${searchTerm}</strong>" atau filter yang Anda terapkan saat ini.`
                    : 'Tidak ada peserta untuk ditampilkan. Silakan tambahkan peserta baru atau ubah filter Anda.';

                html = `
            <div class="col-span-full sm:col-span-2 lg:col-span-3 xl:col-span-4 py-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-gray-100 shadow-sm border-dashed animate-view">
                <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-5 relative">
                    <div class="absolute inset-0 bg-primary/5 rounded-full animate-ping opacity-75"></div>
                    <span class="material-symbols-outlined text-5xl relative z-10">${searchTerm ? 'person_search' : 'group_off'}</span>
                </div>
                <h3 class="text-xl font-extrabold text-teal-950 mb-2 font-headline">${emptyTitle}</h3>
                <p class="text-sm text-gray-500 max-w-sm">${emptyMessage}</p>
            </div>`;
            } else {
                const isAdmin = currentUser.role === 'Admin Utama';
                html = paginatedList.map(p => {
                    const s = p._status;
                    const cardBgClass = 'bg-white';
                    const actionButtons = isAdmin ? `
                    <button class="p-2 bg-gray-50 border border-gray-100 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-colors shadow-sm active:scale-95" onclick="event.stopPropagation(); bukaModalEditPeserta('${p.id}', '${p.kategori}', '${p.semester}')" title="Edit Peserta"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                    <button class="p-2 bg-gray-50 border border-gray-100 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 rounded-xl transition-colors shadow-sm active:scale-95" onclick="event.stopPropagation(); hapusPesertaTunggal('${p.id}', '${p.kategori}', '${p.semester}')" title="Hapus Peserta"><span class="material-symbols-outlined text-[18px]">delete</span></button>` : '';

                    const badgeSusulan = p.isSusulan ? `<span class="px-2 py-0.5 text-[9px] font-bold rounded-md border border-orange-200 bg-orange-50 text-orange-600 ml-2 align-middle shrink-0">Susulan</span>` : '';
                    const isChecked = window.selectedPeserta.includes(p.id);
                    const borderClass = isChecked ? 'border-primary ring-2 ring-primary/20 shadow-md bg-teal-50/10' : 'border-gray-100 shadow-sm hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1';

                    let progressBarColor = s.progress === 100 ? 'bg-emerald-500' : 'bg-primary';
                    let statusBadge = s.progress === 0 ? 'text-gray-400' : (s.progress === 100 ? 'text-emerald-600' : 'text-primary');

                    return `
                <div class="${cardBgClass} rounded-[24px] p-5 border ${borderClass} transition-all duration-300 group flex flex-col relative cursor-pointer animate-view" onclick="bukaProfilSiswa('${p.id}', '${p.kategori}')">
                    <div class="absolute top-5 right-5 z-20" onclick="event.stopPropagation()">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.togglePesertaSelection('${p.id}', this.checked)" class="w-5 h-5 rounded-md border-gray-300 text-primary focus:ring-primary cursor-pointer shadow-sm transition-all hover:scale-110 active:scale-95">
                    </div>
                    
                    <div class="flex items-start justify-between mb-4 pr-7">
                        <div class="flex items-center gap-3.5 w-full">
                            <div class="w-11 h-11 rounded-2xl ${p.warna} flex items-center justify-center font-extrabold text-lg shrink-0 shadow-sm border border-white/60">${p.inisial}</div>
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center">
                                    <h4 class="font-extrabold text-teal-950 text-base leading-tight group-hover:text-primary transition-colors truncate" title="${p.nama}">${p.nama}</h4>
                                    ${badgeSusulan}
                                </div>
                                <p class="text-xs text-gray-500 font-medium truncate mt-0.5">${p.id} &bull; ${p.kelas}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-auto space-y-4">
                        <div class="bg-gray-50/80 rounded-[16px] p-3 border border-gray-100 space-y-2">
                            <div class="flex justify-between items-center">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Progres Ujian</span>
                                <span class="text-xs font-black ${s.progress === 100 ? 'text-emerald-500' : 'text-teal-950'}">${s.progress}%</span>
                            </div>
                            <div class="w-full bg-gray-200/80 h-2 rounded-full overflow-hidden shadow-inner">
                                <div class="${progressBarColor} h-full transition-all duration-1000 rounded-full" style="width: ${s.progress}%"></div>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-between text-xs text-gray-500 font-medium pt-3 border-t border-gray-100">
                            <div class="flex flex-col max-w-[60%]">
                                <span class="font-bold text-primary text-[11px] truncate" title="${p.kategori}">${p.kategori}</span>
                                <span class="text-[10px] font-bold mt-0.5 ${statusBadge}">${s.text}</span>
                            </div>
                            <div class="flex items-center gap-1.5 shrink-0" onclick="event.stopPropagation()">
                                ${actionButtons}
                            </div>
                        </div>
                    </div>
                </div>`;
                }).join('');
            }

            const finalContainer = document.getElementById('container-peserta-cards');
            if (finalContainer) finalContainer.innerHTML = html;

            renderPesertaPaginationControls();
        } catch (error) {
            console.error("Error saat merender tabel peserta:", error);
            container.innerHTML = `<div class="col-span-full py-10 text-center bg-red-50 text-red-500 rounded-2xl border border-red-200">Terjadi kesalahan saat memuat data peserta.<br><span class="text-xs font-mono">${error.message}</span></div>`;
        }
    }, skipSkeleton ? 0 : 200); // Jeda agar kerangka pemuatan (skeleton) dapat terlihat
}

window.handleSelectMassalPeserta = function (action) {
    const selectEl = document.getElementById('select-pilih-massal-peserta');
    if (!action) return;
    const semester = window.currentState.semester;

    if (action === 'none') {
        window.selectedPeserta = [];
    } else {
        const filterKat = document.getElementById('filter-tabel-kategori')?.value || "";
        const filterKelas = document.getElementById('filter-tabel-kelas')?.value || "";
        const filterPembimbing = document.getElementById('filter-tabel-pembimbing')?.value || "";
        const filterStatus = document.getElementById('filter-tabel-status')?.value || "";
        const searchEl = document.getElementById('search-peserta');
        const searchTerm = searchEl ? searchEl.value.toLowerCase() : "";

        let flatPesertaList = [];
        Object.keys(dataPeserta).forEach(key => { // Logic mirrored from renderTablePeserta
            let studentDocSemester = null;
            let kat = key;

            if (key.includes('_')) {
                const firstUnderscore = key.indexOf('_');
                studentDocSemester = key.substring(0, firstUnderscore);
                kat = key.substring(firstUnderscore + 1);
            }

            if (studentDocSemester && studentDocSemester !== semester) return;

            if (!filterKat || filterKat === kat) {
                let list = dataPeserta[key];
                if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
                if (!Array.isArray(list)) list = [];
                list.forEach(p => {
                    if (p && typeof p === 'object' && p.nama) {
                        if (!p.id) p.id = `FIX-${Math.random().toString(36).substring(2, 9)}`;
                        if ((!filterKelas || filterKelas === p.kelas) && (!filterPembimbing || filterPembimbing === p.pembimbing)) {
                            const studentDisplaySemester = studentDocSemester || semester;
                            flatPesertaList.push({ ...p, kategori: kat, semester: studentDisplaySemester });
                        }
                    }
                });
            }
        });

        flatPesertaList.forEach(p => { p._status = getStatusPeserta(p.id, p.kategori, semester); });
        if (filterStatus) {
            flatPesertaList = flatPesertaList.filter(p => {
                if (filterStatus === 'belum') return p._status.progress === 0;
                if (filterStatus === 'sedang') return p._status.progress > 0 && p._status.progress < 100;
                if (filterStatus === 'selesai') return p._status.progress === 100;
                return true;
            });
        }

        if (searchTerm) {
            flatPesertaList = flatPesertaList.filter(p => (p.nama && p.nama.toLowerCase().includes(searchTerm)) || (p.id && p.id.toLowerCase().includes(searchTerm)));
        }

        if (action === 'page') {
            const startIndex = (pesertaPagination.currentPage - 1) * pesertaPagination.itemsPerPage;
            flatPesertaList = flatPesertaList.slice(startIndex, startIndex + pesertaPagination.itemsPerPage);
        }

        flatPesertaList.forEach(p => {
            if (!window.selectedPeserta.includes(p.id)) window.selectedPeserta.push(p.id);
        });
    }

    if (selectEl) selectEl.value = "";
    if (typeof window.updateBulkActionBar === 'function') window.updateBulkActionBar();
    if (typeof window.renderTablePeserta === 'function') window.renderTablePeserta(true);
};

window.updateQuickStats = function () {
    if (typeof window.pulihkanCurrentState === 'function') window.pulihkanCurrentState();
    const container = document.getElementById('peserta-quick-stats');
    const totalPesertaEl = document.getElementById('stat-total-peserta');
    if (!container || !totalPesertaEl) return;
    let semester = window.currentState?.semester || localStorage.getItem('currentSemester');

    if (!semester || typeof dataPeserta === 'undefined' || typeof listKategori === 'undefined') {
        totalPesertaEl.innerHTML = `0 <span class="text-sm font-semibold text-teal-200/80">Siswa</span>`;
        container.innerHTML = '<p class="md:col-span-3 text-center text-sm text-gray-400 py-8 italic w-full">Pilih semester untuk melihat statistik.</p>';
        return;
    }

    let flatPesertaListForStats = [];
    // Gunakan logika yang sama persis dengan renderTablePeserta untuk konsistensi data
    Object.keys(dataPeserta).forEach(key => {
        let studentDocSemester = null;
        let kat = key;

        if (key.includes('_')) {
            const firstUnderscore = key.indexOf('_');
            studentDocSemester = key.substring(0, firstUnderscore);
            kat = key.substring(firstUnderscore + 1);
        }

        if (studentDocSemester && studentDocSemester !== semester) {
            return;
        }

        let list = dataPeserta[key];
        if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
        if (Array.isArray(list)) {
            list.forEach(p => {
                if (p && p.nama) {
                    if (!p.id) p.id = `FIX-${Math.random().toString(36).substring(2, 9)}`;
                    flatPesertaListForStats.push({ ...p, kategori: kat });
                }
            });
        }
    });

    // Deduplikasi final jika siswa terdaftar di beberapa kategori dengan format kunci berbeda
    const uniquePeserta = Array.from(new Map(flatPesertaListForStats.map(p => [p.id, p])).values());
    const totalPeserta = uniquePeserta.length;

    const kategoriCounts = listKategori.map(katObj => {
        // Hitung dari uniquePeserta agar konsisten dengan total
        const count = new Set(uniquePeserta.filter(p => p.kategori === katObj.nama).map(p => p.id)).size;
        return { nama: katObj.nama, count: count };
    }).sort((a, b) => b.count - a.count);

    totalPesertaEl.innerHTML = `${totalPeserta} <span class="text-sm font-semibold text-teal-200/80">Siswa</span>`;

    const activeFilter = document.getElementById('filter-tabel-kategori')?.value || '';
    const cardTotal = document.getElementById('card-total-peserta');
    const iconCheckTotal = document.getElementById('icon-check-total');

    // Toggle status aktif untuk Kartu "Semua Peserta" (Total)
    if (cardTotal) {
        if (activeFilter === '') {
            cardTotal.classList.replace('bg-teal-800', 'bg-primary');
            cardTotal.classList.add('ring-2', 'ring-primary/50', 'opacity-100');
            cardTotal.classList.remove('opacity-90');
            if (iconCheckTotal) iconCheckTotal.classList.remove('hidden');
        } else {
            cardTotal.classList.replace('bg-primary', 'bg-teal-800');
            cardTotal.classList.remove('ring-2', 'ring-primary/50', 'opacity-100');
            cardTotal.classList.add('opacity-90');
            if (iconCheckTotal) iconCheckTotal.classList.add('hidden');
        }
    }

    let html = '';
        const colors = ['bg-purple-50 text-purple-600', 'bg-emerald-50 text-emerald-600', 'bg-blue-50 text-blue-600', 'bg-orange-50 text-orange-600'];
        const borderColors = ['border-purple-100', 'border-emerald-100', 'border-blue-100', 'border-orange-100'];
        const icons = ['book_2', 'auto_stories', 'menu_book', 'import_contacts'];

        kategoriCounts.forEach((kat, index) => {
            const isSelected = activeFilter === kat.nama;
            const ringClass = isSelected ? 'ring-2 ring-primary border-primary shadow-md' : 'border-gray-100 hover:border-primary/30 shadow-sm';
            const cIdx = index % colors.length;

            html += `
                <div onclick="setFilterPesertaKategori('${kat.nama}')"
                     class="bg-white p-4 md:p-5 rounded-2xl border ${ringClass} shrink-0 w-[160px] sm:w-[200px] md:w-auto snap-center cursor-pointer transition-all duration-200 active:scale-[0.98] hover:-translate-y-1 flex flex-col justify-between group">
                    <div class="flex items-start justify-between mb-3 md:mb-4">
                        <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${colors[cIdx]} ${borderColors[cIdx]} border group-hover:scale-110 transition-transform">
                            <span class="material-symbols-outlined text-[20px] md:text-[24px]">${icons[index % icons.length]}</span>
                        </div>
                        ${isSelected ? `<span class="material-symbols-outlined text-primary bg-primary/10 p-1 rounded-md text-[14px]">check_circle</span>` : ''}
                    </div>
                    <div>
                        <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5 md:mb-1 break-words line-clamp-1 group-hover:text-primary transition-colors" title="${kat.nama}">${kat.nama}</p>
                        <h3 class="text-2xl md:text-3xl font-extrabold text-teal-950 font-headline group-hover:text-primary transition-colors">${kat.count} <span class="text-[10px] md:text-xs font-semibold text-gray-400">Siswa</span></h3>
                    </div>
                </div>`;
        });

        container.innerHTML = html || '<p class="md:col-span-3 text-center text-sm text-gray-400 py-8 italic w-full">Belum ada data peserta di kategori manapun.</p>';
    }

    // Fungsi baru untuk menerapkan filter tabel saat mengeklik kartu statistik
    window.setFilterPesertaKategori = function (katName) {
        const filterEl = document.getElementById('filter-tabel-kategori');
        if (filterEl) {
            filterEl.value = katName;
        if (typeof window.filterPeserta === 'function') window.filterPeserta(); // Terapkan pada tabel
        if (typeof window.updateQuickStats === 'function') window.updateQuickStats(); // Mutakhirkan UI kartu yang menyala
        }
    }

    window.togglePesertaSelection = function (id, chk) {
        if (chk) { if (!window.selectedPeserta.includes(id)) window.selectedPeserta.push(id); }
        else { window.selectedPeserta = window.selectedPeserta.filter(i => i !== id); }
    if (typeof window.updateBulkActionBar === 'function') window.updateBulkActionBar();
    if (typeof window.renderTablePeserta === 'function') window.renderTablePeserta(true);
    }

window.updateBulkActionBar = function() {
        const bar = document.getElementById('bulk-action-bar'); if (!bar) return;
        if (window.selectedPeserta.length > 0) { document.getElementById('bulk-count').innerText = window.selectedPeserta.length; bar.classList.replace('hidden', 'flex'); }
        else { bar.classList.replace('flex', 'hidden'); }
    }

    window.changePesertaPage = function (page) {
        const { totalPages } = pesertaPagination;
        if (page < 1 || page > totalPages) return;
        pesertaPagination.currentPage = page;
    if (typeof window.renderTablePeserta === 'function') window.renderTablePeserta();
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
        html += `<button onclick="changePesertaPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-3 sm:px-4 py-2 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center min-w-[40px]"><span class="hidden sm:inline">Sebelumnya</span><span class="sm:hidden material-symbols-outlined text-[18px]">chevron_left</span></button>`;

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

        html += `<button onclick="changePesertaPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-3 sm:px-4 py-2 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center min-w-[40px]"><span class="hidden sm:inline">Berikutnya</span><span class="sm:hidden material-symbols-outlined text-[18px]">chevron_right</span></button>`;
        container.innerHTML = html;
    }

    window.hapusPesertaTunggal = function (id, kat, semester) {
        openConfirm(`Hapus siswa ${id}? Tindakan ini akan menghapus data peserta dari database.`, (yes) => {
            if (yes) {
                const key = dataPeserta[`${semester}_${kat}`] ? `${semester}_${kat}` : (dataPeserta[kat] ? kat : `${semester}_${kat}`);
                if (!dataPeserta[key]) return;
                dataPeserta[key] = dataPeserta[key].filter(p => p.id !== id);
                db.collection('dataPeserta').doc(key).set({ list: dataPeserta[key] }).then(() => {
                if (typeof window.saveLocalState === 'function') window.saveLocalState();
                if (typeof window.renderTablePeserta === 'function') window.renderTablePeserta();
                if (typeof window.updateQuickStats === 'function') window.updateQuickStats();
                }).catch(err => openAlert("Gagal menghapus data di cloud: " + err.message));
            }
        });
    }

    window.batalPilihSemua = function () {
        window.selectedPeserta = [];
    if (typeof window.updateBulkActionBar === 'function') window.updateBulkActionBar();
    if (typeof window.renderTablePeserta === 'function') window.renderTablePeserta(true);
    }

    window.bukaModalUbahPembimbingMassal = function () {
        if (window.selectedPeserta.length === 0) return;
        document.getElementById('bulk-edit-title').innerText = 'Ubah Pembimbing';
        document.getElementById('bulk-edit-count').innerText = window.selectedPeserta.length;
        document.getElementById('bulk-edit-type').value = 'pembimbing';
        document.getElementById('bulk-edit-field-pembimbing').classList.remove('hidden');
        document.getElementById('bulk-edit-field-jadwal').classList.add('hidden');
        
        const pembimbingSelect = document.getElementById('bulk-input-pembimbing');
        if (pembimbingSelect) {
            let optionsHtml = '<option value="">Pilih Pembimbing Baru...</option>';
            if (typeof listPembimbing !== 'undefined' && Array.isArray(listPembimbing) && listPembimbing.length > 0) {
                listPembimbing.slice().sort().forEach(p => { optionsHtml += `<option value="${p}">${p}</option>`; });
            } else {
                const pembimbingSet = new Set();
                const semester = window.currentState.semester;
                Object.keys(dataPeserta || {}).forEach(key => {
                    if (key.includes('_') && !key.startsWith(`${semester}_`)) return;
                    let list = dataPeserta[key];
                    if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
                    if (Array.isArray(list)) { list.forEach(p => { if (p.pembimbing) pembimbingSet.add(p.pembimbing); }); }
                });
                Array.from(pembimbingSet).sort().forEach(p => { optionsHtml += `<option value="${p}">${p}</option>`; });
            }
            pembimbingSelect.innerHTML = optionsHtml;
            pembimbingSelect.value = '';
        }
        
        document.getElementById('modal-bulk-edit').classList.replace('hidden', 'flex');
    }

    window.bukaModalUbahJadwalMassal = function () {
        if (window.selectedPeserta.length === 0) return;
        document.getElementById('bulk-edit-title').innerText = 'Ubah Jadwal Ujian';
        document.getElementById('bulk-edit-count').innerText = window.selectedPeserta.length;
        document.getElementById('bulk-edit-type').value = 'jadwal';
        document.getElementById('bulk-edit-field-pembimbing').classList.add('hidden');
        document.getElementById('bulk-edit-field-jadwal').classList.remove('hidden');

        const dates = (typeof appSettings !== 'undefined' && appSettings.examDates) ? appSettings.examDates : [];
        document.getElementById('bulk-input-jadwal').innerHTML = '<option value="">Pilih Tanggal...</option>' + dates.map(d => `<option value="${d}">${d}</option>`).join('');

        document.getElementById('modal-bulk-edit').classList.replace('hidden', 'flex');
    }

    window.tutupModalBulkEdit = function () {
        document.getElementById('modal-bulk-edit').classList.replace('flex', 'hidden');
    }

    window.simpanBulkEdit = function () {
        const type = document.getElementById('bulk-edit-type').value;
        let newValue = '';
        if (type === 'pembimbing') newValue = document.getElementById('bulk-input-pembimbing').value.trim();
        if (type === 'jadwal') newValue = document.getElementById('bulk-input-jadwal').value;

        if (!newValue && type === 'jadwal') { openAlert("Silakan pilih tanggal."); return; }

        const batch = db.batch();
        const semester = window.currentState.semester;
        let isChanged = false;
        const count = window.selectedPeserta.length;

        Object.keys(dataPeserta || {}).forEach(key => {
            if (key.includes('_') && !key.startsWith(`${semester}_`)) return;
            let updated = false;
            let list = dataPeserta[key];
            if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
            if (Array.isArray(list)) {
                list.forEach(p => {
                    if (window.selectedPeserta.includes(p.id)) {
                        if (type === 'pembimbing') p.pembimbing = newValue;
                        if (type === 'jadwal') p.tanggalUjian = newValue;
                        updated = true;
                        isChanged = true;
                    }
                });
                if (updated) {
                    batch.set(db.collection('dataPeserta').doc(key), { list: list });
                }
            }
        });

        if (isChanged) {
            batch.commit().then(() => {
                if (typeof window.saveLocalState === 'function') window.saveLocalState();
                tutupModalBulkEdit();
            if (typeof window.batalPilihSemua === 'function') window.batalPilihSemua();
                openAlert(`Berhasil mengubah ${type === 'jadwal' ? 'tanggal ujian' : 'pembimbing'} untuk ${count} peserta.`);
                if (typeof window.renderTablePeserta === 'function') window.renderTablePeserta();
            if (typeof window.updateQuickStats === 'function') window.updateQuickStats();
            }).catch(err => openAlert("Gagal menyimpan perubahan: " + err.message));
        } else {
            tutupModalBulkEdit();
        }
    }

    window.cetakKartuUjianMassal = function () {
        if (window.selectedPeserta.length === 0) return;
        let targetPeserta = [];
        const semester = window.currentState.semester;
        Object.keys(dataPeserta || {}).forEach(key => {
            let kat = key.startsWith(`${semester}_`) ? key.replace(`${semester}_`, '') : key;
            if (key.includes('_') && !key.startsWith(`${semester}_`)) return;

            let list = dataPeserta[key];
            if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
            if (Array.isArray(list)) {
                list.forEach(p => {
                    if (window.selectedPeserta.includes(p.id)) targetPeserta.push({ ...p, kategori: kat, semester: semester });
                });
            }
        });
        if (targetPeserta.length === 0) return;

        const printWindow = window.open('', '', 'height=800,width=1000');
        if (!printWindow) { openAlert("Izinkan pop-up peramban Anda untuk mencetak kartu ujian."); return; }

        const schoolName = (typeof appSettings !== 'undefined' && appSettings.schoolName) ? appSettings.schoolName : 'Sekolah';
        const logoUrl = (typeof appSettings !== 'undefined' && appSettings.logoUrl) ? appSettings.logoUrl : '';
        const logoHtml = logoUrl ? `<img src="${logoUrl}" style="max-height:40px; margin-right:10px;">` : '';

        let html = `<!DOCTYPE html><html><head><title>Cetak Kartu Ujian</title><style>body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }@media print { body { background: #fff; padding: 0; } .grid { grid-template-columns: repeat(2, 1fr); gap: 15px; } .card { break-inside: avoid; border: 2px solid #004b50; border-radius: 8px; } }.card { width: 85mm; height: 55mm; border: 2px solid #004b50; border-radius: 8px; background: #fff; position: relative; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column; }.header { background: #004b50; color: #fff; padding: 8px 10px; display: flex; align-items: center; justify-content: center; }.header-text { text-align: center; }.header-text h3 { margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase; }.header-text p { margin: 2px 0 0; font-size: 8px; }.body { padding: 8px; display: flex; gap: 8px; flex: 1; }.photo-area { width: 45px; height: 55px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; background: #f9f9f9; font-size: 9px; color: #aaa; text-align: center; }.info-area { flex: 1; font-size: 10px; line-height: 1.3; }.info-row { display: flex; margin-bottom: 1px; }.info-label { width: 55px; font-weight: bold; color: #555; }.info-value { flex: 1; font-weight: bold; color: #000; text-transform: uppercase;}.footer { background: #f0f0f0; padding: 4px 10px; text-align: center; font-size: 9px; font-weight: bold; color: #004b50; border-top: 1px solid #ddd; }</style></head><body><div class="grid">`;

        targetPeserta.forEach(p => {
            const tglText = p.tanggalUjian ? new Date(p.tanggalUjian).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
            html += `<div class="card"><div class="header">${logoHtml}<div class="header-text"><h3>KARTU PESERTA MUNAQOSYAH</h3><p>${schoolName} - ${p.semester}</p></div></div><div class="body"><div class="photo-area">FOTO<br>3x4</div><div class="info-area"><div class="info-row"><div class="info-label">ID / NISN</div><div class="info-value">: ${p.id}</div></div><div class="info-row"><div class="info-label">NAMA</div><div class="info-value">: ${p.nama}</div></div><div class="info-row"><div class="info-label">KELAS</div><div class="info-value">: ${p.kelas}</div></div><div class="info-row"><div class="info-label">KATEGORI</div><div class="info-value">: ${p.kategori}</div></div><div class="info-row"><div class="info-label">TANGGAL</div><div class="info-value">: ${tglText}</div></div></div></div><div class="footer">Harap dibawa saat pelaksanaan ujian</div></div>`;
        });

        html += `</div><script>window.onload = () => setTimeout(() => window.print(), 500);</script></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
        batalPilihSemua();
    }

    window.unduhTemplateExcel = function () {
        const csvContent = "NAMA,KELAS,KATEGORI\nAhmad Zaki,6 Abu Bakar,Juz 30\nFatimah Az Zahra,5 Umar,Tartil";
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", "Template_Import_Peserta.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function eksporDataPeserta() {
        const filterKat = document.getElementById('filter-tabel-kategori')?.value || "";
        const searchEl = document.getElementById('search-peserta');
        const searchTerm = searchEl ? searchEl.value.toLowerCase() : "";

        // 1. Gather filtered data (ignoring pagination)
        let flatPesertaList = [];
        const semester = window.currentState.semester;
        Object.keys(dataPeserta).forEach(key => {
            let kat = key;
            let studentDocSemester = null;
            if (key.includes('_')) {
                const firstUnderscore = key.indexOf('_');
                studentDocSemester = key.substring(0, firstUnderscore);
                kat = key.substring(firstUnderscore + 1);
            }
            if (studentDocSemester && studentDocSemester !== semester) return;

            if (!filterKat || filterKat === kat) {
                let list = dataPeserta[key];
                if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
                if (Array.isArray(list)) {
                    list.forEach(p => {
                        if (!flatPesertaList.some(existing => existing.id === p.id)) {
                            flatPesertaList.push({ ...p, kategori: kat, semester: semester });
                        }
                    });
                }
            }
        });

        if (searchTerm) {
            flatPesertaList = flatPesertaList.filter(p =>
                (p.nama && p.nama.toLowerCase().includes(searchTerm)) ||
                (p.id && p.id.toLowerCase().includes(searchTerm))
            );
        }

        if (flatPesertaList.length === 0) {
            openAlert("Tidak ada data untuk diekspor berdasarkan filter saat ini.");
            return;
        }

        // 2. Prepare CSV content
        const headers = ['ID', 'Nama Siswa', 'Kelas', 'Semester', 'Kategori', 'Status Ujian', 'Tanggal Ujian', 'Pembimbing', 'Keterangan'];
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
            const status = getStatusPeserta(p.id, p.kategori, p.semester);
            let tanggalUjianFormatted = '-';
            if (p.tanggalUjian) {
                const [y, m, d] = p.tanggalUjian.split('-');
                tanggalUjianFormatted = new Date(y, m - 1, d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }

            const keterangan = p.isSusulan ? 'Ujian Susulan' : 'Reguler';
            const row = [p.id, p.nama, p.kelas, p.semester, p.kategori, status.text, tanggalUjianFormatted, p.pembimbing || '-', keterangan].map(escapeCsvCell);

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

    window.bukaModalEditPeserta = function (id, kat, semester) {
        const key = dataPeserta[`${semester}_${kat}`] ? `${semester}_${kat}` : (dataPeserta[kat] ? kat : `${semester}_${kat}`);
        if (!semester) return;
        let list = dataPeserta[key];
        if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
        if (!Array.isArray(list)) return;
        const p = list.find(x => x.id === id);
        if (!p) return;

        document.getElementById('edit-id-peserta').value = p.id;
        const semesterDisplay = document.getElementById('edit-semester-display');
        if (semesterDisplay) semesterDisplay.value = semester;

        document.getElementById('edit-kategori-hidden').value = kat;

        // Pengaman jika skrip lama masih mencoba mencari elemen ini
        const displayKat = document.getElementById('edit-kategori-display');
        if (displayKat) displayKat.value = kat;

        document.getElementById('edit-nama').value = p.nama;
        document.getElementById('edit-pembimbing').value = p.pembimbing || '';

        const kelasSelect = document.getElementById('edit-kelas');
        if (kelasSelect) kelasSelect.innerHTML = listKelas.map(k => `<option value="${k}" ${k === p.kelas ? 'selected' : ''}>${k}</option>`).join('');

        const pembimbingSelect = document.getElementById('edit-pembimbing');
        if (pembimbingSelect) {
            if (p.pembimbing && typeof listPembimbing !== 'undefined' && !listPembimbing.includes(p.pembimbing)) {
                pembimbingSelect.innerHTML += `<option value="${p.pembimbing}">${p.pembimbing}</option>`;
            }
            pembimbingSelect.value = p.pembimbing || '';
        }

        const katSelect = document.getElementById('edit-kategori-select');
        if (katSelect) katSelect.innerHTML = listKategori.map(k => `<option value="${k.nama}" ${k.nama === kat ? 'selected' : ''}>${k.nama}</option>`).join('');

        const tglSelect = document.getElementById('edit-tanggal-ujian');
        if (tglSelect) {
            const dates = (typeof appSettings !== 'undefined' && appSettings.examDates) ? appSettings.examDates : [];
            let optionsHtml = '<option value="">Pilih Tanggal...</option>';

            // Pertahankan tanggal lama jika sudah tidak ada di daftar aktif agar tidak hilang saat di-save
            if (p.tanggalUjian && !dates.includes(p.tanggalUjian)) {
                optionsHtml += `<option value="${p.tanggalUjian}" selected>${p.tanggalUjian} (Sudah Lewat)</option>`;
            }
            optionsHtml += dates.map(d => `<option value="${d}" ${d === p.tanggalUjian ? 'selected' : ''}>${d}</option>`).join('');
            tglSelect.innerHTML = optionsHtml;
        }

        const susulanCheckbox = document.getElementById('edit-susulan');
        if (susulanCheckbox) susulanCheckbox.checked = p.isSusulan === true;

        document.getElementById('modal-edit-peserta').classList.replace('hidden', 'flex');
    };

    window.tutupModalEditPeserta = function () {
        document.getElementById('modal-edit-peserta').classList.replace('flex', 'hidden');
    };

    window.simpanEditPeserta = function () {
        const id = document.getElementById('edit-id-peserta').value;
        const oldKat = document.getElementById('edit-kategori-hidden').value;
        const newKatSelect = document.getElementById('edit-kategori-select');
        const newKat = newKatSelect ? newKatSelect.value : oldKat;
        const nama = document.getElementById('edit-nama').value.trim();
        const kelas = document.getElementById('edit-kelas').value;
        const pembimbing = document.getElementById('edit-pembimbing').value.trim();
        const tanggalUjian = document.getElementById('edit-tanggal-ujian').value;
        const isSusulan = document.getElementById('edit-susulan') ? document.getElementById('edit-susulan').checked : false;

        if (!nama || !kelas || !newKat) {
            if (typeof openAlert === 'function') openAlert("Nama, Kelas, dan Kategori wajib diisi.");
            else alert("Nama, Kelas, dan Kategori wajib diisi.");
            return;
        }

        // Find the exact document key and list where this student resides
        let oldKey = null;
        let pIndex = -1;
        let oldList = null;

        for (let key of Object.keys(dataPeserta)) {
            let list = dataPeserta[key];
            if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
            if (Array.isArray(list)) {
                const idx = list.findIndex(x => x.id === id);
                if (idx !== -1) {
                    oldKey = key;
                    pIndex = idx;
                    oldList = list;
                    break;
                }
            }
        }

        if (pIndex === -1 || !oldKey) {
            if (typeof openAlert === 'function') openAlert("Data siswa tidak ditemukan di penyimpanan.");
            return;
        }

        const prosesSimpan = () => {
            const p = oldList[pIndex];
            p.nama = nama;
            p.kelas = kelas;
            p.pembimbing = pembimbing;
            p.tanggalUjian = tanggalUjian;
            p.isSusulan = isSusulan;
            p.inisial = nama.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();

            const batch = db.batch();

            // Jika Kategori diubah, pindahkan data array siswa ke dalam kelompok dokumen yang baru (dengan prefix yang sama)
            if (oldKat !== newKat) {
                p.kategori = newKat;
                oldList.splice(pIndex, 1);

                let newKey = newKat;
                if (oldKey.endsWith(oldKat)) {
                    newKey = oldKey.substring(0, oldKey.length - oldKat.length) + newKat;
                } else {
                    // Fallback if the extracted oldKey doesn't cleanly end with oldKat
                    const semesterVal = document.getElementById('edit-semester-display').value;
                    newKey = `${semesterVal}_${newKat}`;
                }

                let newList = dataPeserta[newKey];
                if (newList && !Array.isArray(newList) && Array.isArray(newList.list)) newList = newList.list;
                if (!Array.isArray(newList)) { newList = []; dataPeserta[newKey] = newList; }

                newList.push(p);

                batch.set(db.collection('dataPeserta').doc(oldKey), { list: oldList });
                batch.set(db.collection('dataPeserta').doc(newKey), { list: Array.isArray(newList) ? newList : [] });
                
                // Hapus seluruh nilai (dan catatan) peserta dari kategori sebelumnya secara otomatis
                const semesterVal = document.getElementById('edit-semester-display').value || (typeof window.currentState !== 'undefined' ? window.currentState.semester : null);
                let items = [];
                if (typeof window.getMateriList === 'function') {
                    items = window.getMateriList(oldKat);
                }
                
                items.forEach(materi => {
                    if (materi && materi.no) {
                        const keys = [
                            `${semesterVal}_${id}_${materi.no}`, 
                            `${id}_${materi.no}`, 
                            `${semesterVal}_${id}_${materi.no}_lembar`, 
                            `${id}_${materi.no}_lembar`
                        ];
                        keys.forEach(k => {
                            if (typeof statePenilaian !== 'undefined' && statePenilaian[k] !== undefined) {
                                batch.delete(db.collection('statePenilaian').doc(k));
                                delete statePenilaian[k];
                            }
                        });
                    }
                });
            } else {
                batch.set(db.collection('dataPeserta').doc(oldKey), { list: oldList });
            }

            batch.commit().then(() => {
                if (typeof window.saveLocalState === 'function') window.saveLocalState();
                window.tutupModalEditPeserta();
                if (typeof window.renderTablePeserta === 'function') window.renderTablePeserta();
                if (typeof window.updateQuickStats === 'function') window.updateQuickStats();
            }).catch(err => {
                console.error(err);
                if (typeof openAlert === 'function') openAlert("Terjadi kesalahan menyimpan data.");
            });
        };

        // Munculkan konfirmasi (Warning) jika kategori terganti, jika tidak maka langsung simpan
        if (oldKat !== newKat) {
            const msg = `Anda akan memindahkan siswa ini dari kategori "${oldKat}" ke "${newKat}".\n\nPERINGATAN: Semua data nilai ujian siswa pada kategori lama ("${oldKat}") akan dihapus dan dibersihkan. Apakah Anda yakin ingin melanjutkan?`;
            if (typeof openConfirm === 'function') {
                openConfirm(msg, (yes) => {
                    if (yes) prosesSimpan();
                });
            } else {
                if (confirm(msg)) prosesSimpan();
            }
        } else {
            prosesSimpan();
        }
    };

    window.hapusPesertaTerpilih = function () {
        if (window.selectedPeserta.length === 0) return;
        const msg = `Apakah Anda yakin ingin menghapus ${window.selectedPeserta.length} peserta yang dipilih?`;

        const prosesHapusMassal = () => {
            const batch = db.batch();
            const semester = window.currentState.semester;
            let isChanged = false;

            Object.keys(dataPeserta || {}).forEach(key => {
                if (key.includes('_') && !key.startsWith(`${semester}_`)) return;
                let list = dataPeserta[key];
                if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
                if (Array.isArray(list)) {
                    const originalLength = list.length;
                    list = list.filter(p => !window.selectedPeserta.includes(p.id));
                    if (list.length !== originalLength) {
                        dataPeserta[key] = list; // Perbarui cache lokal
                        batch.set(db.collection('dataPeserta').doc(key), { list: list });
                        isChanged = true;
                    }
                }
            });

            if (isChanged) {
                batch.commit().then(() => {
                    if (typeof window.saveLocalState === 'function') window.saveLocalState();
                    if (typeof openAlert === 'function') openAlert(`Berhasil menghapus ${window.selectedPeserta.length} peserta.`);
                if (typeof window.batalPilihSemua === 'function') window.batalPilihSemua();
                if (typeof window.renderTablePeserta === 'function') window.renderTablePeserta();
                if (typeof window.updateQuickStats === 'function') window.updateQuickStats();
                }).catch(err => {
                    if (typeof openAlert === 'function') openAlert("Gagal menghapus peserta: " + err.message);
                });
            }
        };

        if (typeof openConfirm === 'function') {
            openConfirm(msg, (yes) => { if (yes) prosesHapusMassal(); });
        } else {
            if (confirm(msg)) prosesHapusMassal();
        }
    };

    // --- Auto-Refresh Logic for Peserta Page ---
    document.addEventListener('DOMContentLoaded', () => {
        const pesertaView = document.getElementById('view-peserta');
        if (!pesertaView) return;

        // 1. Trigger render when view becomes visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class' && !pesertaView.classList.contains('hidden')) {
                    // Reset count when view is opened to force a re-render check
                    window.lastPesertaRenderCount = -1;
                if (typeof window.renderTablePeserta === 'function') window.renderTablePeserta();
                if (typeof window.updateQuickStats === 'function') window.updateQuickStats();
                }
            });
        });
        observer.observe(pesertaView, { attributes: true });

        // 2. Poll for data changes while view is active
        window.lastPesertaRenderCount = -1;
        setInterval(() => {
            if (pesertaView.classList.contains('hidden') || typeof dataPeserta === 'undefined') {
                return; // Don't do anything if the view is not visible or data is not ready
            }

            const semester = window.currentState?.semester || localStorage.getItem('currentSemester');
            if (!semester) return;

            let currentPesertaCount = 0;
            Object.keys(dataPeserta).forEach(key => {
                let studentDocSemester = null;
                if (typeof listSemester !== 'undefined' && Array.isArray(listSemester)) {
                    for (const sem of listSemester) { if (key.startsWith(`${sem}_`)) { studentDocSemester = sem; break; } }
                }

                if (!studentDocSemester || studentDocSemester === semester) {
                    let list = dataPeserta[key];
                    if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
                    if (Array.isArray(list)) currentPesertaCount += list.length;
                }
            });

            if (window.lastPesertaRenderCount !== -1 && currentPesertaCount !== window.lastPesertaRenderCount) {
                if (typeof window.renderTablePeserta === 'function') window.renderTablePeserta();
                if (typeof window.updateQuickStats === 'function') window.updateQuickStats();
            }
            window.lastPesertaRenderCount = currentPesertaCount;
        }, 1000);
    });