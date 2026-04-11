                        // --- KKM Management ---
                        function bukaModalKkm() {
                            const kkmInput = document.getElementById('setting-input-kkm');
                            if (kkmInput) {
                                kkmInput.value = appSettings.kkm;
                            }
                            document.getElementById('modal-kkm').classList.replace('hidden', 'flex');
                        }

                        function tutupModalKkm() {
                            document.getElementById('modal-kkm').classList.replace('flex', 'hidden');
                        }

                        function simpanKkm() {
                            const kkmInput = document.getElementById('setting-input-kkm');
                            let newKkm = parseFloat(kkmInput.value);
                            if (isNaN(newKkm) || newKkm < 0 || newKkm > 10) {
                                openAlert("Nilai KKM tidak valid. Harap masukkan angka antara 0 dan 10.");
                                return;
                            }
                            appSettings.kkm = newKkm;
                            saveSettings();
                            tutupModalKkm(); // Tutup modal
                            // openAlert(`Nilai KKM berhasil disimpan menjadi ${newKkm}.`); // Dihilangkan sesuai permintaan
                        }
