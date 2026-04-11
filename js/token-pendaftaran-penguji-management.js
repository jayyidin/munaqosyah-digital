                        // --- Token Pendaftaran Penguji Management ---
                        function bukaModalTokenPendaftaran() {
                            renderTokenPendaftaran();
                            document.getElementById('modal-token-pendaftaran').classList.replace('hidden', 'flex');
                        }

                        function tutupModalTokenPendaftaran() {
                            document.getElementById('modal-token-pendaftaran').classList.replace('flex', 'hidden');
                        }

                        function renderTokenPendaftaran() {
                            const tokenDisplayInput = document.getElementById('token-display');
                            const tokenDisplayContainer = document.getElementById('token-display-container');
                            const noTokenMessage = document.getElementById('no-token-message');
                            const currentToken = appSettings.registrationToken;

                            if (currentToken) {
                                tokenDisplayInput.value = currentToken;
                                tokenDisplayContainer.classList.remove('hidden');
                                noTokenMessage.classList.add('hidden');
                            } else {
                                tokenDisplayInput.value = '';
                                tokenDisplayContainer.classList.add('hidden');
                                noTokenMessage.classList.remove('hidden');
                            }
                        }

                        function generateNewToken() {
                            // Generate a simple alphanumeric token
                            const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                            appSettings.registrationToken = newToken;
                            saveSettings();
                            renderTanggalUjianList(); // Refresh exam dates list if it's open
                            renderTokenPendaftaran(); // Refresh token display
                            // openAlert("Token pendaftaran baru berhasil dibuat!"); // Dihilangkan sesuai permintaan
                        }

                        function copyTokenToClipboard() {
                            const tokenDisplayInput = document.getElementById('token-display');
                            if (tokenDisplayInput && tokenDisplayInput.value) {
                                navigator.clipboard.writeText(tokenDisplayInput.value)
                                    .then(() => openAlert("Token berhasil disalin ke clipboard!"))
                                    .catch(err => console.error('Gagal menyalin token:', err));
                            } else {
                                openAlert("Tidak ada token untuk disalin.");
                            }
                        }
