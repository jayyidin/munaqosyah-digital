// --- Assessment ---

        // Fungsi untuk memastikan currentState pulih dari localStorage setelah di-refresh
        window.pulihkanCurrentState = function() {
            if (typeof window.currentState === 'undefined') window.currentState = {};
            if (!window.currentState.studentId) window.currentState.studentId = localStorage.getItem('currentStudentId');
            if (!window.currentState.kategori) window.currentState.kategori = localStorage.getItem('currentKategori');
            if (!window.currentState.semester) window.currentState.semester = localStorage.getItem('currentSemester');
            
            let lsStudentId = localStorage.getItem('currentStudentId');
            let lsKategori = localStorage.getItem('currentKategori');
            let lsSemester = localStorage.getItem('currentSemester');
            
            // Sanitisasi nilai null string yang sering nyangkut di localStorage
            if (lsStudentId === 'null' || lsStudentId === 'undefined') lsStudentId = null;
            if (lsKategori === 'null' || lsKategori === 'undefined') lsKategori = null;
            if (lsSemester === 'null' || lsSemester === 'undefined') lsSemester = null;

            if (!window.currentState.studentId && lsStudentId) window.currentState.studentId = lsStudentId;
            if (!window.currentState.kategori && lsKategori) window.currentState.kategori = lsKategori;
            if (!window.currentState.semester && lsSemester) window.currentState.semester = lsSemester;
            
            // Paksa simpan balik ke localStorage agar tidak mudah hilang di refresh berikutnya
            if (window.currentState.studentId) localStorage.setItem('currentStudentId', window.currentState.studentId);
            if (window.currentState.kategori) localStorage.setItem('currentKategori', window.currentState.kategori);
        };

        // Langsung pulihkan state saat file dimuat
        window.pulihkanCurrentState();
        
        // Tracking materi yang baru saja diupdate nilainya pada sesi browser ini
        window.sessionUpdatedMaterials = window.sessionUpdatedMaterials || new Set();

        window.ujianPagination = window.ujianPagination || { currentPage: 1, itemsPerPage: 12, totalPages: 0, totalItems: 0 };
        window.renderUjianDateDisplay = function () {
            const selectEl = document.getElementById('ujian-filter-tanggal');
            if (!selectEl) return;

            const currentVal = selectEl.value;
            let dates = [];
            
            if (typeof appSettings !== 'undefined' && appSettings.examDates) {
                dates = [...appSettings.examDates];
            }
            if (typeof dataPeserta !== 'undefined') {
                Object.values(dataPeserta).forEach(list => {
                    let arr = Array.isArray(list) ? list : (list.list || []);
                    arr.forEach(p => {
                        if (p.tanggalUjian && !dates.includes(p.tanggalUjian)) {
                            dates.push(p.tanggalUjian);
                        }
                    });
                });
            }
            dates.sort();

            let html = '<option value="">Semua Tanggal Ujian</option>';
            if (dates.length > 0) {
                dates.forEach(d => {
                    const [y, m, day] = d.split('-');
                    const formatted = new Date(y, m - 1, day).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                    html += `<option value="${d}">${formatted}</option>`;
                });
            } else {
                html = '<option value="">Belum Ada Tanggal</option>';
            }

            if (selectEl.innerHTML !== html) {
                selectEl.innerHTML = html;
                
                // Set default to today if exists, else keep current
                const todayStr = new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0');
                
                if (!currentVal && dates.includes(todayStr)) {
                    selectEl.value = todayStr;
                } else if (currentVal && dates.includes(currentVal)) {
                    selectEl.value = currentVal;
                } else {
                    selectEl.value = "";
                }
            }

            // Tampilkan tombol Nilai Massal khusus Admin Utama
            const btnMassal = document.getElementById('ujian-pilih-massal-container');
            if (btnMassal) {
                if (typeof currentUser !== 'undefined' && currentUser.role === 'Admin Utama') {
                    btnMassal.classList.remove('hidden');
                } else {
                    btnMassal.classList.add('hidden');
                }
            }
        };

        window.bukaDetailPenilaian = function(studentId, kategori) {
            if (typeof window.currentState === 'undefined') {
                window.currentState = {};
            }
            window.currentState.studentId = studentId;
            window.currentState.kategori = kategori;
            
            // Semester sudah di-set secara global, tidak perlu di-set di sini
            localStorage.setItem('currentStudentId', studentId);
            localStorage.setItem('currentKategori', kategori);
            
            // Parameter ke-3 untuk switchView adalah semester, tapi kita gunakan currentState
            if (typeof switchView === 'function') switchView('penilaian-detail', studentId, kategori, window.currentState.semester);
            
            const searchInput = document.getElementById('search-surat');
            if (searchInput && !searchInput.hasAttribute('data-bound')) {
                searchInput.addEventListener('input', function() { if (typeof window.renderDaftarSuratDetail === 'function') window.renderDaftarSuratDetail(); });
                searchInput.setAttribute('data-bound', 'true');
            }
            
            // Eksekusi langsung tanpa menunggu animasi pergantian halaman selesai
            if (typeof window.renderPenilaianDetailHeader === 'function') window.renderPenilaianDetailHeader();
            if (typeof window.renderDaftarSuratDetail === 'function') window.renderDaftarSuratDetail();
            
            setTimeout(() => {
                if (typeof window.renderPenilaianDetailHeader === 'function') window.renderPenilaianDetailHeader();
                if (typeof window.renderDaftarSuratDetail === 'function') window.renderDaftarSuratDetail();
            }, 100); // Memberikan jeda waktu agar DOM halaman siap dirender
        };

        // --- FITUR PILIH MASSAL UJIAN ---
        window.selectedUjianPeserta = window.selectedUjianPeserta || [];

        window.toggleUjianSelection = function(id, checked) {
            if (checked) {
                if (!window.selectedUjianPeserta.includes(id)) window.selectedUjianPeserta.push(id);
            } else {
                window.selectedUjianPeserta = window.selectedUjianPeserta.filter(item => item !== id);
            }
            window.updateUjianBulkActionBar();
            window.filterUjianPeserta(true); // Panggil dengan skipSkeleton agar tabel tidak berkedip
        };

        window.updateUjianBulkActionBar = function() {
            const bar = document.getElementById('ujian-bulk-action-bar');
            const countEl = document.getElementById('ujian-bulk-count');
            if (!bar || !countEl) return;
            
            if (window.selectedUjianPeserta.length > 0) {
                countEl.innerText = window.selectedUjianPeserta.length;
                bar.classList.remove('hidden');
                bar.classList.add('flex');
            } else {
                bar.classList.remove('flex');
                bar.classList.add('hidden');
            }
        };

        window.batalPilihSemuaUjian = function() {
            window.selectedUjianPeserta = [];
            window.updateUjianBulkActionBar();
            window.filterUjianPeserta(true);
        };

        window.handleSelectMassalUjian = function(action) {
            const selectEl = document.getElementById('select-pilih-massal-ujian');
            if (!action) return;

            if (action === 'none') {
                window.selectedUjianPeserta = [];
            } else {
                window.pulihkanCurrentState();
                const katEl = document.getElementById('kategori-select');
                const semester = window.currentState.semester;
                const kategori = katEl ? katEl.value : window.currentState.kategori;
                const searchEl = document.getElementById('search-ujian');
                const searchTerm = searchEl ? searchEl.value.toLowerCase() : "";

                let pesertaList = [];
                if (typeof dataPeserta !== 'undefined' && dataPeserta) {
                    Object.keys(dataPeserta).forEach(key => {
                        let studentDocSemester = null;
                        let kat = key;
                        if (key.includes('_')) {
                            const firstUnderscore = key.indexOf('_');
                            studentDocSemester = key.substring(0, firstUnderscore);
                            kat = key.substring(firstUnderscore + 1);
                        }
                        
                        if (studentDocSemester && studentDocSemester !== semester) return;

                        if (!kategori || kat === kategori) {
                            let list = dataPeserta[key];
                            if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
                            if (Array.isArray(list)) {
                                list.forEach(p => {
                                    if (p && typeof p === 'object' && p.nama) {
                                        if (!p.id) p.id = `FIX-${Math.random().toString(36).substring(2, 9)}`;
                                        pesertaList.push(p);
                                    }
                                });
                            }
                        }
                    });
                }
                
                pesertaList = pesertaList.filter(p => p && typeof p === 'object' && p.nama);
                if (searchTerm) pesertaList = pesertaList.filter(p => (p.nama && p.nama.toLowerCase().includes(searchTerm)) || (p.id && p.id.toLowerCase().includes(searchTerm)));
                
                const filterTanggalEl = document.getElementById('ujian-filter-tanggal');
                const filterTanggal = filterTanggalEl ? filterTanggalEl.value : "";
                if (filterTanggal) {
                    pesertaList = pesertaList.filter(p => p.tanggalUjian === filterTanggal);
                }

                if (action === 'page') {
                    const startIndex = (window.ujianPagination.currentPage - 1) * window.ujianPagination.itemsPerPage;
                    pesertaList = pesertaList.slice(startIndex, startIndex + window.ujianPagination.itemsPerPage);
                }

                pesertaList.forEach(p => { if (!window.selectedUjianPeserta.includes(p.id)) window.selectedUjianPeserta.push(p.id); });
            }

            if (selectEl) selectEl.value = "";
            window.updateUjianBulkActionBar();
            window.filterUjianPeserta(true);
        };

        window.filterUjianPeserta = function (skipSkeleton = false) {
            window.pulihkanCurrentState();
            const katEl = document.getElementById('kategori-select');
            const semester = window.currentState.semester;
            
            let kategori = window.currentState.kategori;
            // Perbaikan: Hindari katEl.value yang kosong (saat baru dimuat) menimpa kategori di state
            if (katEl && katEl.value && katEl.options.length > 0) {
                kategori = katEl.value;
            }

            // Fallback kategori jika masih kosong, dan pastikan semester sudah ada
            if (!kategori && typeof listKategori !== 'undefined' && listKategori.length > 0) {
                kategori = listKategori[0].nama;
            }
            window.currentState.kategori = kategori;
            if (kategori) localStorage.setItem('currentKategori', kategori);
            if (kategori) {
                localStorage.setItem('currentKategori', kategori);
                if (katEl && katEl.value !== kategori) katEl.value = kategori; // Sinkronkan nilai dropdown
            }

            const searchEl = document.getElementById('search-ujian');
            const searchTerm = searchEl ? searchEl.value.toLowerCase() : "";
            
            window.renderUjianDateDisplay();
            
            const filterTanggalEl = document.getElementById('ujian-filter-tanggal');
            const filterTanggal = filterTanggalEl ? filterTanggalEl.value : "";

            const container = document.getElementById('container-peserta-ujian');
            if (!container) return;

            if (!skipSkeleton) {
                let skeletonHtml = '';
                const skeletonCount = window.ujianPagination.itemsPerPage > 0 ? Math.min(window.ujianPagination.itemsPerPage, 6) : 6;
                for (let i = 0; i < skeletonCount; i++) {
                    skeletonHtml += `
                    <div class="bg-white rounded-[28px] p-1.5 shadow-sm border border-gray-100 animate-pulse">
                        <div class="bg-gray-50 rounded-[22px] p-5 h-32"></div>
                        <div class="px-5 py-3.5 bg-white rounded-b-[22px] mt-1 h-12"></div>
                    </div>`;
                }
                container.innerHTML = skeletonHtml;
                const paginationContainer = document.getElementById('pagination-ujian');
                if (paginationContainer) paginationContainer.innerHTML = '';
            }

            setTimeout(() => {
                try {
                let pesertaList = [];
                if (typeof dataPeserta !== 'undefined' && dataPeserta) {
                    Object.keys(dataPeserta).forEach(key => {
                        let studentDocSemester = null;
                        let kat = key;
                        if (key.includes('_')) {
                            const firstUnderscore = key.indexOf('_');
                            studentDocSemester = key.substring(0, firstUnderscore);
                            kat = key.substring(firstUnderscore + 1);
                        }
                        
                        if (studentDocSemester && studentDocSemester !== semester) return;

                        if (!kategori || kat === kategori) {
                            let list = dataPeserta[key];
                            if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
                            if (Array.isArray(list)) {
                                list.forEach(p => {
                                    if (p && typeof p === 'object' && p.nama) {
                                        if (!p.id) p.id = `FIX-${Math.random().toString(36).substring(2, 9)}`;
                                        pesertaList.push(p);
                                    }
                                });
                            }
                        }
                    });
                }
                
                // Filter valid object
                pesertaList = pesertaList.filter(p => p && typeof p === 'object' && p.nama);
                
                if (searchTerm) {
                    pesertaList = pesertaList.filter(p => (p.nama && p.nama.toLowerCase().includes(searchTerm)) || (p.id && p.id.toLowerCase().includes(searchTerm)));
                }

                if (filterTanggal) {
                    pesertaList = pesertaList.filter(p => p.tanggalUjian === filterTanggal);
                }

                // Pagination Calculation
                window.ujianPagination.totalItems = pesertaList.length;
                window.ujianPagination.totalPages = Math.ceil(pesertaList.length / window.ujianPagination.itemsPerPage);
            if (window.ujianPagination.currentPage > window.ujianPagination.totalPages && window.ujianPagination.totalPages > 0) {
                window.ujianPagination.currentPage = window.ujianPagination.totalPages;
            } else if (window.ujianPagination.totalPages === 0) {
                window.ujianPagination.currentPage = 1;
            }

            const startIndex = (window.ujianPagination.currentPage - 1) * window.ujianPagination.itemsPerPage;
            const paginatedList = pesertaList.slice(startIndex, startIndex + window.ujianPagination.itemsPerPage);

            let html = '';
            if (paginatedList.length === 0) {
                html = `
                <div class="col-span-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-gray-100 shadow-sm border-dashed animate-view">
                    <div class="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-5 relative">
                        <div class="absolute inset-0 bg-primary/5 rounded-full animate-ping opacity-75"></div>
                        <span class="material-symbols-outlined text-5xl relative z-10">person_search</span>
                    </div>
                    <h3 class="text-xl font-extrabold text-teal-950 mb-2 font-headline">Peserta Tidak Ditemukan</h3>
                    <p class="text-sm text-gray-500 max-w-sm">Tidak ada siswa yang cocok dengan pencarian atau filter kategori Anda. Coba ubah kata kunci atau kategori.</p>
                </div>`;
            } else {
                paginatedList.forEach(p => {
                    const s = typeof getStatusPeserta === 'function' ? getStatusPeserta(p.id, kategori, semester) : { progress: 0, completed: 0, total: 0 };

                    let surahListHtml = '';
                    let flatList = typeof window.getMateriList === 'function' ? window.getMateriList(kategori) : [];

                    if (flatList.length > 0) {
                        surahListHtml = '<div class="mt-4 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-2 pb-1 hide-scrollbar mask-bottom" onclick="event.stopPropagation();">';
                        flatList.forEach(item => {
                            if (!item || !item.no) return;
                            const stateKey1 = `${semester}_${p.id}_${item.no}`;
                            const stateKey2 = `${p.id}_${item.no}`;
                            const isDinilai = typeof statePenilaian !== 'undefined' && (statePenilaian[stateKey1] !== undefined || statePenilaian[stateKey2] !== undefined);
                            const badgeClass = isDinilai ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-primary/30 hover:bg-primary/5';
                            const escapedNama = item.nama ? item.nama.replace(/'/g, "\\'") : '';
                            surahListHtml += `<span class="px-2.5 py-1 text-[9px] font-bold rounded-md border ${badgeClass} transition-colors" onclick="event.stopPropagation(); window.bukaDetailPenilaian('${p.id}', '${kategori}'); setTimeout(() => window.bukaFormPenilaian('${item.no}', '${escapedNama}'), 300)">${item.nama}</span>`;
                        });
                        surahListHtml += '</div>';
                    }

                    let hasRecentUpdate = false;
                    if (window.sessionUpdatedMaterials) {
                        const prefix = semester ? `${semester}_${p.id}_` : `${p.id}_`;
                        hasRecentUpdate = Array.from(window.sessionUpdatedMaterials).some(key => key.startsWith(prefix));
                    }
                    const isChecked = window.selectedUjianPeserta && window.selectedUjianPeserta.includes(p.id);
                    const borderClass = hasRecentUpdate ? 'border-amber-400 ring-4 ring-amber-400/30 animate-pulse relative z-10' : (isChecked ? 'border-primary ring-2 ring-primary/20 shadow-md bg-teal-50/10' : 'border-gray-100');

                    html += `
                    <div class="bg-white rounded-[28px] p-1.5 shadow-sm hover:shadow-xl hover:shadow-teal-900/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between border ${borderClass} animate-view" onclick="window.bukaDetailPenilaian('${p.id}', '${kategori}')">
                        <div class="bg-gray-50/60 rounded-[22px] p-5 relative overflow-hidden flex-1 flex flex-col">
                            <div class="absolute top-3 right-3 z-20" onclick="event.stopPropagation()">
                                <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.toggleUjianSelection('${p.id}', this.checked)" class="w-5 h-5 rounded-md border-gray-300 text-primary focus:ring-primary cursor-pointer shadow-sm transition-all hover:scale-110 active:scale-95">
                            </div>
                            <div class="absolute -right-6 -top-6 w-28 h-28 bg-gradient-to-br from-primary/5 to-transparent rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-700 ease-out"></div>
                            <div class="flex items-start justify-between mb-5 relative z-10">
                                <div class="flex items-center gap-3.5 w-full">
                                    <div class="w-12 h-12 rounded-2xl ${p.warna} flex items-center justify-center font-extrabold text-lg shrink-0 shadow-sm border border-white/60">${p.inisial}</div>
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 mb-1">
                                            <h4 class="font-extrabold text-teal-950 text-base group-hover:text-primary transition-colors leading-tight truncate">${p.nama}</h4>
                                            ${hasRecentUpdate ? '<span class="relative flex h-2.5 w-2.5 shrink-0" title="Baru saja diperbarui"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span></span>' : ''}
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="inline-block px-2 py-0.5 bg-white border border-gray-200 rounded-md text-[9px] font-bold text-gray-500 uppercase tracking-wider shadow-sm">${p.kelas}</span>
                                            <span class="text-[10px] text-gray-400 font-medium truncate">${p.id}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="relative z-10 flex-1 flex flex-col justify-end">
                                <div class="flex justify-between items-end mb-2">
                                    <span class="text-[10px] font-bold uppercase tracking-widest text-gray-400">Progres Penilaian</span>
                                    <span class="text-sm font-black ${s.progress === 100 ? 'text-emerald-500' : 'text-teal-950'}">${s.progress}%</span>
                                </div>
                                <div class="w-full bg-gray-200/80 h-2.5 rounded-full overflow-hidden shadow-inner">
                                    <div class="h-full transition-all duration-1000 rounded-full ${s.progress === 100 ? 'bg-emerald-500' : 'bg-primary'}" style="width: ${s.progress}%"></div>
                                </div>
                                ${surahListHtml}
                            </div>
                        </div>
                        <div class="px-5 py-3.5 flex items-center justify-between bg-white rounded-b-[22px] mt-1">
                            <div class="flex items-center gap-2.5">
                                <div class="flex -space-x-1.5">
                                    ${s.completed > 0 ? '<div class="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center z-10"><span class="material-symbols-outlined text-[10px] text-emerald-600 font-bold">check</span></div>' : ''}
                                    <div class="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center relative"><span class="text-[9px] font-bold text-gray-500">${s.total}</span></div>
                                </div>
                                <span class="text-[10px] font-bold text-gray-400"><span class="${s.completed === s.total && s.total > 0 ? 'text-emerald-600' : 'text-teal-950'}">${s.completed}</span> dari ${s.total} diuji</span>
                            </div>
                            <div class="w-8 h-8 rounded-full bg-teal-50 text-teal-600 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                                <span class="material-symbols-outlined text-sm font-bold transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                            </div>
                        </div>
                    </div>`;
                });
            }
            const finalContainer = document.getElementById('container-peserta-ujian');
            if (finalContainer) finalContainer.innerHTML = html;
            window.renderUjianPaginationControls();
            } catch (error) {
                console.error("Error in filterUjianPeserta:", error);
                container.innerHTML = `<div class="col-span-full py-10 text-center bg-red-50 text-red-500 rounded-2xl border border-red-200">Terjadi kesalahan saat memuat data ujian.<br><span class="text-xs font-mono">${error.message}</span></div>`;
            }
            }, skipSkeleton ? 0 : 200); // Jeda timeout agar kerangka pemuatan (skeleton) terlihat
        };

        window.changeUjianPage = function(page) {
            if (page < 1 || page > window.ujianPagination.totalPages) return;
            window.ujianPagination.currentPage = page;
            window.filterUjianPeserta();
            document.getElementById('view-ujian')?.querySelector('main')?.scrollTo(0, 0);
        };

        window.renderUjianPaginationControls = function() {
            const container = document.getElementById('pagination-ujian');
            if (!container) return;

            const { currentPage, totalPages } = window.ujianPagination;
            if (totalPages <= 1) {
                container.innerHTML = '';
                return;
            }

            let html = `<button onclick="changeUjianPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} class="px-3 sm:px-4 py-2 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center min-w-[40px]"><span class="hidden sm:inline">Prev</span><span class="sm:hidden material-symbols-outlined text-[18px]">chevron_left</span></button>`;
            
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
                html += `<button onclick="changeUjianPage(1)" class="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">1</button>`;
                if (startPage > 2) html += `<span class="w-10 h-10 flex items-center justify-center text-sm font-bold text-gray-400">...</span>`;
            }

            for (let i = startPage; i <= endPage; i++) {
                html += (i === currentPage) ? `<span class="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold bg-primary text-white border border-primary shadow-sm">${i}</span>` : `<button onclick="changeUjianPage(${i})" class="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">${i}</button>`;
            }

            if (endPage < totalPages) {
                if (endPage < totalPages - 1) html += `<span class="w-10 h-10 flex items-center justify-center text-sm font-bold text-gray-400">...</span>`;
                html += `<button onclick="changeUjianPage(${totalPages})" class="w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">${totalPages}</button>`;
            }

            html += `<button onclick="changeUjianPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} class="px-3 sm:px-4 py-2 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center min-w-[40px]"><span class="hidden sm:inline">Next</span><span class="sm:hidden material-symbols-outlined text-[18px]">chevron_right</span></button>`;
            container.innerHTML = html;
        };

        window.renderPenilaianDetailHeader = function () {
            try {
                window.pulihkanCurrentState();
                const studentId = window.currentState.studentId;
                const kategori = window.currentState.kategori;
                const semester = window.currentState.semester;

                if (!studentId || !kategori) return;
                if (typeof dataPeserta === 'undefined' || !dataPeserta) return;
                
                let p = null;
                Object.values(dataPeserta).forEach(list => {
                    let arr = list;
                    if (arr && !Array.isArray(arr) && Array.isArray(arr.list)) arr = arr.list;
                    if (Array.isArray(arr)) {
                        const found = arr.find(x => x.id === studentId);
                        if (found) p = found;
                    }
                });

                if (!p) {
                    if (typeof window.renderDaftarSuratDetail === 'function') window.renderDaftarSuratDetail();
                    return;
                }

                const s = typeof getStatusPeserta === 'function' ? getStatusPeserta(p.id, kategori, semester) : { progress: 0, completed: 0, total: 0 };
                const header = document.getElementById('detail-student-header');
                if (!header) return;

                header.innerHTML = `
    <div class="col-span-full md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-5">
        <div class="w-16 h-16 rounded-full ${p.warna || 'bg-gray-200'} flex items-center justify-center font-extrabold text-2xl shrink-0 shadow-inner">${p.inisial || '-'}</div>
        <div>
            <h2 class="text-2xl font-headline font-extrabold text-teal-950 leading-tight">${p.nama}</h2>
            <p class="text-sm text-gray-500 font-medium">${p.id} • ${p.kelas || '-'}</p>
            <div class="mt-2 inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                ${kategori}
            </div>
            <div class="mt-1 inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                Semester: ${semester}
            </div>
        </div>
    </div>
    <div class="col-span-full md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
        <div class="flex justify-between mb-2">
            <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Progres Ujian</span>
            <span class="text-sm font-bold text-teal-950">${s.progress}%</span>
        </div>
        <div class="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-3">
            <div class="bg-primary h-full transition-all duration-1000" style="width: ${s.progress}%"></div>
        </div>
        <p class="text-xs text-gray-400 font-medium text-right">${s.completed} dari ${s.total} Materi Selesai</p>
    </div>`;
                // Panggil render daftar materi HANYA JIKA render header berhasil
                if (typeof window.renderDaftarSuratDetail === 'function') window.renderDaftarSuratDetail();

            } catch (error) {
                console.error("Error in renderPenilaianDetailHeader:", error);
            }
        };

        window.renderDaftarSuratDetail = function () {
            try {
                window.pulihkanCurrentState();
                const studentId = window.currentState.studentId;
                const kategori = window.currentState.kategori;
                const semester = window.currentState.semester;

                const container = document.getElementById('container-surat-ujian');
                const countSpan = document.getElementById('detail-surah-count');
                const searchInput = document.getElementById('search-surat');
                const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";

                if (!container || !kategori) return;

                let items = typeof window.getMateriList === 'function' ? window.getMateriList(kategori) : [];

                if (searchTerm) {
                    items = items.filter(item => item && item.nama && item.nama.toLowerCase().includes(searchTerm));
                }

                if (countSpan) countSpan.innerText = `${items.length} Materi`;

                let html = '';
                if (items.length === 0) {
                    html = '<div class="p-8 text-center bg-white rounded-2xl border border-gray-100 animate-view"><p class="text-gray-400 italic">Tidak ada materi ditemukan.</p></div>';
                } else {
                    // Menambahkan wrapper grid 2 kolom untuk membelah data
                    html = '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
                    items.forEach(item => {
                        if (!item || !item.no) return;
                        const stateKey = semester ? `${semester}_${studentId}_${item.no}` : `${studentId}_${item.no}`;
                        const penilaian = (typeof statePenilaian !== 'undefined' && statePenilaian) ? statePenilaian[stateKey] : undefined;
                        const isDinilai = penilaian && penilaian.nilai !== undefined;
                        const nilai = isDinilai ? penilaian.nilai : '-';
                        const kkm = (typeof appSettings !== 'undefined' && appSettings && appSettings.kkm) ? parseFloat(appSettings.kkm) : 7;
                        
                        window.sessionUpdatedMaterials = window.sessionUpdatedMaterials || new Set();
                        const isRecentlyUpdated = window.sessionUpdatedMaterials.has(stateKey);
                        
                        let statusColor = 'text-gray-400 bg-gray-50 border-gray-200';
                        let statusBadge = '';
                        let pengujiText = '';
                        
                        if (isDinilai) {
                            const isLulus = parseFloat(nilai) >= kkm;
                            statusColor = isLulus ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-200';
                            
                            const badgeText = isLulus ? 'Lulus' : 'Remedial';
                            const badgeClass = isLulus ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200';
                            statusBadge = `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold border ${badgeClass}">${badgeText}</span>`;
                            
                            const pengujiName = penilaian.penguji;
                            if (pengujiName && !pengujiName.toLowerCase().includes('admin') && !pengujiName.toLowerCase().includes('jayyidin')) {
                                pengujiText = `<div class="mt-1 flex items-center gap-1 text-[10px] text-gray-500"><span class="material-symbols-outlined text-[12px]">edit_note</span> Dinilai oleh: <span class="font-bold text-teal-800">${pengujiName}</span></div>`;
                            }
                        }
                        
                        const icon = typeof item.no === 'string' && item.no.startsWith('M') ? 'psychology' : (typeof item.no === 'string' && (item.no.startsWith('H') || item.no.startsWith('L')) ? 'auto_stories' : 'menu_book');
                        const escapedNama = item.nama ? item.nama.replace(/'/g, "\\'") : ''; 

                        html += `
            <div class="flex flex-col bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer animate-view" onclick="window.bukaFormPenilaian('${item.no}', '${escapedNama}')">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors shrink-0">
                            <span class="material-symbols-outlined">${icon}</span>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h4 class="font-bold text-teal-950 text-base group-hover:text-primary transition-colors">${item.nama}</h4>
                                ${isRecentlyUpdated ? '<span class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Baru Diubah</span>' : ''}
                                ${statusBadge}
                            </div>
                            <div class="flex flex-wrap items-center gap-2 mt-0.5">
                                <p class="text-[11px] font-medium text-gray-500">${typeof item.ayat === 'number' ? item.ayat + ' Ayat' : item.ayat}</p>
                            </div>
                            ${pengujiText}
                        </div>
                    </div>
                    <div class="flex items-center gap-2 sm:gap-4">
                        <div class="text-right hidden sm:block">
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nilai</p>
                            <span class="inline-block min-w-[3rem] text-center px-2 py-1 rounded border font-extrabold text-sm ${statusColor}">
                                ${nilai}
                            </span>
                        </div>
                        <div class="flex items-center gap-2">
                            ${isDinilai ? `<button onclick="event.stopPropagation(); window.hapusNilaiLangsung('${studentId}', '${item.no}', '${semester}')" class="w-10 h-10 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shrink-0" title="Hapus Nilai"><span class="material-symbols-outlined text-[20px]">delete</span></button>` : ''}
                            <button class="w-10 h-10 rounded-full bg-gray-50 text-gray-400 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all shrink-0">
                                <span class="material-symbols-outlined text-[20px]">${isDinilai ? 'edit' : 'add'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>`;
                    });
                    html += '</div>';
                }
                container.innerHTML = html;
            } catch (error) {
                console.error("Error in renderDaftarSuratDetail:", error);
            }
        };

        function renderUjianForm() {
            if (typeof window.renderUjianForm === 'function') window.renderUjianForm();
        }

window.salinTeksKeClipboard = function(text, successMsg, fallbackUrl) {
    const execCopy = () => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                if (typeof openAlert === 'function') openAlert(successMsg);
                else alert(successMsg);
            } else {
                if (fallbackUrl) prompt("Sistem memblokir salin otomatis. Silakan salin tautan ini:", fallbackUrl);
                else alert("Sistem peramban Anda memblokir fitur salin otomatis.");
            }
        } catch (err) {
            if (fallbackUrl) prompt("Sistem memblokir salin otomatis. Silakan salin tautan ini:", fallbackUrl);
            else alert("Sistem peramban Anda memblokir fitur salin otomatis.");
        }
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            if (typeof openAlert === 'function') openAlert(successMsg);
            else alert(successMsg);
        }).catch(err => execCopy());
    } else {
        execCopy();
    }
};

        window.bukaFormPenilaian = function (surahNo, surahNama) {
                            window.pulihkanCurrentState();
                            const studentId = window.currentState.studentId;
                            const kategori = window.currentState.kategori;
                            const semester = window.currentState.semester;
                            
                            window.currentState.surahNoEdit = surahNo;
                            window.currentState.surahNamaEdit = surahNama;

                            let ayatInfo = "";
                            let items = typeof window.getMateriList === 'function' ? window.getMateriList(kategori) : [];

            const surat = items.find(s => String(s.no) === String(surahNo)) || (typeof masterSurat !== 'undefined' ? masterSurat.find(s => String(s.no) === String(surahNo)) : null);
                            if (surat && typeof surat.ayat === 'string' && surat.ayat.includes('-')) {
                                ayatInfo = ` (${surat.ayat})`;
                            }

                            document.getElementById('modal-title').innerText = `Nilai: ${surahNama}${ayatInfo}`;
                            let pesertaName = '';
                            Object.values(dataPeserta).forEach(list => {
                                let arr = list;
                                if (arr && !Array.isArray(arr) && Array.isArray(arr.list)) arr = arr.list;
                                if (Array.isArray(arr)) {
                                    const found = arr.find(x => x.id === studentId);
                                    if (found) pesertaName = found.nama;
                                }
                            });
                            document.getElementById('modal-subtitle').innerText = `Siswa: ${pesertaName}`;

                            window.renderUjianForm();
                            document.getElementById('modal-penilaian').classList.replace('hidden', 'flex');
                        }

        window.tutupModal = function () {
            if (window.autoSaveTimeout) {
                clearTimeout(window.autoSaveTimeout);
                window.simpanNilaiModal(true); // Paksa simpan jika ada perubahan yg belum masuk
                window.autoSaveTimeout = null;
            }
            document.getElementById('modal-penilaian').classList.replace('flex', 'hidden');
        };

        window.renderUjianForm = function () {
                            window.pulihkanCurrentState();
                            const kat = window.currentState.kategori;
                            const studentId = window.currentState.studentId;
                            const surahNo = typeof window.currentState !== 'undefined' ? window.currentState.surahNoEdit : null;
                            const semester = window.currentState.semester;
                            const formContainer = document.querySelector('#modal-penilaian .overflow-y-auto');

                            if (!kat || !studentId || !surahNo) {
                                if (formContainer) formContainer.classList.add('hidden');
                                return;
                            }

                        if (typeof currentUser !== 'undefined' && currentUser.role === 'Guru Penguji') {
                            // Perbaikan: Gunakan waktu lokal agar tidak tergeser ke hari sebelumnya karena zona waktu UTC
                            const now = new Date();
                            const todayString = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                            if (typeof appSettings === 'undefined' || !appSettings.examDates || appSettings.examDates.length === 0 || !appSettings.examDates.includes(todayString)) {
                                    if (formContainer) formContainer.classList.add('hidden');
                                    openAlert("Penilaian hanya bisa dilakukan pada tanggal ujian yang telah ditentukan.");
                                    window.tutupModal();
                                    return;
                                }
                            }

                            if (formContainer) formContainer.classList.remove('hidden');

                            let items = typeof window.getMateriList === 'function' ? window.getMateriList(kat) : [];

            const surat = items.find(s => String(s.no) === String(surahNo)) || (typeof masterSurat !== 'undefined' ? masterSurat.find(s => String(s.no) === String(surahNo)) : null);
                            if (surat) window.currentState.surahNamaEdit = surat.nama;

                            const kategoriData = listKategori.find(k => k.nama === kat);
                            const tipe = kategoriData ? kategoriData.tipe : 'standar';
                            const isTartil = tipe === 'tartil';

            const kkm = (typeof appSettings !== 'undefined' && appSettings.kkm) ? parseFloat(appSettings.kkm) : 7;
                            const kkmText = `KKM: ${kkm}`;
                            ['standar', 'lembar', 'tartil', 'fashohah', 'ghorib', 'tajwid'].forEach(type => {
                                const el = document.getElementById(`kkm-info-${type}`);
                                if (el) el.innerText = kkmText;
                            });

                            if (formContainer) {
                                formContainer.querySelectorAll('input:not([type="radio"]), textarea').forEach(el => el.value = '');
                                formContainer.querySelectorAll('input[type="radio"]').forEach(el => el.checked = false);
                            }

                            // Reset totals for tartil
                            ['tartil', 'fashohah', 'ghorib', 'tajwid'].forEach(type => {
                                const el = document.getElementById(`total-${type}-display`);
                                if (el) el.innerText = '0.0';
                            });

                            const btnHapus = document.getElementById('btn-hapus-nilai');
                            if (btnHapus) btnHapus.classList.add('hidden');

                            const areaRiwayat = document.getElementById('area-riwayat-nilai');
                            const listRiwayat = document.getElementById('list-riwayat-nilai');
                            if (areaRiwayat && listRiwayat) {
                                areaRiwayat.classList.add('hidden');
                                listRiwayat.innerHTML = '';
                            }
                            const inputPenguji = document.getElementById('modal-input-penguji');
                            if (inputPenguji) {
                                inputPenguji.value = typeof currentUser !== 'undefined' ? currentUser.name : '';
                                inputPenguji.setAttribute('readonly', 'true');
                                inputPenguji.classList.remove('bg-white', 'focus:ring-2', 'focus:ring-primary/20');
                                inputPenguji.classList.add('bg-gray-200', 'cursor-not-allowed');
                                inputPenguji.placeholder = 'Nama Penguji...';
                            }

                            ['area-nilai-standar', 'area-nilai-lembar', 'area-nilai-tartil', 'area-nilai-fashohah', 'area-nilai-ghorib', 'area-nilai-tajwid'].forEach(id => {
                                const el = document.getElementById(id);
                                if (el) el.classList.add('hidden');
                            });

                            const stateKey = semester ? `${semester}_${studentId}_${surahNo}` : `${studentId}_${surahNo}`;
                            const existingData = statePenilaian[stateKey];
                            if (existingData) {
                                const inputCatatan = document.getElementById('modal-input-catatan');
                                if (inputCatatan) inputCatatan.value = existingData.catatan || '';
                                
                                if (typeof currentUser !== 'undefined' && currentUser.role === 'Admin Utama' && existingData.penguji && inputPenguji) {
                                    inputPenguji.value = existingData.penguji;
                                }

                                if (existingData.nilai !== undefined) {
                                    if (btnHapus) btnHapus.classList.remove('hidden');

                                    const score = existingData.nilai;
                                    const scoreIdStandar = `nilai-standar-${score.toString().replace('.', '_')}`;
                                    const scoreIdLembar = `nilai-lembar-${score.toString().replace('.', '_')}`;
                                    const radioStandar = document.getElementById(scoreIdStandar);
                                    const radioLembar = document.getElementById(scoreIdLembar);
                                    if (radioStandar) radioStandar.checked = true;
                                    if (radioLembar) radioLembar.checked = true;

                                    if (isTartil) {
                                        if (surahNo === 'M1') document.getElementById('total-tartil-display').innerText = score;
                                        if (surahNo === 'M2') document.getElementById('total-fashohah-display').innerText = score;
                                        if (surahNo === 'M3') document.getElementById('total-ghorib-display').innerText = score;
                                        if (surahNo === 'M4') document.getElementById('total-tajwid-display').innerText = score;
                                    }
                                }

                                if (existingData.rincian) {
                                    if (surahNo === 'M1') {
                                        if(document.getElementById('score-tajwid')) document.getElementById('score-tajwid').value = existingData.rincian.tajwid || '';
                                        if(document.getElementById('score-kalimah')) document.getElementById('score-kalimah').value = existingData.rincian.kalimah || '';
                                        if(document.getElementById('score-kelancaran')) document.getElementById('score-kelancaran').value = existingData.rincian.kelancaran || '';
                                        if(document.getElementById('score-nafas')) document.getElementById('score-nafas').value = existingData.rincian.nafas || '';
                                        if(document.getElementById('score-waqf')) document.getElementById('score-waqf').value = existingData.rincian.waqf || '';
                                    } else if (surahNo === 'M2') {
                                        if(document.getElementById('score-huruf')) document.getElementById('score-huruf').value = existingData.rincian.huruf || '';
                                        if(document.getElementById('score-harokah')) document.getElementById('score-harokah').value = existingData.rincian.harokah || '';
                                        if(document.getElementById('score-sifat')) document.getElementById('score-sifat').value = existingData.rincian.sifat || '';
                                        if(document.getElementById('score-volume')) document.getElementById('score-volume').value = existingData.rincian.volume || '';
                                    } else if (surahNo === 'M3') {
                                        if(document.getElementById('ghorib-s1-kesalahan')) document.getElementById('ghorib-s1-kesalahan').value = existingData.rincian.s1k || '';
                                        if(document.getElementById('ghorib-s1-nilai')) document.getElementById('ghorib-s1-nilai').value = existingData.rincian.s1n || '';
                                        if(document.getElementById('ghorib-s2-kesalahan')) document.getElementById('ghorib-s2-kesalahan').value = existingData.rincian.s2k || '';
                                        if(document.getElementById('ghorib-s2-nilai')) document.getElementById('ghorib-s2-nilai').value = existingData.rincian.s2n || '';
                                        if(document.getElementById('ghorib-s3-kesalahan')) document.getElementById('ghorib-s3-kesalahan').value = existingData.rincian.s3k || '';
                                        if(document.getElementById('ghorib-s3-nilai')) document.getElementById('ghorib-s3-nilai').value = existingData.rincian.s3n || '';
                                        if(document.getElementById('ghorib-e1')) document.getElementById('ghorib-e1').value = existingData.rincian.e1 || '';
                                        if(document.getElementById('ghorib-e2')) document.getElementById('ghorib-e2').value = existingData.rincian.e2 || '';
                                        if(document.getElementById('ghorib-e3')) document.getElementById('ghorib-e3').value = existingData.rincian.e3 || '';
                                        if(document.getElementById('ghorib-e4')) document.getElementById('ghorib-e4').value = existingData.rincian.e4 || '';
                                    } else if (surahNo === 'M4') {
                                        for(let i=1; i<=5; i++) {
                                            if(document.getElementById(`tajwid-t${i}`)) document.getElementById(`tajwid-t${i}`).value = existingData.rincian[`t${i}`] || '';
                                            if(document.getElementById(`tajwid-u${i}`)) document.getElementById(`tajwid-u${i}`).value = existingData.rincian[`u${i}`] || '';
                                        }
                                    }
                                }

                                if (existingData.history && existingData.history.length > 0 && areaRiwayat && listRiwayat) {
                                    areaRiwayat.classList.remove('hidden');
                                    let historyHtml = '';
                                    existingData.history.forEach(h => {
                                        historyHtml += `
                                        <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <div>
                                                <p class="font-bold text-teal-950">${h.penguji}</p>
                                                <p class="text-[10px] text-gray-500">${h.waktu}</p>
                                            </div>
                                            <span class="font-black text-primary text-sm">${h.nilai}</span>
                                        </div>`;
                                    });
                                    listRiwayat.innerHTML = historyHtml;
                                }
                            }

                            if (isTartil) {
                                if (surahNo === 'M1') document.getElementById('area-nilai-tartil').classList.remove('hidden');
                                else if (surahNo === 'M2') document.getElementById('area-nilai-fashohah').classList.remove('hidden');
                                else if (surahNo === 'M3') document.getElementById('area-nilai-ghorib').classList.remove('hidden');
                                else if (surahNo === 'M4') document.getElementById('area-nilai-tajwid').classList.remove('hidden');
                                // Jika materi di kategori Tartil BUKAN M1-M4 (misal: Surat Hafalan Juz 30), otomatis gunakan format Standar 1 Nilai
                                else document.getElementById('area-nilai-standar').classList.remove('hidden');
                            } else if (tipe === 'lembar') {
                                renderLembarGrid(surahNo);
                                document.getElementById('area-nilai-lembar').classList.remove('hidden');
                            } else {
                                document.getElementById('area-nilai-standar').classList.remove('hidden');
                            }
        };

        window.simpanNilaiModal = function (isAutoSave = false) {
                            window.pulihkanCurrentState();
                            const studentId = window.currentState.studentId;
                            const kategori = window.currentState.kategori;
                            const semester = window.currentState.semester;
                            const surahNoEdit = typeof window.currentState !== 'undefined' ? window.currentState.surahNoEdit : null;
                            const surahNamaEdit = typeof window.currentState !== 'undefined' ? window.currentState.surahNamaEdit : null;

                            if (!studentId || !kategori || !surahNoEdit) return;

                            const kategoriData = listKategori.find(k => k.nama === kategori);
                            if (!kategoriData) return;
                            const tipe = kategoriData.tipe;

                            let nilai;
                            let rincian = null;
                            if (tipe === 'tartil' && ['M1', 'M2', 'M3', 'M4'].includes(surahNoEdit)) {
                                if (surahNoEdit === 'M1') nilai = parseFloat(document.getElementById('total-tartil-display').innerText);
                                else if (surahNoEdit === 'M2') nilai = parseFloat(document.getElementById('total-fashohah-display').innerText);
                                else if (surahNoEdit === 'M3') nilai = parseFloat(document.getElementById('total-ghorib-display').innerText);
                                else if (surahNoEdit === 'M4') nilai = parseFloat(document.getElementById('total-tajwid-display').innerText);
                                
                                rincian = {};
                                if (surahNoEdit === 'M1') {
                                    rincian.tajwid = document.getElementById('score-tajwid')?.value || '';
                                    rincian.kalimah = document.getElementById('score-kalimah')?.value || '';
                                    rincian.kelancaran = document.getElementById('score-kelancaran')?.value || '';
                                    rincian.nafas = document.getElementById('score-nafas')?.value || '';
                                    rincian.waqf = document.getElementById('score-waqf')?.value || '';
                                } else if (surahNoEdit === 'M2') {
                                    rincian.huruf = document.getElementById('score-huruf')?.value || '';
                                    rincian.harokah = document.getElementById('score-harokah')?.value || '';
                                    rincian.sifat = document.getElementById('score-sifat')?.value || '';
                                    rincian.volume = document.getElementById('score-volume')?.value || '';
                                } else if (surahNoEdit === 'M3') {
                                    rincian.s1k = document.getElementById('ghorib-s1-kesalahan')?.value || '';
                                    rincian.s1n = document.getElementById('ghorib-s1-nilai')?.value || '';
                                    rincian.s2k = document.getElementById('ghorib-s2-kesalahan')?.value || '';
                                    rincian.s2n = document.getElementById('ghorib-s2-nilai')?.value || '';
                                    rincian.s3k = document.getElementById('ghorib-s3-kesalahan')?.value || '';
                                    rincian.s3n = document.getElementById('ghorib-s3-nilai')?.value || '';
                                    rincian.e1 = document.getElementById('ghorib-e1')?.value || '';
                                    rincian.e2 = document.getElementById('ghorib-e2')?.value || '';
                                    rincian.e3 = document.getElementById('ghorib-e3')?.value || '';
                                    rincian.e4 = document.getElementById('ghorib-e4')?.value || '';
                                } else if (surahNoEdit === 'M4') {
                                    for(let i=1; i<=5; i++) {
                                        rincian[`t${i}`] = document.getElementById(`tajwid-t${i}`)?.value || '';
                                        rincian[`u${i}`] = document.getElementById(`tajwid-u${i}`)?.value || '';
                                    }
                                }
                            } else if (tipe === 'lembar') {
                                const selectedRadio = document.querySelector('input[name="nilai-lembar"]:checked');
                                nilai = selectedRadio ? parseFloat(selectedRadio.value) : undefined;
                            } else {
                                // Menangkap dan menyimpan nilai untuk materi berformat Standar di dalam Kategori Tartil
                                const selectedRadio = document.querySelector('input[name="nilai-standar"]:checked');
                                nilai = selectedRadio ? parseFloat(selectedRadio.value) : undefined;
                            }

                            const inputPengujiEl = document.getElementById('modal-input-penguji');
                            const penguji = inputPengujiEl ? inputPengujiEl.value.trim() : ((typeof currentUser !== 'undefined' && currentUser.role === 'Admin Utama') ? '' : (typeof currentUser !== 'undefined' ? currentUser.name : 'Admin'));
                            const catatanEl = document.getElementById('modal-input-catatan');
                            const catatan = catatanEl ? catatanEl.value : '';

                            if (nilai === undefined || isNaN(nilai)) {
                                if (!isAutoSave) openAlert("Nilai belum dipilih atau tidak valid. Silakan periksa kembali input Anda.");
                                return;
                            }

                            const stateKey = semester ? `${semester}_${studentId}_${surahNoEdit}` : `${studentId}_${surahNoEdit}`;
                            const existingData = statePenilaian[stateKey];
                            let history = existingData && existingData.history ? existingData.history : [];

                            if (existingData && existingData.nilai !== undefined) {
                                if (existingData.nilai !== nilai || existingData.penguji !== penguji) {
                                    history.unshift({
                                        nilai: existingData.nilai,
                                        penguji: existingData.penguji || '-',
                                        waktu: new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    });
                                }
                            }

                            statePenilaian[stateKey] = {
                                nilai: nilai,
                                penguji: penguji,
                                catatan: catatan,
                                history: history
                            };
                            if (rincian) {
                                statePenilaian[stateKey].rincian = rincian;
                            }
                            
                            window.sessionUpdatedMaterials = window.sessionUpdatedMaterials || new Set();
                            window.sessionUpdatedMaterials.add(stateKey);

                            let peserta = null;
                            Object.values(dataPeserta).forEach(list => {
                                let arr = list;
                                if (arr && !Array.isArray(arr) && Array.isArray(arr.list)) arr = arr.list;
                                if (Array.isArray(arr)) {
                                    const found = arr.find(x => x.id === studentId);
                                    if (found) peserta = found;
                                }
                            });

                            if (peserta) {
                                if (typeof window.activityLog === 'undefined') window.activityLog = [];
                                window.activityLog.unshift({
                                    type: 'penilaian',
                                    waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
                                    data: { nama: peserta.nama, materi: surahNamaEdit, nilai: parseFloat(nilai), penguji: penguji || 'Admin' }
                                });
                                if (window.activityLog.length > 20) window.activityLog.pop();
                            }

                            const batch = db.batch();
                            batch.set(db.collection('statePenilaian').doc(stateKey), statePenilaian[stateKey]);
                            batch.set(db.collection('appData').doc('activityLog'), { log: typeof window.activityLog !== 'undefined' ? window.activityLog : [] }, { merge: true });

                            batch.commit().then(() => {
                                window.saveLocalState(); // Menyimpan ke localStorage sbg backup lokal
                                    if (!isAutoSave) {
                                        openAlert("Penilaian berhasil disimpan!");
                                        window.tutupModal();
                                    } else {
                                        const indicator = document.getElementById('auto-save-indicator');
                                        if (indicator) {
                                            indicator.textContent = 'Tersimpan otomatis';
                                            indicator.className = 'text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full transition-opacity duration-300 border border-emerald-100';
                                            setTimeout(() => {
                                                if (indicator.textContent === 'Tersimpan otomatis') {
                                                    indicator.classList.add('opacity-0');
                                                    setTimeout(() => {
                                                        if (indicator.textContent === 'Tersimpan otomatis') {
                                                            indicator.classList.add('hidden');
                                                            indicator.classList.remove('opacity-0');
                                                        }
                                                    }, 300);
                                                }
                                            }, 3000);
                                        }
                                    }
                                    window.renderDaftarSuratDetail();
                                    window.renderPenilaianDetailHeader();
                            }).catch(err => {
                                if (!isAutoSave) openAlert("Gagal menyimpan penilaian ke cloud: " + err.message);
                                else {
                                    const indicator = document.getElementById('auto-save-indicator');
                                    if (indicator) {
                                        indicator.textContent = 'Gagal menyimpan';
                                        indicator.className = 'text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100';
                                    }
                                }
                            });
        };

        window.hapusNilaiModal = function() {
            if (window.autoSaveTimeout) {
                clearTimeout(window.autoSaveTimeout); // Cegah data tersimpan saat mau dihapus
                window.autoSaveTimeout = null;
            }
            
            window.pulihkanCurrentState();
            const studentId = window.currentState.studentId;
            const semester = window.currentState.semester;
            const surahNoEdit = typeof window.currentState !== 'undefined' ? window.currentState.surahNoEdit : null;
            
            if (!studentId || !surahNoEdit) return;

            const proceed = () => {
                const key = semester ? `${semester}_${studentId}_${surahNoEdit}` : `${studentId}_${surahNoEdit}`;
                // Kunci lembar juga harus menyertakan semester
                const lembarKey = semester ? `${semester}_${studentId}_${surahNoEdit}_lembar` : `${studentId}_${surahNoEdit}_lembar`;
                
                if (window.sessionUpdatedMaterials) window.sessionUpdatedMaterials.delete(key);
                
                const batch = db.batch();
                batch.delete(db.collection('statePenilaian').doc(key));
                // Hapus juga lembar state (peta kesalahan tartil/juz) jika ada
                if (statePenilaian[lembarKey]) batch.delete(db.collection('statePenilaian').doc(lembarKey));

                batch.commit().then(() => {
                    delete statePenilaian[key];
                    if (statePenilaian[lembarKey]) delete statePenilaian[lembarKey];
                    
                    if (typeof window.saveLocalState === 'function') window.saveLocalState();
                    window.tutupModal();
                    
                    if (typeof openAlert === 'function') openAlert("Nilai beserta riwayat dan catatannya berhasil dihapus.");
                    if (typeof window.renderDaftarSuratDetail === 'function') window.renderDaftarSuratDetail();
                    if (typeof window.renderPenilaianDetailHeader === 'function') window.renderPenilaianDetailHeader();
                }).catch(err => {
                    if (typeof openAlert === 'function') openAlert("Gagal menghapus nilai: " + err.message);
                    else alert("Gagal menghapus nilai: " + err.message);
                });
            };

            if (typeof openConfirm === 'function') {
                openConfirm("Apakah Anda yakin ingin menghapus nilai beserta catatan untuk materi ini?", (yes) => {
                    if (yes) proceed();
                });
            } else {
                if (confirm("Apakah Anda yakin ingin menghapus nilai beserta catatan untuk materi ini?")) proceed();
            }
        };

    window.hapusNilaiLangsung = function(studentId, surahNo, semester) {
        const proceed = () => {
            const key = semester ? `${semester}_${studentId}_${surahNo}` : `${studentId}_${surahNo}`;
            const lembarKey = semester ? `${semester}_${studentId}_${surahNo}_lembar` : `${studentId}_${surahNo}_lembar`;
            
            if (window.sessionUpdatedMaterials) window.sessionUpdatedMaterials.delete(key);
            
            const batch = db.batch();
            batch.delete(db.collection('statePenilaian').doc(key));
            if (statePenilaian[lembarKey]) batch.delete(db.collection('statePenilaian').doc(lembarKey));

            batch.commit().then(() => {
                delete statePenilaian[key];
                if (statePenilaian[lembarKey]) delete statePenilaian[lembarKey];
                
                if (typeof window.saveLocalState === 'function') window.saveLocalState();
                if (typeof openAlert === 'function') openAlert("Nilai beserta riwayat dan catatannya berhasil dihapus.");
                if (typeof window.renderDaftarSuratDetail === 'function') window.renderDaftarSuratDetail();
                if (typeof window.renderPenilaianDetailHeader === 'function') window.renderPenilaianDetailHeader();
            }).catch(err => {
                if (typeof openAlert === 'function') openAlert("Gagal menghapus nilai: " + err.message);
                else alert("Gagal menghapus nilai: " + err.message);
            });
        };

        if (typeof openConfirm === 'function') {
            openConfirm("Apakah Anda yakin ingin menghapus nilai beserta catatan untuk materi ini?", (yes) => {
                if (yes) proceed();
            });
        } else {
            if (confirm("Apakah Anda yakin ingin menghapus nilai beserta catatan untuk materi ini?")) proceed();
        }
    };

    // --- FITUR NILAI MASSAL ---
    window.bukaModalNilaiMassal = function() {
        if (typeof currentUser === 'undefined' || currentUser.role !== 'Admin Utama') {
            if (typeof openAlert === 'function') openAlert("Hanya Admin Utama yang dapat mengakses fitur ini.");
            return;
        }
        if (!window.selectedUjianPeserta || window.selectedUjianPeserta.length === 0) {
            if (typeof openAlert === 'function') openAlert("Pilih minimal satu siswa peserta ujian terlebih dahulu.");
            return;
        }
        const modal = document.getElementById('modal-nilai-massal');
        if (modal) modal.classList.replace('hidden', 'flex');

        window.pulihkanCurrentState();
        const activeKategori = window.currentState.kategori;

        const selectKat = document.getElementById('nilai-massal-kategori');
        if (selectKat) {
            selectKat.innerHTML = `<option value="${activeKategori}" selected>${activeKategori}</option>`;
        }
        const selectMat = document.getElementById('nilai-massal-materi');
        if (selectMat) selectMat.innerHTML = '<option value="">Pilih Kategori Dahulu...</option>';
        
        const container = document.getElementById('container-siswa-massal');
        if (container) container.innerHTML = '<p class="text-center text-xs text-gray-400 py-8 italic">Silakan pilih kategori dan materi.</p>';
        
        const stats = document.getElementById('nilai-massal-stats');
        if (stats) stats.innerText = '0 Peserta';

        window.onChangeKategoriMassal(); // Auto-trigger populate
    };

    window.tutupModalNilaiMassal = function() {
        const modal = document.getElementById('modal-nilai-massal');
        if (modal) modal.classList.replace('flex', 'hidden');
        
        const txtArea = document.getElementById('import-nilai-textarea');
        if (txtArea) txtArea.value = '';
        
        // Kembalikan ke tab manual jika ditutup
        if (typeof window.switchTabNilaiMassal === 'function') window.switchTabNilaiMassal('manual');
    };

    window.onChangeKategoriMassal = function() {
        const kat = document.getElementById('nilai-massal-kategori').value;
        const selectMat = document.getElementById('nilai-massal-materi');
        const container = document.getElementById('container-siswa-massal');
        
        if (!kat) {
            if (selectMat) selectMat.innerHTML = '<option value="" disabled>Pilih Kategori Dahulu...</option>';
            if (container) container.innerHTML = '<p class="text-center text-xs text-gray-400 py-8 italic">Silakan pilih kategori dan materi.</p>';
            return;
        }
        
        const items = typeof window.getMateriList === 'function' ? window.getMateriList(kat) : [];
        if (selectMat) {
            selectMat.innerHTML = items.map(m => `<option value="${m.no}">${m.nama}</option>`).join('');
        }
        if (container) container.innerHTML = '<p class="text-center text-xs text-gray-400 py-8 italic">Silakan pilih materi (bisa pilih lebih dari satu).</p>';
    };

    window.renderDaftarSiswaNilaiMassal = function() {
        window.pulihkanCurrentState();
        const semester = window.currentState.semester;
        const kat = document.getElementById('nilai-massal-kategori').value;
        const matSelect = document.getElementById('nilai-massal-materi');
        const selectedMatNos = Array.from(matSelect.selectedOptions).map(opt => opt.value).filter(v => v);
        const container = document.getElementById('container-siswa-massal');
        const stats = document.getElementById('nilai-massal-stats');
        
        if (!semester) {
            if (container) container.innerHTML = '<p class="text-center text-xs text-red-500 py-8 italic">Pilih semester di pojok kanan atas dahulu.</p>';
            return;
        }
        if (!kat || selectedMatNos.length === 0) {
            if (container) container.innerHTML = '<p class="text-center text-xs text-gray-400 py-8 italic">Silakan pilih kategori dan materi.</p>';
            if (stats) stats.innerText = '0 Peserta';
            return;
        }
        
        let pList = [];
        if (typeof dataPeserta !== 'undefined') {
            Object.keys(dataPeserta).forEach(key => {
                let studentDocSemester = null;
                let katKey = key;
                if (key.includes('_')) {
                    const firstUnderscore = key.indexOf('_');
                    studentDocSemester = key.substring(0, firstUnderscore);
                    katKey = key.substring(firstUnderscore + 1);
                }
                
                if (studentDocSemester && studentDocSemester !== semester) return;
                
                if (katKey === kat) {
                    let list = dataPeserta[key];
                    if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
                    if (Array.isArray(list)) pList = pList.concat(list);
                }
            });
        }
        
        if (Array.isArray(pList)) {
            // Filter hanya menampilkan peserta yang dicentang di halaman ujian
            pList = pList.filter(p => window.selectedUjianPeserta.includes(p.id));
        }
        
        if (pList.length === 0) {
            if (container) container.innerHTML = '<p class="text-center text-xs text-gray-400 py-8 italic">Tidak ada peserta di kategori ini pada semester aktif.</p>';
            if (stats) stats.innerText = '0 Peserta';
            return;
        }
        
        if (stats) stats.innerText = `${pList.length} Peserta`;
        
        // Urutkan siswa berdasarkan nama
        const sortedList = [...pList].sort((a, b) => a.nama.localeCompare(b.nama));
        
        let html = `
        <div class="overflow-x-auto border border-gray-200 rounded-lg">
            <table class="w-full text-left text-xs whitespace-nowrap">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="px-4 py-3 font-bold text-teal-950 w-8 text-center sticky left-0 bg-gray-50 z-10 border-r border-gray-200">No</th>
                        <th class="px-4 py-3 font-bold text-teal-950 sticky left-8 bg-gray-50 z-10 border-r border-gray-200">Nama Siswa</th>
        `;

        selectedMatNos.forEach(matNo => {
            const materiObj = (typeof window.getMateriList === 'function' ? window.getMateriList(kat) : []).find(m => String(m.no) === String(matNo));
            const matNama = materiObj ? materiObj.nama : matNo;
            html += `<th class="px-4 py-3 font-bold text-teal-950 min-w-[110px] text-center border-r border-gray-100">${matNama} <br><span class="text-[9px] text-gray-400 font-normal">(0-10)</span></th>`;
        });

        html += `
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
        `;
        
        sortedList.forEach((p, idx) => {
            html += `
                <tr class="hover:bg-gray-50 transition-colors group">
                    <td class="px-4 py-3 text-center text-gray-500 sticky left-0 bg-white z-10 border-r border-gray-200 group-hover:bg-gray-50">${idx + 1}</td>
                    <td class="px-4 py-3 font-bold text-teal-950 truncate max-w-[200px] sticky left-8 bg-white z-10 border-r border-gray-200 group-hover:bg-gray-50" title="${p.nama}">${p.nama}<br><span class="text-[10px] text-gray-400 font-normal">${p.kelas}</span></td>
            `;

            selectedMatNos.forEach(matNo => {
                const stateKey = `${semester}_${p.id}_${matNo}`;
                const existing = statePenilaian[stateKey];
                const currentVal = existing && existing.nilai !== undefined ? existing.nilai : '';
                html += `
                    <td class="px-4 py-2 border-r border-gray-100">
                        <input type="number" min="0" max="10" step="0.1" class="input-nilai-massal w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-center font-bold text-teal-950 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" data-studentid="${p.id}" data-matno="${matNo}" value="${currentVal}" placeholder="-">
                    </td>
                `;
            });
            html += `</tr>`;
        });
        
        html += `</tbody></table></div>`;
        if (container) container.innerHTML = html;
    };

    window.simpanNilaiMassal = function() {
        window.pulihkanCurrentState();
        const semester = window.currentState.semester;
        const kat = document.getElementById('nilai-massal-kategori').value;
        const matSelect = document.getElementById('nilai-massal-materi');
        const selectedMatNos = Array.from(matSelect.selectedOptions).map(opt => opt.value).filter(v => v);
        
        if (!semester || !kat || selectedMatNos.length === 0) {
            if (typeof openAlert === 'function') openAlert("Pastikan kategori dan materi telah dipilih.");
            return;
        }
        
        const inputs = document.querySelectorAll('.input-nilai-massal');
        if (inputs.length === 0) return;
        
        const batch = db.batch();
        let updatesCount = 0;
        const penguji = (typeof currentUser !== 'undefined' && currentUser.role === 'Admin Utama') ? '' : (typeof currentUser !== 'undefined' ? currentUser.name : 'Admin');
        const waktu = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const waktuLog = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
        const items = typeof window.getMateriList === 'function' ? window.getMateriList(kat) : [];

        inputs.forEach(input => {
            const val = input.value.trim();
            const studentId = input.getAttribute('data-studentid');
            const matNo = input.getAttribute('data-matno');
            
            if (val !== '') {
                const nilaiFloat = parseFloat(val);
                if (!isNaN(nilaiFloat) && nilaiFloat >= 0 && nilaiFloat <= 10) {
                    const stateKey = `${semester}_${studentId}_${matNo}`;
                    const existingData = statePenilaian[stateKey] || {};
                    
                    let history = existingData.history ? [...existingData.history] : [];
                    
                    if (existingData.nilai !== undefined && (existingData.nilai !== nilaiFloat || existingData.penguji !== penguji)) {
                        history.unshift({
                            nilai: existingData.nilai,
                            penguji: existingData.penguji || '-',
                            waktu: waktu
                        });
                    }
                    
                    if (existingData.nilai !== nilaiFloat) {
                        statePenilaian[stateKey] = {
                            nilai: nilaiFloat,
                            penguji: penguji,
                            catatan: existingData.catatan || '',
                            history: history
                        };
                        
                        window.sessionUpdatedMaterials = window.sessionUpdatedMaterials || new Set();
                        window.sessionUpdatedMaterials.add(stateKey);
                        
                        batch.set(db.collection('statePenilaian').doc(stateKey), statePenilaian[stateKey]);
                        updatesCount++;
                        
                        let matNama = matNo;
                        const materiObj = items.find(m => String(m.no) === String(matNo));
                        if (materiObj) matNama = materiObj.nama;

                        const keyList = `${semester}_${kat}`;
                    let pList = dataPeserta[keyList] || dataPeserta[kat];
                    if (pList && !Array.isArray(pList) && Array.isArray(pList.list)) pList = pList.list;
                    if (!Array.isArray(pList)) pList = [];
                        const p = pList.find(x => x.id === studentId);
                        if (p) {
                                if (typeof window.activityLog === 'undefined') window.activityLog = [];
                                window.activityLog.unshift({
                                type: 'penilaian',
                                waktu: waktuLog,
                                data: { nama: p.nama, materi: matNama, nilai: nilaiFloat, penguji: penguji ? penguji + " (Massal)" : "Admin (Massal)" }
                            });
                        }
                    }
                }
            }
        });
        
        if (updatesCount === 0) {
            if (typeof openAlert === 'function') openAlert("Tidak ada nilai baru atau perubahan yang disimpan.");
            window.tutupModalNilaiMassal();
            return;
        }
        
        if (typeof window.activityLog !== 'undefined' && window.activityLog.length > 20) window.activityLog = window.activityLog.slice(0, 20);
        batch.set(db.collection('appData').doc('activityLog'), { log: typeof window.activityLog !== 'undefined' ? window.activityLog : [] }, { merge: true });
        
        batch.commit().then(() => {
            if (typeof window.saveLocalState === 'function') window.saveLocalState();
            if (typeof openAlert === 'function') openAlert(`Berhasil menyimpan ${updatesCount} nilai massal.`);
            window.tutupModalNilaiMassal();
            
            if (typeof window.filterUjianPeserta === 'function' && document.getElementById('view-ujian') && !document.getElementById('view-ujian').classList.contains('hidden')) {
                window.filterUjianPeserta();
            }
        }).catch(err => {
            if (typeof openAlert === 'function') openAlert("Gagal menyimpan nilai massal: " + err.message);
            console.error("Massal error:", err);
        });
    };

    window.switchTabNilaiMassal = function(mode) {
        const manualTab = document.getElementById('tab-nilai-manual');
        const importTab = document.getElementById('tab-nilai-import');
        const manualForm = document.getElementById('form-nilai-manual');
        const importForm = document.getElementById('form-nilai-import');
        const btnSimpan = document.getElementById('btn-simpan-nilai-massal');
        const btnImport = document.getElementById('btn-import-nilai-massal');

        if (mode === 'manual') {
            manualTab.className = "flex-1 py-3 text-sm font-bold text-primary border-b-2 border-primary bg-primary/5 transition-colors";
            importTab.className = "flex-1 py-3 text-sm font-bold text-gray-500 border-b-2 border-transparent hover:bg-gray-50 transition-colors";
            manualForm.classList.remove('hidden');
            importForm.classList.add('hidden');
            if (btnSimpan) btnSimpan.classList.remove('hidden');
            if (btnImport) btnImport.classList.add('hidden');
        } else {
            importTab.className = "flex-1 py-3 text-sm font-bold text-primary border-b-2 border-primary bg-primary/5 transition-colors";
            manualTab.className = "flex-1 py-3 text-sm font-bold text-gray-500 border-b-2 border-transparent hover:bg-gray-50 transition-colors";
            importForm.classList.remove('hidden');
            manualForm.classList.add('hidden');
            if (btnSimpan) btnSimpan.classList.add('hidden');
            if (btnImport) btnImport.classList.remove('hidden');
        }
    };

    window.imporNilaiMassal = function() {
        window.pulihkanCurrentState();
        const semester = window.currentState.semester;
        const kat = document.getElementById('nilai-massal-kategori').value;
        const matSelect = document.getElementById('nilai-massal-materi');
        const selectedMatNos = Array.from(matSelect.selectedOptions).map(opt => opt.value).filter(v => v);
        const textData = document.getElementById('import-nilai-textarea').value.trim();

        if (!semester || !kat || selectedMatNos.length === 0) {
            if (typeof openAlert === 'function') openAlert("Pastikan kategori dan materi telah dipilih.");
            return;
        }

        if (!textData) {
            if (typeof openAlert === 'function') openAlert("Data impor tidak boleh kosong. Silakan salin dan tempel data dari Excel.");
            return;
        }

        const rows = textData.split('\n');
        const batch = db.batch();
        let updatesCount = 0;
        const penguji = (typeof currentUser !== 'undefined' && currentUser.role === 'Admin Utama') ? '' : (typeof currentUser !== 'undefined' ? currentUser.name : 'Admin');
        const waktu = new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const waktuLog = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const items = typeof window.getMateriList === 'function' ? window.getMateriList(kat) : [];
        
        const keyList = `${semester}_${kat}`;
        let pList = dataPeserta[keyList] || dataPeserta[kat];
        if (pList && !Array.isArray(pList) && Array.isArray(pList.list)) pList = pList.list;
        if (!Array.isArray(pList)) pList = [];

        let errorRows = [];

        rows.forEach((row, rIndex) => {
            if (!row.trim()) return;
            const cols = row.split('\t').map(c => c.trim());
            if (cols.length < 2) return;

            const studentName = cols[0];
            const p = pList.find(x => x.nama.toLowerCase() === studentName.toLowerCase());
            
            if (!p) {
                errorRows.push(`Baris ${rIndex + 1}: Nama '${studentName}' tidak ditemukan di kategori ini.`);
                return;
            }

            selectedMatNos.forEach((matNo, mIndex) => {
                if (mIndex + 1 < cols.length) {
                    const valStr = cols[mIndex + 1].replace(',', '.'); // Toleransi penulisan koma sebagai koma desimal
                    if (valStr === '' || valStr === '-') return;

                    const nilaiFloat = parseFloat(valStr);
                    if (!isNaN(nilaiFloat) && nilaiFloat >= 0 && nilaiFloat <= 10) {
                        const stateKey = `${semester}_${p.id}_${matNo}`;
                        const existingData = statePenilaian[stateKey] || {};
                        
                        let history = existingData.history ? [...existingData.history] : [];
                        
                        if (existingData.nilai !== undefined && (existingData.nilai !== nilaiFloat || existingData.penguji !== penguji)) {
                            history.unshift({ nilai: existingData.nilai, penguji: existingData.penguji || '-', waktu: waktu });
                        }
                        
                        if (existingData.nilai !== nilaiFloat) {
                            statePenilaian[stateKey] = { nilai: nilaiFloat, penguji: penguji, catatan: existingData.catatan || '', history: history };
                            
                            window.sessionUpdatedMaterials = window.sessionUpdatedMaterials || new Set();
                            window.sessionUpdatedMaterials.add(stateKey);
                            
                            batch.set(db.collection('statePenilaian').doc(stateKey), statePenilaian[stateKey]);
                            updatesCount++;
                            
                            let matNama = matNo;
                            const materiObj = items.find(m => String(m.no) === String(matNo));
                            if (materiObj) matNama = materiObj.nama;

                            if (typeof window.activityLog === 'undefined') window.activityLog = [];
                            window.activityLog.unshift({ type: 'penilaian', waktu: waktuLog, data: { nama: p.nama, materi: matNama, nilai: nilaiFloat, penguji: penguji ? penguji + " (Impor Excel)" : "Admin (Impor Excel)" } });
                        }
                    }
                }
            });
        });

        if (updatesCount === 0) {
            const errMsg = errorRows.length > 0 ? "Beberapa baris ditolak:\n" + errorRows.slice(0,5).join('\n') : "Tidak ada nilai valid yang bisa disimpan (pastikan Nama benar dan format angka 0-10).";
            if (typeof openAlert === 'function') openAlert(errMsg);
            return;
        }

        if (typeof window.activityLog !== 'undefined' && window.activityLog.length > 20) window.activityLog = window.activityLog.slice(0, 20);
        batch.set(db.collection('appData').doc('activityLog'), { log: typeof window.activityLog !== 'undefined' ? window.activityLog : [] }, { merge: true });

        batch.commit().then(() => {
            if (typeof window.saveLocalState === 'function') window.saveLocalState();
            
            let successMsg = `Berhasil mengimpor ${updatesCount} nilai baru/diubah.`;
            if (errorRows.length > 0) {
                successMsg += `\n\n(Abaikan jika disengaja) Ada ${errorRows.length} baris tidak terbaca/Nama salah.`;
            }
            
            if (typeof openAlert === 'function') openAlert(successMsg);
            window.tutupModalNilaiMassal();
            
            if (typeof window.filterUjianPeserta === 'function' && document.getElementById('view-ujian') && !document.getElementById('view-ujian').classList.contains('hidden')) {
                window.filterUjianPeserta();
            }
        }).catch(err => {
            if (typeof openAlert === 'function') openAlert("Gagal mengimpor nilai: " + err.message);
        });
    };

        // Listener untuk fitur Auto-Save saat input berubah
        const modalPenilaianEl = document.getElementById('modal-penilaian');
        if (modalPenilaianEl) {
            modalPenilaianEl.addEventListener('input', function(e) {
                const indicator = document.getElementById('auto-save-indicator');
                if (indicator) {
                    indicator.textContent = 'Menyimpan...';
                    indicator.className = 'text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full transition-opacity duration-300 border border-amber-100';
                    indicator.classList.remove('hidden');
                }
                
                if (window.autoSaveTimeout) clearTimeout(window.autoSaveTimeout);
                window.autoSaveTimeout = setTimeout(() => {
                    if (!modalPenilaianEl.classList.contains('hidden')) {
                        window.simpanNilaiModal(true);
                    }
                }, 800); // Jeda dipercepat menjadi 0.8 detik sebelum menyimpan otomatis
            });
        }

        // Memastikan materi dan header dirender ulang setelah data dimuat (terutama saat refresh halaman)
        document.addEventListener('DOMContentLoaded', () => {
            const detailView = document.getElementById('view-penilaian-detail');
            const ujianView = document.getElementById('view-ujian');
            const loader = document.getElementById('loading-overlay');
            
            const triggerRender = () => {
                if (detailView && !detailView.classList.contains('hidden')) {
                    if (typeof window.renderPenilaianDetailHeader === 'function') window.renderPenilaianDetailHeader();
                    if (typeof window.renderDaftarSuratDetail === 'function') window.renderDaftarSuratDetail();
                }
                if (ujianView && !ujianView.classList.contains('hidden')) {
                    if (typeof window.filterUjianPeserta === 'function') window.filterUjianPeserta();
                }
            };

            // Tambahkan fallback delay agar data yang tertunda muatnya tetap ikut ke-render
            setTimeout(triggerRender, 300);
            setTimeout(triggerRender, 1000);

            let lastPesertaCount = -1;

            // Polling cerdas agar halaman otomatis menampilkan data begitu data berhasil dimuat setelah refresh
            setInterval(() => {
                if (detailView && !detailView.classList.contains('hidden')) {
                    window.pulihkanCurrentState();
                    const studentId = window.currentState.studentId;
                    const kategori = window.currentState.kategori;
                    const semester = window.currentState.semester;
                    const header = document.getElementById('detail-student-header');
                    
                    let needsRender = false;

                    let p = null;
                    if (typeof dataPeserta !== 'undefined') {
                        Object.values(dataPeserta).forEach(list => {
                            let arr = list;
                            if (arr && !Array.isArray(arr) && Array.isArray(arr.list)) arr = arr.list;
                            if (Array.isArray(arr)) {
                                const found = arr.find(x => x.id === studentId);
                                if (found) p = found;
                            }
                        });
                    }

                    if (header && header.innerHTML.trim() === '') {
                        needsRender = true;
                        if (p) needsRender = true; // Hanya render jika data profil (p) benar-benar sudah tiba
                    } else {
                        const countSpan = document.getElementById('detail-surah-count');
                        // Perbaikan: Cek teks "0 Item" maupun "0 Materi"
                        if (countSpan && (countSpan.innerText.includes('0 Item') || countSpan.innerText.includes('0 Materi'))) {
                            if (kategori && typeof window.getMateriList === 'function' && window.getMateriList(kategori).length > 0) {
                                needsRender = true;
                            }
                        }
                    }
                    
                    // Fail-safe tambahan: Sinkronkan bila nilai Firebase (statePenilaian) baru selesai diunduh
                    if (!needsRender && studentId && kategori && semester && typeof getStatusPeserta === 'function' && p) {
                        const s = getStatusPeserta(p.id, kategori, semester);
                        if (window.lastProgressState !== s.progress) {
                            window.lastProgressState = s.progress;
                            needsRender = true;
                        }
                    }

                    if (needsRender) triggerRender();
                }
                
                // Polling otomatis untuk halaman daftar peserta ujian
                if (ujianView && !ujianView.classList.contains('hidden')) {
                    window.pulihkanCurrentState();
                    const kategori = window.currentState.kategori;
                    const semester = window.currentState.semester;
                    
                    if (kategori && typeof dataPeserta !== 'undefined') {
                        let currentCategoryCount = 0;
                        const key = semester ? `${semester}_${kategori}` : kategori;
                        let targetList = dataPeserta[key] || dataPeserta[kategori];
                        
                        if (targetList && !Array.isArray(targetList) && Array.isArray(targetList.list)) targetList = targetList.list;
                        if (Array.isArray(targetList)) currentCategoryCount = targetList.length;
                        
                        if (lastPesertaCount !== -1 && currentCategoryCount !== lastPesertaCount) {
                            lastPesertaCount = currentCategoryCount;
                            triggerRender();
                        } else if (lastPesertaCount === -1) {
                            lastPesertaCount = currentCategoryCount;
                        }
                    }
                }
            }, 1000);

            if (detailView) {
                new MutationObserver((mutations) => {
                    mutations.forEach((m) => { if (m.attributeName === 'class') triggerRender(); });
                }).observe(detailView, { attributes: true });
            }
            
            if (ujianView) {
                new MutationObserver((mutations) => {
                    mutations.forEach((m) => { if (m.attributeName === 'class') triggerRender(); });
                }).observe(ujianView, { attributes: true });
            }
        });