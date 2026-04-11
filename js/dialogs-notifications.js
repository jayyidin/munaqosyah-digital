// --- Dialogs & Notifications ---
let promptCallback = null, confirmCallback = null;
function openPrompt(t, d, c) { document.getElementById('prompt-title').innerText = t; document.getElementById('prompt-input').value = d; promptCallback = c; document.getElementById('modal-prompt').classList.replace('hidden', 'flex'); setTimeout(() => document.getElementById('prompt-input').focus(), 100); }
function closePrompt() { document.getElementById('modal-prompt').classList.replace('flex', 'hidden'); promptCallback = null; }
function submitPrompt() { if (promptCallback) promptCallback(document.getElementById('prompt-input').value); closePrompt(); }
function openConfirm(m, c) { document.getElementById('confirm-message').innerText = m; confirmCallback = c; document.getElementById('modal-confirm').classList.replace('hidden', 'flex'); }
function closeConfirm() { document.getElementById('modal-confirm').classList.replace('flex', 'hidden'); confirmCallback = null; }
function submitConfirm() { if (confirmCallback) confirmCallback(true); closeConfirm(); }
function openAlert(m) { document.getElementById('alert-message').innerText = m; document.getElementById('modal-alert').classList.replace('hidden', 'flex'); }
function closeAlert() { document.getElementById('modal-alert').classList.replace('flex', 'hidden'); }

function applyUserContext() {
    const userNameHeader = document.getElementById('user-name-header');
    const userUsernameHeader = document.getElementById('user-username-header');

    const avatarElements = [
        document.getElementById('user-avatar-header'),
        document.getElementById('user-avatar-laporan'),
        document.getElementById('user-avatar-pengaturan')
    ].filter(Boolean);

    const avatarSrc = currentUser.profilePicUrl || `https://ui-avatars.com/api/?name=${currentUser.name || 'P'}&background=003336&color=fff`;
    avatarElements.forEach(img => img.src = avatarSrc);

    if (userNameHeader) userNameHeader.innerText = currentUser.name;
    if (userUsernameHeader) userUsernameHeader.innerText = currentUser.username ? `@${currentUser.username}` : '';

    // Show/hide settings nav based on role
    const navPengaturan = document.getElementById('nav-pengaturan');
    if (navPengaturan) {
        navPengaturan.style.display = (currentUser.role === 'Admin Utama') ? 'flex' : 'none';
    }

    // Show/hide participant management buttons based on role
    const isAdmin = currentUser.role === 'Admin Utama';
    const btnTambahPeserta = document.getElementById('btn-buka-modal-tambah-peserta');
    const thAksi = document.getElementById('th-aksi-peserta');
    const bulkActionBar = document.getElementById('bulk-action-bar');

    if (btnTambahPeserta) btnTambahPeserta.style.display = isAdmin ? 'flex' : 'none';
    if (thAksi) thAksi.style.display = isAdmin ? '' : 'none';
    if (bulkActionBar && !isAdmin) {
        bulkActionBar.classList.replace('flex', 'hidden');
    }
}