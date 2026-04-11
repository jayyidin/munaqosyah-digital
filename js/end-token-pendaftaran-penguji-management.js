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

                            db.collection('users').get().then(snapshot => {
                                const users = {};
                                snapshot.forEach(doc => {
                                    users[doc.id] = doc.data();
                                });
                                const pengujiUsers = Object.values(users).filter(u => u.role === 'Guru Penguji');

                                if (pengujiUsers.length === 0) {
                                    container.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Belum ada akun penguji yang terdaftar.</p>';
                                    return;
                                }

                                let html = '';
                                pengujiUsers.sort((a, b) => a.name.localeCompare(b.name)).forEach(u => {
                                    if (u.role === 'Admin Utama') return;
                                    html += `
            <div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                <div>
                    <p class="text-sm font-bold text-teal-950 pl-2">${u.name}</p>
                    <p class="text-[10px] text-gray-500 pl-2">${u.username}</p>
                </div>
                <div class="flex items-center">
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
                            db.collection('usernames').doc(username.toLowerCase()).get()
                                .then(doc => {
                                    if (!doc.exists) throw new Error("Username tidak ditemukan.");
                                    const uid = doc.data().uid; // Di Firestore, value disimpan sebagai object
                                    return db.collection('users').doc(uid).get();
                                })
                                .then(userDoc => {
                                    if (!userDoc.exists) throw new Error("Data pengguna tidak ditemukan.");
                                    const user = userDoc.data();

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
                                const usernameDoc = await db.collection('usernames').doc(originalUsername.toLowerCase()).get();
                                if (!usernameDoc.exists) throw new Error("Pengguna tidak ditemukan.");
                                const uid = usernameDoc.data().uid;

                                await db.collection('users').doc(uid).update({ name: name });

                                // openAlert(`Nama untuk ${originalUsername} berhasil diperbarui.`); // Dihilangkan sesuai permintaan
                                renderAkunPengujiList();
                                renderGuruPengujiDashboard(); // Refresh dashboard list of examiners
                                resetFormAkun();
                            } catch (error) {
                                openAlert(`Gagal memperbarui akun: ${error.message}`);
                                console.error("Error updating user name:", error);
                            }
                        }

                        function hapusAkunPenguji(username) {
                            openConfirm(`Anda yakin ingin menghapus akun penguji "${username}"? Tindakan ini akan menghapus data mereka dari database, tetapi TIDAK akan menghapus kredensial login mereka. Mereka tidak akan bisa login ke aplikasi ini lagi.`, (confirmed) => {
                                if (confirmed) {
                                    db.collection('usernames').doc(username.toLowerCase()).get().then(doc => {
                                        if (!doc.exists) {
                                            throw new Error(`Username ${username} tidak ditemukan.`);
                                        }
                                        const uid = doc.data().uid;
                                        return Promise.all([
                                            db.collection('users').doc(uid).delete(),
                                            db.collection('usernames').doc(username.toLowerCase()).delete()
                                        ]);
                                    }).then(() => {
                                        openAlert(`Akun untuk ${username} berhasil dihapus dari database.`);
                                        renderAkunPengujiList();
                                        renderGuruPengujiDashboard(); // Refresh dashboard list of examiners
                                    }).catch(error => {
                                        openAlert(`Gagal menghapus akun: ${error.message}`);
                                        console.error("Error deleting user db entries:", error);
                                    });
                                }
                            });
                        }

                        let importPreviewData = [];

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
                            document.getElementById('btn-pratinjau-impor').classList.toggle('hidden', isManual);
                            document.getElementById('btn-batal-pratinjau').classList.add('hidden');
                            document.getElementById('btn-simpan-impor-final').classList.add('hidden');

                            if (!isManual) {
                                resetPratinjauImpor();
                            }
                        }

                        function resetPratinjauImpor() {
                            importPreviewData = [];
                            const step1 = document.getElementById('import-step-1');
                            const step2 = document.getElementById('import-step-2');
                            const previewTbody = document.getElementById('import-preview-tbody');
                            const stats = document.getElementById('import-stats');
                            const finalButton = document.getElementById('btn-simpan-impor-final');
                            const previewButton = document.getElementById('btn-pratinjau-impor');
                            const cancelPreviewButton = document.getElementById('btn-batal-pratinjau');

                            if (step1) step1.classList.remove('hidden');
                            if (step2) step2.classList.add('hidden');
                            if (previewTbody) previewTbody.innerHTML = '';
                            if (stats) stats.innerText = '0 Valid, 0 Error';
                            if (finalButton) {
                                finalButton.classList.add('hidden');
                                finalButton.disabled = true;
                            }
                            if (previewButton) previewButton.classList.remove('hidden');
                            if (cancelPreviewButton) cancelPreviewButton.classList.add('hidden');
                        }

                        function pratinjauImpor() {
                            const textarea = document.getElementById('import-textarea');
                            const text = textarea.value.trim();
                            const semester = document.getElementById('import-semester').value;
                            const tanggalUjian = document.getElementById('import-tanggal-ujian').value;

                            if (!text) {
                                openAlert("Kolom isian tidak boleh kosong. Salin data dari Excel dan tempel di sini.");
                                return;
                            }

                            if (!semester) {
                                openAlert("Semester untuk peserta impor wajib dipilih.");
                                return;
                            }

                            if (!tanggalUjian && appSettings.examDates && appSettings.examDates.length > 0) {
                                openAlert("Tanggal ujian untuk peserta impor wajib dipilih.");
                                return;
                            }

                            const lines = text.split('\n').filter(line => line.trim() !== '');
                            const previewTbody = document.getElementById('import-preview-tbody');
                            const stats = document.getElementById('import-stats');
                            let validCount = 0;
                            let errorCount = 0;
                            let html = '';

                            importPreviewData = lines.map((line, index) => {
                                const cols = line.split('\t');
                                if (cols.length < 3) {
                                    return {
                                        lineNumber: index + 1,
                                        status: 'error',
                                        error: 'Kurang dari 3 kolom',
                                        rawNama: cols[0] || '',
                                        rawKelas: cols[1] || '',
                                        rawKategori: cols[2] || ''
                                    };
                                }

                                const [namaRaw, kelasRaw, kategoriRaw] = cols.map(c => c.trim());
                                if (!namaRaw || !kelasRaw || !kategoriRaw) {
                                    return {
                                        lineNumber: index + 1,
                                        status: 'error',
                                        error: 'Data tidak lengkap',
                                        rawNama: namaRaw || '',
                                        rawKelas: kelasRaw || '',
                                        rawKategori: kategoriRaw || ''
                                    };
                                }

                                const matchedKelas = findBestMatch(kelasRaw, listKelas);
                                const matchedKategori = findBestMatch(kategoriRaw, listKategori.map(k => k.nama));

                                if (!matchedKelas || !matchedKategori) {
                                    return {
                                        lineNumber: index + 1,
                                        status: 'error',
                                        error: !matchedKelas ? `Kelas "${kelasRaw}" tidak ditemukan` : `Kategori "${kategoriRaw}" tidak ditemukan`,
                                        rawNama: namaRaw,
                                        rawKelas: kelasRaw,
                                        rawKategori: kategoriRaw
                                    };
                                }

                                return {
                                    lineNumber: index + 1,
                                    status: 'valid',
                                    nama: namaRaw,
                                    kelas: matchedKelas,
                                    kategori: matchedKategori,
                                    semester,
                                    tanggalUjian
                                };
                            });

                            importPreviewData.forEach(item => {
                                const isValid = item.status === 'valid';
                                if (isValid) validCount++;
                                else errorCount++;

                                const tanggalUjianFormatted = item.tanggalUjian
                                    ? new Date(item.tanggalUjian + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : '-';

                                html += `
        <tr class="${isValid ? 'bg-white' : 'bg-red-50'}">
            <td class="px-4 py-3 text-center">
                <span class="material-symbols-outlined text-base ${isValid ? 'text-emerald-600' : 'text-red-500'}">${isValid ? 'check_circle' : 'error'}</span>
            </td>
            <td class="px-4 py-3 text-xs font-semibold text-teal-950">${isValid ? item.nama : (item.rawNama || '-')}</td>
            <td class="px-4 py-3 text-xs text-gray-600">${isValid ? item.kelas : (item.rawKelas || '-')}</td>
            <td class="px-4 py-3 text-xs text-gray-600">${isValid ? item.kategori : (item.rawKategori || '-')}</td>
            <td class="px-4 py-3 text-xs text-gray-600">${tanggalUjianFormatted}</td>
        </tr>
        ${!isValid ? `<tr class="bg-red-50 border-b border-red-100"><td></td><td colspan="4" class="px-4 pb-3 text-[11px] text-red-600">Baris ${item.lineNumber}: ${item.error}</td></tr>` : ''}`;
                            });

                            previewTbody.innerHTML = html;
                            stats.innerText = `${validCount} Valid, ${errorCount} Error`;

                            document.getElementById('import-step-1').classList.add('hidden');
                            document.getElementById('import-step-2').classList.remove('hidden');
                            document.getElementById('btn-pratinjau-impor').classList.add('hidden');
                            document.getElementById('btn-batal-pratinjau').classList.remove('hidden');
                            document.getElementById('btn-simpan-impor-final').classList.remove('hidden');
                            document.getElementById('btn-simpan-impor-final').disabled = validCount === 0;
                        }

                        function prosesImporFinal() {
                            const validRows = importPreviewData.filter(item => item.status === 'valid');
                            if (validRows.length === 0) {
                                openAlert("Tidak ada data valid untuk diimpor.");
                                return;
                            }

                            const semester = document.getElementById('import-semester').value;
                            const allCurrentIds = Object.values(dataPeserta).flat().map(p => p.id);
                            const warna = ["bg-blue-100 text-blue-700", "bg-teal-100 text-teal-700", "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700", "bg-red-100 text-red-700"];

                            const keysToUpdate = new Set();
                            validRows.forEach(p => {
                                const id = generateUniqueId(p.semester, p.kategori, allCurrentIds);
                                allCurrentIds.push(id);
                                const inisial = p.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                const randomWarna = warna[Math.floor(Math.random() * warna.length)];
                                
                                const key = `${p.semester}_${p.kategori}`;
                                if (!dataPeserta[key]) dataPeserta[key] = [];
                                
                                dataPeserta[key].push({ id, inisial, warna: randomWarna, nama: p.nama, kelas: p.kelas, pembimbing: "Belum Ditentukan", tanggalUjian: p.tanggalUjian || null });
                                keysToUpdate.add(key);
                            });

                            const batch = db.batch();
                            keysToUpdate.forEach(key => {
                                batch.set(db.collection('dataPeserta').doc(key), { list: dataPeserta[key] });
                            });
                            batch.commit()
                                .then(() => {
                                    document.getElementById('import-textarea').value = '';
                                    resetPratinjauImpor();
                                    tutupModalTambahPeserta();
                                    renderTablePeserta();
                                })
                                .catch(error => openAlert("Gagal menyimpan hasil impor. Error: " + error.message));
                        }

                        function bukaModalTambahPeserta() {
                            if (currentUser.role !== 'Admin Utama') {
                                openAlert("Hanya Admin Utama yang dapat menambah data peserta.");
                                return;
                            }

                            switchTabTambah('manual');
                            resetPratinjauImpor();

                            // Populate semester dropdowns
                            const semesterSelectManual = document.getElementById('tambah-semester');
                            const semesterSelectImport = document.getElementById('import-semester');
                            if (semesterSelectManual) semesterSelectManual.innerHTML = listSemester.map(s => `<option value="${s}">${s}</option>`).join('');
                            if (semesterSelectImport) semesterSelectImport.innerHTML = listSemester.map(s => `<option value="${s}">${s}</option>`).join('');


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
                        function tutupModalTambahPeserta() {
                            document.getElementById('modal-tambah-peserta').classList.replace('flex', 'hidden');
                            resetPratinjauImpor();
                        }

                        function simpanPesertaBaru() {
                            const nama = document.getElementById('tambah-nama').value.trim();
                            const semester = document.getElementById('tambah-semester').value;
                            const kategori = document.getElementById('tambah-kategori').value;
                            const kelas = document.getElementById('tambah-kelas').value;
                            const tanggalUjian = document.getElementById('tambah-tanggal-ujian').value;
                            const pembimbing = document.getElementById('tambah-pembimbing').value.trim();
                            if (!nama || !kelas || !kategori || !tanggalUjian || !semester) {
                                openAlert("Semua kolom (Nama, Semester, Kelas, Kategori, Tanggal) wajib diisi.");
                                return;
                            }

                            const id = generateUniqueId(semester, kategori);

                            const inisial = nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                            const warna = ["bg-blue-100 text-blue-700", "bg-teal-100 text-teal-700", "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700", "bg-red-100 text-red-700"];
                            const randomWarna = warna[Math.floor(Math.random() * warna.length)];

                            const newPeserta = {
                                id,
                                inisial, warna: randomWarna, nama, kelas,
                                pembimbing: pembimbing || "Belum Ditentukan",
                                tanggalUjian: tanggalUjian || null
                            };

                            const key = `${semester}_${kategori}`;
                            const currentPesertaList = dataPeserta[key] || [];
                            const newPesertaList = [...currentPesertaList, newPeserta];
                            dataPeserta[key] = newPesertaList;

                            db.collection('dataPeserta').doc(key).set({ list: newPesertaList })
                                .then(() => {
                                    tutupModalTambahPeserta();
                                    renderTablePeserta(); // Refresh the participant table
                                    // UI will be updated by the 'on' listener.
                                })
                                .catch(error => openAlert("Gagal menyimpan peserta baru. Error: " + error.message));
                        }

                        function generateUniqueId(semester, kategori, existingIds = []) {
                            // Create a prefix from the category name, e.g., "Juz 30 (Amma)" -> "J30"
                            const semesterPrefix = (semester.match(/\d+|[A-Z]/g) || []).join('').substring(0, 4);
                            const prefix = (kategori.match(/\d+|[A-Z]/g) || []).join('');
                            const now = new Date();
                            const year = now.getFullYear().toString().slice(-2);
                            const month = (now.getMonth() + 1).toString().padStart(2, '0');
                            const fullPrefix = `${semesterPrefix}${prefix}-${year}${month}-`;

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
                            const semester = document.getElementById('import-semester').value;
                            const tanggalUjian = document.getElementById('import-tanggal-ujian').value;

                            if (!text) {
                                openAlert("Kolom isian tidak boleh kosong. Salin data dari Excel dan tempel di sini.");
                                return;
                            }

                            if (!semester) {
                                openAlert("Semester untuk peserta impor wajib dipilih.");
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

                                newPesertaList.push({ nama, kelas: matchedKelas, kategori: matchedKategori, semester: semester });
                            });

                            if (newPesertaList.length > 0) {
                                const allCurrentIds = Object.values(dataPeserta).flat().map(p => p.id);
                                const warna = ["bg-blue-100 text-blue-700", "bg-teal-100 text-teal-700", "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700", "bg-red-100 text-red-700"];

                                newPesertaList.forEach(p => {
                                    const id = generateUniqueId(p.semester, p.kategori, allCurrentIds);
                                    allCurrentIds.push(id);
                                    const inisial = p.nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                                    const randomWarna = warna[Math.floor(Math.random() * warna.length)];

                                    const key = `${p.semester}_${p.kategori}`;
                                    if (!dataPeserta[key]) dataPeserta[key] = [];
                                    
                                    dataPeserta[key].push({ id, inisial, warna: randomWarna, nama: p.nama, kelas: p.kelas, pembimbing: "Belum Ditentukan", tanggalUjian: tanggalUjian || null });
                                    berhasil++;
                                });

                            const batch = db.batch();
                            newPesertaList.forEach(p => {
                                const key = `${p.semester}_${p.kategori}`;
                                batch.set(db.collection('dataPeserta').doc(key), { list: dataPeserta[key] });
                            });
                            batch.commit()
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
                                openAlert(errorMessage); // Pesan error tetap ditampilkan
                            } else if (berhasil > 0) {
                                // openAlert(`Impor berhasil! ${berhasil} peserta baru telah ditambahkan.`); // Dihilangkan sesuai permintaan
                            } else {
                                // This case handles when there are no lines to import.
                                // No message needed, or a specific one if desired.
                            }
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
