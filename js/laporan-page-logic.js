// --- LAPORAN PAGE LOGIC ---
window.laporanPagination = window.laporanPagination || { currentPage: 1, itemsPerPage: 12, totalPages: 0, totalItems: 0 };
let selectedLaporanPeserta = [];

function getFilteredLaporanData(allData) {
    const filterKat = document.getElementById('laporan-filter-kategori')?.value || '';
    const filterKelas = document.getElementById('laporan-filter-kelas')?.value || '';
    const filterStatus = document.getElementById('laporan-filter-status')?.value || '';
    const filterTanggal = document.getElementById('laporan-filter-tanggal')?.value || '';
    const filterPenguji = document.getElementById('laporan-filter-penguji')?.value || '';
    const filterPembimbing = document.getElementById('laporan-filter-pembimbing')?.value || '';
    const searchEl = document.getElementById('laporan-search');
    const searchTerm = searchEl && searchEl.value ? searchEl.value.toLowerCase() : '';
    const sortEl = document.getElementById('laporan-sort');
    const sortTerm = sortEl ? sortEl.value : 'score_desc';

    let dataToFilter = [...allData];
    if (filterKat) dataToFilter = dataToFilter.filter(s => s.kategori === filterKat);
    if (filterKelas) dataToFilter = dataToFilter.filter(s => s.kelas === filterKelas);
    if (filterTanggal) dataToFilter = dataToFilter.filter(s => s.tanggalUjian === filterTanggal);
    if (filterStatus === 'lulus') dataToFilter = dataToFilter.filter(s => s.lulus);
    else if (filterStatus === 'tidak-lulus') dataToFilter = dataToFilter.filter(s => !s.lulus && s.progress > 0);
    else if (filterStatus === 'belum-ujian') dataToFilter = dataToFilter.filter(s => s.progress === 0);
    else if (filterStatus === 'susulan') dataToFilter = dataToFilter.filter(s => s.isSusulan);
    if (filterPembimbing) dataToFilter = dataToFilter.filter(s => s.pembimbing === filterPembimbing);
    if (filterPenguji) {
        const semester = window.currentState.semester;
        dataToFilter = dataToFilter.filter(s => {
            const prefixBaru = `${semester}_${s.id}_`;
            const prefixLama = `${s.id}_`;
            return typeof statePenilaian !== 'undefined' && Object.keys(statePenilaian).some(key => 
                (key.startsWith(prefixBaru) || (!key.includes(semester) && key.startsWith(prefixLama))) && statePenilaian[key] && statePenilaian[key].penguji === filterPenguji
            );
        });
    }
    if (searchTerm) {
        const semester = window.currentState.semester;
        dataToFilter = dataToFilter.filter(s => {
            const matchNameOrId = s.nama.toLowerCase().includes(searchTerm) || s.id.toLowerCase().includes(searchTerm);
            if (matchNameOrId) return true;
            
            const prefixBaru = `${semester}_${s.id}_`;
            const prefixLama = `${s.id}_`;
            return typeof statePenilaian !== 'undefined' && Object.keys(statePenilaian).some(key => 
                (key.startsWith(prefixBaru) || (!key.includes(semester) && key.startsWith(prefixLama))) && statePenilaian[key] && statePenilaian[key].penguji && statePenilaian[key].penguji.toLowerCase().includes(searchTerm)
            );
        });
    }

    // Fitur 2: Pengurutan (Sorting)
    dataToFilter.sort((a, b) => {
        if (sortTerm === 'score_desc') return b.avg - a.avg;
        if (sortTerm === 'score_asc') return a.avg - b.avg;
        if (sortTerm === 'name_asc') return a.nama.localeCompare(b.nama);
        if (sortTerm === 'name_desc') return b.nama.localeCompare(a.nama);
        return 0;
    });

    return dataToFilter;
}

function renderLaporanPage() {
    const container = document.getElementById('container-laporan-cards');
    if (!container) return;

    // 1. Render Skeleton UI
    let skeletonHtml = '';
    const skeletonCount = laporanPagination.itemsPerPage > 0 ? laporanPagination.itemsPerPage : 6;
    for (let i = 0; i < skeletonCount; i++) {
        skeletonHtml += `
        <div class="bg-white rounded-[24px] p-5 border border-gray-100 shadow-sm animate-pulse flex flex-col h-[230px]">
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
            <div class="space-y-3">
                <div class="grid grid-cols-3 gap-3">
                    <div class="bg-gray-50 rounded-xl h-14 col-span-3"></div>
                </div>
                <div class="flex items-center justify-between pt-4 mt-auto border-t border-gray-50">
                    <div class="space-y-1">
                        <div class="h-3 bg-gray-100 rounded w-20"></div>
                        <div class="h-2 bg-gray-100 rounded w-16"></div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-xl bg-gray-100"></div>
                        <div class="w-8 h-8 rounded-xl bg-gray-100"></div>
                        <div class="w-8 h-8 rounded-xl bg-gray-100"></div>
                    </div>
                </div>
            </div>
        </div>`;
    }
    container.innerHTML = skeletonHtml;
    document.getElementById('pagination-laporan').innerHTML = '';

    // 2. Defer data processing
    setTimeout(() => {
        // Panggil fungsi secara eksplisit pada window (global scope) untuk menghindari ReferenceError
        const allData = typeof window.getLaporanData === 'function' ? window.getLaporanData() : [];

        const totalSiswa = allData.length;
        const selesai = allData.filter(s => s.progress === 100).length;
        const lulus = allData.filter(s => s.lulus).length;
        const mumtaz = allData.filter(s => s.predikat.text === 'Mumtaz').length;
        const totalSemuaNilai = allData.reduce((acc, s) => acc + (s.totalNilai || 0), 0);
        const totalSemuaPenilaian = allData.reduce((acc, s) => acc + (s.jumlahPenilaian || 0), 0);
        const totalAvg = totalSemuaPenilaian > 0 ? (totalSemuaNilai / totalSemuaPenilaian).toFixed(1) : '0.0';
        const persentaseLulus = totalSiswa > 0 ? Math.round((lulus / totalSiswa) * 100) : 0;

        document.getElementById('laporan-stat-selesai').innerHTML = `${selesai} <span class="text-sm font-medium text-gray-400">/ ${totalSiswa}</span>`;
        document.getElementById('laporan-stat-rata-rata').textContent = totalAvg;
        document.getElementById('laporan-stat-lulus').innerHTML = `${lulus} <span class="text-sm font-medium text-emerald-500 text-[10px]">(${persentaseLulus}%)</span>`;
        document.getElementById('laporan-stat-mumtaz').textContent = `${mumtaz} Siswa`;

        const filteredData = getFilteredLaporanData(allData);

        // Fitur 4: Render Grafik Distribusi Predikat
        renderDistributionChart(filteredData);

        laporanPagination.totalItems = filteredData.length;
        laporanPagination.totalPages = Math.ceil(laporanPagination.totalItems / laporanPagination.itemsPerPage);
        if (laporanPagination.currentPage > laporanPagination.totalPages) laporanPagination.currentPage = laporanPagination.totalPages || 1;

        const startIndex = (laporanPagination.currentPage - 1) * laporanPagination.itemsPerPage;
        const paginatedData = filteredData.slice(startIndex, startIndex + laporanPagination.itemsPerPage);

        let html = '';
        if (paginatedData.length === 0) {
            html = `<div class="col-span-full text-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm border-dashed"><div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mx-auto mb-4"><span class="material-symbols-outlined text-4xl">folder_off</span></div><h3 class="text-lg font-extrabold text-teal-950 font-headline mb-1">Tidak Ada Data Laporan</h3><p class="text-sm text-gray-400 max-w-sm mx-auto">Sesuaikan filter atau gunakan fitur pencarian untuk menemukan data yang spesifik.</p></div>`;
        } else {
            paginatedData.forEach((s) => {
                const predikatIcon = s.predikat.icon ? `<span class="material-symbols-outlined text-base ${s.predikat.color}">${s.predikat.icon}</span>` : '';
                const badgeSusulan = s.isSusulan ? `<span class="px-2 py-0.5 text-[9px] font-bold rounded-md border border-orange-200 bg-orange-50 text-orange-600 ml-2 align-middle">Susulan</span>` : '';
                const isChecked = selectedLaporanPeserta.some(item => item.id === s.id && item.kategori === s.kategori);
                const borderClass = isChecked ? 'border-primary ring-2 ring-primary/20 shadow-md bg-teal-50/10' : 'border-gray-100 shadow-sm hover:shadow-xl hover:shadow-teal-900/5 hover:-translate-y-1';
                let statusBadge, statusText;
                if (s.progress === 0) {
                    statusBadge = 'border-gray-200 bg-gray-50 text-gray-500';
                    statusText = 'Belum Ujian';
                } else if (s.lulus) {
                    statusBadge = 'border-emerald-200 bg-emerald-50 text-emerald-700';
                    statusText = 'Lulus';
                } else if (s.adaNilaiDiBawahKKM) {
                    statusBadge = 'border-red-200 bg-red-50 text-red-600';
                    statusText = 'Remedial';
                } else {
                    statusBadge = 'border-amber-200 bg-amber-50 text-amber-600';
                    statusText = 'Belum Selesai';
                }

                const kkm = (typeof appSettings !== 'undefined' && appSettings.kkm) ? parseFloat(appSettings.kkm) : 7.0;
                const avgColor = (s.progress === 0 || s.avg >= kkm) ? 'text-teal-950' : 'text-red-500';
                const avgText = s.progress === 0 ? '-' : s.avg;
                const predikatText = s.progress === 0 ? '-' : `${predikatIcon} ${s.predikat.text}`;
                const predikatColor = s.progress === 0 ? 'text-gray-400' : s.predikat.color;

                html += `
                <div class="bg-white rounded-[24px] p-5 border ${borderClass} transition-all duration-300 group flex flex-col relative cursor-pointer" onclick="const chk = this.querySelector('input[type=checkbox]'); chk.checked = !chk.checked; toggleLaporanSelection('${s.id}', '${s.kategori}', chk.checked)">
                    <div class="absolute top-5 right-5 z-20" onclick="event.stopPropagation()">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleLaporanSelection('${s.id}', '${s.kategori}', this.checked)" class="w-5 h-5 rounded-md border-gray-300 text-primary focus:ring-primary cursor-pointer shadow-sm transition-all hover:scale-110 active:scale-95">
                    </div>
                    <div class="flex items-start justify-between mb-4 pr-7">
                        <div class="flex items-center gap-3.5 w-full">
                            <div class="w-11 h-11 rounded-2xl ${s.warna || 'bg-gray-200'} flex items-center justify-center font-extrabold text-lg shrink-0 shadow-sm border border-white/60">${s.inisial || '-'}</div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-extrabold text-teal-950 text-base leading-tight group-hover:text-primary transition-colors truncate pr-2" title="${s.nama}">${s.nama}${badgeSusulan}</h4>
                                <p class="text-xs text-gray-500 font-medium truncate">${s.id} &bull; ${s.kelas}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50/80 rounded-[16px] p-3 mb-4 flex gap-2 border border-gray-100">
                        <div class="flex-1 text-center border-r border-gray-200/80">
                            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Rata-rata</p>
                            <p class="text-xl font-black font-headline ${avgColor}">${avgText}</p>
                        </div>
                        <div class="flex-1 text-center px-2 flex flex-col justify-center">
                            <p class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Predikat</p>
                            <p class="text-xs font-bold ${predikatColor} flex items-center justify-center gap-1">${predikatText}</p>
                        </div>
                    </div>

                    <div class="flex items-center justify-between text-xs text-gray-500 font-medium pt-3 border-t border-gray-100 mt-auto">
                        <div class="flex flex-col max-w-[50%]">
                            <span class="font-bold text-primary text-[11px] truncate" title="${s.kategori}">${s.kategori}</span>
                            <span class="text-[10px] font-bold ${statusBadge.replace('border-', 'text-').replace('bg-', '').replace('text-gray-500', 'text-gray-400').replace('text-amber-600', 'text-amber-500')}">${statusText}</span>
                        </div>
                        <div class="flex items-center gap-1.5 shrink-0" onclick="event.stopPropagation()">
                            <button onclick="bukaModalLaporanDetail('${s.id}', '${s.kategori}')" class="p-2 bg-gray-50 border border-gray-100 text-gray-500 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-xl transition-colors shadow-sm active:scale-95" title="Lihat Rincian Nilai"><span class="material-symbols-outlined text-[18px]">summarize</span></button>
                            <button onclick="window.bagikanHasil('${s.id}', '${s.kategori}')" class="p-2 bg-gray-50 border border-gray-100 text-gray-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 rounded-xl transition-colors shadow-sm active:scale-95" title="Bagikan Link Hasil Ujian"><span class="material-symbols-outlined text-[18px]">share</span></button>
                            <button ${!s.lulus ? 'disabled' : ''} onclick="cetakSyahadah('${s.id}', '${s.kategori}')" class="p-2 ${s.lulus ? 'bg-amber-50 border-amber-200 text-amber-600 hover:text-amber-700 hover:bg-amber-100 shadow-sm active:scale-95' : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'} border rounded-xl transition-colors" title="Cetak Syahadah"><span class="material-symbols-outlined text-[18px]">workspace_premium</span></button>
                        </div>
                    </div>
                </div>`;
            });
        }

        const finalContainer = document.getElementById('container-laporan-cards');
        if (finalContainer) finalContainer.innerHTML = html;

        renderLaporanPagination();
    }, 200);
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
    html += `<button onclick="changeLaporanPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-3 sm:px-4 py-2 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm active:scale-95 flex items-center justify-center min-w-[40px]"><span class="hidden sm:inline">Sebelumnya</span><span class="sm:hidden material-symbols-outlined text-[18px]">chevron_left</span></button>`;

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
        html += `<button onclick="changeLaporanPage(1)" class="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">1</button>`;
        if (startPage > 2) html += `<span class="w-10 h-10 flex items-center justify-center text-sm font-bold text-gray-400">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += (i === currentPage) ? `<span class="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold bg-primary text-white border border-primary shadow-sm">${i}</span>` : `<button onclick="changeLaporanPage(${i})" class="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm active:scale-95">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="w-10 h-10 flex items-center justify-center text-sm font-bold text-gray-400">...</span>`;
        html += `<button onclick="changeLaporanPage(${totalPages})" class="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm active:scale-95">${totalPages}</button>`;
    }

    html += `<button onclick="changeLaporanPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-3 sm:px-4 py-2 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm active:scale-95 flex items-center justify-center min-w-[40px]"><span class="hidden sm:inline">Berikutnya</span><span class="sm:hidden material-symbols-outlined text-[18px]">chevron_right</span></button>`;
    container.innerHTML = html;
}

function renderDistributionChart(filteredData) {
    const chartContainer = document.getElementById('laporan-distribution-chart');
    const barContainer = document.getElementById('laporan-dist-bar');
    const legendContainer = document.getElementById('laporan-dist-legend');
    
    if (!chartContainer || !barContainer || !legendContainer) return;
    
    if (filteredData.length === 0) {
        chartContainer.classList.add('hidden');
        chartContainer.classList.remove('flex');
        return;
    }
    
    const distribution = {
        'Mumtaz': { count: 0, color: 'bg-amber-500', labelColor: 'text-amber-600' },
        'Jayyid Jiddan': { count: 0, color: 'bg-emerald-500', labelColor: 'text-emerald-600' },
        'Jayyid': { count: 0, color: 'bg-blue-500', labelColor: 'text-blue-600' },
        'Maqbul': { count: 0, color: 'bg-orange-400', labelColor: 'text-orange-500' },
        'Rasib': { count: 0, color: 'bg-red-600', labelColor: 'text-red-700' },
        'Remedial': { count: 0, color: 'bg-red-400', labelColor: 'text-red-500' },
        'Belum Selesai': { count: 0, color: 'bg-gray-400', labelColor: 'text-gray-500' }
    };
    
    let total = 0;
    filteredData.forEach(s => {
        if (s.progress === 0) return; // Abaikan siswa yang belum ujian
        
        if (distribution[s.predikat.text]) {
            distribution[s.predikat.text].count++;
            total++;
        } else if (!s.lulus) {
            distribution['Rasib'].count++;
            total++;
        }
    });
    
    if (total === 0) {
        chartContainer.classList.add('hidden');
        chartContainer.classList.remove('flex');
        return;
    }
    
    chartContainer.classList.remove('hidden');
    chartContainer.classList.add('flex');
    
    let barHtml = '';
    let legendHtml = '';
    
    Object.entries(distribution).forEach(([key, data]) => {
        if (data.count > 0) {
            const percentage = (data.count / total) * 100;
            barHtml += `<div class="${data.color} h-full transition-all duration-1000 flex items-center justify-center text-[10px] text-white font-bold" style="width: ${percentage}%;" title="${key}: ${data.count} Santri"></div>`;
            legendHtml += `<div class="flex items-center gap-1"><div class="w-3 h-3 rounded-full ${data.color}"></div> <span class="${data.labelColor}">${key} (${data.count})</span></div>`;
        }
    });
    
    barContainer.innerHTML = barHtml;
    legendContainer.innerHTML = legendHtml;
}

function toggleLaporanSelection(id, kat, checked) {
    if (checked) {
        if (!selectedLaporanPeserta.some(item => item.id === id && item.kategori === kat)) {
            selectedLaporanPeserta.push({id, kategori: kat});
        }
    } else {
        selectedLaporanPeserta = selectedLaporanPeserta.filter(item => !(item.id === id && item.kategori === kat));
    }
    updateLaporanBulkActionBar();
    renderLaporanPage();
}

function updateLaporanBulkActionBar() {
    const bar = document.getElementById('laporan-bulk-action-bar');
    const countEl = document.getElementById('laporan-bulk-count');
    if (!bar || !countEl) return;
    
    if (selectedLaporanPeserta.length > 0) {
        countEl.innerText = selectedLaporanPeserta.length;
        bar.classList.remove('hidden');
        bar.classList.add('flex');
    } else {
        bar.classList.remove('flex');
        bar.classList.add('hidden');
    }
}

function batalPilihSemuaLaporan() {
    selectedLaporanPeserta = [];
    updateLaporanBulkActionBar();
    renderLaporanPage();
}

window.handleSelectMassalLaporan = function(action) {
    const selectEl = document.getElementById('select-pilih-massal-laporan');
    if (!action) return;

    if (action === 'none') {
        selectedLaporanPeserta = [];
    } else {
        const allData = typeof window.getLaporanData === 'function' ? window.getLaporanData() : [];
        let filteredData = getFilteredLaporanData(allData);

        if (action === 'page') {
            const startIndex = (laporanPagination.currentPage - 1) * laporanPagination.itemsPerPage;
            filteredData = filteredData.slice(startIndex, startIndex + laporanPagination.itemsPerPage);
        }

        filteredData.forEach(s => {
            if (!selectedLaporanPeserta.some(item => item.id === s.id && item.kategori === s.kategori)) {
                selectedLaporanPeserta.push({id: s.id, kategori: s.kategori});
            }
        });
    }

    if (selectEl) selectEl.value = "";
    updateLaporanBulkActionBar();
    renderLaporanPage();
};

function cetakSyahadah(id, kat) {
    const allData = typeof window.getLaporanData === 'function' ? window.getLaporanData() : [];
    const peserta = allData.find(p => p.id === id && p.kategori === kat);
    if (!peserta) {
        openAlert("Data peserta tidak ditemukan.");
        return;
    }
    if (!peserta.lulus) {
        openAlert("Hanya peserta yang lulus yang dapat dicetak syahadahnya.");
        return;
    }
    generatePrintSyahadah([peserta]);
}

function cetakSyahadahMassal() {
    if (selectedLaporanPeserta.length === 0) return;
    
    const allData = typeof window.getLaporanData === 'function' ? window.getLaporanData() : [];
    const targetPeserta = [];
    
    selectedLaporanPeserta.forEach(sel => {
        const p = allData.find(x => x.id === sel.id && x.kategori === sel.kategori);
        if (p && p.lulus) {
            targetPeserta.push(p);
        }
    });
    
    if (targetPeserta.length === 0) {
        openAlert("Dari peserta yang dipilih, tidak ada yang berstatus lulus.");
        return;
    }
    
    if (targetPeserta.length < selectedLaporanPeserta.length) {
        openAlert(`Hanya ${targetPeserta.length} dari ${selectedLaporanPeserta.length} peserta terpilih yang berstatus lulus dan akan dicetak.`);
    }
    
    generatePrintSyahadah(targetPeserta);
    batalPilihSemuaLaporan();
}

function generatePrintSyahadah(pesertaList) {
    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) {
        openAlert("Izinkan pop-up untuk mencetak sertifikat.");
        return;
    }

    const appName = appSettings.appName ? appSettings.appName.replace(/<br\s*\/?>/gi, ' ') : 'Aplikasi Munaqosyah';
    const schoolName = appSettings.schoolName || '';
    const logoUrl = appSettings.logoUrl || '';

    let html = `
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <title>Cetak Syahadah</title>
            <style>
                body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; background: #fff; }
                .page { 
                    width: 297mm; height: 210mm; /* A4 Landscape */
                    margin: 0 auto; 
                    page-break-after: always; 
                    position: relative;
                    box-sizing: border-box;
                    padding: 20mm;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    border: 8px solid #004b50;
                    outline: 2px solid #004b50;
                    outline-offset: -12px;
                }
                .page:last-child { page-break-after: auto; }
                @page { size: A4 landscape; margin: 0; }
                .logo { max-width: 80px; max-height: 80px; margin-bottom: 10px; }
                .school-name { font-size: 24px; font-weight: bold; color: #004b50; text-transform: uppercase; margin: 5px 0; letter-spacing: 2px; }
                .title { font-size: 38px; font-weight: bold; color: #b48c36; margin: 15px 0 25px 0; font-family: 'Georgia', serif; }
                .text-regular { font-size: 16px; margin: 5px 0; color: #333; }
                .student-name { font-size: 32px; font-weight: bold; margin: 15px 0; text-decoration: underline; text-transform: uppercase; }
                .details { font-size: 18px; margin: 10px 0; }
                .predikat-box { 
                    display: inline-block; 
                    border: 2px solid #b48c36; 
                    color: #004b50;
                    padding: 10px 30px; 
                    font-size: 22px; 
                    font-weight: bold; 
                    border-radius: 50px; 
                    margin: 20px 0; 
                    background: #fffdf5;
                }
                .signatures { 
                    display: flex; justify-content: space-between; width: 80%; margin-top: 40px; 
                }
                .sig-block { text-align: center; font-size: 16px; }
                .sig-line { width: 200px; border-bottom: 1px solid #000; margin-bottom: 5px; height: 60px; }
                .watermark {
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    opacity: 0.05;
                    z-index: -1;
                    width: 500px;
                }
            </style>
        </head>
        <body>
    `;

    pesertaList.forEach(p => {
        const logoHtml = logoUrl ? `<img src="${logoUrl}" class="logo">` : '';
        const bgLogoHtml = logoUrl ? `<img src="${logoUrl}" class="watermark">` : '';
        
        let pengujiSet = new Set();
        if (typeof statePenilaian !== 'undefined') {
            Object.keys(statePenilaian).forEach(key => {
                if (key.startsWith(p.id + '_') && statePenilaian[key] && statePenilaian[key].penguji) {
                    pengujiSet.add(statePenilaian[key].penguji);
                }
            });
        }
        const namaPenguji = Array.from(pengujiSet).join(' & ') || 'Penguji Utama';

        html += `
            <div class="page">
                ${bgLogoHtml}
                ${logoHtml}
                <div class="school-name">${schoolName}</div>
                <div class="title">SYAHADAH MUNAQOSYAH</div>
                
                <div class="text-regular">Diberikan kepada:</div>
                <div class="student-name">${p.nama}</div>
                
                <div class="text-regular">Nomor Induk / ID: ${p.id}</div>
                
                <div class="text-regular" style="margin-top: 20px;">Telah dinyatakan LULUS dalam Ujian Munaqosyah untuk kategori:</div>
                <div class="details" style="font-weight:bold;">${p.kategori}</div>
                
                <div class="text-regular">Dengan Nilai Rata-rata: <strong>${p.avg}</strong> dan berhak mendapatkan predikat:</div>
                
                <div class="predikat-box">
                    ${p.predikat.text.toUpperCase()}
                </div>

                <div class="signatures">
                    <div class="sig-block">
                        <div>Penguji / Munaqisy</div>
                        <div class="sig-line"></div>
                        <div><strong>${namaPenguji}</strong></div>
                    </div>
                    <div class="sig-block">
                        <div>Kepala Sekolah</div>
                        <div class="sig-line"></div>
                        <div><strong>_________________</strong></div>
                    </div>
                </div>
            </div>
        `;
    });

    html += `
        <script>
            window.onload = function() { window.print(); }
        </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
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
    const tglFilter = document.getElementById('laporan-filter-tanggal');
    const pengujiFilter = document.getElementById('laporan-filter-penguji');

    if (katFilter) katFilter.innerHTML = '<option value="">Semua Kategori</option>' + listKategori.map(k => `<option value="${k.nama}">${k.nama}</option>`).join('');
    if (kelasFilter) kelasFilter.innerHTML = '<option value="">Semua Kelas</option>' + listKelas.map(k => `<option value="${k}">${k}</option>`).join('');
    
    if (tglFilter) {
        const dates = (typeof appSettings !== 'undefined' && appSettings.examDates) ? [...appSettings.examDates] : [];
        if (typeof dataPeserta !== 'undefined') {
            Object.values(dataPeserta).flat().forEach(p => {
                if (p.tanggalUjian && !dates.includes(p.tanggalUjian)) {
                    dates.push(p.tanggalUjian);
                }
            });
        }
        dates.sort();
        tglFilter.innerHTML = '<option value="">Semua Tanggal</option>' + dates.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    if (pengujiFilter) {
        const pengujiSet = new Set();
        if (typeof statePenilaian !== 'undefined') {
            Object.values(statePenilaian).forEach(val => {
                if (val && val.penguji) pengujiSet.add(val.penguji);
            });
        }
        const pengujiList = Array.from(pengujiSet).sort();
        pengujiFilter.innerHTML = '<option value="">Semua Penguji</option>' + pengujiList.map(p => `<option value="${p}">${p}</option>`).join('');
    }

    const pembimbingFilter = document.getElementById('laporan-filter-pembimbing');
    if (pembimbingFilter) {
        const pembimbingSet = new Set();
        if (typeof dataPeserta !== 'undefined') {
            Object.values(dataPeserta).flat().forEach(p => {
                if (p.pembimbing) pembimbingSet.add(p.pembimbing);
            });
        }
        const pembimbingList = Array.from(pembimbingSet).sort();
        pembimbingFilter.innerHTML = '<option value="">Semua Pembimbing</option>' + pembimbingList.map(p => `<option value="${p}">${p}</option>`).join('');
    }
}

function bukaModalLaporanDetail(studentId, kategori) {
    window.pulihkanCurrentState();
    const semester = window.currentState.semester;
    const pList = dataPeserta[`${semester}_${kategori}`] || ((typeof listSemester !== 'undefined' && listSemester[0] === semester) ? dataPeserta[kategori] : null) || [];
    const peserta = pList.find(p => p.id === studentId);
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
        const kkm = (typeof appSettings !== 'undefined' && appSettings.kkm) ? parseFloat(appSettings.kkm) : 7.0;
        items.forEach(item => {
            const penilaian = statePenilaian[`${studentId}_${item.no}`];
            const nilai = penilaian?.nilai;
            const isDinilai = nilai !== undefined;

            html += `
            <div class="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div><p class="font-bold text-sm text-teal-950">${item.nama}</p><p class="text-xs text-gray-500">${typeof item.ayat === 'number' ? item.ayat + ' Ayat' : item.ayat}</p></div>
                ${isDinilai ? `<span class="text-xl font-black font-headline ${nilai < kkm ? 'text-red-600' : 'text-primary'}">${nilai}</span>` : `<span class="text-xs font-bold text-gray-400 italic">Belum Dinilai</span>`}
            </div>`;
        });
    }

    contentContainer.innerHTML = html;
    document.getElementById('modal-laporan-detail').classList.replace('hidden', 'flex');
}

function tutupModalLaporanDetail() {
    document.getElementById('modal-laporan-detail').classList.replace('flex', 'hidden');
}

function eksporDataLaporan() {
    const allData = typeof window.getLaporanData === 'function' ? window.getLaporanData() : [];
    const filteredData = getFilteredLaporanData(allData);

    if (filteredData.length === 0) {
        openAlert("Tidak ada data laporan untuk diekspor berdasarkan filter saat ini.");
        return;
    }

    // 1. Prepare CSV content
    const headers = ['ID', 'Nama Siswa', 'Kelas', 'Kategori', 'Nilai Rata-rata', 'Predikat', 'Status Kelulusan', 'Keterangan', 'Nama Penguji'];
    const csvRows = [headers.join(',')];

    const escapeCsvCell = (cell) => {
        if (cell === null || cell === undefined) {
            return '';
        }
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
    };

    filteredData.forEach(s => {
        const keterangan = s.isSusulan ? 'Ujian Susulan' : 'Reguler';
        
        let pengujiSet = new Set();
        if (typeof statePenilaian !== 'undefined') {
            Object.keys(statePenilaian).forEach(key => {
                if (key.startsWith(s.id + '_') && statePenilaian[key] && statePenilaian[key].penguji) {
                    pengujiSet.add(statePenilaian[key].penguji);
                }
            });
        }
        const namaPenguji = Array.from(pengujiSet).join(' & ') || '-';
        
        let statusText = 'Belum Ujian';
        if (s.progress > 0) {
            if (s.lulus) statusText = 'Lulus';
            else if (s.adaNilaiDiBawahKKM) statusText = 'Remedial';
            else statusText = 'Belum Selesai';
        }

        const avgVal = s.progress === 0 ? '-' : s.avg;
        const predikatVal = s.progress === 0 ? '-' : s.predikat.text;

        const row = [s.id, s.nama, s.kelas, s.kategori, avgVal, predikatVal, statusText, keterangan, namaPenguji].map(escapeCsvCell);
        csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');

    // 2. Trigger download
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const today = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `laporan-munaqosyah-${today}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function cetakRekapLaporan() {
    const allData = typeof window.getLaporanData === 'function' ? window.getLaporanData() : [];
    const filteredData = getFilteredLaporanData(allData);

    if (filteredData.length === 0) {
        openAlert("Tidak ada data laporan untuk dicetak berdasarkan filter saat ini.");
        return;
    }

    // Buat jendela cetak baru atau gunakan iframe
    const printWindow = window.open('', '', 'height=800,width=1200');
    if (!printWindow) {
        openAlert("Izinkan pop-up untuk mencetak laporan.");
        return;
    }

    // Load app settings for header
    const appName = appSettings.appName ? appSettings.appName.replace(/<br\s*\/?>/gi, ' ') : 'Aplikasi Munaqosyah';
    const schoolName = appSettings.schoolName || '';
    const printTitle = schoolName ? `Laporan Nilai ${appName} - ${schoolName}` : `Laporan Nilai ${appName}`;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <title>${printTitle}</title>
            <style>
                body { font-family: 'Inter', sans-serif; margin: 2cm; color: #191c1c; }
                h1 { font-family: 'Manrope', sans-serif; font-size: 24px; font-weight: 800; text-align: center; margin-bottom: 5px; color: #003336; }
                h2 { font-family: 'Manrope', sans-serif; font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 20px; color: #404849; }
                .header-info { text-align: center; margin-bottom: 30px; font-size: 12px; color: #707979; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th, td { border: 1px solid #e1e3e3; padding: 10px 15px; text-align: left; }
                th { background-color: #f2f4f4; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #404849; }
                td { font-size: 13px; color: #191c1c; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .badge { padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; display: inline-block; }
                .badge-lulus { background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
                .badge-remedial { background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
                .badge-sedang { background-color: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
                .badge-belum { background-color: #f3f4f6; color: #6b7280; border: 1px solid #e5e7eb; }
                .avg-score { font-size: 16px; font-weight: 900; }
                .predikat-text { font-weight: 600; font-size: 12px; }
                .page-break { page-break-before: always; }
                @page { size: A4 portrait; margin: 1cm; }
            </style>
        </head>
        <body>
            <h1>${appName}</h1>
            <h2>Laporan Rekapitulasi Nilai Akhir</h2>
            <div class="header-info">
                ${schoolName ? `<p>${schoolName}</p>` : ''}
                <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <p>Filter Aktif: Kategori: ${document.getElementById('laporan-filter-kategori')?.value || 'Semua'}, Kelas: ${document.getElementById('laporan-filter-kelas')?.value || 'Semua'}, Status: ${document.getElementById('laporan-filter-status')?.value || 'Semua'}, Tanggal: ${document.getElementById('laporan-filter-tanggal')?.value || 'Semua'}, Penguji: ${document.getElementById('laporan-filter-penguji')?.value || 'Semua'}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">No.</th>
                        <th>Nama Siswa</th>
                        <th style="width: 15%;">Kelas</th>
                        <th style="width: 15%;">Kategori</th>
                        <th style="width: 10%;" class="text-center">Rata-rata</th>
                        <th style="width: 15%;">Predikat</th>
                        <th style="width: 10%;" class="text-center">Status</th>
                        <th style="width: 10%;" class="text-center">Ket.</th>
                    </tr>
                </thead>
                <tbody>
    `);

    filteredData.forEach((s, index) => {
        let predikatText = s.predikat.text;
        let statusBadgeClass = 'badge-belum';
        let statusText = 'Belum Ujian';
        let avgColorClass = s.avg < (appSettings.kkm || 7) ? 'color: #dc2626;' : 'color: #003336;';
        let avgText = s.avg;
        
        if (s.progress === 0) {
            statusBadgeClass = 'badge-belum';
            statusText = 'Belum Ujian';
            predikatText = '-';
            avgText = '-';
            avgColorClass = 'color: #6b7280;';
        } else if (s.lulus) {
            statusBadgeClass = 'badge-lulus';
            statusText = 'Lulus';
        } else if (s.adaNilaiDiBawahKKM) {
            statusBadgeClass = 'badge-remedial';
            statusText = 'Remedial';
        } else {
            statusBadgeClass = 'badge-sedang';
            statusText = 'Belum Selesai';
        }
        
        const ketText = s.isSusulan ? '<span style="color:#d97706;font-weight:bold;font-size:10px;">Susulan</span>' : '-';

        printWindow.document.write(`
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${s.nama} <div style="font-size: 11px; color: #707979;">(${s.id})</div></td>
                <td>${s.kelas}</td>
                <td>${s.kategori}</td>
                <td class="text-center avg-score" style="${avgColorClass}">${avgText}</td>
                <td><span class="predikat-text" style="color: ${s.progress === 0 ? '#6b7280' : s.predikat.color}">${predikatText}</span></td>
                <td class="text-center"><span class="badge ${statusBadgeClass}">${statusText}</span></td>
                <td class="text-center">${ketText}</td>
            </tr>
        `);
    });

    printWindow.document.write(`
                </tbody>
            </table>
            <div style="font-size: 11px; color: #707979; margin-top: 30px; text-align: center;">
                &copy; 2026 ${appName}. Semua Hak Cipta Dilindungi.
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function bukaProfilSiswa(id, kat) {
    window.pulihkanCurrentState();
    const semester = window.currentState.semester;
    const pList = dataPeserta[`${semester}_${kat}`] || ((typeof listSemester !== 'undefined' && listSemester[0] === semester) ? dataPeserta[kat] : null) || [];
    const p = pList.find(x => x.id === id); if (!p) return;
    const s = getStatusPeserta(id, kat, semester);

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
    // Memicu event input secara manual agar ditangkap oleh Auto-Save
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

window.hitungTotalTartil = function () {
    const tajwid = Math.min(3, parseFloat(document.getElementById('score-tajwid').value) || 0);
    const kalimah = Math.min(3, parseFloat(document.getElementById('score-kalimah').value) || 0);
    const kelancaran = Math.min(2, parseFloat(document.getElementById('score-kelancaran').value) || 0);
    const nafas = Math.min(1, parseFloat(document.getElementById('score-nafas').value) || 0);
    const waqf = Math.min(1, parseFloat(document.getElementById('score-waqf').value) || 0);
    const total = tajwid + kalimah + kelancaran + nafas + waqf;
    document.getElementById('total-tartil-display').innerText = total.toFixed(1);
}

window.hitungTotalFashohah = function () {
    const huruf = Math.min(4, parseFloat(document.getElementById('score-huruf').value) || 0);
    const harokah = Math.min(3, parseFloat(document.getElementById('score-harokah').value) || 0);
    const sifat = Math.min(2, parseFloat(document.getElementById('score-sifat').value) || 0);
    const volume = Math.min(1, parseFloat(document.getElementById('score-volume').value) || 0);
    const total = huruf + harokah + sifat + volume;
    document.getElementById('total-fashohah-display').innerText = total.toFixed(1);
}

window.hitungTotalGhorib = function () {
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

window.hitungTotalTajwid = function () {
    let total = 0;
    for (let i = 1; i <= 5; i++) {
        total += Math.min(1, parseFloat(document.getElementById(`tajwid-t${i}`).value) || 0);
        total += Math.min(1, parseFloat(document.getElementById(`tajwid-u${i}`).value) || 0);
    }
    document.getElementById('total-tajwid-display').innerText = total.toFixed(1);
}

function renderLembarGrid(surahNo) {
    const studentId = (typeof currentState !== 'undefined' && currentState.studentId) ? currentState.studentId : localStorage.getItem('currentStudentId');
    const grid = document.getElementById('lembar-grid');
    const key = `${studentId}_${surahNo}_lembar`;
    let state = statePenilaian[key];
    if (state && state.length === 15) {
        state = [...state, ...Array(15).fill(0)];
    }
    lembarState = state || Array(30).fill(0); // 0: lancar, 1: khafi, 2: jali
    let html = '';
    for (let i = 0; i < 30; i++) {
        if (i === 0) {
            html += '<div class="w-full basis-full text-center text-[10px] font-bold text-indigo-700 mt-1 mb-1">Halaman 1 (Baris 1 - 15)</div>';
        }
        if (i === 15) {
            html += '<div class="w-full basis-full text-center text-[10px] font-bold text-indigo-700 mt-2 mb-1 border-t border-indigo-200 pt-2">Halaman 2 (Baris 1 - 15)</div>';
        }
        let bgColor = 'bg-gray-100 hover:bg-gray-200 text-gray-400';
        if (lembarState[i] === 1) bgColor = 'bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-600';
        if (lembarState[i] === 2) bgColor = 'bg-red-100 border border-red-300 hover:bg-red-200 text-red-600';

        const lineNum = i < 15 ? i + 1 : i - 14;
        html += `<div onclick="window.toggleLembarState(${i}, '${surahNo}')" class="w-8 h-8 sm:w-9 sm:h-9 rounded-md cursor-pointer transition-colors flex items-center justify-center text-[10px] font-bold ${bgColor}">${lineNum}</div>`;
    }
    grid.innerHTML = html;
}

window.toggleLembarState = function (index, surahNo) {
    const studentId = (typeof currentState !== 'undefined' && currentState.studentId) ? currentState.studentId : localStorage.getItem('currentStudentId');
    lembarState[index] = (lembarState[index] + 1) % 3; // Cycle 0 -> 1 -> 2 -> 0
    const key = `${studentId}_${surahNo}_lembar`;
    statePenilaian[key] = lembarState;

    window.saveLocalState();
    renderLembarGrid(surahNo);
    
    // Memicu event input secara manual agar ditangkap oleh Auto-Save
    const modalPenilaianEl = document.getElementById('modal-penilaian');
    if (modalPenilaianEl) modalPenilaianEl.dispatchEvent(new Event('input', { bubbles: true }));
}

function tutupProfilSiswa() {
    document.getElementById('slideover-panel').classList.add('translate-x-full');
    setTimeout(() => document.getElementById('slideover-backdrop').classList.replace('flex', 'hidden'), 300);
}

function bukaPenilaianDariProfil() {
    tutupProfilSiswa();
    switchView('ujian');
    setTimeout(() => {
        const selectEl = document.getElementById('kategori-select');
        if (selectEl) selectEl.value = currentState.kategori;
        if (typeof window.filterUjianPeserta === 'function') window.filterUjianPeserta();
                
                if (typeof window.bukaDetailPenilaian === 'function') {
                    window.bukaDetailPenilaian(currentState.studentId, currentState.kategori);
                } else if (typeof switchView === 'function') {
                    switchView('penilaian-detail', currentState.studentId, currentState.kategori);
                }
    }, 100);
}

window.bagikanHasil = function(id, kat) {
    window.pulihkanCurrentState();
    const semester = window.currentState.semester;
    if (!semester) {
        if (typeof openAlert === 'function') openAlert("Pastikan semester telah dipilih terlebih dahulu.");
        return;
    }
    
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    const shareUrl = `${baseUrl}hasil.html?id=${encodeURIComponent(id)}&kat=${encodeURIComponent(kat)}&sem=${encodeURIComponent(semester)}`;
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(shareUrl).then(() => {
            if (typeof openAlert === 'function') openAlert("Tautan hasil ujian berhasil disalin ke clipboard!\n\nAnda dapat membagikannya kepada siswa/orang tua.\n\n" + shareUrl);
        }).catch(err => {
            prompt("Gagal menyalin otomatis. Silakan salin tautan berikut secara manual:", shareUrl);
        });
    } else {
        prompt("Silakan salin tautan hasil ujian berikut untuk dibagikan:", shareUrl);
    }
};

window.bagikanHasilFilter = function() {
    window.pulihkanCurrentState();
    const semester = window.currentState.semester;
    if (!semester) {
        if (typeof openAlert === 'function') openAlert("Pastikan semester telah dipilih terlebih dahulu.");
        return;
    }

    const allData = typeof window.getLaporanData === 'function' ? window.getLaporanData() : [];
    const filteredData = getFilteredLaporanData(allData);

    if (filteredData.length === 0) {
        if (typeof openAlert === 'function') openAlert("Tidak ada data peserta untuk dibagikan berdasarkan filter saat ini.");
        return;
    }

    const filterPembimbing = document.getElementById('laporan-filter-pembimbing')?.value || '';
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    
    let textToCopy = `Assalamu'alaikum Wr. Wb.\n`;
    if (filterPembimbing) {
        textToCopy += `Berikut adalah tautan hasil ujian Munaqosyah santri bimbingan ${filterPembimbing} (Semester ${semester}):\n\n`;
    } else {
        textToCopy += `Berikut adalah tautan hasil ujian Munaqosyah (Semester ${semester}):\n\n`;
    }

    filteredData.forEach((p, index) => {
        const shareUrl = `${baseUrl}hasil.html?id=${encodeURIComponent(p.id)}&kat=${encodeURIComponent(p.kategori)}&sem=${encodeURIComponent(semester)}`;
        textToCopy += `${index + 1}. ${p.nama} (${p.kategori})\n   Link: ${shareUrl}\n\n`;
    });

    textToCopy += `Terima kasih.`;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            if (typeof openAlert === 'function') openAlert(`Berhasil menyalin ${filteredData.length} tautan hasil ujian ke papan klip!\n\nAnda dapat langsung menempelkannya (paste) ke grup WhatsApp.`);
        }).catch(err => prompt("Gagal menyalin otomatis. Silakan salin teks berikut secara manual:", textToCopy));
    } else {
        prompt("Silakan salin teks berikut secara manual untuk dibagikan:", textToCopy);
    }
};
