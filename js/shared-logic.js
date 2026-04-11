// --- SHARED LOGIC (Refactored to break circular dependencies) ---

function getPredicate(score) {
    if (score >= 90) return { text: 'Mumtaz', color: 'text-orange-500', icon: 'stars' };
    if (score >= 80) return { text: 'Jayyid Jiddan', color: 'text-teal-600', icon: '' };
    if (score >= 70) return { text: 'Jayyid', color: 'text-blue-600', icon: '' };
    if (score >= 60) return { text: 'Maqbul', color: 'text-gray-500', icon: '' };
    return { text: 'Rasib', color: 'text-red-600', icon: '' };
}

function findKategoriOfSurah(surahNo) {
    for (const kat in dataSurat) {
        const sList = dataSurat[kat];
        // Handle both array and object structures for sList
        const items = Array.isArray(sList) ? sList : Object.values(sList).flat();
        if (items.some(s => s && String(s.no) === String(surahNo))) {
            return kat;
        }
    }
    return null;
}

function getStatusPeserta(studentId, kategori) {
    const items = dataSurat[kategori]; if (!items) return { text: "Belum Ujian", color: "bg-gray-100", progress: 0, completed: 0, total: 0 };
    let total = 0; const nos = [];
    if (Array.isArray(items)) {
        const validItems = items.filter(i => i && i.no);
        total = validItems.length;
        nos.push(...validItems.map(i => String(i.no)));
    } else {
        Object.values(items).forEach(seg => {
            if (Array.isArray(seg)) {
                const validSeg = seg.filter(i => i && i.no);
                total += validSeg.length;
                nos.push(...validSeg.map(i => String(i.no)));
            }
        });
    }
    let comp = 0;
    if (typeof statePenilaian !== 'undefined' && statePenilaian) {
        Object.keys(statePenilaian).forEach(k => { if (k.startsWith(studentId + '_') && nos.includes(k.split('_')[1])) comp++; });
    }
    if (comp === 0) return { text: "Belum Ujian", color: "text-gray-500 border-gray-200", progress: 0, completed: 0, total: total };
    if (comp >= total && total > 0) return { text: "Selesai", color: "text-emerald-700 border-emerald-200 bg-emerald-50", progress: 100, completed: comp, total: total };
    return { text: "Sedang Ujian", color: "text-amber-700 border-amber-200 bg-amber-50", progress: Math.round(comp / total * 100), completed: comp, total: total };
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
                progress: status.progress,
                totalNilai,
                jumlahPenilaian
            });
        });
    });
    return allStudents;
}