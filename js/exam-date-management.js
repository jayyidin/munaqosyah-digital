                        // --- Exam Date Management ---
                        function bukaModalTanggalUjian() {
                            renderTanggalUjianList();
                            document.getElementById('modal-tanggal-ujian').classList.replace('hidden', 'flex');
                        }

                        function tutupModalTanggalUjian() {
                            document.getElementById('modal-tanggal-ujian').classList.replace('flex', 'hidden');
                            if (getCurrentVisibleView() === 'ujian') {
                                renderUjianDateDisplay();
                                window.renderUjianDateDisplay();
                            }
                        }

                        function renderTanggalUjianList() {
                            const container = document.getElementById('list-tanggal-ujian-edit');
                            if (!container) return;
                            let html = '';
                            appSettings.examDates.sort().forEach(dateStr => {
                                const date = new Date(dateStr + 'T00:00:00');
                                const formattedDate = date.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                                html += `<div class="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200"><span class="text-sm font-bold text-teal-950 pl-2">${formattedDate}</span><button onclick="hapusTanggalUjian('${dateStr}')" class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><span class="material-symbols-outlined text-base">delete</span></button></div>`;
                            });
                            container.innerHTML = html || '<p class="text-center text-xs text-gray-400 py-4 italic">Belum ada tanggal ujian yang ditambahkan.</p>';
                        }

                        function tambahTanggalUjian() {
                            const dateInput = document.getElementById('setting-input-exam-date');
                            const newDate = dateInput.value;
                            if (!newDate) { openAlert("Silakan pilih tanggal terlebih dahulu."); return; }
                            if (appSettings.examDates.includes(newDate)) { openAlert("Tanggal ini sudah ditambahkan."); return; }
                            appSettings.examDates.push(newDate);
                            saveSettings();
                            renderTokenPendaftaran(); // Refresh token display if it's open
                            renderTanggalUjianList();
                            dateInput.value = '';
                        }

                        function hapusTanggalUjian(dateStr) {
                            appSettings.examDates = appSettings.examDates.filter(d => d !== dateStr);
                            saveSettings();
                            renderTokenPendaftaran(); // Refresh token display if it's open
                            renderTanggalUjianList();
                        }
