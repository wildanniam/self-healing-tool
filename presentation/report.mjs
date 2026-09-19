import { ARMS, CATEGORIES, GROUPS } from './data.mjs';
import { RANKING_ARMS } from './ranking-data.mjs';
import { inspectorClient, INSPECTOR_CSS } from './inspector.mjs';
import { REPORT_POLISH as POLISH } from '../dist/report-style.js';
import { UI_TEXT, languageClient } from '../dist/report-language.js';
import { CSS } from './report-style.mjs';
const embed = x => JSON.stringify(x).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
export function renderReport(data) {
    const studies = (data.studies ?? [{ ...data, studyId: 'rm2' }]).map(s => ({ ...s, arms: s.arms ?? ARMS,
        rows: s.rows.map(r => ({ ...r, studyId: s.studyId, evidenceKind: s.evidenceKind, assessed: r.assessed ?? true })) }));
    const view = { ...data, studies, rows: studies.flatMap(s => s.rows) };
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Self-healing · Hasil dan bukti</title><style>${CSS}${INSPECTOR_CSS}${POLISH}</style></head><body>
  <div class="language-bar"><label for="report-language">Language / Bahasa</label><select id="report-language"><option value="en">English</option><option value="id">Bahasa Indonesia</option></select></div><nav class="rail" aria-label="Report"><strong>Self-healing · Hasil dan bukti</strong><span id="generated"></span></nav>
  <main id="overview-view"><header><div class="topline"><div><p id="mode" class="eyebrow"></p><h1>Hasil pemulihan locator</h1></div><div class="actions"><button id="download">Unduh ringkasan JSON</button><button id="print">Cetak</button></div></div>
  <div class="report-navigation"><label id="study-label">Studi<select id="study">${studies.map(s => `<option value="${s.studyId}">${s.studyId === 'rm1' ? 'RM1 · Pemeringkatan DOM' : 'RM2 · Aturan target'}</option>`).join('')}</select></label><div role="group" aria-label="Tampilan"><button id="view-results" aria-pressed="true">Hasil eksekusi</button> <button id="view-comparison" aria-pressed="false">Perbandingan studi</button></div></div>
  <div id="coverage" role="status"></div><p id="scope" class="caption"></p><div class="stats" id="stats"></div></header>
  <section id="cases"><div class="filters"><label class="search-label">Cari kasus<input id="search" type="search" placeholder="ID atau tujuan tes"></label><label>Aplikasi<select id="group"><option value="all">Semua aplikasi</option>${Object.entries(GROUPS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label>Kelompok<select id="category"><option value="all">Semua kelompok</option></select></label><label class="check"><input id="wrong-only" type="checkbox"> Kasus dengan tindakan salah</label></div>
  <div class="section-heading"><p id="case-count" class="caption" role="status"></p><button id="csv">Unduh CSV terfilter</button></div><p class="caption">Pilih hasil ulangan untuk melihat proses. ✓ benar menurut evaluator · ! tindakan salah · — berhenti · ? belum dinilai.</p>
  <div class="table-wrap"><table class="cases"><thead id="case-head"></thead><tbody id="case-rows"></tbody></table></div><div class="pagination"><button id="previous">← Sebelumnya</button><span id="page-number"></span><button id="next">Berikutnya →</button></div></section>
  <section id="comparison" hidden><h2 id="comparison-title"></h2><p class="caption">Seluruh data studi terpilih; filter daftar kasus tidak mengubah perbandingan ini.</p><div class="table-wrap"><table><thead id="metric-head"></thead><tbody id="metrics"></tbody></table></div><p class="caption">Eksekusi berulang bukan kasus independen. Pemulihan, penolakan dan kontrol tidak digabung menjadi satu success rate.</p><details><summary>Konfigurasi yang dibandingkan</summary><div id="arms"></div></details><details><summary>Token, waktu dan asumsi biaya</summary><div id="resources"></div></details></section>
  <details class="provenance"><summary>Sumber dan batas interpretasi</summary><p id="limitations"></p><pre id="provenance"></pre></details><footer>Hasil teknis, jawaban model, keputusan pemeriksa dan efek aplikasi adalah bukti yang berbeda.</footer></main><main id="inspector-root" hidden></main>
  <script>const language=(${languageClient.toString()})(${embed(UI_TEXT)},'en');language.bindStatic(document.documentElement);const data=${embed(view)};(${client.toString()})(data,${embed({ ARMS: { ...ARMS, ...RANKING_ARMS }, CATEGORIES, GROUPS })},${inspectorClient.toString()},language);</script></body></html>`;
}
function client(data, labels, createInspector, language) {
    const t = language.text, ui = language.html;
    labels.language = language;
    const { CATEGORIES, GROUPS } = labels, $ = id => document.getElementById(id), esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const inspector = createInspector(data, labels);
    let page = 0, printing = false;
    const study = () => data.studies.find(s => s.studyId === $('study').value);
    const label = r => r.operational ? t('Gangguan operasional') : r.status !== 'complete' ? t('Belum selesai') : r.wrong ? t('Tindakan salah') : !r.assessed ? t('Ketepatan belum dinilai') : r.correct ? (r.category === 'negative' ? t('Berhenti tepat') : r.recovery ? t('Pulih benar') : t('Aksi awal benar')) : t('Tujuan belum tercapai');
    function groups() { const map = new Map(); for (const r of study().rows) {
        const key = r.group + '/' + r.caseId;
        if (!map.has(key))
            map.set(key, []);
        map.get(key).push(r);
    } const q = $('search').value.trim().toLowerCase(); return [...map.entries()].filter(([, rr]) => { const r = rr[0]; return ($('group').value === 'all' || r.group === $('group').value) && ($('category').value === 'all' || r.category === $('category').value) && (!$('wrong-only').checked || rr.some(x => x.wrong)) && (!q || ui `${r.caseId} ${r.title} ${GROUPS[r.group]}`.toLowerCase().includes(q)); }); }
    const filtered = () => groups().flatMap(([, rr]) => rr);
    function download(name, text, type = 'application/json') { const u = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a'); a.href = u; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
    function metric(title, filter, test) { return ui `<tr><th scope="row">${esc(title)}</th>${Object.keys(study().arms).map(a => { const rr = study().rows.filter(r => r.arm === a && filter(r)); return ui `<td>${rr.length ? ui `${rr.filter(test).length} / ${rr.length}` : '—'}</td>`; }).join('')}</tr>`; }
    function renderComparison() {
        const s = study();
        $('comparison-title').textContent = s.studyId === 'rm1' ? t('Pemeringkatan DOM') : t('Aturan target');
        $('metric-head').innerHTML = t('<tr><th>Metrik / kelompok</th>') + Object.keys(s.arms).map(a => ui `<th>${a} · ${esc(t(s.arms[a].short))}</th>`).join('') + '</tr>';
        const metrics = s.studyId === 'rm1' ? [
            [t('Target pada input pertama'), () => true, r => r.ranking?.targetPresent], [t('Pemulihan benar'), () => true, r => r.correct && r.executed], [t('Tindakan salah'), () => true, r => r.wrong], [t('Berhenti tanpa aksi'), () => true, r => !r.executed && !r.operational]
        ] : [[t('Kontrol: aksi awal benar'), r => r.category === 'control', r => r.correct], [t('Pemulihan biasa · privat: benar'), r => r.category === 'ordinary' && r.group === 'platform', r => r.correct && r.executed], [t('Pemulihan biasa · sintetis: benar'), r => r.category === 'ordinary' && r.group !== 'platform', r => r.correct && r.executed], [t('Negatif: tindakan salah'), r => r.category === 'negative', r => r.wrong], [t('Negatif: berhenti'), r => r.category === 'negative', r => !r.executed && !r.operational], [t('Label menyesatkan: tindakan salah'), r => r.category === 'stress', r => r.wrong], [t('Kontrak missing/stale: aksi benar'), r => r.category === 'quality', r => r.correct && r.executed], [t('Kontrak missing/stale: berhenti'), r => r.category === 'quality', r => !r.executed && !r.operational]];
        $('metrics').innerHTML = metrics.map(args => metric(...args)).join('');
        $('arms').innerHTML = Object.entries(s.arms).map(([a, m]) => ui `<p><b>${a} · ${esc(t(m.title))}</b><br>${esc(t(m.description))}</p>`).join('');
        $('resources').innerHTML = Object.keys(s.arms).map(a => { const rr = s.rows.filter(r => r.arm === a), known = rr.every(r => !r.usage.unknown), n = k => rr.reduce((sum, r) => sum + (r.usage[k] ?? 0), 0), ts = rr.map(r => r.totalMs).filter(Number.isFinite).sort((a, b) => a - b), median = ts.length > 0 && ts.length === rr.length ? (ts[Math.floor((ts.length - 1) / 2)] + ts[Math.floor(ts.length / 2)]) / 2 / 1000 : null; return ui `<p><b>${a}</b> · input ${known ? n('input') : 'unknown'} token · output ${known ? n('output') : 'unknown'} token · biaya ${known && s.price ? 'USD ' + ((n('input') * s.price.inputUsdPerMillion + n('output') * s.price.outputUsdPerMillion) / 1e6).toFixed(8) : 'unknown'} · median ${median == null ? 'unknown' : median.toFixed(3) + ' s'}</p>`; }).join('') + t('<p>Tarif tersimpan, bukan invoice. Waktu termasuk timeout dan instrumentasi. Biaya hanya phase yang ditampilkan.</p>');
    }
    function render() {
        const s = study(), gg = groups(), rr = filtered(), arms = Object.keys(s.arms), pages = Math.max(1, Math.ceil(gg.length / 12));
        page = Math.min(page, pages - 1);
        $('case-head').innerHTML = t('<tr><th>Kasus / tujuan</th><th>Kelompok</th>') + arms.map(a => ui `<th>${a} · ${esc(t(s.arms[a].short))}</th>`).join('') + '</tr>';
        $('case-rows').innerHTML = (printing ? gg : gg.slice(page * 12, page * 12 + 12)).map(([, rs]) => { const r = rs[0]; return ui `<tr><td><b>${esc(r.caseId)}</b><span class="case-title">${esc(r.title)}</span></td><td>${esc(r.profile ? { U: t('Kecil / unik'), D: t('Duplikat / pemilik'), L: t('Padat') }[r.profile] : t(CATEGORIES[r.category]))}<small>${esc(t(GROUPS[r.group]))}</small></td>${arms.map(a => ui `<td><div class="repeat-results">${rs.filter(x => x.arm === a).sort((a, b) => a.repeat - b.repeat).map(x => ui `<button class="result-chip ${x.wrong ? 'bad' : x.correct ? 'good' : 'warn'}" data-row="${esc(x.id)}" aria-label="${esc(ui `${x.caseId} ${a} ulangan ${x.repeat}: ${label(x)}. Lihat proses`)}" title="${esc(label(x))}">${x.repeat} <b>${x.wrong ? '!' : !x.assessed ? '?' : x.correct ? '✓' : x.executed ? '?' : '—'}</b></button>`).join('') || t('Slot tidak tersedia')}</div></td>`).join('')}</tr>`; }).join('') || ui `<tr><td colspan="${arms.length + 2}">Tidak ada kasus yang cocok dengan filter.</td></tr>`;
        $('case-count').textContent = ui `${gg.length} kondisi · ${rr.length} eksekusi sesuai filter`;
        $('page-number').textContent = ui `${page + 1} / ${pages}`;
        $('previous').disabled = page === 0;
        $('next').disabled = page === pages - 1;
        $('stats').innerHTML = [[t('Eksekusi studi'), s.rows.length], [t('Kondisi'), new Set(s.rows.map(r => r.caseId)).size], [t('Tindakan salah'), s.rows.filter(r => r.wrong).length], [t('Berhenti tanpa aksi'), s.rows.filter(r => !r.executed && !r.operational && r.status === 'complete').length]].map(([k, v]) => ui `<div><span>${k}</span><strong>${v}</strong></div>`).join('');
        $('case-rows').querySelectorAll('[data-row]').forEach(b => b.onclick = () => { const r = s.rows.find(r => r.id === b.dataset.row); inspector.open(r.group + '/' + r.caseId, { arm: r.arm, repeat: r.repeat, stage: 'context' }); });
    }
    function selectStudy() {
        const s = study(), historical = s.evidenceKind.startsWith('historical');
        page = 0;
        $('search').value = '';
        $('category').innerHTML = t('<option value="all">Semua kelompok</option>') + [...new Set(s.rows.map(r => r.category))].map(k => ui `<option value="${k}">${esc(t(CATEGORIES[k]))}</option>`).join('');
        $('group').value = 'all';
        $('wrong-only').checked = false;
        $('mode').textContent = historical ? ui `Arsip ${s.studyId === 'rm1' ? 'D33' : 'D30'} · ${s.evaluationDate}` : s.evidenceKind === 'replay' ? t('Replay · keputusan model tersimpan') : t('Demo live · inferensi model baru');
        $('scope').textContent = s.studyId === 'rm1' ? t('12 kondisi × 3 strategi × 3 pengulangan; 108 slot main direncanakan. Kontrak dimatikan.') : historical ? t('D30: 42 kondisi × 3 konfigurasi × 3 pengulangan; 378 slot direncanakan. Sumber yang belum dimuat tetap dinyatakan.') : t('Hasil run peragaan ini; replay bukan pengukuran performa AI baru.');
        const notices = [...(data.coverage ?? []), ...(s.coverage ?? [])];
        if (s.privateAudit)
            notices.push(t('Audit privat lokal aktif; ekspor ringkasan tidak menyertakan diagnostik privat.'));
        if (s.evidenceKind === 'replay')
            notices.push(t('Browser dijalankan ulang dengan jawaban model tersimpan.'));
        if (s.replayMismatches?.length)
            notices.push(t('Replay berbeda: ') + s.replayMismatches.join(', '));
        $('coverage').innerHTML = notices.map(n => ui `<p class="notice">${esc(n)}</p>`).join('');
        $('limitations').textContent = s.studyId === 'rm1' ? t('Membandingkan tiga strategi pada representasi dan batas input yang sama. Belum menguji ranking vs tanpa ranking atau manfaat cleansing tersendiri. Kesimpulan berlaku pada kondisi yang tersedia.') : t('Aturan membantu pada negatif terpilih, tetapi tetap gagal pada label menyesatkan dan dapat menghentikan aksi saat kontrak missing/stale. Bukan diagnosis otomatis bug.');
        $('provenance').textContent = JSON.stringify({ evidenceKind: s.evidenceKind, evaluationDate: s.evaluationDate, sources: s.sources, price: s.price }, null, 2);
        $('study-label').hidden = !historical;
        $('view-comparison').hidden = !historical;
        render();
        renderComparison();
    }
    $('study').onchange = selectStudy;
    for (const id of ['search', 'category', 'group', 'wrong-only'])
        $(id).addEventListener(id === 'search' ? 'input' : 'change', () => { page = 0; render(); });
    $('previous').onclick = () => { page--; render(); };
    $('next').onclick = () => { page++; render(); };
    for (const v of ['results', 'comparison'])
        $('view-' + v).onclick = () => { $('cases').hidden = v !== 'results'; $('comparison').hidden = v !== 'comparison'; for (const k of ['results', 'comparison'])
            $('view-' + k).setAttribute('aria-pressed', String(k === v)); };
    $('download').onclick = () => { const s = study(), selected = filtered(); download('self-healing-results.json', JSON.stringify({ schemaVersion: 1, evidenceKind: s.evidenceKind, studyId: s.studyId, createdAt: data.createdAt, evaluationDate: s.evaluationDate, price: s.price, selection: { group: $('group').value, category: $('category').value, search: $('search').value, wrongCases: $('wrong-only').checked, sourceSlots: s.rows.length }, coverage: [...(s.coverage ?? []), ...(selected.length < s.rows.length ? [ui `Snapshot terfilter: ${selected.length} dari ${s.rows.length} slot sumber.`] : [])], sources: s.sources, privateLoaded: s.privateLoaded, privateAudit: false, rows: selected.map(r => { if (!r.audit?.privateHost)
            return r; const { audit, ...safe } = r; return safe; }) }, null, 2)); };
    $('csv').onclick = () => { const fields = ['studyId', 'caseId', 'arm', 'repeat', 'group', 'category', 'correct', 'wrong', 'executed', 'status'], cell = x => '"' + String(x ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""') + '"'; download('self-healing-filtered.csv', [fields, ...filtered().map(r => fields.map(k => r[k]))].map(row => row.map(cell).join(',')).join('\n'), 'text/csv'); };
    $('print').onclick = () => window.print();
    window.addEventListener('beforeprint', () => { printing = true; render(); });
    window.addEventListener('afterprint', () => { printing = false; render(); });
    $('generated').textContent = t('Dibuat ') + new Date(data.createdAt).toLocaleString('id-ID');
    language.subscribe(() => { const values = Object.fromEntries(['search', 'category', 'group'].map(id => [id, $(id).value])), wrong = $('wrong-only').checked, oldPage = page; selectStudy(); for (const [id, value] of Object.entries(values))
        $(id).value = value; $('wrong-only').checked = wrong; page = oldPage; render(); });
    selectStudy();
}
