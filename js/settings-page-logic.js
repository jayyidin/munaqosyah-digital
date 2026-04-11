                        // --- Settings Page Logic ---
                        function switchSettingsTab(tabName) {
                            const navs = ['umum', 'data', 'bahaya'];
                            if (!navs.includes(tabName)) tabName = 'umum'; // fallback ke umum jika tidak valid
                            
                            navs.forEach(nav => {
                                document.getElementById(`settings-nav-${nav}`).className = "flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-500 hover:bg-gray-100 font-semibold text-sm";
                                document.getElementById(`settings-content-${nav}`).classList.add('hidden');
                            });

                            document.getElementById(`settings-nav-${tabName}`).className = "flex items-center gap-3 px-4 py-2.5 rounded-lg bg-primary/10 text-primary font-bold text-sm";
                            document.getElementById(`settings-content-${tabName}`).classList.remove('hidden');
                            
                            localStorage.setItem('currentSettingsTab', tabName);
                        }

                        function downloadBackup() {
                            const backupData = {
                                settings: appSettings,
                                state: { statePenilaian, dataPeserta, listKategori, activityLog }
                            };
                            const jsonStr = JSON.stringify(backupData, null, 2);
                            const blob = new Blob([jsonStr], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const downloadAnchorNode = document.createElement('a');
                            downloadAnchorNode.setAttribute("href", url);
                            downloadAnchorNode.setAttribute("download", `munaqosyah_backup_${new Date().toISOString().split('T')[0]}.json`);
                            document.body.appendChild(downloadAnchorNode);
                            downloadAnchorNode.click();
                            downloadAnchorNode.remove();
                            URL.revokeObjectURL(url);
                            openAlert("Data cadangan berhasil diunduh.");
                        }

                        function resetApplicationData() {
                            openConfirm("Anda yakin ingin mereset SEMUA data aplikasi? Tindakan ini tidak dapat diurungkan dan akan menghapus semua data peserta, nilai, dan riwayat aktivitas.", async (confirmed) => {
                                if (confirmed) {
                                    if (typeof db !== 'undefined') {
                                        try {
                                            let batches = [];
                                            let currentBatch = db.batch();
                                            let opCount = 0;

                                            // 1. Kosongkan Data Peserta dari semua kategori
                                            if (typeof listKategori !== 'undefined') {
                                                listKategori.forEach(k => {
                                                    currentBatch.set(db.collection('dataPeserta').doc(k.nama), { list: [] });
                                                    opCount++;
                                                });
                                            }

                                            // 2. Hapus seluruh Dokumen Nilai Ujian
                                            const penSnap = await db.collection('statePenilaian').get();
                                            penSnap.forEach(doc => {
                                                currentBatch.delete(doc.ref);
                                                opCount++;
                                                if (opCount >= 490) { // Batas Firestore adalah 500 operasi
                                                    batches.push(currentBatch.commit());
                                                    currentBatch = db.batch();
                                                    opCount = 0;
                                                }
                                            });
                                            
                                            // 3. Bersihkan Riwayat Aktivitas
                                            currentBatch.set(db.collection('appData').doc('activityLog'), { log: [] });
                                            batches.push(currentBatch.commit());
                                            
                                            await Promise.all(batches);
                                        } catch (e) {
                                            console.error("Gagal menghapus data di cloud:", e);
                                        }
                                    }
                                    
                                    localStorage.removeItem('munaqosyahState');
                                    openAlert("Semua data berhasil direset ke pengaturan awal.");
                                    setTimeout(() => handleLogout(true), 2500);
                                }
                            });
                        }

                        window.promptUbahFirebase = function() {
                            const currentConfig = localStorage.getItem('customFirebaseConfig') || '';
                            const msg = "Masukkan Konfigurasi Firebase (format JSON) untuk sekolah baru:\n\nContoh format:\n{\n  \"apiKey\": \"AIzaSy...\",\n  \"authDomain\": \"...\",\n  \"projectId\": \"...\"\n}\n\nKosongkan lalu tekan OK untuk kembali ke database default.";
                            
                            const configStr = prompt(msg, currentConfig);
                            
                            if (configStr === null) return; // Dibatalkan oleh user
                            
                            if (configStr.trim() === '') {
                                localStorage.removeItem('customFirebaseConfig');
                                if (typeof openAlert === 'function') openAlert("Database dikembalikan ke default. Anda akan dikeluarkan (logout).");
                                else alert("Database dikembalikan ke default.");
                                setTimeout(() => {
                                    if (typeof performLogout === 'function') performLogout();
                                    else window.location.replace('login.html');
                                }, 1500);
                                return;
                            }

                            try {
                                const parsed = JSON.parse(configStr);
                                if (!parsed.apiKey || !parsed.projectId) {
                                    if (typeof openAlert === 'function') openAlert("Format JSON tidak lengkap. Harus memiliki apiKey dan projectId.");
                                    else alert("Format JSON tidak lengkap.");
                                    return;
                                }
                                localStorage.setItem('customFirebaseConfig', JSON.stringify(parsed));
                                if (typeof openAlert === 'function') openAlert("Database berhasil diubah! Aplikasi akan memuat ulang dan mengeluarkan Anda.");
                                else alert("Database berhasil diubah!");
                                setTimeout(() => { if (typeof performLogout === 'function') performLogout(); else window.location.replace('login.html'); }, 1500);
                            } catch(e) {
                                if (typeof openAlert === 'function') openAlert("Format JSON tidak valid!"); else alert("Format JSON tidak valid!");
                            }
                        };

                        // --- Logika Pengaturan Umum (Info & Logo Aplikasi) ---
                        (function initPengaturanUmum() {
                            const btnChangeLogo = document.getElementById('btn-change-logo');
                            const inputLogoFile = document.getElementById('input-logo-file');
                            const logoPreview = document.getElementById('setting-logo-preview');
                            const logoIcon = document.getElementById('setting-logo-icon-preview');
                            const btnSaveSettings = document.getElementById('btn-save-settings');
                            const inputAppName = document.getElementById('setting-input-app-name');
                            const inputSchoolName = document.getElementById('setting-input-school-name');

                            let tempLogoUrl = null;

                            // Menangani klik tombol ubah logo
                            if (btnChangeLogo && inputLogoFile) {
                                btnChangeLogo.addEventListener('click', () => {
                                    inputLogoFile.click();
                                });
                            }

                            // Menangani proses pemilihan file gambar logo
                            if (inputLogoFile) {
                                inputLogoFile.addEventListener('change', function(e) {
                                    const file = e.target.files[0];
                                    if (!file) return;

                                    // Validasi ukuran file maksimal 2MB
                                    if (file.size > 2 * 1024 * 1024) {
                                        if(typeof openAlert === 'function') openAlert("Ukuran file logo maksimal 2MB.");
                                        else alert("Ukuran file logo maksimal 2MB.");
                                        return;
                                    }

                                    const reader = new FileReader();
                                    reader.onload = function(event) {
                                        tempLogoUrl = event.target.result;
                                        if (logoPreview && logoIcon) {
                                            logoPreview.src = tempLogoUrl;
                                            logoPreview.classList.remove('hidden');
                                            logoIcon.classList.add('hidden');
                                        }
                                    };
                                    reader.readAsDataURL(file);
                                });
                            }

                            // Menangani proses penyimpanan pengaturan umum
                            if (btnSaveSettings) {
                                btnSaveSettings.addEventListener('click', async () => {
                                    if (typeof appSettings === 'undefined') window.appSettings = {};
                                    
                                    const newAppName = inputAppName ? inputAppName.value.trim() : 'Aplikasi Munaqosyah';
                                    const newSchoolName = inputSchoolName ? inputSchoolName.value.trim() : '';

                                    const originalBtnText = btnSaveSettings.innerText;
                                    btnSaveSettings.innerText = 'Menyimpan...';
                                    btnSaveSettings.disabled = true;

                                    const updates = {
                                        appName: newAppName,
                                        schoolName: newSchoolName
                                    };
                                    if (tempLogoUrl) {
                                        updates.logoUrl = tempLogoUrl;
                                    }

                                    try {
                                        // 1. Simpan ke Firestore (Tunggu respon)
                                        if (typeof db !== 'undefined') {
                                            await db.collection('appData').doc('settings').set(updates, { merge: true });
                                        }

                                        // 2. Simpan Lokal Segera & Update UI setelah sukses
                                        appSettings.appName = newAppName;
                                        appSettings.schoolName = newSchoolName;
                                        if (tempLogoUrl) appSettings.logoUrl = tempLogoUrl;
                                        localStorage.setItem('munaqosyahSettings', JSON.stringify(appSettings));
                                        if (typeof window.applySettings === 'function') window.applySettings(appSettings);

                                        if (typeof openAlert === 'function') {
                                            openAlert("Pengaturan Umum berhasil disimpan!");
                                        } else {
                                            alert("Pengaturan Umum berhasil disimpan!");
                                        }
                                    } catch (error) {
                                        console.error("Gagal menyimpan pengaturan:", error);
                                        if (typeof openAlert === 'function') {
                                            openAlert("Gagal menyimpan pengaturan: " + error.message);
                                        } else {
                                            alert("Gagal menyimpan pengaturan: " + error.message);
                                        }
                                    } finally {
                                        btnSaveSettings.innerText = originalBtnText;
                                        btnSaveSettings.disabled = false;
                                    }
                                });
                            }
                        })();

                        // Fungsi Global untuk Menerapkan Pengaturan ke UI (Dipanggil saat login/load aplikasi)
                        window.applySettings = function(settings = window.appSettings) {
                            if (!settings) return;
                            
                            // 1. Perbarui Teks & Logo di Sidebar dan Header
                            const headerAppName = document.getElementById('app-name-sidebar');
                            const headerSchoolName = document.getElementById('school-name-sidebar');
                            const sidebarLogo = document.getElementById('app-logo-sidebar');
                            const sidebarIcon = document.getElementById('app-logo-icon-sidebar');
                            const loaderLogoImg = document.getElementById('app-logo-loader');
                            const loaderLogoIcon = document.getElementById('app-logo-icon-loader');
                            const loaderAppName = document.getElementById('app-name-loader');
                            const loaderSchoolName = document.getElementById('school-name-loader');
                            
                            if (headerAppName && settings.appName) headerAppName.innerHTML = settings.appName.replace(/<br\s*\/?>/gi, ' ');
                            if (headerSchoolName && settings.schoolName) headerSchoolName.innerText = settings.schoolName;
                            
                            if (loaderAppName && settings.appName) loaderAppName.innerHTML = settings.appName;
                            if (loaderSchoolName && settings.schoolName) loaderSchoolName.innerText = settings.schoolName;
                            
                            if (settings.logoUrl && sidebarLogo && sidebarIcon) {
                                sidebarLogo.src = settings.logoUrl;
                                sidebarLogo.classList.remove('hidden');
                                sidebarIcon.classList.add('hidden');
                                if (loaderLogoImg && loaderLogoIcon) {
                                    loaderLogoImg.src = settings.logoUrl;
                                    loaderLogoImg.classList.remove('hidden');
                                    loaderLogoIcon.classList.add('hidden');
                                }
                            } else {
                                if (sidebarLogo && sidebarIcon) {
                                    sidebarLogo.classList.add('hidden');
                                    sidebarIcon.classList.remove('hidden');
                                }
                                if (loaderLogoImg && loaderLogoIcon) {
                                    loaderLogoImg.classList.add('hidden');
                                    loaderLogoIcon.classList.remove('hidden');
                                }
                            }

                            let title = settings.appName ? settings.appName.replace(/<br\s*\/?>/gi, ' ') : "Aplikasi Munaqosyah";
                            if (settings.schoolName) title += ` - ${settings.schoolName}`;
                            document.title = title;

                            // 2. Perbarui nilai di Form Input Pengaturan Umum itu sendiri
                            const inputAppName = document.getElementById('setting-input-app-name');
                            const inputSchoolName = document.getElementById('setting-input-school-name');
                            const inputKkm = document.getElementById('setting-input-kkm');
                            const settingsPreviewImg = document.getElementById('setting-logo-preview');
                            const settingsPreviewIcon = document.getElementById('setting-logo-icon-preview');

                            if (inputAppName && settings.appName) inputAppName.value = settings.appName.replace(/<br\s*\/?>/gi, ' ');
                            if (inputSchoolName && settings.schoolName) inputSchoolName.value = settings.schoolName;
                            if (inputKkm && settings.kkm) inputKkm.value = settings.kkm;
                            
                            if (settings.logoUrl && settingsPreviewImg && settingsPreviewIcon) {
                                settingsPreviewImg.src = settings.logoUrl;
                                settingsPreviewImg.classList.remove('hidden');
                                settingsPreviewIcon.classList.add('hidden');
                            } else if (settingsPreviewImg && settingsPreviewIcon) {
                                settingsPreviewImg.classList.add('hidden');
                                settingsPreviewIcon.classList.remove('hidden');
                            }
                        };

                        // --- Logika Kelola Kategori Ujian ---
                        window.bukaModalKategori = function() {
                            document.getElementById('input-kategori-original-nama').value = '';
                            document.getElementById('input-kategori-baru').value = '';
                            document.getElementById('input-tipe-kategori').value = 'standar';
                            document.getElementById('btn-simpan-kategori-icon').innerText = 'add';
                            window.renderListKategoriEdit();
                            document.getElementById('modal-kategori').classList.replace('hidden', 'flex');
                        };

                        window.tutupModalKategori = function() {
                            document.getElementById('modal-kategori').classList.replace('flex', 'hidden');
                            if (typeof renderKategoriDropdown === 'function') window.renderKategoriDropdown();
                            if (typeof renderDashboardFilterOptions === 'function') renderDashboardFilterOptions();
                        };

                        window.renderListKategoriEdit = function() {
                            const container = document.getElementById('list-kategori-edit');
                            if (!container) return;
                            let html = '';
                            if (typeof listKategori === 'undefined' || listKategori.length === 0) {
                                html = '<p class="text-xs text-gray-400 italic text-center py-2">Belum ada kategori.</p>';
                            } else {
                                listKategori.forEach((k, index) => {
                                    const moveUpButton = `<button onclick="window.pindahUrutanKategori(${index}, -1)" ${index === 0 ? 'disabled' : ''} class="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors disabled:text-gray-300 disabled:cursor-not-allowed" title="Naikkan Urutan"><span class="material-symbols-outlined text-base">keyboard_arrow_up</span></button>`;
                                    const moveDownButton = `<button onclick="window.pindahUrutanKategori(${index}, 1)" ${index === listKategori.length - 1 ? 'disabled' : ''} class="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors disabled:text-gray-300 disabled:cursor-not-allowed" title="Turunkan Urutan"><span class="material-symbols-outlined text-base">keyboard_arrow_down</span></button>`;
                                    const manageMateriButton = `<button onclick="window.bukaModalMateri('${k.nama}')" class="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Kelola Materi"><span class="material-symbols-outlined text-base">format_list_bulleted</span></button>`;
                                    
                                    html += `
                                    <div class="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-200 mb-2">
                                        <div class="pl-2">
                                            <p class="font-bold text-teal-950 text-sm">${k.nama}</p>
                                            <p class="text-[10px] text-gray-500 uppercase tracking-widest">Tipe: ${k.tipe} • Urutan: ${index + 1}</p>
                                        </div>
                                        <div class="flex items-center gap-0.5">
                                            ${moveUpButton}
                                            ${moveDownButton}
                                            ${manageMateriButton}
                                            <button onclick="window.editKategori('${k.nama}', '${k.tipe}')" class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><span class="material-symbols-outlined text-base">edit</span></button>
                                            <button onclick="window.hapusKategori('${k.nama}')" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><span class="material-symbols-outlined text-base">delete</span></button>
                                        </div>
                                    </div>`;
                                });
                            }
                            container.innerHTML = html;
                        };

                        window.editKategori = function(nama, tipe) {
                            document.getElementById('input-kategori-original-nama').value = nama;
                            document.getElementById('input-kategori-baru').value = nama;
                            document.getElementById('input-tipe-kategori').value = tipe;
                            document.getElementById('btn-simpan-kategori-icon').innerText = 'save';
                        };

                        window.hapusKategori = function(nama) {
                            if (typeof openConfirm === 'function') {
                                openConfirm(`Yakin ingin menghapus kategori "${nama}"? Semua data peserta dan materi di dalamnya akan ikut terhapus!`, async (yes) => {
                                    if (yes) await prosesHapusKategori(nama);
                                });
                            } else {
                                if (confirm(`Yakin ingin menghapus kategori "${nama}"? Semua data peserta dan materi di dalamnya akan ikut terhapus!`)) {
                                    prosesHapusKategori(nama);
                                }
                            }
                        };

                        async function prosesHapusKategori(nama) {
                            const filtered = listKategori.filter(k => k.nama !== nama);
                            listKategori.length = 0;
                            filtered.forEach(k => listKategori.push(k));
                            if (typeof dataPeserta !== 'undefined') delete dataPeserta[nama];
                            if (typeof dataSurat !== 'undefined') delete dataSurat[nama];

                            try {
                                const batch = db.batch();
                                batch.set(db.collection('appData').doc('kategori'), { list: listKategori });
                                batch.delete(db.collection('dataPeserta').doc(nama));
                                batch.delete(db.collection('dataSurat').doc(nama));
                                await batch.commit();

                                localStorage.setItem('munaqosyah_listKategori', JSON.stringify(listKategori));
                                if (typeof window.saveLocalState === 'function') window.saveLocalState();
                                window.renderListKategoriEdit();
                                if (typeof openAlert === 'function') openAlert(`Kategori "${nama}" berhasil dihapus.`);
                                
                                if (typeof renderDashboardFilterOptions === 'function') renderDashboardFilterOptions();
                                if (typeof filterPeserta === 'function') filterPeserta();
                                if (typeof updateQuickStats === 'function') updateQuickStats();
                                if (typeof setupLaporanFilters === 'function') setupLaporanFilters();
                            } catch (e) {
                                console.error("Gagal menghapus kategori", e);
                                if (typeof openAlert === 'function') openAlert("Gagal menghapus kategori: " + e.message);
                            }
                        }

                        window.simpanKategori = async function() {
                            const originalNama = document.getElementById('input-kategori-original-nama').value;
                            const newNama = document.getElementById('input-kategori-baru').value.trim();
                            const tipe = document.getElementById('input-tipe-kategori').value;

                            if (!newNama) {
                                if (typeof openAlert === 'function') openAlert("Nama kategori tidak boleh kosong.");
                                return;
                            }

                            const isEdit = originalNama !== '';

                            if (!isEdit) {
                                if (listKategori.find(k => k.nama.toLowerCase() === newNama.toLowerCase())) {
                                    if (typeof openAlert === 'function') openAlert("Kategori dengan nama ini sudah ada.");
                                    return;
                                }
                                listKategori.push({ nama: newNama, tipe: tipe });
                                if (typeof dataPeserta !== 'undefined' && !dataPeserta[newNama]) dataPeserta[newNama] = [];
                                if (typeof dataSurat !== 'undefined' && !dataSurat[newNama]) dataSurat[newNama] = [];
                            } else {
                                if (newNama !== originalNama && listKategori.find(k => k.nama.toLowerCase() === newNama.toLowerCase())) {
                                    if (typeof openAlert === 'function') openAlert("Kategori dengan nama ini sudah ada.");
                                    return;
                                }
                                const idx = listKategori.findIndex(k => k.nama === originalNama);
                                if (idx !== -1) {
                                    listKategori[idx].nama = newNama;
                                    listKategori[idx].tipe = tipe;
                                }
                                
                                if (newNama !== originalNama) {
                                    if (typeof dataPeserta !== 'undefined') {
                                        dataPeserta[newNama] = dataPeserta[originalNama] || [];
                                        delete dataPeserta[originalNama];
                                        dataPeserta[newNama].forEach(p => p.kategori = newNama);
                                    }
                                    if (typeof dataSurat !== 'undefined') {
                                        dataSurat[newNama] = dataSurat[originalNama] || [];
                                        delete dataSurat[originalNama];
                                    }
                                }
                            }

                            try {
                                const batch = db.batch();
                                batch.set(db.collection('appData').doc('kategori'), { list: listKategori });
                                
                                if (isEdit && newNama !== originalNama) {
                                    batch.set(db.collection('dataPeserta').doc(newNama), { list: dataPeserta[newNama] || [] });
                                    batch.delete(db.collection('dataPeserta').doc(originalNama));

                                    batch.set(db.collection('dataSurat').doc(newNama), { list: dataSurat[newNama] || [] });
                                    batch.delete(db.collection('dataSurat').doc(originalNama));
                                } else if (!isEdit) {
                                    batch.set(db.collection('dataPeserta').doc(newNama), { list: [] });
                                    batch.set(db.collection('dataSurat').doc(newNama), { list: [] });
                                }

                                await batch.commit();

                                localStorage.setItem('munaqosyah_listKategori', JSON.stringify(listKategori));
                                if (typeof window.saveLocalState === 'function') window.saveLocalState();
                                
                                document.getElementById('input-kategori-original-nama').value = '';
                                document.getElementById('input-kategori-baru').value = '';
                                document.getElementById('input-tipe-kategori').value = 'standar';
                                document.getElementById('btn-simpan-kategori-icon').innerText = 'add';
                                
                                window.renderListKategoriEdit();
                                
                                if (typeof openAlert === 'function') openAlert(isEdit ? "Kategori berhasil diperbarui." : "Kategori berhasil ditambahkan.");
                                
                                if (typeof renderDashboardFilterOptions === 'function') renderDashboardFilterOptions();
                                if (typeof filterPeserta === 'function') filterPeserta();
                                if (typeof updateQuickStats === 'function') updateQuickStats();
                                if (typeof setupLaporanFilters === 'function') setupLaporanFilters();

                            } catch (e) {
                                console.error("Gagal menyimpan kategori", e);
                                if (typeof openAlert === 'function') openAlert("Gagal menyimpan kategori: " + e.message);
                            }
                        };

                        // --- Logika Kelola Akun Penguji (Reset Password) ---
                        const originalResetFormAkun = window.resetFormAkun;
                        window.resetFormAkun = function() {
                            if (typeof originalResetFormAkun === 'function') originalResetFormAkun();
                            const pwdInput = document.getElementById('input-akun-password');
                            if (pwdInput) pwdInput.value = '';
                        };

                        window.simpanAkunPenguji = async function() {
                            const username = document.getElementById('input-akun-username-original').value;
                            const newNama = document.getElementById('input-akun-nama').value.trim();
                            const pwdInput = document.getElementById('input-akun-password');
                            const newPassword = pwdInput ? pwdInput.value : '';

                            if (!newNama) {
                                if (typeof openAlert === 'function') openAlert("Nama lengkap tidak boleh kosong.");
                                return;
                            }
                            if (newPassword && newPassword.length < 6) {
                                if (typeof openAlert === 'function') openAlert("Password baru minimal harus 6 karakter.");
                                return;
                            }

                            const localUsersStr = localStorage.getItem('localUsers');
                            if (!localUsersStr) return;
                            const localUsers = JSON.parse(localUsersStr);

                            const uid = Object.keys(localUsers).find(k => localUsers[k].username === username);
                            if (!uid) return;

                            localUsers[uid].name = newNama;
                            if (newPassword) {
                                localUsers[uid].password = newPassword;
                            }

                            try {
                                if (typeof db !== 'undefined') {
                                    const updates = { name: newNama };
                                    if (newPassword) updates.password = newPassword;
                                    await db.collection('users').doc(uid).set(updates, { merge: true });
                                }
                                localStorage.setItem('localUsers', JSON.stringify(localUsers));
                                
                                if (typeof window.bukaModalAkunPenguji === 'function') window.bukaModalAkunPenguji(); // Segarkan list
                                if (typeof renderGuruPengujiDashboard === 'function') renderGuruPengujiDashboard();
                                
                                window.resetFormAkun();
                                if (typeof openAlert === 'function') openAlert("Akun penguji berhasil diperbarui.");
                            } catch (err) {
                                if (typeof openAlert === 'function') openAlert("Gagal memperbarui akun: " + err.message);
                            }
                        };
