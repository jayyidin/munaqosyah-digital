        window.renderGlobalSemesterSelector = function() {
            const selector = document.getElementById('global-semester-selector');
            if (!selector) return;
            
            let html = '';
            if (typeof listSemester === 'undefined' || listSemester.length === 0) {
                html = '<option value="">Belum ada semester</option>';
            } else {
                listSemester.sort().forEach(s => {
                    const isSelected = typeof window.currentState !== 'undefined' && window.currentState.semester === s;
                    html += `<option value="${s}" ${isSelected ? 'selected' : ''}>${s}</option>`;
                });
            }
            selector.innerHTML = html;
        };

        window.pilihSemester = function(semester) {
            if (!semester) return;
            if (typeof window.currentState === 'undefined') window.currentState = {};
            window.currentState.semester = semester;
            localStorage.setItem('currentSemester', semester);
            
            if (typeof window.renderGlobalSemesterSelector === 'function') window.renderGlobalSemesterSelector();
            
            // Refresh UI berdasarkan semester yang baru dipilih
            if (typeof renderDashboard === 'function' && document.getElementById('view-dashboard') && !document.getElementById('view-dashboard').classList.contains('hidden')) renderDashboard();
            if (typeof renderTablePeserta === 'function' && document.getElementById('view-peserta') && !document.getElementById('view-peserta').classList.contains('hidden')) {
                if (typeof pesertaPagination !== 'undefined') pesertaPagination.currentPage = 1;
                renderTablePeserta();
                if (typeof updateQuickStats === 'function') updateQuickStats();
            }
            if (typeof window.filterUjianPeserta === 'function' && document.getElementById('view-ujian') && !document.getElementById('view-ujian').classList.contains('hidden')) {
                if (typeof window.ujianPagination !== 'undefined') window.ujianPagination.currentPage = 1;
                window.filterUjianPeserta();
            }
            if (typeof renderLaporanPage === 'function' && document.getElementById('view-laporan') && !document.getElementById('view-laporan').classList.contains('hidden')) renderLaporanPage();
        };

        // Sinkronisasi data master secara mandiri (Fail-safe agar tidak kembali seperti semula saat refresh)
        (function initMasterDataSync() {
            // 0. MUAT SEMESTER AKTIF DARI LOCALSTORAGE
            const savedSemester = localStorage.getItem('currentSemester');
            if (savedSemester && savedSemester !== 'null' && savedSemester !== 'undefined') {
                if (typeof window.currentState === 'undefined') window.currentState = {};
                window.currentState.semester = savedSemester;
            }

            // 1. MUAT DARI LOCAL STORAGE SEGERA (ANTI-RESET)
            try {
                const localKelas = localStorage.getItem('munaqosyah_listKelas');
                if (localKelas && localKelas !== 'undefined') {
                    const parsed = JSON.parse(localKelas);
                    if (typeof listKelas !== 'undefined') { listKelas.length = 0; parsed.forEach(k => listKelas.push(k)); }
                    if (typeof window.renderKelasEditList === 'function') window.renderKelasEditList();
                    if (typeof populateFilterKelasPeserta === 'function') populateFilterKelasPeserta();
                }
                const localKategori = localStorage.getItem('munaqosyah_listKategori');
                if (localKategori && localKategori !== 'undefined') {
                    const parsed = JSON.parse(localKategori);
                    if (typeof listKategori !== 'undefined') { listKategori.length = 0; parsed.forEach(k => listKategori.push(k)); }
                    if (typeof window.renderListKategoriEdit === 'function') window.renderListKategoriEdit();
                    if (typeof window.renderKategoriDropdown === 'function') window.renderKategoriDropdown();
                }
                const localSemester = localStorage.getItem('munaqosyah_listSemester');
                if (localSemester && localSemester !== 'undefined') {
                    const parsed = JSON.parse(localSemester);
                    if (typeof listSemester !== 'undefined') { listSemester.length = 0; parsed.forEach(s => listSemester.push(s)); }
                    if (typeof window.renderSemesterEditList === 'function') window.renderSemesterEditList();
                }
                const localSettings = localStorage.getItem('munaqosyahSettings');
                if (localSettings && localSettings !== 'undefined') {
                    const parsed = JSON.parse(localSettings);
                    if (typeof appSettings !== 'undefined') Object.assign(appSettings, parsed);
                    else window.appSettings = parsed;
                    if (typeof window.applySettings === 'function') window.applySettings(window.appSettings);
                }
            } catch(e) { console.warn("Local Load Error:", e); }

            // 2. SINKRONISASI REALTIME KE FIREBASE
            const syncInterval = setInterval(() => {
                if (typeof db !== 'undefined' && db !== null) {
                    clearInterval(syncInterval);
                    
                    // Sinkronisasi Realtime Kelas
                    db.collection('appData').doc('kelas').onSnapshot(doc => {
                        if (doc.exists && doc.data().list) {
                            const arr = doc.data().list;
                            if (typeof listKelas !== 'undefined' && Array.isArray(listKelas)) {
                                listKelas.length = 0;
                                arr.forEach(k => listKelas.push(k));
                            }
                            localStorage.setItem('munaqosyah_listKelas', JSON.stringify(arr));
                            if (typeof window.renderKelasEditList === 'function') window.renderKelasEditList();
                            if (typeof populateFilterKelasPeserta === 'function') populateFilterKelasPeserta();
                        }
                    }, err => console.error('Error sync kelas:', err));
                    
                    // Sinkronisasi Realtime Kategori
                    db.collection('appData').doc('kategori').onSnapshot(doc => {
                        if (doc.exists && doc.data().list) {
                            const arr = doc.data().list;
                            if (typeof listKategori !== 'undefined' && Array.isArray(listKategori)) {
                                listKategori.length = 0;
                                arr.forEach(k => listKategori.push(k));
                            }
                            localStorage.setItem('munaqosyah_listKategori', JSON.stringify(arr));
                            if (typeof window.renderListKategoriEdit === 'function') window.renderListKategoriEdit();
                            if (typeof window.renderKategoriDropdown === 'function') window.renderKategoriDropdown();
                            if (typeof renderDashboardFilterOptions === 'function') renderDashboardFilterOptions();
                        }
                    }, err => console.error('Error sync kategori:', err));

                    // Sinkronisasi Realtime Semester
                    db.collection('appData').doc('semester').onSnapshot(doc => {
                        if (doc.exists && doc.data().list) {
                            const arr = doc.data().list;
                            if (typeof listSemester !== 'undefined' && Array.isArray(listSemester)) {
                                listSemester.length = 0;
                                arr.forEach(s => listSemester.push(s));
                            }
                            localStorage.setItem('munaqosyah_listSemester', JSON.stringify(arr));
                            if (typeof window.renderSemesterEditList === 'function') window.renderSemesterEditList();
                            if (typeof window.renderGlobalSemesterSelector === 'function') window.renderGlobalSemesterSelector();
                            // Jika belum ada semester terpilih, pilih yang pertama
                            if (!window.currentState.semester && arr.length > 0 && typeof window.pilihSemester === 'function') window.pilihSemester(arr[0]);
                        }
                    }, err => console.error('Error sync semester:', err));
                    
                    // Sinkronisasi Realtime Pengaturan
                    db.collection('appData').doc('settings').onSnapshot(doc => {
                        if (doc.exists && doc.data()) {
                            const data = doc.data();
                            
                            if (typeof appSettings !== 'undefined') Object.assign(appSettings, data);
                            else window.appSettings = data;
                            
                            localStorage.setItem('munaqosyahSettings', JSON.stringify(window.appSettings));
                            
                            if (typeof window.applySettings === 'function') window.applySettings(window.appSettings);
                            if (typeof window.renderTanggalUjianList === 'function') window.renderTanggalUjianList();
                            if (typeof window.renderTokenPendaftaran === 'function') window.renderTokenPendaftaran();
                            if (typeof window.renderUjianDateDisplay === 'function') window.renderUjianDateDisplay();
                            if (typeof renderDashboard === 'function' && document.getElementById('view-dashboard') && !document.getElementById('view-dashboard').classList.contains('hidden')) renderDashboard();
                            if (typeof renderLaporanPage === 'function' && document.getElementById('view-laporan') && !document.getElementById('view-laporan').classList.contains('hidden')) renderLaporanPage();
                        }
                    }, err => console.error('Error sync settings:', err));
                }
            }, 500); // Cek setiap 500ms sampai DB siap
        })();

        // --- Management & Utility Functions ---
        window.getMateriList = function(kategori) {
            if (typeof dataSurat === 'undefined' || !dataSurat || !kategori) return [];
            const raw = dataSurat[kategori];
            if (!raw) return [];
            
            let items = [];
            if (Array.isArray(raw)) {
                items = raw;
            } else if (typeof raw === 'object') {
                // Cek kemungkinan variasi field name array yang ada di Firestore
                if (raw.list) items = Array.isArray(raw.list) ? raw.list : Object.values(raw.list);
                else if (raw.materi) items = Array.isArray(raw.materi) ? raw.materi : Object.values(raw.materi);
                else if (raw.data) items = Array.isArray(raw.data) ? raw.data : Object.values(raw.data);
                else items = Object.values(raw); // Fallback ke semua value
            }
            
            // Bersihkan format final dan pastikan setiap item valid
            return items.flat().filter(item => item && typeof item === 'object' && item.no !== undefined && item.nama !== undefined);
        };

        window.renderKategoriDropdown = function() {
            const select = document.getElementById('kategori-select');
            if (select) {
                let html = '';
                listKategori.forEach(k => { html += `<option value="${k.nama}" ${typeof currentState !== 'undefined' && currentState.kategori === k.nama ? 'selected' : ''}>${k.nama}</option>`; });
                select.innerHTML = html;
            }

            const filterSelect = document.getElementById('filter-tabel-kategori');
            if (filterSelect) filterSelect.innerHTML = `<option value="">Semua Kategori</option>` + listKategori.map(k => `<option value="${k.nama}">${k.nama}</option>`).join('');
        };

        window.pindahUrutanKategori = async function(index, arah) {
            const targetIndex = index + arah;
            if (index < 0 || targetIndex < 0 || index >= listKategori.length || targetIndex >= listKategori.length) return;

            const newKategoriList = [...listKategori];
            [newKategoriList[index], newKategoriList[targetIndex]] = [newKategoriList[targetIndex], newKategoriList[index]];
            listKategori.length = 0;
            newKategoriList.forEach(k => listKategori.push(k));

            try {
                const batch = db.batch();
                batch.set(db.collection('appData').doc('kategori'), { list: listKategori });
                await batch.commit();
                localStorage.setItem('munaqosyah_listKategori', JSON.stringify(listKategori));

                if(typeof window.saveLocalState === 'function') window.saveLocalState();
                if(typeof window.renderListKategoriEdit === 'function') window.renderListKategoriEdit();
                window.renderKategoriDropdown();
                if(typeof renderDashboardFilterOptions === 'function') renderDashboardFilterOptions();
                if(typeof getCurrentVisibleView === 'function') {
                    if (getCurrentVisibleView() === 'peserta' && typeof renderTablePeserta === 'function') renderTablePeserta();
                    if (getCurrentVisibleView() === 'ujian' && typeof window.filterUjianPeserta === 'function') window.filterUjianPeserta();
                    if (getCurrentVisibleView() === 'laporan' && typeof renderLaporanPage === 'function') {
                        if(typeof setupLaporanFilters === 'function') setupLaporanFilters();
                        renderLaporanPage();
                    }
                    if (getCurrentVisibleView() === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
                }
            } catch(e) {
                if(typeof openAlert === 'function') openAlert("Gagal memindah urutan: " + e.message);
            }
        };

        window.bukaModalMateri = function(kategoriNama) {
                            document.getElementById('materi-kategori-title').innerText = kategoriNama;
                            document.getElementById('input-materi-kategori-aktif').value = kategoriNama;
                            window.resetFormMateri();
                            window.renderMateriEditList();
                            document.getElementById('modal-materi').classList.replace('hidden', 'flex');
                        }

                        window.tutupModalMateri = function() {
                            document.getElementById('modal-materi').classList.replace('flex', 'hidden');
                        }

                        window.resetFormMateri = function() {
                            document.getElementById('form-materi-title').innerText = 'Tambah Materi Baru';
                            document.getElementById('input-materi-original-no').value = '';
                            document.getElementById('input-materi-no').value = '';
                            document.getElementById('input-materi-nama').value = '';
                            document.getElementById('input-materi-ayat').value = '';
                            document.getElementById('btn-simpan-materi-icon').innerText = 'add';
                            document.getElementById('btn-batal-materi').classList.add('hidden');
                            
                            const manual = document.getElementById('form-materi-manual');
                            const massal = document.getElementById('form-materi-massal');
                            const btnToggle = document.getElementById('btn-toggle-materi-massal');
                            if (manual && massal) {
                                manual.classList.remove('hidden');
                                massal.classList.add('hidden');
                                if (btnToggle) btnToggle.classList.remove('hidden');
                            }
                        }

                        window.bukaFormEditMateri = function(no) {
                            const kategoriNama = document.getElementById('input-materi-kategori-aktif').value;
                            let sList = window.getMateriList(kategoriNama);
                            
                            const materi = sList.find(m => String(m.no) === String(no));
                            if (!materi) return;

                            document.getElementById('form-materi-title').innerText = 'Edit Materi';
                            document.getElementById('input-materi-original-no').value = materi.no || '';
                            document.getElementById('input-materi-no').value = materi.no || '';
                            document.getElementById('input-materi-nama').value = materi.nama || '';
                            document.getElementById('input-materi-ayat').value = materi.ayat || '';
                            document.getElementById('btn-simpan-materi-icon').innerText = 'save';
                            document.getElementById('btn-batal-materi').classList.remove('hidden');
                            document.getElementById('input-materi-no').focus();
                            
                            const btnToggle = document.getElementById('btn-toggle-materi-massal');
                            if (btnToggle) btnToggle.classList.add('hidden');
                        }

                        window.renderMateriEditList = function() {
                            const container = document.getElementById('list-materi-edit');
                            const kategoriNama = document.getElementById('input-materi-kategori-aktif').value;
                            if (!container || !kategoriNama) return;

                            let items = window.getMateriList(kategoriNama);
                            let html = '';
                            if (items.length === 0) {
                                html = '<p class="text-center text-xs text-gray-400 py-4">Belum ada materi untuk kategori ini.</p>';
                            } else {
                                items.forEach((m, index) => {
                                    const escapedNo = String(m.no).replace(/'/g, "\\'");
                                    const escapedNama = m.nama ? String(m.nama).replace(/'/g, "\\'") : '';
                                    const moveUpButton = `<button onclick="window.pindahUrutanMateri('${m.no}', -1)" ${index === 0 ? 'disabled' : ''} class="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent" title="Naikkan Urutan"><span class="material-symbols-outlined text-sm">keyboard_arrow_up</span></button>`;
                                    const moveDownButton = `<button onclick="window.pindahUrutanMateri('${m.no}', 1)" ${index === items.length - 1 ? 'disabled' : ''} class="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-full transition-colors disabled:text-gray-300 disabled:cursor-not-allowed disabled:hover:bg-transparent" title="Turunkan Urutan"><span class="material-symbols-outlined text-sm">keyboard_arrow_down</span></button>`;
                                    const editButton = `<button onclick="window.bukaFormEditMateri('${escapedNo}')" class="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="Edit Materi"><span class="material-symbols-outlined text-sm">edit</span></button>`;
                                    const deleteButton = `<button onclick="window.hapusMateri('${escapedNo}')" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Hapus Materi"><span class="material-symbols-outlined text-sm">delete</span></button>`;

                                    html += `
                                    <div class="flex items-center justify-between gap-3 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                        <div class="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold text-xs text-teal-950 shrink-0 shadow-sm">${m.no}</div>
                                        <div class="min-w-0 flex-1">
                                            <p class="text-sm font-bold text-teal-950 truncate">${m.nama}</p>
                                            <p class="text-[10px] text-gray-400 font-medium">${m.ayat}</p>
                                        </div>
                                        <div class="flex items-center shrink-0">
                                            ${moveUpButton}
                                            ${moveDownButton}
                                            ${editButton}
                                            ${deleteButton}
                                        </div>
                                    </div>`;
                                });
                            }
                            container.innerHTML = html;
                        }

                        window.pindahUrutanMateri = function(no, arah) {
                            const kategoriNama = document.getElementById('input-materi-kategori-aktif').value;
                            let items = [...window.getMateriList(kategoriNama)];
                            const index = items.findIndex(m => String(m.no) === String(no));
                            const targetIndex = index + arah;

                            if (index < 0 || targetIndex < 0 || index >= items.length || targetIndex >= items.length) return;

                            [items[index], items[targetIndex]] = [items[targetIndex], items[index]];
                            dataSurat[kategoriNama] = items;

                            db.collection('dataSurat').doc(kategoriNama).set({ list: items }).then(() => {
                                if(typeof window.saveLocalState === 'function') window.saveLocalState();
                                window.renderMateriEditList();
                            }).catch(e => {
                                if(typeof openAlert === 'function') openAlert("Gagal memindah materi: " + e.message);
                            });
                        }

                        window.simpanMateri = function() {
                            const kategoriNama = document.getElementById('input-materi-kategori-aktif').value;
                            const originalNo = document.getElementById('input-materi-original-no').value;
                            const isEditing = !!originalNo;

                            let no = document.getElementById('input-materi-no').value.trim();
                            const nama = document.getElementById('input-materi-nama').value.trim();
                            const ayat = document.getElementById('input-materi-ayat').value.trim();

                            if (!no || !nama) { 
                                if (typeof openAlert === 'function') openAlert("Kode dan Nama materi wajib diisi."); 
                                else alert("Kode dan Nama materi wajib diisi.");
                                return; 
                            }
                            
                            const finalAyat = ayat || '-';

                            if (/^\d+$/.test(no)) { no = parseInt(no, 10); }

                            let items = [...window.getMateriList(kategoriNama)];
                            if (items.some(m => String(m.no) === String(no) && String(m.no) !== String(originalNo))) {
                                if (typeof openAlert === 'function') openAlert("Kode/No materi sudah ada. Gunakan kode yang unik.");
                                else alert("Kode/No materi sudah ada. Gunakan kode yang unik.");
                                return;
                            }

                            if (isEditing) {
                                const index = items.findIndex(m => String(m.no) === String(originalNo));
                                if (index > -1) { items[index] = { no, nama, ayat: finalAyat }; }
                            } else {
                                items.push({ no, nama, ayat: finalAyat });
                            }

                            dataSurat[kategoriNama] = items;
                            db.collection('dataSurat').doc(kategoriNama).set({ list: items }).then(() => {
                                if(typeof window.saveLocalState === 'function') window.saveLocalState();
                                window.resetFormMateri(); 
                                window.renderMateriEditList();
                                if(typeof openAlert === 'function') openAlert("Materi berhasil disimpan.");
                            }).catch(e => {
                                if(typeof openAlert === 'function') openAlert("Gagal menyimpan materi: " + e.message);
                                else alert("Gagal menyimpan materi: " + e.message);
                            });
                        }

                        window.toggleMateriMassal = function() {
                            const manual = document.getElementById('form-materi-manual');
                            const massal = document.getElementById('form-materi-massal');
                            const title = document.getElementById('form-materi-title');
                            const btnToggle = document.getElementById('btn-toggle-materi-massal');
                            
                            if (manual.classList.contains('hidden')) {
                                manual.classList.remove('hidden');
                                massal.classList.add('hidden');
                                title.innerText = 'Tambah Materi Baru';
                                btnToggle.classList.remove('hidden');
                                document.getElementById('input-materi-massal').value = '';
                            } else {
                                manual.classList.add('hidden');
                                massal.classList.remove('hidden');
                                title.innerText = 'Tambah Materi Massal';
                                btnToggle.classList.add('hidden');
                            }
                        }

                        window.simpanMateriMassal = function() {
                            const kategoriNama = document.getElementById('input-materi-kategori-aktif').value;
                            const text = document.getElementById('input-materi-massal').value.trim();
                            
                            if (!text) { 
                                if(typeof openAlert === 'function') openAlert("Silakan masukkan data materi massal."); 
                                else alert("Silakan masukkan data materi massal.");
                                return; 
                            }
                            
                            const rows = text.split('\n');
                            let items = [...window.getMateriList(kategoriNama)];
                            let addedCount = 0, duplicateCount = 0;
                            
                            rows.forEach(row => {
                                const cols = row.split('\t').map(c => c.trim());
                                if (cols.length >= 2) {
                                    let no = cols[0];
                                    const nama = cols[1];
                                    const ayat = cols.length > 2 ? cols[2] : '-';
                                    if (/^\d+$/.test(no)) { no = parseInt(no, 10); }
                                    if (!items.some(m => String(m.no) === String(no))) {
                                        items.push({ no, nama, ayat });
                                        addedCount++;
                                    } else { duplicateCount++; }
                                }
                            });
                            
                            if (addedCount > 0) {
                                dataSurat[kategoriNama] = items;
                                db.collection('dataSurat').doc(kategoriNama).set({ list: items }).then(() => {
                                    if(typeof window.saveLocalState === 'function') window.saveLocalState();
                                    window.resetFormMateri(); 
                                    window.renderMateriEditList();
                                    if(typeof openAlert === 'function') openAlert(`Berhasil menambahkan ${addedCount} materi massal.` + (duplicateCount > 0 ? ` (${duplicateCount} dilewati karena kode duplikat)` : ''));
                                }).catch(e => {
                                    if(typeof openAlert === 'function') openAlert("Gagal menyimpan materi massal: " + e.message);
                                    else alert("Gagal menyimpan materi massal: " + e.message);
                                });
                            } else {
                                if(typeof openAlert === 'function') openAlert("Tidak ada materi baru yang ditambahkan. Pastikan format benar (Kode [Tab] Nama [Tab] Keterangan) dan kode belum digunakan.");
                                else alert("Tidak ada materi baru yang ditambahkan.");
                            }
                        }

                        window.hapusMateri = function(no) {
                            const kategoriNama = document.getElementById('input-materi-kategori-aktif').value;
                            const msg = `Anda yakin ingin menghapus materi dengan Kode "${no}"?`;
                            
                            const proceed = () => {
                                let items = [...window.getMateriList(kategoriNama)];
                                items = items.filter(m => String(m.no) !== String(no));
                                dataSurat[kategoriNama] = items;
                                
                                db.collection('dataSurat').doc(kategoriNama).set({ list: items }).then(() => {
                                    if(typeof window.saveLocalState === 'function') window.saveLocalState();
                                    window.renderMateriEditList();
                                    if(typeof openAlert === 'function') openAlert("Materi berhasil dihapus.");
                                }).catch(e => {
                                    if(typeof openAlert === 'function') openAlert("Gagal menghapus materi: " + e.message);
                                    else alert("Gagal menghapus materi: " + e.message);
                                });
                            };

                            if (typeof openConfirm === 'function') {
                                openConfirm(msg, (confirmed) => {
                                    if (confirmed) proceed();
                                });
                            } else {
                                if (confirm(msg)) proceed();
                            }
                        }

                        window.resetFormKelas = function() {
                            document.getElementById('modal-kelas-title').innerText = 'Kelola Daftar Kelas';
                            document.getElementById('input-kelas-original-nama').value = '';
                            document.getElementById('input-kelas-baru').value = '';
                            document.getElementById('btn-simpan-kelas-icon').innerText = 'add';
                        }

                        window.bukaFormEditKelas = function(nama) {
                            document.getElementById('modal-kelas-title').innerText = 'Edit Kelas';
                            document.getElementById('input-kelas-original-nama').value = nama;
                            document.getElementById('input-kelas-baru').value = nama;
                            document.getElementById('btn-simpan-kelas-icon').innerText = 'save';
                            document.getElementById('input-kelas-baru').focus();
                        }

                        window.bukaModalKelas = function() {
                            window.resetFormKelas();
                            window.renderKelasEditList();
                            document.getElementById('modal-kelas').classList.replace('hidden', 'flex');
                        }

                        window.tutupModalKelas = function() {
                            document.getElementById('modal-kelas').classList.replace('flex', 'hidden');
                            // Update dropdown in the (potentially hidden) add participant modal
                            const kelasSelect = document.getElementById('tambah-kelas');
                            if (kelasSelect) {
                                kelasSelect.innerHTML = listKelas.map(k => `<option value="${k}">${k}</option>`).join('');
                            }
                            window.resetFormKelas();
                        }

                        window.renderKelasEditList = function() {
                            const container = document.getElementById('list-kelas-edit');
                            if (!container) return;

                            let html = '';
                            listKelas.sort().forEach(namaKelas => {
                                html += `
        <div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
            <span class="text-sm font-bold text-teal-950 pl-2">${namaKelas}</span>
            <div class="flex items-center">
                <button onclick="bukaFormEditKelas('${namaKelas}')" class="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="Edit Kelas"><span class="material-symbols-outlined text-base">edit</span></button>
                <button onclick="hapusKelas('${namaKelas}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Hapus Kelas"><span class="material-symbols-outlined text-base">delete</span></button>
            </div>
        </div>`;
                            });
                            container.innerHTML = html || '<p class="text-center text-xs text-gray-400">Belum ada kelas.</p>';
                        }

                        window.simpanKelas = async function() {
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
                                try {
                                const updatedKelas = listKelas.map(k => k === originalNama ? nama : k).sort();
                                listKelas.length = 0;
                                updatedKelas.forEach(k => listKelas.push(k));

                                const batch = db.batch();
                                batch.set(db.collection('appData').doc('kelas'), { list: listKelas });

                                for (const kategori of listKategori.map(k=>k.nama)) {
                                    Object.keys(dataPeserta).forEach(key => {
                                        if (key.endsWith(`_${kategori}`) || key === kategori) {
                                            let kategoriPerluUpdate = false;
                                            const updatedPesertaDiKategori = dataPeserta[key].map(p => {
                                        if (p.kelas === originalNama) {
                                            kategoriPerluUpdate = true;
                                            return { ...p, kelas: nama };
                                        }
                                        return p;
                                    });

                                    if (kategoriPerluUpdate) {
                                                dataPeserta[key] = updatedPesertaDiKategori;
                                                batch.set(db.collection('dataPeserta').doc(key), { list: updatedPesertaDiKategori });
                                            }
                                        }
                                    });
                                }

                                await batch.commit();
                                localStorage.setItem('munaqosyah_listKelas', JSON.stringify(listKelas));
                                if(typeof window.saveLocalState === 'function') window.saveLocalState();
                                    window.resetFormKelas();
                                    window.renderKelasEditList();
                                if(typeof populateFilterKelasPeserta === 'function') populateFilterKelasPeserta();
                                    if(typeof openAlert === 'function') openAlert("Kelas berhasil diperbarui.");
                                } catch(e) {
                                    if(typeof openAlert === 'function') openAlert("Gagal memperbarui kelas: " + e.message);
                                }

                            } else {
                                // --- ADD LOGIC ---
                                const newKelasList = [...listKelas, nama].sort();
                                listKelas.length = 0;
                                newKelasList.forEach(k => listKelas.push(k));
                                try {
                                    await db.collection('appData').doc('kelas').set({ list: listKelas });
                                    localStorage.setItem('munaqosyah_listKelas', JSON.stringify(listKelas));
                                    if(typeof window.saveLocalState === 'function') window.saveLocalState();
                                    namaInput.value = '';
                                    namaInput.focus();
                                    window.renderKelasEditList();
                                    if(typeof populateFilterKelasPeserta === 'function') populateFilterKelasPeserta();
                                    if(typeof openAlert === 'function') openAlert("Kelas berhasil ditambahkan.");
                                } catch(e) {
                                    openAlert("Gagal menyimpan kelas: " + e.message);
                                }
                            }
                        }

                        window.hapusKelas = function(namaKelas) {
                            const isUsed = Object.values(dataPeserta).flat().some(p => p.kelas === namaKelas);
                            if (isUsed) { openAlert(`Kelas "${namaKelas}" tidak dapat dihapus karena masih digunakan oleh peserta.`); return; }

                            openConfirm(`Anda yakin ingin menghapus kelas "${namaKelas}"?`, async (confirmed) => {
                                if (confirmed) {
                                    const filtered = listKelas.filter(k => k !== namaKelas);
                                    listKelas.length = 0;
                                    filtered.forEach(k => listKelas.push(k));
                                    try {
                                        await db.collection('appData').doc('kelas').set({ list: listKelas });
                                        localStorage.setItem('munaqosyah_listKelas', JSON.stringify(listKelas));
                                        if(typeof window.saveLocalState === 'function') window.saveLocalState();
                                        window.renderKelasEditList();
                                        if(typeof populateFilterKelasPeserta === 'function') populateFilterKelasPeserta();
                                        if(typeof openAlert === 'function') openAlert("Kelas berhasil dihapus.");
                                    } catch(e) {
                                        openAlert("Gagal menghapus kelas: " + e.message);
                                    }
                                }
                            });
                        }

                        // --- Fitur Kelola Semester ---
                        window.bukaModalSemester = function() {
                            window.resetFormSemester();
                            window.renderSemesterEditList();
                            document.getElementById('modal-semester').classList.replace('hidden', 'flex');
                        }

                        window.tutupModalSemester = function() {
                            document.getElementById('modal-semester').classList.replace('flex', 'hidden');
                            window.resetFormSemester();
                        }

                        window.renderSemesterEditList = function() {
                            const container = document.getElementById('list-semester-edit');
                            if (!container) return;

                            let html = '';
                            listSemester.sort().forEach(namaSemester => {
                                html += `
                                <div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <span class="text-sm font-bold text-teal-950 pl-2">${namaSemester}</span>
                                    <div class="flex items-center">
                                        <button onclick="bukaFormEditSemester('${namaSemester}')" class="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors" title="Edit Semester"><span class="material-symbols-outlined text-base">edit</span></button>
                                        <button onclick="hapusSemester('${namaSemester}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Hapus Semester"><span class="material-symbols-outlined text-base">delete</span></button>
                                    </div>
                                </div>`;
                            });
                            container.innerHTML = html || '<p class="text-center text-xs text-gray-400">Belum ada semester.</p>';
                        }

                        window.resetFormSemester = function() {
                            document.getElementById('modal-semester-title').innerText = 'Kelola Daftar Semester';
                            document.getElementById('input-semester-original-nama').value = '';
                            document.getElementById('input-semester-baru').value = '';
                            document.getElementById('btn-simpan-semester-icon').innerText = 'add';
                        }

                        window.bukaFormEditSemester = function(nama) {
                            document.getElementById('modal-semester-title').innerText = 'Edit Semester';
                            document.getElementById('input-semester-original-nama').value = nama;
                            document.getElementById('input-semester-baru').value = nama;
                            document.getElementById('btn-simpan-semester-icon').innerText = 'save';
                            document.getElementById('input-semester-baru').focus();
                        }

                        window.simpanSemester = async function() {
                            const originalNama = document.getElementById('input-semester-original-nama').value;
                            const isEditing = !!originalNama;

                            const namaInput = document.getElementById('input-semester-baru');
                            const nama = namaInput.value.trim();

                            if (!nama) { openAlert("Nama semester tidak boleh kosong."); return; }

                            if (listSemester.some(s => s.toLowerCase() === nama.toLowerCase() && s !== originalNama)) {
                                openAlert("Nama semester sudah ada.");
                                return;
                            }

                            if (isEditing) {
                                // Logic untuk edit
                                const updatedList = listSemester.map(s => s === originalNama ? nama : s).sort();
                                listSemester.length = 0;
                                updatedList.forEach(s => listSemester.push(s));
                                
                                // PENTING: Ganti nama semester di data peserta juga
                                if (dataPeserta[originalNama]) {
                                    dataPeserta[nama] = dataPeserta[originalNama];
                                    delete dataPeserta[originalNama];
                                }
                                // TODO: Ganti nama semester di statePenilaian (sangat kompleks, mungkin di-skip untuk sekarang)

                                try {
                                    await db.collection('appData').doc('semester').set({ list: listSemester });
                                    // TODO: Update data peserta di Firestore
                                    localStorage.setItem('munaqosyah_listSemester', JSON.stringify(listSemester));
                                    if(typeof window.saveLocalState === 'function') window.saveLocalState();
                                    window.resetFormSemester();
                                    window.renderSemesterEditList();
                                    if(typeof openAlert === 'function') openAlert("Semester berhasil diperbarui.");
                                } catch(e) {
                                    if(typeof openAlert === 'function') openAlert("Gagal memperbarui semester: " + e.message);
                                }

                            } else {
                                // Logic untuk tambah baru
                                const newList = [...listSemester, nama].sort();
                                listSemester.length = 0;
                                newList.forEach(s => listSemester.push(s));
                                try {
                                    await db.collection('appData').doc('semester').set({ list: listSemester });
                                    localStorage.setItem('munaqosyah_listSemester', JSON.stringify(listSemester));
                                    namaInput.value = '';
                                    namaInput.focus();
                                    window.renderSemesterEditList();
                                    if(typeof openAlert === 'function') openAlert("Semester berhasil ditambahkan.");
                                } catch(e) { openAlert("Gagal menyimpan semester: " + e.message); }
                            }
                        }

                        window.hapusSemester = function(namaSemester) {
                            const isUsed = dataPeserta[namaSemester] && Object.values(dataPeserta[namaSemester]).flat().length > 0;
                            if (isUsed) { openAlert(`Semester "${namaSemester}" tidak dapat dihapus karena sudah berisi data peserta.`); return; }

                            openConfirm(`Anda yakin ingin menghapus semester "${namaSemester}"?`, async (confirmed) => {
                                if (confirmed) {
                                    const filtered = listSemester.filter(s => s !== namaSemester);
                                    listSemester.length = 0;
                                    filtered.forEach(s => listSemester.push(s));
                                    try {
                                        await db.collection('appData').doc('semester').set({ list: listSemester });
                                        localStorage.setItem('munaqosyah_listSemester', JSON.stringify(listSemester));
                                        window.renderSemesterEditList();
                                        if(typeof openAlert === 'function') openAlert("Semester berhasil dihapus.");
                                    } catch(e) { openAlert("Gagal menghapus semester: " + e.message); }
                                }
                            });
                        }

                        // --- Fitur Tanggal Ujian, Token, dan KKM ---
                        window.bukaModalTanggalUjian = function() {
                            if(typeof window.renderTanggalUjianList === 'function') window.renderTanggalUjianList();
                            document.getElementById('modal-tanggal-ujian').classList.replace('hidden', 'flex');
                        }

                        window.tutupModalTanggalUjian = function() {
                            document.getElementById('modal-tanggal-ujian').classList.replace('flex', 'hidden');
                        }

                        window.renderTanggalUjianList = function() {
                            const container = document.getElementById('list-tanggal-ujian-edit');
                            if (!container) return;
                            const dates = (typeof appSettings !== 'undefined' && appSettings.examDates) ? appSettings.examDates : [];
                            let html = '';
                            if (dates.length === 0) {
                                html = '<p class="text-center text-xs text-gray-400 py-4">Belum ada tanggal ujian yang diatur.</p>';
                            } else {
                                dates.sort().forEach(d => {
                                    const formatted = new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                    html += `
                                    <div class="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200">
                                        <span class="text-sm font-bold text-teal-950">${formatted}</span>
                                        <button onclick="hapusTanggalUjian('${d}')" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-90"><span class="material-symbols-outlined text-base">delete</span></button>
                                    </div>`;
                                });
                            }
                            container.innerHTML = html;
                        }

                        window.tambahTanggalUjian = async function() {
                            const input = document.getElementById('setting-input-exam-date');
                            const newDate = input.value;
                            if (!newDate) { openAlert("Silakan pilih tanggal."); return; }
                            
                            if (typeof appSettings === 'undefined') window.appSettings = {};
                            if (!appSettings.examDates) appSettings.examDates = [];
                            
                            if (appSettings.examDates.includes(newDate)) { openAlert("Tanggal tersebut sudah ada."); return; }
                            
                            const updatedDates = [...appSettings.examDates, newDate];
                            
                            try {
                                await db.collection('appData').doc('settings').set({ examDates: updatedDates }, { merge: true });
                                appSettings.examDates = updatedDates;
                                localStorage.setItem('munaqosyahSettings', JSON.stringify(appSettings));
                                input.value = '';
                                if(typeof window.renderTanggalUjianList === 'function') window.renderTanggalUjianList();
                                if(typeof window.renderUjianDateDisplay === 'function') window.renderUjianDateDisplay();
                            } catch (e) {
                                openAlert("Gagal menyimpan tanggal: " + e.message);
                            }
                        }

                        window.hapusTanggalUjian = function(dateToRemove) {
                            openConfirm(`Hapus tanggal ujian ${dateToRemove}?`, async (yes) => {
                                if(yes) {
                                    if (typeof appSettings === 'undefined') window.appSettings = {};
                                    if (!appSettings.examDates) appSettings.examDates = [];
                                    const updatedDates = appSettings.examDates.filter(d => d !== dateToRemove);
                                    try {
                                        await db.collection('appData').doc('settings').set({ examDates: updatedDates }, { merge: true });
                                        appSettings.examDates = updatedDates;
                                        localStorage.setItem('munaqosyahSettings', JSON.stringify(appSettings));
                                        if(typeof window.renderTanggalUjianList === 'function') window.renderTanggalUjianList();
                                        if(typeof window.renderUjianDateDisplay === 'function') window.renderUjianDateDisplay();
                                    } catch (e) {
                                        openAlert("Gagal menghapus tanggal: " + e.message);
                                    }
                                }
                            });
                        }

                        window.bukaModalKkm = function() {
                            const input = document.getElementById('setting-input-kkm');
                            if(input) input.value = (typeof appSettings !== 'undefined' && appSettings.kkm !== undefined) ? appSettings.kkm : 7;
                            document.getElementById('modal-kkm').classList.replace('hidden', 'flex');
                        }

                        window.tutupModalKkm = function() {
                            document.getElementById('modal-kkm').classList.replace('flex', 'hidden');
                        }

                        window.simpanKkm = async function() {
                            const input = document.getElementById('setting-input-kkm');
                            if(!input) return;
                            const newKkm = parseFloat(input.value);
                            if(isNaN(newKkm) || newKkm < 0 || newKkm > 10) {
                                openAlert("Nilai KKM harus antara 0 dan 10.");
                                return;
                            }
                            
                            try {
                                await db.collection('appData').doc('settings').set({ kkm: newKkm }, { merge: true });
                                
                                if (typeof appSettings === 'undefined') window.appSettings = {};
                                appSettings.kkm = newKkm;
                                localStorage.setItem('munaqosyahSettings', JSON.stringify(appSettings));
                                
                                window.tutupModalKkm();
                                if (typeof openAlert === 'function') openAlert("Nilai KKM berhasil diperbarui.");
                                
                                if (typeof window.applySettings === 'function') window.applySettings(appSettings);
                                if (typeof renderDashboard === 'function' && document.getElementById('view-dashboard') && !document.getElementById('view-dashboard').classList.contains('hidden')) renderDashboard();
                                if (typeof renderLaporanPage === 'function' && document.getElementById('view-laporan') && !document.getElementById('view-laporan').classList.contains('hidden')) renderLaporanPage();
                            } catch(e) {
                                openAlert("Gagal menyimpan KKM: " + e.message);
                            }
                        }

                        window.bukaModalTokenPendaftaran = function() {
                            if(typeof window.renderTokenPendaftaran === 'function') window.renderTokenPendaftaran();
                            document.getElementById('modal-token-pendaftaran').classList.replace('hidden', 'flex');
                        }

                        window.tutupModalTokenPendaftaran = function() {
                            document.getElementById('modal-token-pendaftaran').classList.replace('flex', 'hidden');
                        }

                        window.renderTokenPendaftaran = function() {
                            const tokenDisplayContainer = document.getElementById('token-display-container');
                            const tokenDisplay = document.getElementById('token-display');
                            const noTokenMessage = document.getElementById('no-token-message');
                            const btnShareToken = document.getElementById('btn-share-token');
                            
                            const token = (typeof appSettings !== 'undefined' && appSettings.registrationToken) ? appSettings.registrationToken : null;
                            
                            if (token) {
                                if(tokenDisplay) tokenDisplay.value = token;
                                if(tokenDisplayContainer) tokenDisplayContainer.classList.remove('hidden');
                                if(noTokenMessage) noTokenMessage.classList.add('hidden');
                                if(btnShareToken) btnShareToken.classList.remove('hidden');
                            } else {
                                if(tokenDisplayContainer) tokenDisplayContainer.classList.add('hidden');
                                if(noTokenMessage) noTokenMessage.classList.remove('hidden');
                                if(btnShareToken) btnShareToken.classList.add('hidden');
                            }
                        }

                        window.generateToken = async function() {
                            const newToken = Math.random().toString(36).substring(2, 10).toUpperCase();
                            try {
                                await db.collection('appData').doc('settings').set({ registrationToken: newToken }, { merge: true });
                                if (typeof appSettings === 'undefined') window.appSettings = {};
                                appSettings.registrationToken = newToken;
                                localStorage.setItem('munaqosyahSettings', JSON.stringify(appSettings));
                                if(typeof window.renderTokenPendaftaran === 'function') window.renderTokenPendaftaran();
                            } catch(e) {
                                openAlert("Gagal membuat token: " + e.message);
                            }
                        }

                        window.clearToken = async function() {
                            openConfirm("Anda yakin ingin menghapus token? Penguji baru tidak akan bisa mendaftar sampai token baru dibuat.", async (yes) => {
                                if(yes) {
                                    try {
                                        await db.collection('appData').doc('settings').set({ registrationToken: firebase.firestore.FieldValue.delete() }, { merge: true });
                                        if (typeof appSettings === 'undefined') window.appSettings = {};
                                        delete appSettings.registrationToken;
                                        localStorage.setItem('munaqosyahSettings', JSON.stringify(appSettings));
                                        if(typeof window.renderTokenPendaftaran === 'function') window.renderTokenPendaftaran();
                                    } catch(e) {
                                        try {
                                            await db.collection('appData').doc('settings').set({ registrationToken: null }, { merge: true });
                                            if (typeof appSettings === 'undefined') window.appSettings = {};
                                            delete appSettings.registrationToken;
                                            localStorage.setItem('munaqosyahSettings', JSON.stringify(appSettings));
                                            if(typeof window.renderTokenPendaftaran === 'function') window.renderTokenPendaftaran();
                                        } catch(e2) {
                                            openAlert("Gagal menghapus token: " + e2.message);
                                        }
                                    }
                                }
                            });
                        }

                        window.copyTokenToClipboard = function() {
                            const tokenInput = document.getElementById('token-display');
                            if(!tokenInput) return;
                            tokenInput.select();
                            tokenInput.setSelectionRange(0, 99999);
                            document.execCommand("copy");
                            openAlert("Token berhasil disalin ke papan klip!");
                        }

                        window.shareLoginToken = function() {
                            const token = (typeof appSettings !== 'undefined' && appSettings.registrationToken) ? appSettings.registrationToken : null;
                            if (!token) return;
                            
                            let urlObj = new URL(window.location.href);
                            let pathname = urlObj.pathname;
                            
                            if (pathname.endsWith('index.html')) {
                                pathname = pathname.replace('index.html', 'login.html');
                            } else if (!pathname.endsWith('/')) {
                                pathname += '/login.html';
                            } else {
                                pathname += 'login.html';
                            }
                            urlObj.pathname = pathname;
                            urlObj.search = '';
                            urlObj.hash = '';
                            
                            const text = `*Pendaftaran Guru Penguji Munaqosyah*\n\nSilakan buka tautan berikut untuk masuk (login) atau membuat akun baru:\n${urlObj.toString()}\n\nGunakan Token Pendaftaran ini: *${token}*`;
                            
                            const tempInput = document.createElement('textarea');
                            tempInput.value = text;
                            document.body.appendChild(tempInput);
                            tempInput.select();
                            document.execCommand("copy");
                            document.body.removeChild(tempInput);
                            
                            if (typeof openAlert === 'function') openAlert("Tautan Login beserta Token berhasil disalin! Silakan tempel (paste) di WhatsApp.");
                            else alert("Tautan Login beserta Token berhasil disalin!");
                        }

        // --- Fitur Ganti Foto Profil ---
        window.updateSemuaFotoProfil = function(url) {
            if (!url) return;
            const avatarEls = document.querySelectorAll('#user-avatar-header, #user-avatar-laporan, #user-avatar-pengaturan, #user-avatar-peserta, #user-avatar-ujian, #user-avatar-penilaian');
            avatarEls.forEach(el => {
                if (el) el.src = url;
            });
        };

        window.initFotoProfil = function() {
            if (typeof currentUser !== 'undefined' && currentUser) {
                const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || currentUser.username || 'U')}&background=cfe6f2&color=071e27`;
                window.updateSemuaFotoProfil(currentUser.profilePicUrl || fallbackUrl);
            }
        };

        window.triggerGantiFotoProfil = function(e) {
            if (e) e.preventDefault();
            const inputProfilePic = document.getElementById('input-profile-pic');
            if (inputProfilePic) inputProfilePic.click();
        };

        window.hapusFotoProfil = async function(e) {
            if (e) e.preventDefault();
            const proceed = async () => {
                try {
                    const loadingOverlay = document.getElementById('loading-overlay');
                    if (loadingOverlay) loadingOverlay.classList.remove('opacity-0', 'pointer-events-none');

                    if (typeof currentUser !== 'undefined' && currentUser) {
                        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || currentUser.username || 'U')}&background=cfe6f2&color=071e27`;
                        window.updateSemuaFotoProfil(fallbackUrl);

                        delete currentUser.profilePicUrl;
                        localStorage.setItem('currentUser', JSON.stringify(currentUser));

                        if (typeof db !== 'undefined' && currentUser.uid) {
                            await db.collection('users').doc(currentUser.uid).set({ 
                                profilePicUrl: firebase.firestore.FieldValue.delete() 
                            }, { merge: true });
                            
                            const localStr = localStorage.getItem('localUsers');
                            if (localStr) {
                                const localUsers = JSON.parse(localStr);
                                if (localUsers[currentUser.uid]) {
                                    delete localUsers[currentUser.uid].profilePicUrl;
                                    localStorage.setItem('localUsers', JSON.stringify(localUsers));
                                }
                            }
                            
                            if (typeof openAlert === 'function') openAlert("Foto profil berhasil dihapus!");
                            else alert("Foto profil berhasil dihapus!");
                            
                            if (typeof renderGuruPengujiDashboard === 'function') renderGuruPengujiDashboard();
                        }
                    }
                } catch (err) {
                    console.error("Gagal menghapus foto profil:", err);
                    if (typeof openAlert === 'function') openAlert("Gagal menghapus foto profil.");
                    else alert("Gagal menghapus foto profil.");
                } finally {
                    const loadingOverlay = document.getElementById('loading-overlay');
                    if (loadingOverlay) loadingOverlay.classList.add('opacity-0', 'pointer-events-none');
                }
            };

            if (typeof openConfirm === 'function') openConfirm("Apakah Anda yakin ingin menghapus foto profil kembali ke default?", (yes) => { if (yes) proceed(); });
            else if (confirm("Apakah Anda yakin ingin menghapus foto profil kembali ke default?")) proceed();
        };

        window.prosesGantiFotoProfil = async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith('image/')) {
                if (typeof openAlert === 'function') openAlert("Harap pilih file gambar yang valid.");
                else alert("Harap pilih file gambar yang valid.");
                return;
            }

            try {
                // Tampilkan indikator loading jika ada
                const loadingOverlay = document.getElementById('loading-overlay');
                if (loadingOverlay) loadingOverlay.classList.remove('opacity-0', 'pointer-events-none');

                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const img = new Image();
                        img.onload = function() {
                            const canvas = document.createElement('canvas');
                            const MAX_SIZE = 256;
                            let width = img.width, height = img.height;

                            if (width > height) { 
                                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } 
                            } else { 
                                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } 
                            }

                            canvas.width = width; canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            resolve(canvas.toDataURL('image/jpeg', 0.8));
                        };
                        img.onerror = reject;
                        img.src = event.target.result;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                // Langsung perbarui UI untuk UX yang responsif
                window.updateSemuaFotoProfil(dataUrl);

                if (typeof currentUser !== 'undefined' && currentUser) {
                    currentUser.profilePicUrl = dataUrl;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));

                    if (typeof db !== 'undefined' && currentUser.uid) {
                        await db.collection('users').doc(currentUser.uid).set({ profilePicUrl: dataUrl }, { merge: true });
                        
                        const localStr = localStorage.getItem('localUsers');
                        if (localStr) {
                            const localUsers = JSON.parse(localStr);
                            if (localUsers[currentUser.uid]) {
                                localUsers[currentUser.uid].profilePicUrl = dataUrl;
                                localStorage.setItem('localUsers', JSON.stringify(localUsers));
                            }
                        }
                        
                        if (typeof openAlert === 'function') openAlert("Foto profil berhasil diperbarui!");
                        else alert("Foto profil berhasil diperbarui!");
                        
                        // Segarkan list guru penguji di dasbor
                        if (typeof renderGuruPengujiDashboard === 'function') {
                            renderGuruPengujiDashboard();
                        }
                    }
                }
            } catch (err) {
                console.error("Gagal memproses/menyimpan foto profil:", err);
                if (typeof openAlert === 'function') openAlert("Gagal memproses atau menyimpan foto profil.");
                else alert("Gagal memproses atau menyimpan foto profil.");
            } finally {
                e.target.value = ''; // Reset input form agar bisa upload file yg sama lagi jika perlu
                const loadingOverlay = document.getElementById('loading-overlay');
                if (loadingOverlay) loadingOverlay.classList.add('opacity-0', 'pointer-events-none');
            }
        };

        // --- Fitur Toggle Dropdown Profil ---
        window.toggleProfileDropdown = function(btn) {
            const menu = btn.nextElementSibling;
            const isHidden = menu ? menu.classList.contains('hidden') : false;
            
            // Sembunyikan semua menu dropdown profil yang mungkin sedang terbuka di halaman
            document.querySelectorAll('.profile-dropdown-menu').forEach(m => m.classList.add('hidden'));
            
            // Jika menu yang diklik sebelumnya tersembunyi, maka tampilkan
            if (isHidden && menu) {
                menu.classList.remove('hidden');
            }
        };

        // Tutup dropdown secara otomatis jika mengklik di luar area ATAU setelah memilih salah satu tombol menu
        document.addEventListener('click', function(e) {
            const isOutside = !e.target.closest('.profile-dropdown-container');
            const isMenuAction = e.target.closest('.profile-dropdown-menu button');
            
            if (isOutside || isMenuAction) {
                document.querySelectorAll('.profile-dropdown-menu').forEach(menu => {
                    menu.classList.add('hidden');
                });
            }
        });

        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(window.initFotoProfil, 500); // Tunggu currentUser siap

            const inputProfilePic = document.getElementById('input-profile-pic');
            if (inputProfilePic) {
                inputProfilePic.addEventListener('change', window.prosesGantiFotoProfil);
            }

            const triggerBtns = [
                document.getElementById('btn-change-profile-pic'),
                document.getElementById('btn-change-profile-pic-laporan'),
                document.getElementById('btn-change-profile-pic-pengaturan'),
                document.getElementById('btn-change-profile-pic-peserta'),
                document.getElementById('btn-change-profile-pic-ujian'),
                document.getElementById('btn-change-profile-pic-penilaian')
            ];

            triggerBtns.forEach(btn => {
                if (btn) {
                    btn.addEventListener('click', window.triggerGantiFotoProfil);
                }
            });
        });
