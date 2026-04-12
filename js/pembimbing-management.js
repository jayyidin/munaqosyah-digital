window.renderListPembimbingEdit = function () {
    const container = document.getElementById('list-pembimbing-edit');
    if (!container) return;
    let html = '';
    if (typeof listPembimbing === 'undefined' || listPembimbing.length === 0) {
        html = '<p class="text-xs text-gray-400 italic text-center py-2">Belum ada pembimbing.</p>';
    } else {
        listPembimbing.forEach((k, index) => {
            const moveUpButton = `<button onclick="window.pindahUrutanPembimbing(${index}, -1)" ${index === 0 ? 'disabled' : ''} class="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors disabled:text-gray-300 disabled:cursor-not-allowed" title="Naikkan Urutan"><span class="material-symbols-outlined text-base">keyboard_arrow_up</span></button>`;
            const moveDownButton = `<button onclick="window.pindahUrutanPembimbing(${index}, 1)" ${index === listPembimbing.length - 1 ? 'disabled' : ''} class="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors disabled:text-gray-300 disabled:cursor-not-allowed" title="Turunkan Urutan"><span class="material-symbols-outlined text-base">keyboard_arrow_down</span></button>`;

            html += `
            <div class="flex items-center justify-between bg-gray-50 p-2 rounded-xl border border-gray-200 mb-2">
                <div class="pl-2">
                    <p class="font-bold text-teal-950 text-sm">${k}</p>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest">Urutan: ${index + 1}</p>
                </div>
                <div class="flex items-center gap-0.5">
                    ${moveUpButton}
                    ${moveDownButton}
                    <button onclick="window.editPembimbing('${k.replace(/'/g, "\\'")}')" class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><span class="material-symbols-outlined text-base">edit</span></button>
                    <button onclick="window.hapusPembimbing('${k.replace(/'/g, "\\'")}')" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><span class="material-symbols-outlined text-base">delete</span></button>
                </div>
            </div>`;
        });
    }
    container.innerHTML = html;
};

window.bukaModalPembimbing = function () {
    document.getElementById('input-pembimbing-original-nama').value = '';
    document.getElementById('input-pembimbing-baru').value = '';
    document.getElementById('btn-simpan-pembimbing-icon').innerText = 'add';
    document.getElementById('form-pembimbing-title').innerText = 'Tambah Pembimbing';
    window.renderListPembimbingEdit();
    document.getElementById('modal-pembimbing').classList.replace('hidden', 'flex');
};

window.tutupModalPembimbing = function () {
    document.getElementById('modal-pembimbing').classList.replace('flex', 'hidden');
    window.renderPembimbingDropdown();
};

window.renderPembimbingDropdown = function () {
    if (typeof listPembimbing === 'undefined') return;
    const optionsHtml = '<option value="">Pilih Pembimbing...</option>' + listPembimbing.map(k => `<option value="${k}">${k}</option>`).join('');
    
    const elementsToUpdate = ['tambah-pembimbing', 'edit-pembimbing', 'bulk-input-pembimbing'];
    elementsToUpdate.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const currentVal = el.value;
            el.innerHTML = optionsHtml;
            if (currentVal && listPembimbing.includes(currentVal)) {
                el.value = currentVal;
            }
        }
    });

    if (typeof filterPeserta === 'function' && document.getElementById('filter-tabel-pembimbing')) {
        const filterPembimbing = document.getElementById('filter-tabel-pembimbing');
        const currentFilter = filterPembimbing.value;
        filterPembimbing.innerHTML = '<option value="">Semua Pembimbing</option>' + listPembimbing.map(k => `<option value="${k}">${k}</option>`).join('');
        if (currentFilter && listPembimbing.includes(currentFilter)) {
             filterPembimbing.value = currentFilter;
        }
    }
    if (typeof renderLaporanPage === 'function' && document.getElementById('laporan-filter-pembimbing')) {
        const filterPembimbing = document.getElementById('laporan-filter-pembimbing');
        const currentFilter = filterPembimbing.value;
        filterPembimbing.innerHTML = '<option value="">Semua Pembimbing</option>' + listPembimbing.map(k => `<option value="${k}">${k}</option>`).join('');
        if (currentFilter && listPembimbing.includes(currentFilter)) {
             filterPembimbing.value = currentFilter;
        }
    }
};

window.pindahUrutanPembimbing = async function (index, direction) {
    if (typeof listPembimbing === 'undefined') return;
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || index >= listPembimbing.length || targetIndex >= listPembimbing.length) return;

    const newPembimbingList = [...listPembimbing];
    const temp = newPembimbingList[index];
    newPembimbingList[index] = newPembimbingList[targetIndex];
    newPembimbingList[targetIndex] = temp;

    listPembimbing.length = 0;
    newPembimbingList.forEach(k => listPembimbing.push(k));

    try {
        const batch = db.batch();
        batch.set(db.collection('appData').doc('pembimbing'), { list: listPembimbing });
        await batch.commit();
        localStorage.setItem('munaqosyah_listPembimbing', JSON.stringify(listPembimbing));
        window.renderListPembimbingEdit();
        window.renderPembimbingDropdown();
    } catch (e) {
        console.error('Error reordering pembimbing:', e);
        if (typeof openAlert === 'function') openAlert('Gagal mengubah urutan.');
    }
};

window.simpanPembimbing = async function () {
    const originalNama = document.getElementById('input-pembimbing-original-nama').value;
    const newNama = document.getElementById('input-pembimbing-baru').value.trim();

    if (!newNama) {
        if (typeof openAlert === 'function') openAlert('Nama pembimbing tidak boleh kosong.');
        return;
    }

    try {
        const batch = db.batch();
        
        if (typeof listPembimbing === 'undefined') window.listPembimbing = [];

        if (originalNama === '') {
            if (listPembimbing.includes(newNama)) {
                 if (typeof openAlert === 'function') openAlert('Nama pembimbing ini sudah ada.');
                 return;
            }
            listPembimbing.push(newNama);
        } else {
            if (newNama !== originalNama && listPembimbing.includes(newNama)) {
                 if (typeof openAlert === 'function') openAlert('Nama pembimbing ini sudah ada.');
                 return;
            }
            const idx = listPembimbing.indexOf(originalNama);
            if (idx > -1) {
                listPembimbing[idx] = newNama;
            }

            // Update in dataPeserta
            if (typeof dataPeserta !== 'undefined') {
                for (const key of Object.keys(dataPeserta)) {
                     let list = dataPeserta[key];
                     if (list && !Array.isArray(list) && Array.isArray(list.list)) list = list.list;
                     let needsUpdate = false;
                     if (Array.isArray(list)) {
                         list.forEach(p => {
                              if (p.pembimbing === originalNama) {
                                  p.pembimbing = newNama;
                                  needsUpdate = true;
                              }
                         });
                         if (needsUpdate) {
                             batch.set(db.collection('dataPeserta').doc(key), { list: list });
                         }
                     }
                }
            }
        }

        batch.set(db.collection('appData').doc('pembimbing'), { list: listPembimbing });
        await batch.commit();

        localStorage.setItem('munaqosyah_listPembimbing', JSON.stringify(listPembimbing));
        if (typeof window.saveLocalState === 'function') window.saveLocalState();

        document.getElementById('input-pembimbing-original-nama').value = '';
        document.getElementById('input-pembimbing-baru').value = '';
        document.getElementById('btn-simpan-pembimbing-icon').innerText = 'add';
        document.getElementById('form-pembimbing-title').innerText = 'Tambah Pembimbing';
        window.renderListPembimbingEdit();
        window.renderPembimbingDropdown();
        if (typeof openAlert === 'function') openAlert('Pembimbing berhasil disimpan.');

    } catch (err) {
        console.error("Gagal simpan pembimbing:", err);
        if (typeof openAlert === 'function') openAlert("Terjadi kesalahan: " + err.message);
    }
};

window.editPembimbing = function (nama) {
    document.getElementById('input-pembimbing-original-nama').value = nama;
    document.getElementById('input-pembimbing-baru').value = nama;
    document.getElementById('btn-simpan-pembimbing-icon').innerText = 'check';
    document.getElementById('form-pembimbing-title').innerText = 'Edit Pembimbing';
};

window.hapusPembimbing = async function (nama) {
    const msg = `Apakah Anda yakin ingin menghapus pembimbing '${nama}'? \n\nData peserta yang menggunakan pembimbing ini tidak akan terhapus, tetapi akan ditampilkan sebagai teks biasa.`;
    const proceed = async () => {
        const filtered = listPembimbing.filter(k => k !== nama);
        listPembimbing.length = 0;
        filtered.forEach(k => listPembimbing.push(k));
        
        try {
            const batch = db.batch();
            batch.set(db.collection('appData').doc('pembimbing'), { list: listPembimbing });
            await batch.commit();
            localStorage.setItem('munaqosyah_listPembimbing', JSON.stringify(listPembimbing));
            if (typeof window.saveLocalState === 'function') window.saveLocalState();
            window.renderListPembimbingEdit();
            window.renderPembimbingDropdown();
            if (typeof openAlert === 'function') openAlert('Pembimbing berhasil dihapus.');
        } catch(e) {
             console.error(e);
             if (typeof openAlert === 'function') openAlert('Gagal menghapus.');
        }
    };

    if (typeof openConfirm === 'function') {
        openConfirm(msg, (confirmed) => {
            if (confirmed) proceed();
        });
    } else {
        if (confirm(msg)) proceed();
    }
};

window.togglePembimbingMassal = function () {
    const manualForm = document.getElementById('form-pembimbing-manual');
    const massalForm = document.getElementById('form-pembimbing-massal');
    const toggleBtn = document.getElementById('btn-toggle-pembimbing-massal');
    
    if (massalForm.classList.contains('hidden')) {
        manualForm.classList.add('hidden');
        massalForm.classList.remove('hidden');
        toggleBtn.innerText = 'Input Manual';
        document.getElementById('form-pembimbing-title').innerText = 'Tambah Pembimbing (Massal)';
    } else {
        massalForm.classList.add('hidden');
        manualForm.classList.remove('hidden');
        toggleBtn.innerText = 'Tambah Massal';
        document.getElementById('form-pembimbing-title').innerText = 'Tambah Pembimbing';
    }
};

window.simpanPembimbingMassal = async function () {
    const inputText = document.getElementById('input-pembimbing-massal').value;
    if (!inputText.trim()) {
        if (typeof openAlert === 'function') openAlert("Data tidak boleh kosong");
        return;
    }
    
    if (typeof listPembimbing === 'undefined') window.listPembimbing = [];

    const newNames = inputText.split('\n').map(line => line.trim()).filter(line => line && !listPembimbing.includes(line));
    
    if (newNames.length === 0) {
        if (typeof openAlert === 'function') openAlert("Tidak ada pembimbing baru yang ditambahkan (mungkin sudah ada atau format salah).");
        return;
    }

    try {
        newNames.forEach(name => listPembimbing.push(name));
        
        const batch = db.batch();
        batch.set(db.collection('appData').doc('pembimbing'), { list: listPembimbing });
        await batch.commit();

        localStorage.setItem('munaqosyah_listPembimbing', JSON.stringify(listPembimbing));
        if (typeof window.saveLocalState === 'function') window.saveLocalState();

        document.getElementById('input-pembimbing-massal').value = '';
        window.togglePembimbingMassal();
        window.renderListPembimbingEdit();
        window.renderPembimbingDropdown();
        if (typeof openAlert === 'function') openAlert(`Berhasil menambahkan ${newNames.length} pembimbing.`);
    } catch(e) {
        console.error(e);
        if (typeof openAlert === 'function') openAlert('Gagal simpan massal.');
    }
};
