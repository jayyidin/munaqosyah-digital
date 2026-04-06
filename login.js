document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Config ---
    const firebaseConfig = {
        apiKey: "AIzaSyDxGG3pzQU_5IAhC-ozTnjayTdzVFaYZqY",
        authDomain: "munaqosyah-sditalfityan.firebaseapp.com",
        databaseURL: "https://munaqosyah-sditalfityan-default-rtdb.asia-southeast1.firebasedatabase.app/",
        projectId: "munaqosyah-sditalfityan",
        storageBucket: "munaqosyah-sditalfityan.firebasestorage.app",
        messagingSenderId: "729297832237",
        appId: "1:729297832237:web:0c992e31e330ab7813eba4"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.database();

    // Function to load app settings (needed for registration token)
    function loadAppSettings() {
        const savedSettings = localStorage.getItem('munaqosyahSettings');
        let appSettings = { registrationToken: null, schoolName: '' }; // Default
        if (savedSettings) {
            try {
                appSettings = JSON.parse(savedSettings);
            } catch (e) {
                console.error("Error parsing munaqosyahSettings from localStorage:", e);
            }
        }
        return appSettings;
    }

    // New function to load settings from Firebase
    function loadFirebaseSettings(callback) {
        db.ref('appSettings').once('value', (snapshot) => {
            let settings = { registrationToken: null, schoolName: '' };
            if (snapshot.exists()) {
                settings = snapshot.val();
            }
            callback(settings);
        }).catch(error => {
            console.error("Error loading settings from Firebase:", error);
            callback({ registrationToken: null, schoolName: '' });
        });
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
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonHTML;
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
            try {
                // Gunakan email yang telah ditentukan untuk admin utama
                const adminEmail = "jayyidin.admin@munaqosyah.app";
                await auth.signInWithEmailAndPassword(adminEmail, password);
                return true; // Login admin berhasil
            } catch (error) {
                console.error("Firebase Admin Login Error:", error);
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                    showError('Akun Admin Utama belum diaktifkan. Silakan hubungi developer untuk setup awal.');
                } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    showError('Password Admin Utama yang Anda masukkan salah.');
                } else {
                    showError('Terjadi kesalahan saat login sebagai admin.');
                }
                return false;
            }
        }

        // Alur login untuk pengguna biasa
        try {
            // Construct email directly from username to avoid permission_denied on unauthenticated DB reads
            const email = `${username.toLowerCase()}@munaqosyah.app`;

            // Sign in with the generated email and provided password
            await auth.signInWithEmailAndPassword(email, password);
            return true; // Success
        } catch (error) {
            console.error("Firebase Login Error:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
                showError('Username atau Password yang Anda masukkan salah.');
            } else {
                showError('Terjadi kesalahan. Periksa koneksi internet Anda.');
            }
            return false;
        }
    }

    async function fakeApiRegister(name, username, password) {
        try {
            let finalUsername = username.toLowerCase();
            let generatedEmail = `${finalUsername}@munaqosyah.app`;
            let userCredential = null;
            let counter = 1;
            let isUnique = false;

            while (!isUnique) {
                try {
                    userCredential = await auth.createUserWithEmailAndPassword(generatedEmail, password);
                    isUnique = true;
                } catch (error) {
                    if (error.code === 'auth/email-already-in-use') {
                        finalUsername = `${username.toLowerCase()}${counter}`;
                        generatedEmail = `${finalUsername}@munaqosyah.app`;
                        counter++;
                    } else {
                        throw error;
                    }
                }
            }

            const user = userCredential.user;

            // Write user data to Realtime Database immediately after Auth registration
            const updates = {};
            updates[`/users/${user.uid}`] = {
                name,
                username: finalUsername,
                email: generatedEmail,
                role: 'Guru Penguji'
            };
            updates[`/usernames/${finalUsername}`] = user.uid; // Store username mapping

            // Simpan asuransi data di localStorage sebelum mencoba ke DB
            localStorage.setItem('munaqosyah_pending_user_' + user.uid, JSON.stringify({ name, username: finalUsername }));

            try {
                await db.ref().update(updates);
                console.log("Data pengguna baru berhasil disimpan ke database.");
            } catch (dbError) {
                console.warn("DB rules memblokir penulisan, fallback akan menanganinya:", dbError);
            }

            // Pastikan user logout dari form registrasi agar benar-benar login dari awal
            await auth.signOut();

            /*
            // Removed: Old logic to store info in localStorage
            const newUserInfo = {
                uid: user.uid,
                name,
                username: finalUsername,
                email: generatedEmail,
                role: 'Guru Penguji'
            };
            localStorage.setItem('newlyRegisteredUser', JSON.stringify(newUserInfo));
            */
            return { success: true };
        } catch (error) {
            console.error("Firebase Register Error:", error);
            throw new Error(error.message || 'Gagal mendaftar.');
        }
    }
});