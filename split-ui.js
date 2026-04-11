const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexFile, 'utf-8');

const viewsDir = path.join(__dirname, 'views');
if (!fs.existsSync(viewsDir)) {
    fs.mkdirSync(viewsDir);
}

// 1. Ekstrak masing-masing halaman View
const views = ['dashboard', 'peserta', 'ujian', 'penilaian-detail', 'laporan', 'pengaturan'];

views.forEach(view => {
    const startMarker = `<div id="view-${view}"`;
    const startIdx = html.indexOf(startMarker);
    if (startIdx === -1) return;
    
    const headerStart = html.indexOf('<header', startIdx);
    const mainEnd = html.indexOf('</main>', headerStart);
    
    if (headerStart !== -1 && mainEnd !== -1) {
        const endIdx = mainEnd + 7; // Sertakan tag </main>
        let content = html.substring(headerStart, endIdx);
        
        // PERBAIKI BUG: Matikan hover dropdown logout agar tidak nyangkut di depan pada layar HP
        content = content.replace(/hidden group-hover:block/g, 'hidden md:group-hover:block');
        
        fs.writeFileSync(path.join(viewsDir, `${view}.html`), content);
        
        // Hapus isi konten dari index.html untuk membuat wadah komponen kosong
        html = html.substring(0, headerStart) + '\n    ' + html.substring(endIdx);
    }
});

// 2. Ekstrak Modals & Slide-over
const modalStartMarker = '<div id="modals-container">\n';
const modalEndMarker = '\n        </div>\n\n        <!-- Mobile Bottom Navigation -->';
const mStart = html.indexOf(modalStartMarker);
const mEnd = html.indexOf(modalEndMarker);

if (mStart !== -1 && mEnd !== -1) {
    const innerStart = mStart + modalStartMarker.length;
    const modalsContent = html.substring(innerStart, mEnd).trim();
    fs.writeFileSync(path.join(viewsDir, 'modals.html'), modalsContent);
    
    // Hapus kode modals dari index.html
    html = html.substring(0, innerStart) + '        ' + html.substring(mEnd);
}

// 3. PERBAIKI BUG: Kembalikan class 'flex' pada Sidebar agar layout Tombol Logout normal
html = html.replace(
    'class="w-64 h-full flex-col py-4 px-4 bg-slate-50',
    'class="w-64 h-full flex flex-col py-4 px-4 bg-slate-50'
);

// Tulis ulang index.html yang sudah dirampingkan ke dalam 100 baris saja
fs.writeFileSync(indexFile, html);

console.log('✅ PROSES SELESAI!');
console.log('1. index.html berhasil dipecah menjadi multi-file di dalam folder views/.');
console.log('2. Bug tombol logout yang terus muncul di layar HP telah diperbaiki.');