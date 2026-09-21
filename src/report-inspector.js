/** Embedded in a standalone HTML report. No network or application execution. */
export function inspectorClient(data, { ARMS, CATEGORIES, GROUPS, language }) {
    const t = language.text, ui = language.html;
    const library = data.library === true;
    const root = document.getElementById('inspector-root');
    const overview = document.getElementById('overview-view'), rail = document.querySelector('.rail');
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const pretty = x => JSON.stringify(x, null, 2), yes = x => x === true ? t('Ya') : x === false ? t('Tidak') : t('Tidak direkam');
    const json = (x, title = t('Data yang direkam')) => ui `<details class="audit-raw"><summary>${esc(t(title))}</summary><pre>${esc(pretty(x))}</pre></details>`;
    const code = x => ui `<pre class="audit-code">${esc(x)}</pre>`;
    const note = (text, tone = '') => ui `<p class="audit-note ${tone}">${esc(t(text))}</p>`;
    const fact = (k, v) => ui `<div><dt>${esc(t(k))}</dt><dd>${esc(v ?? t('Tidak direkam'))}</dd></div>`;
    const reasons = {
        'original-success': t('Locator awal bekerja. Tidak perlu mencari pengganti atau memanggil AI.'),
        recovered: t('Aksi dengan locator pengganti selesai. Ketepatan sasaran tetap dinilai secara terpisah.'),
        abstained: 'AI tidak memilih locator; pemulihan berhenti tanpa menjalankan kandidat.',
        'spec-unknown': t('Bukti belum cukup untuk mengizinkan kandidat sesuai aturan requirement.'),
        'spec-refused': t('Acuan requirement secara eksplisit menolak pemulihan ini.'),
        spec_insufficient_evidence: t('Ada syarat identitas kandidat yang tidak ditemukan pada bukti elemen.'),
        spec_evidence_matched: t('Semua syarat bukti yang dideklarasikan cocok. Ini belum menjamin fungsi bisnisnya benar.'),
        spec_retired: t('Fitur ditandai nonaktif pada aturan yang disuplai.'),
        spec_missing: t('Aturan requirement tidak tersedia. Ini bukan bukti bahwa fiturnya dihapus.'),
        spec_revision_mismatch: t('Versi aturan tidak cocok dengan versi yang diharapkan.'),
        spec_action_mismatch: t('Jenis aksi tidak cocok dengan aturan.'),
        spec_target_unavailable: t('Elemen tidak lagi tersedia ketika akan diperiksa.'),
        ambiguous: t('Locator menunjuk lebih dari satu elemen.'), no_match: t('Locator tidak menemukan elemen.'),
        not_visible: t('Elemen tidak terlihat.'), not_enabled: t('Elemen tidak aktif.'), action_mismatch: t('Elemen tidak cocok dengan jenis aksi.'),
        selector_validation_failed: t('Pemeriksaan locator gagal.'), no_candidate: t('Tidak ada kandidat yang dipilih.'),
        'attempt-limit': t('Batas percobaan tercapai.'), 'time-limit': t('Batas waktu pemulihan tercapai.'),
        'provider-failure': t('Panggilan penyedia AI gagal; pemulihan tidak boleh dianggap berhasil.'),
        'context-failure': t('Pengumpulan konteks gagal.'), nonrecoverable: t('Kegagalan awal berada di luar pemulihan locator yang didukung.'),
    };
    const explain = x => t(reasons[x]) ?? (x ? ui `Kode yang direkam: ${x}` : t('Tidak ada alasan kegagalan yang direkam.'));
    const stages = [['context', t('Konteks DOM')], ['ai', t('Input dan jawaban AI')], ['checks', t('Pemeriksaan')], ['outcome', t('Hasil aksi')]];
    const groups = new Map();
    for (const row of data.rows) {
        const key = row.group + '/' + row.caseId;
        if (!groups.has(key))
            groups.set(key, []);
        groups.get(key).push(row);
    }
    const keys = [...groups.keys()];
    let selectedKey = keys[0], arm = 'C', repeat = 1, attemptNumber = null, stage = 'context', returnFocus = null;
    const currentRows = () => groups.get(selectedKey) ?? [];
    const selectedRow = () => currentRows().find(r => r.arm === arm && r.repeat === repeat);
    function download(filename, text, type = 'application/json') {
        const url = URL.createObjectURL(new Blob([text], { type }));
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    function close() { root.hidden = true; overview.hidden = false; rail.style.display = ''; document.body.classList.remove('inspecting'); (returnFocus?.isConnected ? returnFocus : overview.querySelector(returnFocus?.dataset.action ? `[data-action="${CSS.escape(returnFocus.dataset.action)}"]` : returnFocus?.dataset.row ? `[data-row="${CSS.escape(returnFocus.dataset.row)}"]` : 'button'))?.focus(); }
    function render(focusId) {
        const row = selectedRow(), fallback = currentRows()[0], availableArms = [...new Set(currentRows().map(r => r.arm))].sort();
        const audit = row?.audit, e = audit?.event, attempts = audit?.attempts ?? [], attempt = attempts.find(a => a.number === attemptNumber) ?? attempts[0];
        attemptNumber = attempt?.number ?? null;
        let request = null, input = null;
        try {
            request = JSON.parse(attempt?.request?.body ?? 'null');
            const message = request?.messages?.find(m => m.role === 'user');
            input = message ? JSON.parse(message.content) : null;
        }
        catch { /* Raw content remains readable even when user text is not JSON. */ }
        const observed = attempt?.inputContext ?? audit?.initialContext, coverage = attempt?.inputCoverage ?? observed?.coverage ?? input?.coverage;
        const spec = input?.targetSpec ?? observed?.targetSpec, decision = attempt?.specDecision;
        const outcome = audit?.outcome;
        const native = e?.stopReason === 'original-success', called = attempt?.providerCalled === true;
        const ruleMode = library ? (e?.targetSpec?.mode === 'enforce' ? 'C' : e?.targetSpec?.mode === 'context' ? 'B' : 'A') : arm;
        function status(id) {
            if (!row)
                return t('Slot tidak tersedia');
            if (!audit)
                return t('Bukti belum dimuat');
            if (['start', 'outcome', 'source'].includes(id))
                return t('Terekam');
            if (native)
                return t('Dilewati');
            if (id === 'ai')
                return !attempt?.providerCalled ? t('Tidak dipanggil') : attempt?.request?.body && typeof attempt?.response?.text==='string' ? t('Pasangan terekam') : attempt?.request?.body ? t('Input recorded; output unavailable') : typeof attempt?.response?.text==='string' ? t('Output recorded; input unavailable') : t('Evidence incomplete');
            if (id === 'checks')
                return attempt?.candidateAccepted ? t('Lolos teknis') : t('Lihat keputusan');
            if (id === 'context')
                return observed ? t('Terekam') : t('Tidak direkam');
            if (id === 'request')
                return attempt?.request?.body ? (attempt.request.status === 'redacted' ? t('Salinan direduksi') : attempt.request.integrity === 'verified' ? t('Hash cocok') : t('Periksa integritas')) : called ? t('Tidak direkam') : t('Tidak dipanggil');
            if (id === 'response')
                return !called ? t('Tidak dipanggil') : attempt?.response?.text ? t('Terekam') : t('Hasil parsing');
            if (id === 'validation')
                return attempt?.candidateAccepted ? t('Lolos teknis') : attempt?.validations?.length ? t('Ditolak') : t('Belum lolos');
            if (id === 'rules')
                return arm !== 'C' ? t('Tidak diberlakukan') : decision ? (decision.outcome === 'accepted' ? t('Diizinkan') : t('Dihentikan')) : t('Belum tercapai');
        }
        const result = !row ? t('Slot tidak tersedia') : row.operational ? t('Gangguan operasional') : row.wrong ? t('Efek salah tercatat') : row.assessed === false ? t('Ketepatan belum dinilai') : row.category === 'quality' && !row.executed ? t('Berhenti: acuan tidak cukup') : row.correct ? (!row.executed ? t('Berhenti dengan tepat') : row.recovery ? t('Pulih ke sasaran benar') : t('Aksi awal benar')) : t('Tujuan belum tercapai');
        const methodCopy = t(ARMS[arm]?.description ?? '');
        root.innerHTML = ui `<div class="inspect-shell">
      <div class="inspect-top"><button id="audit-back">← Semua hasil</button><span>${library ? t(data.evidenceKind==='offline-mechanism-check'?'Offline · mechanism check':'Local action evidence') : audit?.privateHost ? t('AUDIT LOKAL · BUKTI APLIKASI PRIVAT') : (row?.evidenceKind ?? data.evidenceKind) === 'replay' ? t('REPLAY · KEPUTUSAN AI TERSIMPAN') : (row?.evidenceKind ?? data.evidenceKind) === 'live-demo' ? t('DEMO LIVE · PANGGILAN BARU') : row?.studyId === 'rm1' ? t('BUKTI TERSIMPAN · D33 MAIN') : t('BUKTI TERSIMPAN · D30')}</span><button id="audit-download" ${audit ? '' : 'disabled'}>Unduh bukti run</button></div>
      <div class="inspect-heading"><div><p class="eyebrow">${esc(t(GROUPS[fallback.group]))} / ${esc(t(CATEGORIES[fallback.category]))}</p><h1><span>${esc(fallback.caseId)}</span>${esc(fallback.title)}</h1></div>
      <label class="case-select">${library ? t('Pindah aksi') : t('Pindah kasus')}<select id="audit-case">${keys.map(k => { const r = groups.get(k)[0]; return ui `<option value="${esc(k)}" ${k === selectedKey ? 'selected' : ''}>${esc(r.caseId + ' · ' + r.title)}</option>`; }).join('')}</select></label></div>
      <div class="run-toolbar"><div class="method-switch" ${library ? 'hidden' : ''} role="group" aria-label="Konfigurasi">${availableArms.map(a => ui `<button id="audit-arm-${a}" data-arm="${a}" aria-pressed="${arm === a}"><b>${a}</b><span>${esc(t(ARMS[a]?.short ?? a))}</span></button>`).join('')}</div>
      <label ${library ? 'hidden' : ''}>Pengulangan<select id="audit-repeat">${[...new Set(currentRows().map(r => r.repeat))].sort((a, b) => a - b).map(n => ui `<option value="${n}" ${n === repeat ? 'selected' : ''}>Ulangan ${n}</option>`).join('')}</select></label>
      <label>Percobaan healing<select id="audit-attempt" ${attempts.length ? '' : 'disabled'}>${attempts.length ? attempts.map(a => ui `<option value="${a.number}" ${a.number === attemptNumber ? 'selected' : ''}>Attempt ${a.number}</option>`).join('') : t('<option>Tidak ada attempt</option>')}</select></label></div>
      <p class="method-explainer">${esc(methodCopy)}</p>
      <div class="run-verdict ${row?.wrong ? 'is-wrong' : row?.correct ? 'is-correct' : 'is-unknown'}"><div><small>HASIL RUN INI</small><strong>${esc(result)}</strong><p>${esc(native ? t('Locator awal berhasil. Tidak ada DOM recovery, request AI, atau pemeriksaan kandidat pengganti.') : e ? explain(e.stopReason) : t('Buka bukti hasil untuk melihat penilaian yang tersedia.'))}</p></div><dl>${fact('API calls', row?.usage?.requests ?? '—')}${fact(t('Durasi langkah'), row?.totalMs == null ? '—' : (row.totalMs / 1000).toFixed(2) + ' s')}${fact(t('Aksi dijalankan'), row ? yes(row.executed) : '—')}</dl></div><p class="locator-pair"><span>Awal: <code>${esc(e?.originalSelector ?? row?.detail?.original ?? t('Tidak direkam'))}</code></span><span>Pengganti attempt ini: <code>${esc(native ? t('Tidak diperlukan') : attempt?.selector ?? attempt?.proposedSelector ?? t('Tidak ada pilihan terekam'))}</code></span></p>
      <div class="inspection-layout"><nav class="stage-nav" aria-label="Tahap eksekusi">${stages.map(([id, title], i) => ui `<button id="stage-${id}" data-stage="${id}" aria-current="${stage === id ? 'step' : 'false'}"><span class="stage-index">${String(i + 1).padStart(2, '0')}</span><span><b>${t(title)}</b><small>${esc(status(id))}</small></span></button>`).join('')}</nav>
      <section class="stage-panel" aria-labelledby="stage-title"><div class="stage-title"><span class="eyebrow">${esc(status(stage))}</span><h2 id="stage-title">${t(stages.find(s => s[0] === stage)[1])}</h2></div>${groupContent()}</section></div>
      <details class="evidence-details"><summary>Detail bukti, sumber dan konfigurasi</summary>${content('source')}</details><footer class="inspect-footer"><span>Hasil tes, keputusan pemeriksa, dan usulan AI adalah bukti yang berbeda.</span><button id="audit-next-stage">${stage === 'outcome' ? t('Kembali ke konteks DOM') : t('Tahap berikutnya →')}</button></footer>
    </div>`;
        function groupContent() {
            if (stage === 'ai')
                return t('<div class="paired-block"><h3>Input ke AI</h3>') + content('request') + t('</div><div class="paired-block"><h3>Jawaban AI</h3>') + content('response') + '</div>';
            if (stage === 'checks')
                return content('validation') + t('<h3>Aturan target</h3>') + content('rules');
            if (stage === 'context')
                return t('<details><summary>Aksi awal dan locator yang gagal</summary>') + content('start') + '</details>' + content('context');
            return content(stage);
        }
        function content(stage) {
            if (!row)
                return note(t('Eksekusi untuk pilihan ini tidak tersedia. Tidak ada hasil yang diasumsikan.'));
            if (!audit)
                return note(t('Detail diagnostik belum dimuat. Untuk arsip privat, aktifkan opsi audit lokal saat membuat report. Angka ringkasan tetap berasal dari hasil tersimpan.'));
            if (stage === 'source')
                return note(t('Bukti ini dibaca dari rekaman. Tampilan tidak menjalankan ulang AI atau merekonstruksi tahapan yang tidak direkam.')) + json(audit.source, t('Identitas sumber')) + json(audit.config, t('Konfigurasi yang direkam')) + ui `<ul class="audit-limits">${(audit.missing ?? []).map(x => ui `<li>${esc(t(x))}</li>`).join('')}</ul>` + note(t('Respons model tidak berisi penjelasan pemikiran internal. Alasan penolakan yang ditampilkan berasal dari validator dan aturan, bukan alasan yang dikarang atas nama AI.'));
            if (stage === 'start')
                return ui `<p class="stage-intro">Apa yang hendak dilakukan test sebelum proses self-healing.</p><dl class="audit-facts">${fact(t('Tujuan tes'), e?.task?.description)}${fact(t('Jenis aksi'), e?.action)}${fact(t('Locator awal'), e?.originalSelector)}${fact(t('Pemulihan dipicu'), yes(e?.recoveryTriggered))}${fact(t('Kegagalan awal'), e?.originalFailure ? ui `${e.originalFailure.name} · ${e.originalFailure.classification}` : t('Tidak ada kegagalan yang direkam'))}</dl>` + note(native ? t('Aksi asli sudah berhasil. Jadi hasil ini tidak membuktikan kemampuan AI memperbaiki locator; ini kontrol untuk memastikan perilaku normal tetap berjalan.') : explain(e?.stopReason)) + json(e, t('Event runtime lengkap yang tersedia'));
            if (stage === 'outcome') {
                const checks = audit.privateHost ? [
                    [t('Oracle tujuan tes'), outcome?.oracleCorrect], [t('Field/entitas lain tetap sesuai'), outcome?.guardUnchanged], [t('Ada efek salah'), row.wrong]
                ] : [[t('Penilaian semantik'), outcome?.assessment?.semantic], [t('Ada efek salah'), outcome?.assessment?.wrongEffect], [t('Tujuan yang diharapkan'), outcome?.assessment?.goalExpected ?? outcome?.expectation?.goalExpected]];
                const explanation = row.assessed === false ? t('Belum ada penilaian independen atas ketepatan aksi ini. Status aksi selesai hanya membuktikan eksekusi.') : row.wrong ? t('Evaluator mencatat efek yang salah. Locator valid atau aksi selesai tidak mengubah hasil ini menjadi benar.') : row.correct && native ? t('Aksi awal berhasil, dan evaluator menilai tujuan tercapai tanpa efek salah. Tidak ada perbaikan AI pada run ini.') : row.correct && row.category === 'negative' ? t('Untuk kondisi ini, tindakan yang diharapkan adalah tidak mengubah sasaran lain. Berhenti merupakan hasil yang tepat, bukan recovery berhasil.') : row.correct ? t('Evaluator menilai tujuan tes tercapai tanpa efek salah. Ini penilaian sesudah aksi, terpisah dari persetujuan locator.') : t('Tujuan tes belum tercapai. Lihat riwayat percobaan dan hasil pemeriksaan; berhenti aman tidak sama dengan pemulihan berhasil.');
                return ui `<p class="stage-intro">${esc(explanation)}</p><div class="proof-grid">${checks.map(([k, v]) => ui `<article><small>${esc(k)}</small><strong>${esc(typeof v === 'boolean' ? yes(v) : v ?? t('Tidak direkam'))}</strong></article>`).join('')}</div>` + note(t('Bukti evaluator berada di luar input AI. Status “benar” berasal dari pengujian efek aplikasi, bukan pengakuan AI.')) + json(outcome, t('Hasil / keadaan aplikasi yang direkam')) + json(audit.assessments, t('Penilaian tiap event / attempt')) + (audit.calls ? json(audit.calls, t('Riwayat aksi dan efek yang diamati')) : '') + note(t('Rekaman tidak selalu memuat nilai expected, before, dan after secara lengkap. Flag oracle adalah hasil pemeriksa yang direkam; jangan menganggapnya sebagai snapshot yang tidak tersedia.'));
            }
            if (native)
                return note(t('Tahap ini dilewati: locator awal berhasil. Tidak ada proses healing, request AI, atau kandidat pengganti pada run ini.'), 'skipped');
            if (stage === 'context') {
                if (!observed)
                    return note(t('Konteks DOM untuk tahap ini tidak direkam atau pengumpulan belum tercapai.'));
                const candidates = observed.candidates ?? [];
                const ranking = row.ranking ? ui `<div class="target-proof"><b>Target pada input: ${yes(row.ranking.targetPresent)}</b><p>Peringkat target ${esc(row.ranking.rank)} · lolos top-30 ${yes(row.ranking.top30)} · lolos budget ${yes(row.ranking.afterBudget)}</p><small>Anotasi evaluator sesudah pengumpulan; bukan jawaban yang diberikan ke AI.</small></div>` : '';
                const funnel = [[t('Dipindai'), 'scanned'], [t('Tidak eligible'), 'ineligible'], [t('Kandidat ditemukan'), 'discovered'], [t('Masuk konteks'), 'included']];
                return ranking + ui `<p class="stage-intro">Elemen disaring sesuai aksi, informasinya dibersihkan, lalu kandidat diberi skor dan dibatasi sebelum dikirim ke AI.</p>` + note(attempt?.inputContext ? t('Ini konteks yang direkam untuk attempt terpilih. Payload yang benar-benar dikirim tersedia di Input ke AI.') : t('Ini konteks awal event; konteks khusus attempt tidak tersedia.')) + ui `<div class="audit-funnel">${funnel.map(([k, v]) => ui `<article><strong>${esc(coverage?.[v] ?? '—')}</strong><span>${k}</span></article>`).join('')}</div>` + json(coverage, t('Seluruh hitungan, batas karakter dan pemotongan')) + ui `<h3>Urutan kandidat yang terekam <small>${candidates.length} kandidat</small></h3><p class="audit-muted">Skor di bawah adalah hasil ranking yang disimpan, bukan skor yang dihitung ulang oleh report. Rincian bobot per fitur tidak direkam.</p><details><summary>Kandidat pada konteks attempt</summary><div class="candidate-list">${candidates.map((c, i) => ui `<details><summary><span class="candidate-rank">${i + 1}</span><span class="candidate-name">${esc(c.label || c.features?.text || c.features?.name || c.tag)}<small>${esc(c.selector || t('Tidak ada locator terverifikasi'))}</small></span><span class="candidate-score">${esc(c.score)}<small>skor</small></span></summary>${code(c.selector ?? '')}${json(c, t('Fitur, owner, duplikasi dan usulan locator'))}</details>`).join('')}</div></details><h3>HTML hasil cleansing / tambahan</h3>` + (typeof observed.cleanedDom === 'string' ? code(observed.cleanedDom) : note(t('Tidak ada HTML tambahan pada konteks ini. Informasi DOM dikirim sebagai daftar kandidat dan atribut yang sudah dipilih; bukan berarti proses pemilihan/pembersihan DOM tidak berjalan.'))) + (audit.dom ? json(audit.dom.raw, t('DOM mentah yang direkam')) + json(audit.dom.cleaned, t('DOM setelah cleansing yang direkam')) + json(audit.dom.ranked, t('Seluruh kandidat setelah ranking; sebelum budget')) + json(audit.dom.observations, t('Observasi dan tahapan seleksi')) : note(library?t('Pre-cleansing DOM is not included in this library report.'):t('DOM mentah sebelum cleansing dan elemen yang dibuang tidak direkam.')));
            }
            if (stage === 'request') {
                if (!called)
                    return note(t('Tidak ada pemanggilan provider pada attempt ini.'));
                if (!attempt.request?.body)
                    return note(ui `Body request tidak tersedia untuk ditampilkan. Status: ${attempt.request?.status ?? 'missing'}.`) + json(attempt.request, t('Identitas request yang tersedia'));
                const p = attempt.request;
                const integrity = p.status === 'redacted' ? t('Salinan mengandung redaksi secret; tidak byte-identik.') : p.integrity === 'verified' ? t('Request asli tersimpan · SHA-256 cocok.') : t('Integritas request belum terverifikasi atau berbeda.');
                return note(integrity, 'integrity-' + p.integrity) + ui `<p class="audit-muted">${esc(input?.candidates?.length ?? t('Jumlah tidak direkam'))} kandidat pada pesan user. Buka pesan untuk melihat seluruh input.</p>` + (request?.messages??[]).map((m, i) => ui `<details class="audit-raw"><summary>${esc(m.role)} · pesan ${i + 1} lengkap</summary>${code(m.content)}</details>`).join('') + ui `<div class="audit-actions"><button id="audit-request-download">Unduh body request</button><button id="audit-request-copy">Salin request</button></div><details><summary>Model, batas dan integritas request</summary><dl class="audit-facts">${fact(t('Model diminta'), request?.model)}${fact('Temperature', request?.temperature)}${fact(t('Batas output'), request?.max_tokens)}${fact(t('Ukuran body'), p.bytes + ' bytes')}${fact(t('Tujuan dalam pesan user'), input?.task?.description ?? t('Lihat pesan asli'))}</dl>` + json(p, t('Hash dan status integritas')) + (library ? '' : note(arm.startsWith('R') ? t('RM1 memakai proyeksi tanpa skor; kontrak dimatikan.') : arm === 'A' ? t('Tidak ada targetSpec tambahan pada metode A.') : t('B dan C memasukkan targetSpec ke pesan user; hanya C menegakkannya lewat kode sebelum aksi.'))) + '</details>';
            }
            if (stage === 'response') {
                if (!called)
                    return note(t('Provider tidak dipanggil pada attempt ini.'));
                const raw = attempt.response?.text, hasOutput=typeof raw==='string';
                const outputRedacted = attempt.response?.status === 'redacted' ? note(t('Redacted output copy; original hash retained.')) : attempt.response?.status==='withheld' ? note(t('Output capture withheld by the diagnostic size limit.')) : '';
                return outputRedacted + (attempt.response?.status === 'replayed' ? note(t('Keputusan model diputar ulang; bukan inferensi AI baru.')) : hasOutput ? '' : note(t('Respons mentah tidak direkam. Yang tersedia hanya locator hasil parsing.'))) + (hasOutput ? ui `<p class="audit-muted">Output provider yang tersimpan</p>${code(raw)}` : '') + ui `<p class="audit-muted">Locator hasil parsing</p>${code(attempt.failure === 'abstained' ? t('null — tidak ada locator yang dipilih') : attempt.proposedSelector ?? t('Tidak direkam'))}<details><summary>Metadata output dan observasi lanjutan</summary><dl class="audit-facts">${fact(t('Model yang dikembalikan'), attempt.providerMetadata?.returnedModel)}${fact('Finish reason', attempt.providerMetadata?.finishReason)}${fact('Input tokens', attempt.usage?.inputTokens)}${fact('Output tokens', attempt.usage?.outputTokens)}</dl>` + json(attempt.observationRefresh ?? null, t('Observasi ulang setelah tidak ada pilihan')) + note(t('Format respons meminta selector atau null. Tidak ada alasan naratif AI yang bisa diaudit jika model tidak mengeluarkan alasan tersebut.')) + '</details>';
            }
            if (stage === 'validation') {
                return ui `<p class="stage-intro">Pemeriksaan dasar memastikan usulan bisa dipakai pada elemen yang tepat secara struktur: satu target, terlihat, aktif, dan cocok dengan aksi.</p><dl class="audit-facts">${fact(t('Usulan awal'), attempt?.proposedSelector)}${fact(t('Locator yang diterima'), attempt?.selector)}${fact(t('Lolos validasi dasar'), yes(attempt?.candidateAccepted))}${fact(t('Aksi recovery dijalankan'), yes(attempt?.actionExecuted))}</dl>` + note(attempt?.candidateAccepted ? t('Locator lolos pemeriksaan teknis. Pada C, aturan requirement masih harus diperiksa sebelum aksi. Ini belum berarti sasaran bisnis benar.') : explain(attempt?.reason)) + json(attempt?.validations ?? null, t('Varian locator yang ditolak / alasan / jumlah match')) + note(t('Daftar varian bisa kosong jika usulan pertama lolos. Arsip hanya merekam keputusan agregat untuk pemeriksaan yang berhasil; tidak mengarang log per-check.')) + json(input?.feedback ?? null, t('Umpan balik penolakan yang masuk ke AI pada attempt ini'));
            }
            if (stage === 'rules') {
                if (ruleMode.startsWith('R'))
                    return note(t('Pemeriksaan aturan target dinonaktifkan pada seluruh strategi RM1. Validasi locator dasar tetap berjalan.'));
                if (ruleMode === 'A')
                    return note(t('Metode A tidak diberi aturan requirement tambahan dan tidak menjalankan pemeriksa aturan. Validasi locator dasar tetap ada.'));
                const contract = spec?.contract;
                let html = ui `<p class="stage-intro">${ruleMode === 'B' ? t('Aturan ini diberikan kepada AI sebagai konteks. Tidak ada keputusan pemeriksa kode yang diberlakukan pada B.') : t('Kode membandingkan bukti elemen terpilih dengan setiap syarat yang dideklarasikan sebelum klik / fill.')}</p>`;
                html += ui `<dl class="audit-facts">${fact(t('Tujuan requirement'), contract?.intent)}${fact(t('ID / revisi'), contract ? contract.requirementId + ' / ' + contract.revision : e?.targetSpec?.requirementId)}${fact(t('Status fitur'), contract?.status)}${fact(t('Aksi yang diizinkan'), contract?.action)}${fact(t('Kesesuaian acuan'), spec?.applicability ?? e?.targetSpec?.applicability)}</dl>`;
                if (ruleMode === 'C')
                    html += note(decision ? explain(decision.reason) : t('Pemeriksa aturan belum tercapai pada attempt ini. Misalnya AI tidak memilih kandidat, atau validasi dasar belum lolos.'));
                html += ui `<div class="rule-list">${(contract?.allOf ?? []).map((rule, i) => { const result = decision?.clauses?.find(c => c.index === i); return ui `<article><div class="rule-heading"><h3>Syarat ${i + 1}</h3><span class="pill ${result?.matched === true ? 'good' : result?.matched === false ? 'bad' : 'warn'}">${result ? result.matched ? t('Cocok') : t('Belum cocok') : ruleMode === 'B' ? t('Konteks AI') : t('Belum diperiksa')}</span></div><p>Cari salah satu frasa: <b>${esc(rule.anyOf.join(' · '))}</b></p><p>Pada: ${esc(rule.sources.join(', '))}</p>${result ? ui `<p>Sumber yang cocok: ${esc(result.source ?? t('Tidak ditemukan'))}</p>` : ''}${decision?.observed ? json(Object.fromEntries(rule.sources.map(s => [s, decision.observed[s] ?? null])), t('Bukti elemen untuk syarat ini')) : ''}</article>`; }).join('')}</div>`;
                return html + json(spec ?? e?.targetSpec, t('Aturan, versi dan provenance yang tersedia')) + json(decision ?? null, t('Keputusan pemeriksa pada attempt terpilih')) + note(t('Pemeriksa ini mencocokkan frasa pada bukti label/atribut/konteks. Ia tidak membuktikan seluruh perilaku aplikasi dan dapat tertipu label yang menyesatkan.'));
            }
            return '';
        }
        const bind = (id, fn) => { const el = document.getElementById(id); if (el)
            el.onclick = fn; };
        bind('audit-back', close);
        bind('audit-download', () => download(ui `${fallback.caseId}-${arm}-r${repeat}-audit.json`, pretty({ caseId: fallback.caseId, arm, repeat, audit })));
        root.querySelectorAll('[data-arm]').forEach(b => b.onclick = () => { arm = b.dataset.arm; attemptNumber = null; render(b.id); });
        root.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { stage = b.dataset.stage; render(b.id); });
        document.getElementById('audit-case').onchange = e => { selectedKey = e.target.value; if (!currentRows().some(r => r.arm === arm))
            arm = currentRows()[0].arm; repeat = currentRows().find(r => r.arm === arm)?.repeat ?? 1; attemptNumber = null; render('audit-case'); };
        document.getElementById('audit-repeat').onchange = e => { repeat = Number(e.target.value); attemptNumber = null; render('audit-repeat'); };
        document.getElementById('audit-attempt').onchange = e => { attemptNumber = Number(e.target.value); render('audit-attempt'); };
        bind('audit-next-stage', () => { stage = stages[(stages.findIndex(x => x[0] === stage) + 1) % stages.length][0]; render('stage-' + stage); });
        bind('audit-request-download', () => download(ui `${fallback.caseId}-${arm}-r${repeat}-attempt${attemptNumber}-request.json`, attempt.request.body));
        bind('audit-request-copy', async () => { const button = document.getElementById('audit-request-copy'); try {
            await navigator.clipboard.writeText(attempt.request.body);
            button.textContent = t('Tersalin');
        }
        catch {
            button.textContent = t('Gunakan unduh request');
        } });
        if (focusId)
            document.getElementById(focusId)?.focus();
    }
    language.subscribe(() => { if (!root.hidden) { const opened=[...root.querySelectorAll('details')].map((el,i)=>el.open?i:-1).filter(i=>i>=0); render(); const details=root.querySelectorAll('details'); for(const i of opened) if(details[i]) details[i].open=true; } });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !root.hidden)
        close(); });
    return { open(key, selection = {}) { if (!groups.has(key))
            return; returnFocus = document.activeElement; selectedKey = key; arm = selection.arm ?? (currentRows().some(r => r.arm === 'C') ? 'C' : currentRows()[0].arm); repeat = selection.repeat ?? currentRows().find(r => r.arm === arm)?.repeat ?? 1; attemptNumber = selection.attempt ?? null; stage = selection.stage ?? 'context'; overview.hidden = true; rail.style.display = 'none'; root.hidden = false; document.body.classList.add('inspecting'); render(); window.scrollTo(0, 0); document.getElementById('audit-back').focus(); } };
}
export const INSPECTOR_CSS = `
[hidden]{display:none!important}.inspecting{background:#f5f5f0}.inspect-shell{max-width:1450px;margin:auto;padding:25px 44px 0}.inspect-top{display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:22px;border-bottom:1px solid var(--line)}.inspect-top>span{font-size:10px;letter-spacing:1.3px;color:var(--muted)}.inspect-top button{background:#fffef9}.inspect-heading{display:flex;justify-content:space-between;align-items:end;gap:40px;padding:27px 0 20px}.inspect-heading h1{font:31px/1.3 Georgia,serif;letter-spacing:-.5px;margin:8px 0;max-width:760px}.inspect-heading h1>span{display:block;color:var(--teal);font:13px/1.7 'SFMono-Regular',Consolas,monospace;letter-spacing:0}.case-select{width:290px;min-width:210px}.case-select select{width:100%}.run-toolbar{display:flex;align-items:end;gap:20px;flex-wrap:wrap;padding:18px 0 0}.method-switch{display:flex;gap:6px;margin-right:auto}.method-switch button{display:flex;align-items:center;gap:12px;padding:12px 17px;min-height:53px;background:#fffef9;border-color:var(--line);text-align:left}.method-switch b{font:21px Georgia,serif}.method-switch button[aria-pressed=true]{background:var(--ink);border-color:var(--ink);color:white}.method-switch span{font-size:11px}.method-explainer{font-size:12px;color:var(--muted);margin:15px 0 20px;max-width:840px;line-height:1.65}.run-verdict{display:flex;justify-content:space-between;align-items:center;gap:30px;padding:21px 25px;background:#fffef9;border:1px solid var(--line);border-left:4px solid #a08b47;margin-bottom:29px}.run-verdict.is-correct{border-left-color:var(--teal)}.run-verdict.is-wrong{border-left-color:var(--red)}.run-verdict small{font-size:9px;letter-spacing:1.3px;color:var(--muted)}.run-verdict strong{display:block;font:24px/1.4 Georgia,serif}.run-verdict p{font-size:12px;color:var(--muted);margin:5px 0 0;max-width:630px}.run-verdict dl{display:flex;gap:28px;margin:0;flex-shrink:0}.run-verdict dt{font-size:10px;margin:0}.run-verdict dd{font-size:14px;margin:6px 0 0}.inspection-layout{display:grid;grid-template-columns:218px minmax(0,1fr);gap:35px;align-items:start}.stage-nav{position:sticky;top:24px;display:grid;gap:5px}.stage-nav button{display:flex;align-items:center;gap:16px;text-align:left;border:1px solid transparent;padding:13px 12px;background:transparent;border-radius:5px}.stage-index{font:11px 'SFMono-Regular',Consolas,monospace;color:#839995}.stage-nav b{font-size:12px;font-weight:600;display:block}.stage-nav small{display:block;font-size:10px;color:var(--muted);margin-top:4px}.stage-nav button[aria-current=step]{background:#e2ece4;border-color:#c6d8cc}.stage-panel{background:#fffefb;border:1px solid #d9e0d8;min-height:510px;padding:30px 34px;border-radius:8px;min-width:0}.stage-title{border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:22px}.stage-title h2{font-size:28px;margin-top:6px}.stage-intro{font-size:14px;line-height:1.8;max-width:800px}.audit-note{background:#eef2ec;border-left:3px solid #a1b7a8;color:#415d57;padding:14px 18px;font-size:12px;line-height:1.8;margin:20px 0;overflow-wrap:anywhere}.audit-note.skipped{background:#f1f0e8;border-color:#bcb596}.audit-note.integrity-mismatch{background:#fae9e2;border-color:var(--red)}.audit-code,.audit-raw pre{font:12px/1.75 'SFMono-Regular',Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;tab-size:2;background:#f2f4ed;border:1px solid #e0e6da;border-radius:5px;padding:18px 21px;max-height:510px;overflow:auto;letter-spacing:0}.audit-raw{margin:16px 0;border:1px solid var(--line);border-radius:5px;background:#fffefb;min-width:0}.audit-raw>summary{padding:13px 17px;font-size:12px;color:var(--teal);overflow-wrap:anywhere}.audit-raw pre{margin:0;border:0;border-top:1px solid var(--line);border-radius:0 0 5px 5px}.audit-facts{display:grid;grid-template-columns:1fr 1fr;gap:0 28px;margin:12px 0 20px}.audit-facts>div{padding:12px 0;border-bottom:1px solid #e6e9df;min-width:0}.audit-facts dt{font-size:11px;margin:0}.audit-facts dd{font-size:13px;margin:6px 0 0;line-height:1.7;overflow-wrap:anywhere}.audit-facts.compact{grid-template-columns:repeat(4,1fr)}.audit-muted{font-size:12px;line-height:1.7;color:var(--muted)}.stage-panel h3{font-size:14px;margin-top:25px}.stage-panel h3>small{font-weight:400;color:var(--muted);margin-left:13px;font-size:11px}.audit-funnel{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin:22px 0}.audit-funnel article{border-bottom:2px solid #cadacd;padding:10px 0}.audit-funnel strong{display:block;font:29px Georgia,serif}.audit-funnel span{font-size:10px;color:var(--muted)}.candidate-list{border-top:1px solid var(--line)}.candidate-list>details{border-bottom:1px solid var(--line)}.candidate-list>details>summary{display:flex;align-items:center;gap:18px;padding:14px 5px;list-style:none;font-size:12px}.candidate-rank{font:13px Georgia,serif;border:1px solid #cedbd0;border-radius:50%;width:28px;height:28px;display:grid;place-items:center;flex-shrink:0}.candidate-name{flex:1;overflow-wrap:anywhere;min-width:0}.candidate-name small{display:block;font:10px/1.6 'SFMono-Regular',Consolas,monospace;color:var(--muted);margin-top:4px}.candidate-score{font-size:16px}.candidate-score small{display:block;font-size:9px;color:var(--muted)}.audit-actions{display:flex;gap:10px;margin:18px 0}.rule-list article{border:1px solid var(--line);padding:18px 21px;border-radius:5px;margin:15px 0;font-size:12px;overflow-wrap:anywhere}.rule-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.rule-heading h3{margin:0}.proof-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:25px 0}.proof-grid article{border:1px solid var(--line);padding:17px;border-radius:5px;min-width:0}.proof-grid small{display:block;color:var(--muted);font-size:10px}.proof-grid strong{display:block;font-size:17px;margin-top:9px;overflow-wrap:anywhere}.audit-limits{font-size:12px;color:var(--muted);line-height:1.8;padding-left:20px}.audit-limits li{padding-bottom:12px}.inspect-footer{align-items:center;letter-spacing:0;padding:25px 0 32px;font-size:11px}.inspect-footer button{flex-shrink:0}
@media(max-width:1050px){.inspect-shell{padding-inline:25px}.inspection-layout{grid-template-columns:180px minmax(0,1fr);gap:20px}.stage-panel{padding:24px}.run-verdict{align-items:start;flex-direction:column;gap:17px}.run-verdict dl{flex-wrap:wrap}.inspect-heading{align-items:start;flex-direction:column;gap:15px}.case-select{width:100%;max-width:600px}.method-switch{width:100%}.method-switch button{flex:1}.audit-facts.compact{grid-template-columns:1fr 1fr}}
@media(max-width:700px){.inspect-shell{padding:18px 16px 0}.inspect-top{flex-wrap:wrap;gap:12px}.inspect-top>span{order:3;width:100%;font-size:9px}.inspect-heading h1{font-size:25px}.method-switch{gap:4px}.method-switch button{padding:10px;gap:8px;align-items:start}.method-switch span{font-size:10px}.run-toolbar{gap:14px}.run-toolbar label{flex:1;min-width:0}.run-toolbar select{width:100%}.run-verdict{padding:17px}.run-verdict strong{font-size:22px}.run-verdict dl{gap:17px}.inspection-layout{grid-template-columns:1fr;gap:17px}.stage-nav{position:static;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.stage-nav button{padding:9px 8px;gap:10px;border-color:var(--line);min-width:0}.stage-nav b{font-size:10px}.stage-nav small{font-size:9px}.stage-index{font-size:9px}.stage-panel{padding:21px 17px;min-height:350px}.stage-title h2{font-size:24px}.audit-facts{grid-template-columns:1fr}.audit-funnel{gap:9px}.audit-funnel strong{font-size:23px}.audit-funnel span{font-size:9px}.proof-grid{grid-template-columns:1fr;gap:10px}.proof-grid article{padding:14px}.proof-grid strong{font-size:15px}.audit-code,.audit-raw pre{padding:14px;font-size:11px}.inspect-footer{align-items:start;gap:15px}.inspect-footer span{font-size:10px}.audit-actions{flex-wrap:wrap}}
@media print{.inspect-top,.stage-nav,.run-toolbar,.case-select,.inspect-footer{display:none!important}.inspection-layout{display:block}.inspect-shell{padding:0}.stage-panel{border:0;padding:15px 0}.audit-code,.audit-raw pre{max-height:none}.run-verdict{break-inside:avoid}}
`;
