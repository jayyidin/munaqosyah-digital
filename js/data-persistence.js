// --- Data Persistence ---

window.saveLocalState = function() {
    const appState = {
        statePenilaian: typeof statePenilaian !== 'undefined' ? statePenilaian : {},
        dataPeserta: typeof dataPeserta !== 'undefined' ? dataPeserta : {},
        listKategori: typeof listKategori !== 'undefined' ? listKategori : [],
        activityLog: typeof activityLog !== 'undefined' ? activityLog : [],
        listKelas: typeof listKelas !== 'undefined' ? listKelas : [],
        dataSurat: typeof dataSurat !== 'undefined' ? dataSurat : {}
    };
    localStorage.setItem('munaqosyahState', JSON.stringify(appState));
};

function seedInitialData() {
    console.log("Menyiapkan struktur awal Firestore...");
    db.collection('appData').doc('masterData').set({
        listKategori: typeof listKategori !== 'undefined' ? listKategori : [],
        listKelas: typeof listKelas !== 'undefined' ? listKelas : [],
        dataSurat: typeof dataSurat !== 'undefined' ? dataSurat : {}
    }, { merge: true });

    if (typeof dataSurat !== 'undefined') {
        const batch = db.batch();
        Object.keys(dataSurat).forEach(kat => {
            batch.set(db.collection('dataSurat').doc(kat), { list: dataSurat[kat] });
        });
        batch.commit().catch(e => console.error("Gagal seed dataSurat", e));
    }
    window.saveLocalState();
}

let initCounter = 0;
const requiredInits = 6; // Menunggu 6 koleksi utama dimuat

function checkInit(loader) {
    initCounter++;
    if (initCounter >= requiredInits) {
        if (!window.isAppInitialized) {
            if (typeof initializeAppUI === 'function') initializeAppUI();
            window.isAppInitialized = true;
            if (loader) {
                loader.classList.remove('opacity-100');
                loader.classList.add('opacity-0', 'pointer-events-none');
                setTimeout(() => {
                    loader.classList.replace('bg-surface', 'bg-white/50');
                    loader.classList.add('backdrop-blur-sm');
                }, 300);
            }
        } else {
            if (typeof refreshRealtimeUI === 'function') refreshRealtimeUI();
        }
    }
}

function loadState() {
    const loader = document.getElementById('loading-overlay');
    if (loader && !window.isAppInitialized) {
        loader.classList.remove('opacity-0', 'pointer-events-none');
        loader.classList.add('opacity-100');
    }

    // Penanganan jika Firebase memblokir akses (Rules) atau sedang offline
    const handleSnapshotError = (error) => {
        console.error("[FIRESTORE] Gagal memuat data:", error.message);
        const savedState = localStorage.getItem('munaqosyahState');
        if (savedState) {
            try {
                const appState = JSON.parse(savedState);
                if (appState.statePenilaian) statePenilaian = appState.statePenilaian;
                if (appState.dataPeserta) dataPeserta = appState.dataPeserta;
                if (appState.listKategori) listKategori = appState.listKategori;
                if (appState.activityLog) activityLog = appState.activityLog;
                if (appState.listKelas) listKelas = appState.listKelas;
                if (appState.dataSurat) dataSurat = appState.dataSurat;
            } catch(err) {}
        }
        checkInit(loader);
    };

        try {
            // 1. Dengarkan Master Data
            db.collection('appData').doc('masterData').onSnapshot(doc => {
                if(doc.exists) {
                    const data = doc.data();
                    if(data.listKategori) listKategori = data.listKategori;
                    if(data.listKelas) listKelas = data.listKelas;
                    if(data.dataSurat) dataSurat = data.dataSurat;
                } else {
                    seedInitialData();
                }
                checkInit(loader);
            }, handleSnapshotError);

            // 2. Dengarkan Data Peserta
            db.collection('dataPeserta').onSnapshot(snapshot => {
                dataPeserta = {};
                snapshot.forEach(doc => {
                    dataPeserta[doc.id] = doc.data().list || [];
                });
                checkInit(loader);
            }, handleSnapshotError);

            // 3. Dengarkan State Penilaian
            db.collection('statePenilaian').onSnapshot(snapshot => {
                statePenilaian = {};
                snapshot.forEach(doc => {
                    // Tangani array khusus untuk ujian tipe 'lembar'
                    statePenilaian[doc.id] = doc.data().data !== undefined ? doc.data().data : doc.data();
                });
                checkInit(loader);
            }, handleSnapshotError);

            // 4. Dengarkan Activity Log
            db.collection('appData').doc('activityLog').onSnapshot(doc => {
                if(doc.exists) {
                    activityLog = doc.data().log || [];
                }
                checkInit(loader);
            }, handleSnapshotError);

            // 5. Dengarkan Settings
            db.collection('appData').doc('settings').onSnapshot(doc => {
                if(doc.exists) {
                    const data = doc.data();
                    if (data.examStartDate && !data.examDates) {
                        data.examDates = [data.examStartDate];
                        delete data.examStartDate;
                    }
                    appSettings = { ...appSettings, ...data };
                    localStorage.setItem('munaqosyahSettings', JSON.stringify(appSettings));
                    if (typeof applySettings === 'function') applySettings(appSettings);
                }
                checkInit(loader);
            }, handleSnapshotError);

    // 6. Dengarkan Data Surat / Materi Ujian
    db.collection('dataSurat').onSnapshot(snapshot => {
        dataSurat = {};
        snapshot.forEach(doc => {
            dataSurat[doc.id] = doc.data().list || [];
        });
        checkInit(loader);
    }, handleSnapshotError);

        } catch(e) {
            console.error("Gagal inisialisasi Firestore", e);
            // Fallback memuat dari cache localStorage jika error/offline pertama kali
            const savedState = localStorage.getItem('munaqosyahState');
            if (savedState) {
                try {
                    const appState = JSON.parse(savedState);
                    statePenilaian = appState.statePenilaian || {};
                    dataPeserta = appState.dataPeserta || {};
                    listKategori = appState.listKategori || listKategori;
                    activityLog = appState.activityLog || [];
                    listKelas = appState.listKelas || [];
                    dataSurat = appState.dataSurat || dataSurat;
                } catch(err) {}
            }
            // Paksa penyelesaian loading UI
            for(let i=0; i<requiredInits; i++) checkInit(loader);
        }
}

function saveSettings() {
    localStorage.setItem('munaqosyahSettings', JSON.stringify(appSettings));
}

function loadSettings(callback) {
    const savedSettings = localStorage.getItem('munaqosyahSettings');
    if (savedSettings) {
        try {
            const loaded = JSON.parse(savedSettings);
            if (loaded.examStartDate && !loaded.examDates) {
                loaded.examDates = [loaded.examStartDate];
                delete loaded.examStartDate;
            }
            appSettings = { ...appSettings, ...loaded };
        } catch(e) {}
        }
    saveSettings();
        if (callback) callback();
}
