document.addEventListener('DOMContentLoaded', () => {

    // Function to load app settings (needed for registration token)
    function loadAppSettings() {
        const savedSettings = localStorage.getItem('munaqosyahSettings');
        let appSettings = { registrationToken: null, schoolName: '' }; // Default
            if (savedSettings && savedSettings !== 'undefined') {
            try {
                appSettings = JSON.parse(savedSettings);
            } catch (e) {
                console.error("Error parsing munaqosyahSettings from localStorage:", e);
            }
        }
        return appSettings;
    }

    function loadFirebaseSettings(callback) {
        callback(loadAppSettings());
    }

    // --- Apply App Name and Logo on Login Page ---
    (() => {
        const appNameEl = document.getElementById('app-name-login');
        const schoolNameEl = document.getElementById('school-name-login');
        const logoImg = document.getElementById('app-logo-login');
        const logoIcon = document.getElementById('app-logo-icon-login');

        const applyLoginSettings = (settings) => {
            if (!settings) return;

            let title = "Login";
            if (appNameEl && typeof settings.appName === 'string') {
                // Ganti <br> dengan spasi untuk memastikan judul selalu satu baris
                const singleLineAppName = settings.appName.replace(/<br\s*\/?>/gi, ' ');
                appNameEl.innerHTML = singleLineAppName;
                title = singleLineAppName;
            }

            if (schoolNameEl && settings.schoolName) {
                schoolNameEl.innerText = settings.schoolName;
                if (title !== "Login") title += ` - ${settings.schoolName}`;
            }
            document.title = title;

            if (logoImg && logoIcon && settings.logoUrl) {
                logoImg.src = settings.logoUrl;
                logoImg.classList.remove('hidden');
                logoIcon.classList.add('hidden');
            }
        };

        loadFirebaseSettings(settings => {
            applyLoginSettings(settings);
        });
    })();
    // Views
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');

    // Forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Links to switch views
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    // Login Form Elements
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('toggle-password');
    const loginErrorDiv = document.getElementById('login-error');

    // Register Form Elements
    const registerErrorDiv = document.getElementById('register-error');
    const registerTokenInput = document.getElementById('register-token'); // New input for token
    const registerNameInput = document.getElementById('register-name');
    const autoUsernameContainer = document.getElementById('auto-username-container');
    const autoUsernameDisplay = document.getElementById('auto-username-display');
    const modalSuccess = document.getElementById('modal-success');
    const btnCloseSuccessModal = document.getElementById('btn-close-success-modal');

    // Logika untuk toggle visibilitas password
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            // Toggle the type attribute
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Toggle ikon mata
            const icon = togglePassword.querySelector('span');
            icon.textContent = type === 'password' ? 'visibility' : 'visibility_off';
        });
    }

    // Menangani proses login saat form di-submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Mencegah form mengirim data secara tradisional

            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const submitButton = loginForm.querySelector('button[type="submit"]');

            // Bersihkan error sebelumnya
            if (loginErrorDiv) {
                loginErrorDiv.classList.add('hidden');
                loginErrorDiv.textContent = '';
            }

            // 1. Validasi Input (Client-Side)
            if (!username || !password) {
                showError('Username dan password tidak boleh kosong.');
                return;
            }

            // 2. Tampilkan Status Loading pada Tombol
            const originalButtonHTML = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `<span class="loader"></span> Mengautentikasi...`;

            let isSuccess = false;
            try {
                // 3. Simulasi Panggilan API ke Backend
                // Di aplikasi nyata, ganti ini dengan `fetch` ke endpoint login Anda
                const loginSuccessful = await fakeApiLogin(username, password);

                if (loginSuccessful) {
                    // 4. Login Berhasil - Redirect will be handled by onAuthStateChanged in script.js
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('currentView', 'dashboard');
                    localStorage.removeItem('currentStudentId');
                    localStorage.removeItem('currentKategori');
                    window.location.replace('index.html');
                    isSuccess = true;
                } else {
                    // 5. Login Gagal (Kredensial Salah)
                    // Error is shown inside fakeApiLogin now
                }
            } catch (error) {
                // This catch is now for unexpected errors, as fakeApiLogin handles auth errors internally.
                if (error.code === 'auth/network-request-failed') {
                    showError('Terjadi kesalahan. Periksa koneksi internet Anda.');
                }
                // 6. Menangani Error Jaringan atau Server
                console.error('Login error:', error);
                showError('Terjadi kesalahan pada server. Silakan coba lagi nanti.');
            } finally {
                // 7. Kembalikan Tombol ke State Semula
                if (!isSuccess) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonHTML;
                }
            }
        });
    }

    // Menangani proses pendaftaran saat form di-submit
    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const name = document.getElementById('register-name').value.trim();
            const password = document.getElementById('register-password').value;
            const passwordConfirm = document.getElementById('register-password-confirm').value;
            const registrationToken = registerTokenInput.value.trim(); // Get token from input
            const submitButton = registerForm.querySelector('button[type="submit"]');

            // Generate username from full name
            const generatedUsername = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

            if (registerErrorDiv) {
                registerErrorDiv.classList.add('hidden');
                registerErrorDiv.textContent = '';
            }

            if (!name || !password || !passwordConfirm || !registrationToken) {
                showRegisterError('Semua kolom wajib diisi.');
                return;
            }
            if (!generatedUsername) {
                showRegisterError('Nama Lengkap tidak valid untuk membuat username otomatis.');
                return;
            }
            if (password !== passwordConfirm) {
                showRegisterError('Konfirmasi kata sandi tidak cocok.');
                return;
            }
            if (password.length < 6) {
                showRegisterError('Kata sandi minimal harus 6 karakter.');
                return;
            }

            const originalButtonHTML = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `<span class="loader"></span> Mendaftarkan...`;

            // Load app settings from Firebase to get the required registration token
            loadFirebaseSettings(appSettings => {
                // Validate registration token
                if (!appSettings.registrationToken || registrationToken !== appSettings.registrationToken) {
                    showRegisterError('Token pendaftaran tidak valid.');
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonHTML;
                    return;
                }

                // Proceed with registration
                fakeApiRegister(name, generatedUsername, password)
                    .then(result => {
                        if (result.success) {
                            // Tampilkan pop-up sukses profesional
                            if (modalSuccess) {
                                modalSuccess.classList.replace('hidden', 'flex');
                            } else {
                                alert('Pendaftaran berhasil! Akun Anda telah dibuat. Silakan kembali ke halaman login untuk masuk.');
                                switchToLoginView();
                            }
                        }
                    }).catch(error => {
                        showRegisterError(error.message);
                    }).finally(() => {
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalButtonHTML;
                    });
            });
        });
    }

    // Menampilkan username yang dibuat otomatis saat pengguna mengetik nama
    if (registerNameInput && autoUsernameContainer && autoUsernameDisplay) {
        registerNameInput.addEventListener('input', () => {
            const name = registerNameInput.value.trim();
            if (name) {
                const generatedUsername = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
                autoUsernameDisplay.textContent = generatedUsername;
                autoUsernameContainer.classList.remove('hidden');
            } else {
                autoUsernameContainer.classList.add('hidden');
            }
        });
    }

    // Menutup modal sukses pendaftaran dan mengarahkan ke form login
    if (btnCloseSuccessModal) {
        btnCloseSuccessModal.addEventListener('click', () => {
            modalSuccess.classList.replace('flex', 'hidden');
            switchToLoginView();
        });
    }

    // Event listeners untuk beralih view
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchToRegisterView();
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchToLoginView();
    });

    function switchToRegisterView() {
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
    }

    function switchToLoginView() {
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
        if (registerForm) registerForm.reset(); // Bersihkan form registrasi
    }

    function showError(message) {
        if (!loginErrorDiv) return;
        loginErrorDiv.textContent = message;
        loginErrorDiv.classList.remove('hidden');
    }

    function showRegisterError(message) {
        if (!registerErrorDiv) return;
        registerErrorDiv.textContent = message;
        registerErrorDiv.classList.remove('hidden');
    }

    // Fungsi ini mensimulasikan panggilan API ke server.
    // Di dunia nyata, Anda akan menggunakan fetch() untuk mengirim data ke backend.
    async function fakeApiLogin(username, password) {
        // Pengecekan khusus untuk Admin Utama yang di-hardcode
        if (username.toLowerCase() === 'jayyidin' && password === 'offthewallba123') {
            const adminUser = { uid: 'admin-1', email: 'jayyidin@admin.com', name: 'Jayyidin', username: 'jayyidin', role: 'Admin Utama', profilePicUrl: null };
            localStorage.setItem('currentUser', JSON.stringify(adminUser));
            return true;
        }

        const localUsersStr = localStorage.getItem('localUsers');
        if (localUsersStr) {
            const localUsers = JSON.parse(localUsersStr);
            const userKey = Object.keys(localUsers).find(k => localUsers[k].username === username.toLowerCase());
            if (userKey) {
                const user = localUsers[userKey];
                if (user.password === password) {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    return true;
                } else {
                    showError('Password yang Anda masukkan salah.');
                    return false;
                }
            }
        }
        
        showError('Username atau Password yang Anda masukkan salah.');
        return false;
    }

    async function fakeApiRegister(name, username, password) {
            let finalUsername = username.toLowerCase();
            const localUsersStr = localStorage.getItem('localUsers');
            let localUsers = localUsersStr ? JSON.parse(localUsersStr) : {};
            
            let counter = 1;
            let checkUsername = finalUsername;
            while (Object.keys(localUsers).some(k => localUsers[k].username === checkUsername)) {
                checkUsername = `${finalUsername}${counter}`;
                counter++;
            }
            finalUsername = checkUsername;

            const uid = 'user_' + new Date().getTime();
            localUsers[uid] = {
                uid: uid,
                name,
                username: finalUsername,
                password: password,
                role: 'Guru Penguji',
                profilePicUrl: null
            };
            localStorage.setItem('localUsers', JSON.stringify(localUsers));
            return { success: true };
    }
});