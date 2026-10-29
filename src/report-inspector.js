/** Embedded in a standalone HTML report. No network or application execution. */
export function inspectorClient(data, { ARMS, CATEGORIES, GROUPS, ICONS, language }) {
  const t = language.text,
    ui = language.html;
  const library = data.library === true;
  const root = document.getElementById('inspector-root');
  const overview = document.getElementById('overview-view'),
    rail = document.querySelector('.rail');
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const pretty = (x) => JSON.stringify(x, null, 2),
    yes = (x) => (x === true ? t('Ya') : x === false ? t('Tidak') : t('Tidak direkam'));
  const json = (x, title = t('Data yang direkam')) =>
    ui`<details class="audit-raw"><summary>${esc(t(title))}</summary><pre>${esc(pretty(x))}</pre>` +
    ui`</details>`;
  const code = (x) => ui`<pre class="audit-code">${esc(x)}</pre>`;
  const note = (text, tone = '') => ui`<p class="audit-note ${tone}">${esc(t(text))}</p>`;
  const fact = (k, v) =>
    ui`<div><dt>${esc(t(k))}</dt><dd>${esc(v ?? t('Tidak direkam'))}</dd></div>`;
  const reasons = {
    'original-success': t('Locator awal bekerja. Tidak perlu mencari pengganti atau memanggil AI.'),
    recovered: t(
      'Aksi dengan locator pengganti selesai. Ketepatan sasaran tetap dinilai secara terpisah.',
    ),
    abstained: 'AI tidak memilih locator; pemulihan berhenti tanpa menjalankan kandidat.',
    'spec-unknown': t('Bukti belum cukup untuk mengizinkan kandidat sesuai aturan requirement.'),
    'spec-refused': t('Acuan requirement secara eksplisit menolak pemulihan ini.'),
    spec_insufficient_evidence: t(
      'Ada syarat identitas kandidat yang tidak ditemukan pada bukti elemen.',
    ),
    spec_evidence_matched: t(
      'Semua syarat bukti yang dideklarasikan cocok. Ini belum menjamin fungsi bisnisnya benar.',
    ),
    spec_retired: t('Fitur ditandai nonaktif pada aturan yang disuplai.'),
    spec_missing: t('Aturan requirement tidak tersedia. Ini bukan bukti bahwa fiturnya dihapus.'),
    spec_revision_mismatch: t('Versi aturan tidak cocok dengan versi yang diharapkan.'),
    spec_action_mismatch: t('Jenis aksi tidak cocok dengan aturan.'),
    spec_target_unavailable: t('Elemen tidak lagi tersedia ketika akan diperiksa.'),
    ambiguous: t('Locator menunjuk lebih dari satu elemen.'),
    no_match: t('Locator tidak menemukan elemen.'),
    not_visible: t('Elemen tidak terlihat.'),
    not_enabled: t('Elemen tidak aktif.'),
    action_mismatch: t('Elemen tidak cocok dengan jenis aksi.'),
    selector_validation_failed: t('Pemeriksaan locator gagal.'),
    no_candidate: t('Tidak ada kandidat yang dipilih.'),
    'attempt-limit': t('Batas percobaan tercapai.'),
    'time-limit': t('Batas waktu pemulihan tercapai.'),
    'provider-failure': t('Panggilan penyedia AI gagal; pemulihan tidak boleh dianggap berhasil.'),
    'context-failure': t('Pengumpulan konteks gagal.'),
    nonrecoverable: t('Kegagalan awal berada di luar pemulihan locator yang didukung.'),
  };
  const explain = (x) =>
    t(reasons[x]) ??
    (x ? ui`Kode yang direkam: ${x}` : t('Tidak ada alasan kegagalan yang direkam.'));
  const stages = [
    ['context', t('Konteks DOM')],
    ['ai', t('Input dan jawaban AI')],
    ['checks', t('Pemeriksaan')],
    ['outcome', t('Hasil aksi')],
  ];
  const groups = new Map();
  for (const row of data.rows) {
    const key = row.group + '/' + row.caseId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const keys = [...groups.keys()];
  let selectedKey = keys[0],
    arm = 'C',
    repeat = 1,
    attemptNumber = null,
    stage = 'context',
    returnFocus = null;
  const currentRows = () => groups.get(selectedKey) ?? [];
  const selectedRow = () => currentRows().find((r) => r.arm === arm && r.repeat === repeat);
  function selectCase(key) {
    selectedKey = key;
    if (!currentRows().some((r) => r.arm === arm)) arm = currentRows()[0].arm;
    repeat = currentRows().find((r) => r.arm === arm)?.repeat ?? 1;
    attemptNumber = null;
  }
  function download(filename, text, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function close() {
    if (library) return;
    root.hidden = true;
    overview.hidden = false;
    if (rail) rail.style.display = '';
    document.body.classList.remove('inspecting');
    (returnFocus?.isConnected
      ? returnFocus
      : overview.querySelector(
          returnFocus?.dataset.action
            ? `[data-action="${CSS.escape(returnFocus.dataset.action)}"]`
            : returnFocus?.dataset.row
              ? `[data-row="${CSS.escape(returnFocus.dataset.row)}"]`
              : 'button',
        )
    )?.focus();
  }
  function render(focusId) {
    const row = selectedRow(),
      fallback = currentRows()[0],
      availableArms = [...new Set(currentRows().map((r) => r.arm))].sort();
    const audit = row?.audit,
      e = audit?.event,
      attempts = audit?.attempts ?? [],
      attempt = attempts.find((a) => a.number === attemptNumber) ?? attempts[0];
    attemptNumber = attempt?.number ?? null;
    let request = null,
      input = null,
      copyable = null;
    try {
      request = JSON.parse(attempt?.request?.body ?? 'null');
      const message = request?.messages?.find((m) => m.role === 'user');
      input = message ? JSON.parse(message.content) : null;
    } catch {
      /* Raw content remains readable even when user text is not JSON. */
    }
    const observed = attempt?.inputContext ?? audit?.initialContext,
      coverage = attempt?.inputCoverage ?? observed?.coverage ?? input?.coverage;
    const spec = input?.targetSpec ?? observed?.targetSpec,
      decision = attempt?.specDecision;
    const outcome = audit?.outcome;
    const native = e?.stopReason === 'original-success',
      called = attempt?.providerCalled === true;
    const ruleMode = library
      ? e?.targetSpec?.mode === 'enforce'
        ? 'C'
        : e?.targetSpec?.mode === 'context'
          ? 'B'
          : 'A'
      : arm;
    const STOPS = ['abstained', 'spec-refused', 'spec-unknown'];
    const L = (en, id) => (language.current === 'id' ? id : en);
    const locale = language.current === 'id' ? 'id-ID' : 'en-US';
    const num = (x) => (Number.isFinite(x) ? x : null);
    const secs = (ms) => (Number.isFinite(ms) ? (ms / 1000).toFixed(2) + ' s' : '—');
    const count = (x) => (Number.isFinite(x) ? x.toLocaleString(locale) : '—');
    const chip = (text, tone) => `<span class="chip ${tone}">${esc(text)}</span>`;
    const kindOf = (r) =>
      !r
        ? 'missing'
        : r.executed
          ? r.recovery
            ? 'recovered'
            : 'original'
          : r.operational
            ? 'failed'
            : !(r.audit?.event || r.detail) ||
                STOPS.includes(r.audit?.event?.stopReason ?? r.detail?.stop)
              ? 'stopped'
              : 'failed';
    const kind = kindOf(row);
    const final = attempts.find((a) => a.actionExecuted) ?? attempts[attempts.length - 1];
    const requests = attempts.filter((a) => a.providerCalled).length;
    const refused = final?.specDecision && final.specDecision.outcome !== 'accepted';
    const KIND = {
      recovered: [L('Recovered', 'Pulih'), 'b-teal', ICONS.check],
      original: [L('Original locator worked', 'Locator asli berhasil'), 'b-slate', ''],
      stopped: [L('Stopped before acting', 'Berhenti sebelum aksi'), 'b-amber', ICONS.stop],
      failed: [
        row?.operational
          ? L('Operational failure', 'Gangguan operasional')
          : L('Not recovered', 'Tidak pulih'),
        'b-red',
        ICONS.cross,
      ],
      missing: [L('Run unavailable', 'Run tidak tersedia'), 'b-slate', ''],
    };
    const SHORT = {
      recovered: [L('Recovered', 'Pulih'), 'b-teal', ICONS.check],
      original: [L('Original', 'Locator asli'), 'b-slate', ''],
      stopped: [L('Stopped', 'Berhenti'), 'b-amber', ICONS.stop],
      failed: [L('Failed', 'Gagal'), 'b-red', ICONS.cross],
      missing: [L('Unavailable', 'Tidak tersedia'), 'b-slate', ''],
    };
    const verdict = !row
      ? ''
      : row.wrong
        ? chip(L('Assessed: wrong action', 'Dinilai: aksi salah'), 'c-bad')
        : row.assessed === false
          ? chip(L('Correctness: not assessed', 'Ketepatan: belum dinilai'), 'c-neutral')
          : row.correct
            ? chip(
                row.executed
                  ? L('Assessed: correct', 'Dinilai: benar')
                  : L('Assessed: correct stop', 'Dinilai: berhenti tepat'),
                'c-ok',
              )
            : chip(L('Assessed: goal not met', 'Dinilai: tujuan tidak tercapai'), 'c-bad');
    const aiChip =
      native || !row || !audit
        ? ''
        : requests
          ? chip(
              `${L('AI-assisted', 'Dibantu AI')} · ${requests} ${requests === 1 ? 'request' : L('requests', 'request')}`,
              'c-ai',
            )
          : audit.config?.mode === 'ranker-only'
            ? chip(L('Ranker only · no AI', 'Hanya ranker · tanpa AI'), 'c-neutral')
            : row.recovery
              ? chip(L('No AI request', 'Tanpa request AI'), 'c-neutral')
              : '';
    const checksChip =
      native || !final
        ? ''
        : refused
          ? chip(L('Target rule not satisfied', 'Aturan target tidak terpenuhi'), 'c-warn')
          : final.candidateAccepted
            ? chip(L('Live checks passed', 'Cek halaman lolos'), 'c-ok')
            : final.validations?.length
              ? chip(L('Rejected by live checks', 'Ditolak cek halaman'), 'c-bad')
              : '';
    function status(id) {
      if (!row) return [t('Slot tidak tersedia'), 'slate'];
      if (!audit) return [t('Bukti belum dimuat'), 'slate'];
      if (id === 'outcome') {
        const done = row.executed
          ? L('Executed', 'Dijalankan')
          : L('Not executed', 'Tidak dijalankan');
        return row.wrong
          ? [`${done} · ${L('wrong action', 'aksi salah')}`, 'red']
          : row.assessed === false
            ? [`${done} · ${L('not assessed', 'belum dinilai')}`, 'slate']
            : row.correct
              ? [`${done} · ${L('correct', 'benar')}`, 'teal']
              : [`${done} · ${L('goal not met', 'tujuan tidak tercapai')}`, 'red'];
      }
      if (native) return [t('Dilewati'), 'slate'];
      if (id === 'context') {
        const sent = num(coverage?.included);
        return !observed && !coverage
          ? [t('Tidak direkam'), 'slate']
          : sent === null
            ? [t('Terekam'), 'teal']
            : [
                `${count(sent)} ${sent === 1 ? L('candidate', 'kandidat') : L('candidates', 'kandidat')} ${called ? L('sent', 'dikirim') : L('kept', 'disimpan')}`,
                'teal',
              ];
      }
      if (id === 'ai') {
        if (!called)
          return audit.config?.mode === 'ranker-only'
            ? [L('Ranker only · no AI', 'Hanya ranker · tanpa AI'), 'slate']
            : [t('Tidak dipanggil'), 'slate'];
        const input = Boolean(attempt.request?.body),
          output = typeof attempt.response?.text === 'string';
        return input && output
          ? [
              attempt.request.integrity === 'verified'
                ? L('1 request · verified', '1 request · terverifikasi')
                : L('1 request · recorded', '1 request · terekam'),
              'ai',
            ]
          : output
            ? [L('Output recorded; input unavailable', 'Output terekam; input tidak ada'), 'amber']
            : input
              ? [
                  L('Input recorded; output unavailable', 'Input terekam; output tidak ada'),
                  'amber',
                ]
              : [L('Parsed output only', 'Hanya hasil parsing'), 'amber'];
      }
      if (attempt?.specDecision && attempt.specDecision.outcome !== 'accepted')
        return [L('Stopped by target rule', 'Dihentikan aturan target'), 'amber'];
      return attempt?.candidateAccepted
        ? [L('Basic checks passed', 'Cek dasar lolos'), 'teal']
        : attempt?.validations?.length
          ? [L('Rejected', 'Ditolak'), 'red']
          : [L('Not reached', 'Belum tercapai'), 'slate'];
    }
    const methodCopy = t(ARMS[arm]?.description ?? '');
    const original = e?.originalSelector ?? row?.detail?.original;
    const proposal = final?.proposedSelector ?? final?.selector ?? null;
    const loc = (tone, label, value, sub) =>
      `<div class="loc ${tone}"><span class="loc-label">${esc(label)}</span>` +
      (value === undefined ? '' : `<code>${esc(value ?? t('Tidak direkam'))}</code>`) +
      `<span class="loc-sub">${esc(sub)}</span></div>`;
    const failedFirst = e?.originalFailure
      ? e.originalFailure.classification === 'missing-locator'
        ? `${L('No element matched', 'Tidak ada elemen yang cocok')} · ${e.originalFailure.name}`
        : e.originalFailure.name
      : L('The original action failed', 'Aksi awal gagal');
    const locators = !row
      ? note(t('Eksekusi untuk pilihan ini tidak tersedia. Tidak ada hasil yang diasumsikan.'))
      : native || kind === 'original'
        ? `<div class="xform is-single">${loc('same', L('Original locator', 'Locator asli'), original, t('Locator awal berhasil. Tidak ada DOM recovery, request AI, atau pemeriksaan kandidat pengganti.'))}</div>`
        : `<div class="xform">${loc('old', L('Original locator', 'Locator asli'), original, failedFirst)}<span class="xform-arrow">${ICONS.arrow}<span class="sr-only">${L('then', 'lalu')}</span></span>` +
          (kind === 'recovered'
            ? loc(
                'new',
                L('Replacement', 'Pengganti'),
                final?.selector,
                requests
                  ? L(
                      'Proposed by AI · accepted by live checks',
                      'Diusulkan AI · lolos cek halaman',
                    )
                  : L(
                      'Selected by the ranker · accepted by live checks',
                      'Dipilih ranker · lolos cek halaman',
                    ),
              )
            : kind === 'stopped'
              ? loc(
                  'prop',
                  L('Proposed · not executed', 'Diusulkan · tidak dijalankan'),
                  proposal ?? t('null — tidak ada locator yang dipilih'),
                  refused
                    ? final.candidateAccepted
                      ? L(
                          'Passed basic checks · failed target rule',
                          'Lolos cek dasar · gagal aturan target',
                        )
                      : L('Stopped by target rule', 'Dihentikan aturan target')
                    : explain(e?.stopReason),
                )
              : loc(
                  'fail',
                  proposal
                    ? L('Last proposal · not executed', 'Usulan terakhir · tidak dijalankan')
                    : L('No replacement', 'Tanpa pengganti'),
                  proposal ?? undefined,
                  explain(e?.stopReason),
                )) +
          `</div>`;
    const usage = attempts.filter((a) => a.usage);
    const facts = row
      ? `<div class="result-facts">` +
        (native
          ? ''
          : `<span><b>${attempts.length}</b> ${attempts.length === 1 ? L('attempt', 'percobaan') : L('attempts', 'percobaan')}</span>`) +
        (usage.length && requests
          ? `<span><b>${count(usage.reduce((s, a) => s + (a.usage.inputTokens ?? 0), 0))} → ${count(usage.reduce((s, a) => s + (a.usage.outputTokens ?? 0), 0))}</b> ${L('tokens', 'token')}</span>`
          : '') +
        `<span>${L('total', 'total')} <b>${secs(row.totalMs ?? e?.totalMs)}</b></span>` +
        `<label class="attempt-pick" ${attempts.length > 1 ? '' : 'hidden'}>${L('Showing', 'Menampilkan')} <select id="audit-attempt" ${attempts.length ? '' : 'disabled'}>${attempts.map((a) => `<option value="${a.number}" ${a.number === attemptNumber ? 'selected' : ''}>${L('attempt', 'percobaan')} ${a.number}</option>`).join('')}</select></label></div>`
      : '';
    function timeline() {
      const total = num(e?.totalMs) ?? num(row?.totalMs);
      if (!e || total === null) return '';
      const ai = attempts.reduce((s, a) => s + (num(a.providerMs) ?? 0), 0),
        timeout = num(audit?.config?.actionTimeoutMs);
      const parts = native
        ? [['t-ok', L('Original action', 'Aksi awal'), num(e.originalMs) ?? total, '']]
        : [
            [
              't-orig',
              L('Original attempt', 'Percobaan awal'),
              num(e.originalMs),
              timeout ? `timeout ${secs(timeout)}` : '',
            ],
            [
              't-recovery',
              L('Recovery', 'Pemulihan'),
              num(e.internalMs),
              ai ? `AI ${secs(ai)}` : '',
            ],
            ...(kind === 'recovered'
              ? [
                  [
                    't-retry',
                    L('Retry with replacement', 'Ulang dengan pengganti'),
                    num(e.retryMs),
                    '',
                  ],
                ]
              : []),
          ];
      const end =
        kind === 'stopped'
          ? ['t-stop', L('Stopped · no retry', 'Berhenti · tanpa ulang')]
          : kind === 'failed'
            ? ['t-fail', L('Not recovered', 'Tidak pulih')]
            : null;
      return (
        `<section class="timeline"><div class="tl-head"><h2>${native ? L('Action timeline', 'Linimasa aksi') : L('Recovery timeline', 'Linimasa pemulihan')}</h2><b>${secs(total)}</b></div>` +
        `<div class="tl-bar" aria-hidden="true">${parts
          .filter(([, , ms]) => ms > 0)
          .map(([tone, , ms]) => `<i class="${tone}" style="flex-grow:${ms}"></i>`)
          .join('')}${end ? `<i class="${end[0]} tl-end"></i>` : ''}</div>` +
        `<ul class="tl-legend">${parts.map(([tone, label, ms, extra]) => `<li><i class="${tone}"></i>${esc(label)} <b>${secs(ms)}</b>${extra ? `<small>${esc(extra)}</small>` : ''}</li>`).join('')}${end ? `<li><i class="${end[0]}"></i>${esc(end[1])}</li>` : ''}</ul></section>`
      );
    }
    function sidebar() {
      const live = data.evidenceKind === 'live-provider-run',
        config = row?.audit?.config ?? fallback?.audit?.config,
        recorded = new Date(data.createdAt);
      return (
        `<aside class="side"><h2 class="side-title">${L('Actions', 'Aksi')} · ${keys.length}</h2><nav class="side-list" aria-label="${L('Actions', 'Aksi')}">` +
        keys
          .map((k) => {
            const r = groups.get(k)[0],
              [label, tone, icon] = SHORT[kindOf(r)],
              used = (r.audit?.attempts ?? []).some((a) => a.providerCalled);
            return `<button type="button" class="side-item" id="action-${esc(r.caseId)}" data-key="${esc(k)}" aria-current="${k === selectedKey}"><span class="badge ${tone}">${icon}${esc(label)}</span><b>${esc(r.title)}</b><span>${esc(r.audit?.event?.action ?? '')} · ${used ? 'AI' : L('no AI', 'tanpa AI')} · ${secs(r.totalMs)}</span></button>`;
          })
          .join('') +
        `</nav><dl class="run-box"><div><dt>${L('Run', 'Run')}</dt><dd>${data.evidenceKind === 'live-provider-run' ? L('Live AI run', 'Run AI langsung') : L('Offline mechanism check', 'Cek mekanisme offline')}</dd></div>` +
        (live && config?.model
          ? `<div><dt>${L('Model', 'Model')}</dt><dd>${esc(config.model)}</dd></div>`
          : '') +
        (config?.mode
          ? `<div><dt>${L('Mode', 'Mode')}</dt><dd>${esc(config.mode)}</dd></div>`
          : '') +
        (Number.isNaN(recorded.getTime())
          ? ''
          : `<div><dt>${L('Recorded', 'Direkam')}</dt><dd>${esc(recorded.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }))}</dd></div>`) +
        `</dl><button type="button" id="audit-download" ${audit ? '' : 'disabled'}>${ICONS.download}${L('Action evidence JSON', 'JSON bukti aksi')}</button></aside>`
      );
    }
    function toolbar() {
      return (
        ui`<div class="inspect-top"><button id="audit-back">← Semua hasil</button>` +
        `<span class="evidence-kind">${esc(audit?.privateHost ? t('AUDIT LOKAL · BUKTI APLIKASI PRIVAT') : (row?.evidenceKind ?? data.evidenceKind) === 'replay' ? t('REPLAY · KEPUTUSAN AI TERSIMPAN') : (row?.evidenceKind ?? data.evidenceKind) === 'live-demo' ? t('DEMO LIVE · PANGGILAN BARU') : row?.studyId === 'rm1' ? t('BUKTI TERSIMPAN · D33 MAIN') : t('BUKTI TERSIMPAN · D30'))}</span>` +
        ui`<button id="audit-download" ${audit ? '' : 'disabled'}>Unduh bukti run</button></div>` +
        ui`<div class="run-toolbar"><label class="case-select">Pindah kasus<select id="audit-case">${keys
          .map((k) => {
            const r = groups.get(k)[0];
            return ui`<option value="${esc(k)}" ${k === selectedKey ? 'selected' : ''}>${esc(r.caseId + ' · ' + t(r.title))}</option>`;
          })
          .join('')}</select></label>` +
        ui`<div class="method-switch" role="group" aria-label="Konfigurasi">${availableArms.map((a) => ui`<button id="audit-arm-${a}" data-arm="${a}" aria-pressed="${arm === a}">` + ui`<b>${a}</b><span>${esc(t(ARMS[a]?.short ?? a))}</span></button>`).join('')}</div>` +
        ui`<label>Pengulangan<select id="audit-repeat">${[
          ...new Set(currentRows().map((r) => r.repeat)),
        ]
          .sort((a, b) => a - b)
          .map(
            (n) => ui`<option value="${n}" ${n === repeat ? 'selected' : ''}>Ulangan ${n}</option>`,
          )
          .join('')}</select></label></div>` +
        `<p class="method-explainer">${esc(methodCopy)}</p>`
      );
    }
    const [kindLabel, kindTone, kindIcon] = KIND[kind];
    const nextStage = stages[(stages.findIndex((x) => x[0] === stage) + 1) % stages.length];
    root.innerHTML =
      `<div class="inspect-shell ${library ? 'is-library' : 'is-archive'}">` +
      (library ? sidebar() : toolbar()) +
      `<div class="inspect-main"><section class="result-card run-verdict ${row?.wrong ? 'is-wrong' : row?.correct ? 'is-correct' : 'is-unknown'}">` +
      `<div class="result-chips"><span class="badge ${kindTone}">${kindIcon}${esc(kindLabel)}</span>${aiChip}${checksChip}<span class="result-verdict">${verdict}</span></div>` +
      `<h1 class="result-title"><span>${esc(t(fallback.title))}</span>${e?.action ? `<span class="tag">${esc(e.action)}</span>` : ''}${library ? '' : `<small>${esc(fallback.caseId)} · ${esc(t(GROUPS[fallback.group] ?? ''))} · ${esc(t(CATEGORIES[fallback.category] ?? ''))} · ${esc(arm)} · ${L('repeat', 'ulangan')} ${esc(repeat)}</small>`}</h1>` +
      locators +
      facts +
      timeline() +
      `</section><nav class="stage-nav" aria-label="${L('Execution stages', 'Tahap eksekusi')}">${stages
        .map(([id, title], i) => {
          const [text, tone] = status(id);
          return `<button id="stage-${id}" data-stage="${id}" aria-current="${stage === id ? 'step' : 'false'}"><span class="stage-index">${i + 1}</span><span class="stage-text"><b>${esc(t(title))}</b><small><i class="dot dot-${tone}"></i>${esc(text)}</small></span></button>`;
        })
        .join('')}</nav>` +
      `<section class="stage-panel" aria-labelledby="stage-title"><h2 id="stage-title">${esc(t(stages.find((s) => s[0] === stage)[1]))}</h2>${groupContent()}` +
      `<footer class="panel-foot"><span class="info-note">${ICONS.info}${esc(t('Hasil tes, keputusan pemeriksa, dan usulan AI adalah bukti yang berbeda.'))}</span>` +
      `<button id="audit-next-stage" class="primary">${stage === 'outcome' ? esc(t('Kembali ke konteks DOM')) : `${L('Next', 'Berikutnya')}: ${esc(t(nextStage[1]))}${ICONS.arrow}`}</button></footer></section>` +
      `<details class="evidence-details"><summary>${L('About this evidence · sources and configuration', 'Tentang bukti ini · sumber dan konfigurasi')}</summary>${content('source')}</details>` +
      `</div></div>`;
    function groupContent() {
      if (stage === 'ai')
        return (
          t('<div class="paired-block"><h3>Input ke AI</h3>') +
          content('request') +
          t('</div><div class="paired-block"><h3>Jawaban AI</h3>') +
          content('response') +
          '</div>'
        );
      if (stage === 'checks')
        return (
          content('validation') + t('<h3 class="sec-label">Aturan target</h3>') + content('rules')
        );
      if (stage === 'context')
        return (
          content('context') +
          t('<details class="evidence-row"><summary>Aksi awal dan locator yang gagal</summary>') +
          content('start') +
          '</details>'
        );
      return content(stage);
    }
    function content(stage) {
      if (!row)
        return note(
          t('Eksekusi untuk pilihan ini tidak tersedia. Tidak ada hasil yang diasumsikan.'),
        );
      if (!audit)
        return note(
          t(
            'Detail diagnostik belum dimuat. Untuk arsip privat, aktifkan opsi audit lokal saat membuat report. Angka ringkasan tetap berasal dari hasil tersimpan.',
          ),
        );
      if (stage === 'source')
        return (
          note(
            t(
              'Bukti ini dibaca dari rekaman. Tampilan tidak menjalankan ulang AI atau merekonstruksi tahapan yang tidak direkam.',
            ),
          ) +
          json(audit.source, t('Identitas sumber')) +
          json(audit.config, t('Konfigurasi yang direkam')) +
          ui`<ul class="audit-limits">${(audit.missing ?? []).map((x) => ui`<li>${esc(t(x))}</li>`).join('')}</ul>` +
          note(
            t(
              'Respons model tidak berisi penjelasan pemikiran internal. Alasan penolakan yang ditampilkan berasal dari validator dan aturan, bukan alasan yang dikarang atas nama AI.',
            ),
          )
        );
      if (stage === 'start')
        return (
          ui`<p class="stage-intro">Apa yang hendak dilakukan test sebelum proses self-healing.</p>` +
          ui`<dl class="audit-facts">${fact(t('Tujuan tes'), e?.task?.description)}${fact(t('Jenis aksi'), e?.action)}${fact(t('Locator awal'), e?.originalSelector)}${fact(t('Pemulihan dipicu'), yes(e?.recoveryTriggered))}${fact(t('Kegagalan awal'), e?.originalFailure ? ui`${e.originalFailure.name} · ${e.originalFailure.classification}` : t('Tidak ada kegagalan yang direkam'))}</dl>` +
          note(
            native
              ? t(
                  'Aksi asli sudah berhasil. Jadi hasil ini tidak membuktikan kemampuan AI memperbaiki locator; ini kontrol untuk memastikan perilaku normal tetap berjalan.',
                )
              : explain(e?.stopReason),
          ) +
          json(e, t('Event runtime lengkap yang tersedia'))
        );
      if (stage === 'outcome') {
        const checks = audit.privateHost
          ? [
              [t('Oracle tujuan tes'), outcome?.oracleCorrect],
              [t('Field/entitas lain tetap sesuai'), outcome?.guardUnchanged],
              [t('Ada efek salah'), row.wrong],
            ]
          : [
              [t('Penilaian semantik'), outcome?.assessment?.semantic],
              [t('Ada efek salah'), outcome?.assessment?.wrongEffect],
              [
                t('Tujuan yang diharapkan'),
                outcome?.assessment?.goalExpected ?? outcome?.expectation?.goalExpected,
              ],
            ];
        const explanation =
          row.assessed === false
            ? t(
                'Belum ada penilaian independen atas ketepatan aksi ini. Status aksi selesai hanya membuktikan eksekusi.',
              )
            : row.wrong
              ? t(
                  'Evaluator mencatat efek yang salah. Locator valid atau aksi selesai tidak mengubah hasil ini menjadi benar.',
                )
              : row.correct && native
                ? t(
                    'Aksi awal berhasil, dan evaluator menilai tujuan tercapai tanpa efek salah. Tidak ada perbaikan AI pada run ini.',
                  )
                : row.correct && row.category === 'negative'
                  ? t(
                      'Untuk kondisi ini, tindakan yang diharapkan adalah tidak mengubah sasaran lain. Berhenti merupakan hasil yang tepat, bukan recovery berhasil.',
                    )
                  : row.correct
                    ? t(
                        'Evaluator menilai tujuan tes tercapai tanpa efek salah. Ini penilaian sesudah aksi, terpisah dari persetujuan locator.',
                      )
                    : t(
                        'Tujuan tes belum tercapai. Lihat riwayat percobaan dan hasil pemeriksaan; berhenti aman tidak sama dengan pemulihan berhasil.',
                      );
        return (
          ui`<p class="stage-intro">${esc(explanation)}</p><div class="proof-grid">${checks.map(([k, v]) => ui`<article><small>${esc(k)}</small><strong>${esc(typeof v === 'boolean' ? yes(v) : (v ?? t('Tidak direkam')))}</strong>` + ui`</article>`).join('')}</div>` +
          note(
            t(
              'Bukti evaluator berada di luar input AI. Status “benar” berasal dari pengujian efek aplikasi, bukan pengakuan AI.',
            ),
          ) +
          json(outcome, t('Hasil / keadaan aplikasi yang direkam')) +
          json(audit.assessments, t('Penilaian tiap event / attempt')) +
          (audit.calls ? json(audit.calls, t('Riwayat aksi dan efek yang diamati')) : '') +
          note(
            t(
              'Rekaman tidak selalu memuat nilai expected, before, dan after secara lengkap. Flag oracle adalah hasil pemeriksa yang direkam; jangan menganggapnya sebagai snapshot yang tidak tersedia.',
            ),
          )
        );
      }
      if (native)
        return note(
          t(
            'Tahap ini dilewati: locator awal berhasil. Tidak ada proses healing, request AI, atau kandidat pengganti pada run ini.',
          ),
          'skipped',
        );
      if (stage === 'context') {
        if (!observed)
          return note(
            t('Konteks DOM untuk tahap ini tidak direkam atau pengumpulan belum tercapai.'),
          );
        const candidates = observed.candidates ?? [];
        const ranking = row.ranking
          ? ui`<div class="target-proof"><b>Target pada input: ${yes(row.ranking.targetPresent)}</b>` +
            ui`<p>Peringkat target ${esc(row.ranking.rank)} · lolos top-30 ${yes(row.ranking.top30)} · lolos budget ${yes(row.ranking.afterBudget)}</p>` +
            ui`<small>Anotasi evaluator sesudah pengumpulan; bukan jawaban yang diberikan ke AI.</small>` +
            ui`</div>`
          : '';
        const c = coverage ?? {},
          shown = 8,
          arrow = `<span class="fn-arrow" aria-hidden="true">${ICONS.arrow}</span>`;
        const meter = (label, used, limit, unit = '') =>
          Number.isFinite(used) && Number.isFinite(limit) && limit > 0
            ? `<div class="meter"><div class="m-top"><span>${esc(label)}</span><b>${count(used)} <small>/ ${count(limit)}${unit}</small></b></div>` +
              `<div class="m-bar" aria-hidden="true"><i style="width:${Math.min(100, (used / limit) * 100).toFixed(1)}%"></i></div></div>`
            : '';
        const card = (x, i) =>
          `<article class="cand"><span class="rank">#${i + 1}</span><div class="c-body"><div class="c-title"><b>${esc(x.label || x.features?.text || x.features?.name || x.tag)}</b>` +
          `<code>${esc(x.selector || t('Tidak ada locator terverifikasi'))}</code></div><div class="c-meta">${x.tag ? `<span class="tag">${esc(x.tag)}</span>` : ''}` +
          `${x.container ? `<span>${esc(x.container)}</span>` : ''}${x.duplicateCount > 1 ? chip(`${x.duplicateCount} ${L('similar elements', 'elemen serupa')}`, 'c-warn') : ''}</div></div>` +
          `<div class="score"><small>${L('score', 'skor')}</small><b>${esc(x.score ?? '—')}</b></div></article>`;
        if (typeof observed.cleanedDom === 'string') copyable = observed.cleanedDom;
        return (
          ranking +
          (audit.config?.mode === 'ranker-only'
            ? `<p class="stage-intro">${L('Elements are filtered for the action, cleaned and ranked. Without a model, the top candidate is checked on the page.', 'Elemen disaring sesuai aksi, dibersihkan, lalu diberi peringkat. Tanpa model, kandidat teratas langsung diperiksa di halaman.')}</p>`
            : ui`<p class="stage-intro">Elemen disaring sesuai aksi, informasinya dibersihkan, lalu kandidat diberi skor dan dibatasi sebelum dikirim ke AI.</p>`) +
          `<div class="funnel"><div class="fn"><b>${count(c.scanned)}</b><span>${L('Elements scanned', 'Elemen dipindai')}</span></div>${arrow}` +
          `<div class="fn"><b>${count(c.discovered)}</b><span>${L('Candidates found', 'Kandidat ditemukan')}${Number.isFinite(c.ineligible) ? ` <small>(${count(c.ineligible)} ${L('ineligible', 'tidak eligible')})</small>` : ''}</span></div>${arrow}` +
          `<div class="fn hl"><b>${count(c.included)}</b><span>${called ? L('Sent to AI', 'Dikirim ke AI') : L('Included in context', 'Masuk konteks')}${Number.isFinite(c.omitted) ? ` · ${count(c.omitted)} ${L('omitted', 'dibuang')}` : ''}</span></div></div>` +
          `<h3 class="sec-label">${L('Input limits used', 'Batas input terpakai')}${c.textTruncated ? chip(L('text truncated', 'teks dipotong'), 'c-warn') : ''}</h3>` +
          `<div class="meters">${meter(L('Candidates', 'Kandidat'), c.included, c.candidateLimit)}${meter(L('Page context', 'Konteks halaman'), c.domChars, c.domLimit, ' ' + L('chars', 'karakter'))}` +
          `${meter(L('Full request', 'Request lengkap'), c.payloadChars, c.payloadLimit, ' ' + L('chars', 'karakter'))}</div>` +
          `<h3 class="sec-label">${L('Candidates in ranked order', 'Kandidat sesuai peringkat')}${chip(String(candidates.length), 'c-neutral')}</h3>` +
          (candidates.length
            ? `<div class="cand-list">${candidates.slice(0, shown).map(card).join('')}</div>` +
              (candidates.length > shown
                ? `<details class="evidence-row"><summary>${L('Show', 'Tampilkan')} ${candidates.length - shown} ${L('more candidates', 'kandidat lagi')}</summary><div class="cand-list">${candidates
                    .slice(shown)
                    .map((x, i) => card(x, i + shown))
                    .join('')}</div></details>`
                : '')
            : note(
                L(
                  'No candidates were recorded for this attempt.',
                  'Tidak ada kandidat yang terekam untuk attempt ini.',
                ),
              )) +
          ui`<p class="audit-muted">Skor di bawah adalah hasil ranking yang disimpan, bukan skor yang dihitung ulang oleh report. Rincian bobot per fitur tidak direkam.</p>` +
          (typeof observed.cleanedDom === 'string'
            ? `<h3 class="sec-label">${L('Cleaned page excerpt', 'Cuplikan halaman yang dibersihkan')} · ${count(observed.cleanedDom.length)} ${L('chars', 'karakter')}</h3>` +
              `<div class="codebox"><div class="code-head"><span>HTML</span><button type="button" id="audit-copy-dom">${L('Copy', 'Salin')}</button></div><pre class="audit-code">${esc(observed.cleanedDom)}</pre></div>`
            : note(
                t(
                  'Tidak ada HTML tambahan pada konteks ini. Informasi DOM dikirim sebagai daftar kandidat dan atribut yang sudah dipilih; bukan berarti proses pemilihan/pembersihan DOM tidak berjalan.',
                ),
              )) +
          note(
            attempt?.inputContext
              ? t(
                  'Ini konteks yang direkam untuk attempt terpilih. Payload yang benar-benar dikirim tersedia di Input ke AI.',
                )
              : t('Ini konteks awal event; konteks khusus attempt tidak tersedia.'),
          ) +
          json(candidates, t('Fitur, owner, duplikasi dan usulan locator')) +
          json(coverage, t('Seluruh hitungan, batas karakter dan pemotongan')) +
          (audit.dom
            ? json(audit.dom.raw, t('DOM mentah yang direkam')) +
              json(audit.dom.cleaned, t('DOM setelah cleansing yang direkam')) +
              json(audit.dom.ranked, t('Seluruh kandidat setelah ranking; sebelum budget')) +
              json(audit.dom.observations, t('Observasi dan tahapan seleksi'))
            : note(
                library
                  ? t('Pre-cleansing DOM is not included in this library report.')
                  : t('DOM mentah sebelum cleansing dan elemen yang dibuang tidak direkam.'),
              ))
        );
      }
      if (stage === 'request') {
        if (!called) return note(t('Tidak ada pemanggilan provider pada attempt ini.'));
        if (!attempt.request?.body)
          return (
            note(
              ui`Body request tidak tersedia untuk ditampilkan. Status: ${attempt.request?.status ?? 'missing'}.`,
            ) + json(attempt.request, t('Identitas request yang tersedia'))
          );
        const p = attempt.request;
        const integrity =
          p.status === 'redacted'
            ? t('Salinan mengandung redaksi secret; tidak byte-identik.')
            : p.integrity === 'verified'
              ? t('Request asli tersimpan · SHA-256 cocok.')
              : t('Integritas request belum terverifikasi atau berbeda.');
        return (
          note(integrity, 'integrity-' + p.integrity) +
          ui`<p class="audit-muted">${esc(input?.candidates?.length ?? t('Jumlah tidak direkam'))} kandidat pada pesan user. Buka pesan untuk melihat seluruh input.</p>` +
          (request?.messages ?? [])
            .map(
              (m, i) =>
                ui`<details class="audit-raw"><summary>${esc(m.role)} · pesan ${i + 1} lengkap</summary>${code(m.content)}</details>`,
            )
            .join('') +
          (ui`<div class="audit-actions"><button id="audit-request-download">Unduh body request</button>` +
            ui`<button id="audit-request-copy">Salin request</button></div><details><summary>Model, batas dan integritas request</summary>` +
            ui`<dl class="audit-facts">${fact(t('Model diminta'), request?.model)}${fact('Temperature', request?.temperature)}${fact(t('Batas output'), request?.max_tokens)}${fact(t('Ukuran body'), p.bytes + ' bytes')}${fact(t('Tujuan dalam pesan user'), input?.task?.description ?? t('Lihat pesan asli'))}</dl>`) +
          json(p, t('Hash dan status integritas')) +
          (library
            ? ''
            : note(
                arm.startsWith('R')
                  ? t('RM1 memakai proyeksi tanpa skor; kontrak dimatikan.')
                  : arm === 'A'
                    ? t('Tidak ada targetSpec tambahan pada metode A.')
                    : t(
                        'B dan C memasukkan targetSpec ke pesan user; hanya C menegakkannya lewat kode sebelum aksi.',
                      ),
              )) +
          '</details>'
        );
      }
      if (stage === 'response') {
        if (!called) return note(t('Provider tidak dipanggil pada attempt ini.'));
        const raw = attempt.response?.text,
          hasOutput = typeof raw === 'string';
        const outputRedacted =
          attempt.response?.status === 'redacted'
            ? note(t('Redacted output copy; original hash retained.'))
            : attempt.response?.status === 'withheld'
              ? note(t('Output capture withheld by the diagnostic size limit.'))
              : '';
        return (
          outputRedacted +
          (attempt.response?.status === 'replayed'
            ? note(t('Keputusan model diputar ulang; bukan inferensi AI baru.'))
            : hasOutput
              ? ''
              : note(
                  t('Respons mentah tidak direkam. Yang tersedia hanya locator hasil parsing.'),
                )) +
          (hasOutput
            ? ui`<p class="audit-muted">Output provider yang tersimpan</p>${code(raw)}`
            : '') +
          (ui`<p class="audit-muted">Locator hasil parsing</p>${code(attempt.failure === 'abstained' ? t('null — tidak ada locator yang dipilih') : (attempt.proposedSelector ?? t('Tidak direkam')))}<details>` +
            ui`<summary>Metadata output dan observasi lanjutan</summary><dl class="audit-facts">${fact(t('Model yang dikembalikan'), attempt.providerMetadata?.returnedModel)}${fact('Finish reason', attempt.providerMetadata?.finishReason)}${fact('Input tokens', attempt.usage?.inputTokens)}${fact('Output tokens', attempt.usage?.outputTokens)}</dl>`) +
          json(attempt.observationRefresh ?? null, t('Observasi ulang setelah tidak ada pilihan')) +
          note(
            t(
              'Format respons meminta selector atau null. Tidak ada alasan naratif AI yang bisa diaudit jika model tidak mengeluarkan alasan tersebut.',
            ),
          ) +
          '</details>'
        );
      }
      if (stage === 'validation') {
        return (
          ui`<p class="stage-intro">Pemeriksaan dasar memastikan usulan bisa dipakai pada elemen yang tepat secara struktur: satu target, terlihat, aktif, dan cocok dengan aksi.</p>` +
          `<h3 class="sec-label">${L('Basic checks', 'Cek dasar')} · ${attempt?.candidateAccepted ? L('all passed', 'semua lolos') : attempt?.validations?.length ? L('rejected', 'ditolak') : L('not reached', 'belum tercapai')}</h3>` +
          (attempt?.candidateAccepted
            ? `<ul class="check-grid">${[
                L('One match', 'Tepat satu elemen'),
                L('Visible', 'Terlihat'),
                L('Enabled', 'Aktif'),
                `${L('Accepts', 'Menerima')} ${e?.action ?? L('the action', 'aksi')}`,
              ]
                .map((x) => `<li>${ICONS.check}${esc(x)}</li>`)
                .join('')}</ul>`
            : '') +
          ui`<dl class="audit-facts">${fact(t('Usulan awal'), attempt?.proposedSelector)}${fact(t('Locator yang diterima'), attempt?.selector)}${fact(t('Lolos validasi dasar'), yes(attempt?.candidateAccepted))}${fact(t('Aksi recovery dijalankan'), yes(attempt?.actionExecuted))}</dl>` +
          note(
            attempt?.candidateAccepted
              ? t(
                  'Locator lolos pemeriksaan teknis. Pada C, aturan requirement masih harus diperiksa sebelum aksi. Ini belum berarti sasaran bisnis benar.',
                )
              : explain(attempt?.reason),
          ) +
          json(
            attempt?.validations ?? null,
            t('Varian locator yang ditolak / alasan / jumlah match'),
          ) +
          note(
            t(
              'Daftar varian bisa kosong jika usulan pertama lolos. Arsip hanya merekam keputusan agregat untuk pemeriksaan yang berhasil; tidak mengarang log per-check.',
            ),
          ) +
          json(
            input?.feedback ?? null,
            t('Umpan balik penolakan yang masuk ke AI pada attempt ini'),
          )
        );
      }
      if (stage === 'rules') {
        if (ruleMode.startsWith('R'))
          return note(
            t(
              'Pemeriksaan aturan target dinonaktifkan pada seluruh strategi RM1. Validasi locator dasar tetap berjalan.',
            ),
          );
        if (ruleMode === 'A')
          return note(
            t(
              'Metode A tidak diberi aturan requirement tambahan dan tidak menjalankan pemeriksa aturan. Validasi locator dasar tetap ada.',
            ),
          );
        const contract = spec?.contract;
        let html = ui`<p class="stage-intro">${ruleMode === 'B' ? t('Aturan ini diberikan kepada AI sebagai konteks. Tidak ada keputusan pemeriksa kode yang diberlakukan pada B.') : t('Kode membandingkan bukti elemen terpilih dengan setiap syarat yang dideklarasikan sebelum klik / fill.')}</p>`;
        html += ui`<dl class="audit-facts">${fact(t('Tujuan requirement'), contract?.intent)}${fact(t('ID / revisi'), contract ? contract.requirementId + ' / ' + contract.revision : e?.targetSpec?.requirementId)}${fact(t('Status fitur'), contract?.status)}${fact(t('Aksi yang diizinkan'), contract?.action)}${fact(t('Kesesuaian acuan'), spec?.applicability ?? e?.targetSpec?.applicability)}</dl>`;
        html += `<div class="rule-list">${(contract?.allOf ?? [])
          .map((rule, i) => {
            const result = decision?.clauses?.find((c) => c.index === i);
            const [tone, badge] =
              result?.matched === true
                ? ['ok', 'b-teal']
                : result?.matched === false
                  ? ['fail', 'b-red']
                  : ['open', ruleMode === 'B' ? 'b-slate' : 'b-amber'];
            const seen = decision?.observed
              ? rule.sources
                  .filter((src) => ![undefined, null, ''].includes(decision.observed[src]))
                  .map(
                    (src) =>
                      `<span class="obs">${esc(src)} <code>${esc([].concat(decision.observed[src]).join(' · '))}</code></span>`,
                  )
                  .join('')
              : '';
            return (
              `<article class="rule ${tone}"><div class="rule-head"><h4>${L('Clause', 'Syarat')} ${i + 1} · ${L('must mention', 'harus memuat')} “${esc(rule.anyOf.join(' / '))}”</h4>` +
              `<span class="badge ${badge}">${esc(result ? (result.matched ? t('Cocok') : t('Belum cocok')) : ruleMode === 'B' ? t('Konteks AI') : t('Belum diperiksa'))}</span></div>` +
              `<dl><div><dt>${L('Looked in', 'Dicari di')}</dt><dd>${esc(rule.sources.join(', '))}</dd></div>` +
              (result
                ? `<div><dt>${L('Matched in', 'Cocok di')}</dt><dd>${esc(result.source ?? t('Tidak ditemukan'))}</dd></div>`
                : '') +
              (seen
                ? `<div><dt>${L('Observed', 'Teramati')}</dt><dd class="obs-list">${seen}</dd></div>`
                : '') +
              `</dl>${decision?.observed ? json(Object.fromEntries(rule.sources.map((s) => [s, decision.observed[s] ?? null])), t('Bukti elemen untuk syarat ini')) : ''}</article>`
            );
          })
          .join('')}</div>`;
        if (ruleMode === 'C')
          html += !decision
            ? note(
                t(
                  'Pemeriksa aturan belum tercapai pada attempt ini. Misalnya AI tidak memilih kandidat, atau validasi dasar belum lolos.',
                ),
              )
            : decision.outcome === 'accepted'
              ? `<div class="verdict ok">${ICONS.check}<div><b>${L('Allowed by target rules', 'Diizinkan aturan target')}</b><p>${esc(explain(decision.reason))}</p></div></div>`
              : `<div class="verdict stop">${ICONS.warning}<div><b>${L('Stopped before acting', 'Berhenti sebelum aksi')}</b><p>${esc(explain(decision.reason))}</p></div></div>`;
        return (
          html +
          json(spec ?? e?.targetSpec, t('Aturan, versi dan provenance yang tersedia')) +
          json(decision ?? null, t('Keputusan pemeriksa pada attempt terpilih')) +
          note(
            t(
              'Pemeriksa ini mencocokkan frasa pada bukti label/atribut/konteks. Ia tidak membuktikan seluruh perilaku aplikasi dan dapat tertipu label yang menyesatkan.',
            ),
          )
        );
      }
      return '';
    }
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.onclick = fn;
    };
    bind('audit-back', close);
    bind('audit-download', () =>
      download(
        ui`${fallback.caseId}-${arm}-r${repeat}-audit.json`,
        pretty({ caseId: fallback.caseId, arm, repeat, audit }),
      ),
    );
    root.querySelectorAll('[data-arm]').forEach(
      (b) =>
        (b.onclick = () => {
          arm = b.dataset.arm;
          attemptNumber = null;
          render(b.id);
        }),
    );
    root.querySelectorAll('[data-stage]').forEach(
      (b) =>
        (b.onclick = () => {
          stage = b.dataset.stage;
          render(b.id);
        }),
    );
    root.querySelectorAll('[data-key]').forEach(
      (b) =>
        (b.onclick = () => {
          selectCase(b.dataset.key);
          render(b.id);
        }),
    );
    const change = (id, fn) => {
      const el = document.getElementById(id);
      if (el)
        el.onchange = (event) => {
          fn(event.target.value);
          render(id);
        };
    };
    change('audit-case', selectCase);
    change('audit-repeat', (value) => {
      repeat = Number(value);
      attemptNumber = null;
    });
    change('audit-attempt', (value) => {
      attemptNumber = Number(value);
    });
    bind('audit-copy-dom', async () => {
      const button = document.getElementById('audit-copy-dom');
      try {
        await navigator.clipboard.writeText(copyable ?? '');
        button.textContent = L('Copied', 'Tersalin');
      } catch {
        button.textContent = L('Copy unavailable', 'Tidak bisa menyalin');
      }
    });
    bind('audit-next-stage', () => {
      stage = stages[(stages.findIndex((x) => x[0] === stage) + 1) % stages.length][0];
      render('stage-' + stage);
    });
    bind('audit-request-download', () =>
      download(
        ui`${fallback.caseId}-${arm}-r${repeat}-attempt${attemptNumber}-request.json`,
        attempt.request.body,
      ),
    );
    bind('audit-request-copy', async () => {
      const button = document.getElementById('audit-request-copy');
      try {
        await navigator.clipboard.writeText(attempt.request.body);
        button.textContent = t('Tersalin');
      } catch {
        button.textContent = t('Gunakan unduh request');
      }
    });
    if (focusId) document.getElementById(focusId)?.focus();
  }
  language.subscribe(() => {
    if (!root.hidden) {
      const opened = [...root.querySelectorAll('details')]
        .map((el, i) => (el.open ? i : -1))
        .filter((i) => i >= 0);
      render();
      const details = root.querySelectorAll('details');
      for (const i of opened) if (details[i]) details[i].open = true;
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !root.hidden && !library) close();
  });
  return {
    open(key, selection = {}) {
      if (!groups.has(key)) return;
      if (!library) returnFocus = document.activeElement;
      selectedKey = key;
      arm =
        selection.arm ?? (currentRows().some((r) => r.arm === 'C') ? 'C' : currentRows()[0].arm);
      repeat = selection.repeat ?? currentRows().find((r) => r.arm === arm)?.repeat ?? 1;
      attemptNumber = selection.attempt ?? null;
      stage = selection.stage ?? 'context';
      root.hidden = false;
      document.body.classList.add('inspecting');
      render();
      if (library) return;
      overview.hidden = true;
      if (rail) rail.style.display = 'none';
      window.scrollTo(0, 0);
      document.getElementById('audit-back').focus();
    },
  };
}
export const INSPECTOR_CSS = `
.inspect-shell.is-library {
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}
.inspect-main {
  min-width: 0;
  display: grid;
  gap: 16px;
}
.side {
  position: sticky;
  top: 16px;
  display: grid;
  gap: 8px;
  min-width: 0;
}
.side-title {
  margin: 4px 4px 2px;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.side-list {
  display: grid;
  gap: 8px;
}
.side-item {
  display: grid;
  justify-items: start;
  gap: 6px;
  width: 100%;
  height: auto;
  padding: 12px 14px;
  text-align: left;
  border: 1px solid transparent;
  border-radius: var(--r);
  background: transparent;
}
.side-item b {
  color: var(--ink);
  font-size: 15px;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.side-item > span:last-child {
  color: var(--muted);
  font-size: 13px;
}
.side-item[aria-current='true'] {
  background: var(--surface);
  border-color: var(--line);
  box-shadow: var(--shadow);
}
.run-box {
  margin: 12px 0 0;
  padding: 14px 4px 0;
  border-top: 1px solid var(--line);
  font-size: 13px;
}
.run-box div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
}
.run-box dt {
  color: var(--muted);
}
.run-box dd {
  margin: 0;
  color: var(--ink-2);
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}
.side > button {
  justify-self: start;
  gap: 8px;
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
}
.inspect-shell.is-archive {
  display: grid;
  gap: 16px;
}
.inspect-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.inspect-top .evidence-kind {
  flex: 1;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.run-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px 16px;
}
.run-toolbar label {
  display: grid;
  gap: 4px;
}
.case-select {
  flex: 1 1 320px;
  min-width: 0;
}
.case-select select {
  width: 100%;
}
.method-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.method-switch button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.method-switch button b {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--slate-bg);
  color: var(--slate);
  font-size: 13px;
}
.method-switch button[aria-pressed='true'] {
  border-color: var(--navy);
  box-shadow: inset 0 0 0 1px var(--navy);
  color: var(--ink);
}
.method-switch button[aria-pressed='true'] b {
  background: var(--navy);
  color: var(--on-navy);
}
.method-explainer {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}
.result-card {
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow);
  min-width: 0;
}
.result-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.result-verdict {
  margin-left: auto;
}
.result-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 14px 0 18px;
  font-size: 26px;
  letter-spacing: -0.3px;
}
.result-title > span:first-child {
  overflow-wrap: anywhere;
  min-width: 0;
}
.result-title small {
  flex-basis: 100%;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
}
.xform {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px minmax(0, 1fr);
  align-items: stretch;
  gap: 12px;
}
.xform.is-single {
  grid-template-columns: minmax(0, 1fr);
}
.xform-arrow {
  display: grid;
  place-items: center;
  color: var(--muted);
}
.loc {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid;
  border-radius: var(--r);
}
.loc-label {
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.loc code {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.loc-sub {
  font-size: 13.5px;
}
.loc.old {
  background: var(--red-bg);
  border-color: var(--red-line);
  color: var(--red);
}
.loc.old code {
  color: #7a1b13;
}
.loc.new {
  background: var(--teal-bg);
  border-color: var(--teal-line);
  color: var(--teal);
}
.loc.new code {
  color: #0b4f49;
}
.loc.prop {
  background: var(--amber-bg);
  border-color: var(--amber-line);
  color: var(--amber);
}
.loc.prop code {
  color: #6e3504;
}
.loc.fail {
  background: var(--surface-2);
  border-color: var(--red-line);
  border-style: dashed;
  color: var(--red);
}
.loc.fail code {
  color: var(--ink-2);
}
.loc.same {
  background: var(--slate-bg);
  border-color: var(--slate-line);
  color: var(--slate);
}
.loc.same code {
  color: var(--ink);
}
.result-facts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 22px;
  margin-top: 16px;
  color: var(--muted);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}
.result-facts b {
  color: var(--ink);
  font-weight: 650;
}
.attempt-pick {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-size: 13px;
}
.timeline {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--line-2);
}
.tl-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
}
.tl-head h2 {
  margin: 0;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
.tl-head b {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.tl-bar {
  display: flex;
  gap: 3px;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
}
.tl-bar i {
  display: block;
  min-width: 6px;
  flex-basis: 0;
}
.tl-bar .tl-end {
  flex: 0 0 32px;
}
.t-orig {
  background: var(--red-fill);
}
.t-recovery {
  background: var(--ai-fill);
}
.t-retry {
  background: var(--teal-fill);
}
.t-ok {
  background: var(--slate-fill);
}
.t-stop {
  background: repeating-linear-gradient(135deg, var(--amber-fill) 0 6px, #fbd38d 6px 12px);
}
.t-fail {
  background: repeating-linear-gradient(135deg, var(--red-fill) 0 6px, #fbc4bd 6px 12px);
}
.tl-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  color: var(--ink-2);
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
}
.tl-legend li {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}
.tl-legend i {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}
.tl-legend small {
  color: var(--muted);
  font-size: 12.5px;
}
.stage-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.stage-nav button {
  display: flex;
  align-items: center;
  gap: 12px;
  height: auto;
  min-height: 60px;
  padding: 10px 14px;
  text-align: left;
  border-radius: var(--r);
}
.stage-index {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--slate-bg);
  color: var(--slate);
  font-size: 13px;
  font-weight: 700;
}
.stage-text {
  min-width: 0;
}
.stage-text b {
  display: block;
  color: var(--ink);
  font-size: 14.5px;
  line-height: 1.25;
}
.stage-text small {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: var(--muted);
  font-size: 12.5px;
}
.dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  transform: translateY(-1px);
}
.dot-teal {
  background: var(--teal-fill);
}
.dot-ai {
  background: var(--ai-fill);
}
.dot-amber {
  background: var(--amber-fill);
}
.dot-red {
  background: var(--red-fill);
}
.dot-slate {
  background: var(--slate-fill);
}
.stage-nav button[aria-current='step'] {
  border-color: var(--navy);
  box-shadow: inset 0 0 0 1px var(--navy);
  background: var(--surface);
}
.stage-nav button[aria-current='step'] .stage-index {
  background: var(--navy);
  color: var(--on-navy);
}
.stage-panel {
  min-width: 0;
  padding: 24px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
}
.stage-panel > h2 {
  margin: 0 0 6px;
  font-size: 20px;
}
.stage-intro {
  margin: 0 0 18px;
  color: var(--muted);
  font-size: 14.5px;
}
.stage-panel h3:not(.sec-label) {
  margin: 22px 0 10px;
  font-size: 16px;
}
.funnel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.fn {
  min-width: 150px;
  padding: 12px 16px;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--r);
}
.fn b {
  display: block;
  font-size: 26px;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}
.fn span {
  color: var(--muted);
  font-size: 13px;
}
.fn.hl {
  background: var(--ai-bg);
  border-color: var(--ai-line);
}
.fn.hl b {
  color: var(--ai);
}
.fn-arrow {
  color: #8fa1aa;
}
.meters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.meter {
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: var(--r);
}
.m-top {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: baseline;
  gap: 4px 8px;
  margin-bottom: 10px;
}
.m-top span {
  color: var(--ink-2);
  font-size: 13.5px;
  font-weight: 600;
}
.m-top b {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}
.m-top small {
  color: var(--muted);
  font-weight: 500;
}
.m-bar {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--line-2);
}
.m-bar i {
  display: block;
  height: 100%;
  min-width: 6px;
  border-radius: 999px;
  background: var(--ai-fill);
}
.cand-list {
  display: grid;
  gap: 8px;
}
.cand {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: var(--r);
}
.rank {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--navy);
  color: var(--on-navy);
  font-size: 13px;
  font-weight: 700;
}
.c-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
}
.c-title b {
  overflow-wrap: anywhere;
}
.c-title code {
  color: var(--teal);
  font-size: 13.5px;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.c-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 4px;
  color: var(--muted);
  font-size: 13px;
  overflow-wrap: anywhere;
}
.score {
  text-align: right;
}
.score small {
  display: block;
  color: var(--muted);
  font-size: 12px;
}
.score b {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}
.check-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.check-grid li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--teal-line);
  border-radius: var(--r);
  background: var(--teal-bg);
  color: var(--teal);
  font-size: 14px;
  font-weight: 600;
}
.check-grid svg {
  flex: none;
}
.rule-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}
.rule {
  padding: 16px 16px 16px 20px;
  border: 1px solid var(--line);
  border-radius: var(--r);
}
.rule.ok {
  border-color: var(--teal-line);
  box-shadow: inset 4px 0 0 var(--teal-fill);
}
.rule.fail {
  border-color: var(--red-line);
  box-shadow: inset 4px 0 0 var(--red-fill);
}
.rule.open {
  box-shadow: inset 4px 0 0 var(--slate-line);
}
.rule-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px 12px;
}
.rule-head h4 {
  margin: 0;
  font-size: 15px;
  overflow-wrap: anywhere;
}
.rule dl {
  display: grid;
  gap: 6px;
  margin: 12px 0 0;
  font-size: 14px;
}
.rule dl div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 14px;
}
.rule dt {
  color: var(--muted);
}
.rule dd {
  margin: 0;
  color: var(--ink-2);
  overflow-wrap: anywhere;
}
.obs-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
}
.obs code {
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--slate-bg);
  font-size: 13px;
}
.verdict {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-top: 16px;
  padding: 16px 18px;
  border: 1px solid;
  border-radius: var(--r);
}
.verdict svg {
  flex: none;
  margin-top: 2px;
}
.verdict b {
  display: block;
  font-size: 16px;
}
.verdict p {
  margin: 4px 0 0;
}
.verdict.stop {
  background: var(--amber-bg);
  border-color: var(--amber-line);
  color: #6e3504;
}
.verdict.stop b,
.verdict.stop svg {
  color: var(--amber);
}
.verdict.ok {
  background: var(--teal-bg);
  border-color: var(--teal-line);
  color: #0b4f49;
}
.verdict.ok b,
.verdict.ok svg {
  color: var(--teal);
}
.target-proof {
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid var(--ai-line);
  border-radius: var(--r);
  background: var(--ai-bg);
  color: var(--ink-2);
}
.target-proof p {
  margin: 4px 0;
}
.target-proof small {
  color: var(--muted);
}
.proof-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.proof-grid article {
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--surface-2);
}
.proof-grid small {
  display: block;
  color: var(--muted);
  font-size: 13px;
}
.proof-grid strong {
  font-size: 17px;
}
.paired-block {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--r);
}
.paired-block + .paired-block {
  margin-top: 12px;
  border-color: var(--ai-line);
}
.paired-block > h3 {
  margin: 0 0 10px !important;
}
.audit-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px 20px;
  margin: 12px 0;
}
.audit-facts dt {
  color: var(--muted);
  font-size: 13px;
}
.audit-facts dd {
  margin: 2px 0 0;
  color: var(--ink-2);
  font-weight: 600;
  overflow-wrap: anywhere;
}
.audit-note {
  margin: 12px 0;
  padding: 10px 14px;
  border-left: 3px solid var(--slate-line);
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 14px;
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
}
.audit-note.skipped {
  border-left-color: var(--slate-fill);
}
.audit-note.integrity-verified {
  border-left-color: var(--teal-fill);
}
.audit-note.integrity-mismatch {
  border-left-color: var(--red-fill);
}
.audit-muted {
  margin: 10px 0;
  color: var(--muted);
  font-size: 13.5px;
}
.audit-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}
.audit-limits {
  margin: 8px 0;
  padding-left: 20px;
  color: var(--ink-2);
  font-size: 14px;
}
.inspect-main details:not(.evidence-details) {
  margin-top: 8px;
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--surface);
}
.inspect-main details > summary {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  color: var(--ink-2);
  font-size: 14px;
  font-weight: 600;
  list-style: none;
}
.inspect-main details > summary::-webkit-details-marker {
  display: none;
}
.inspect-main details > summary::before {
  content: '';
  flex: none;
  width: 7px;
  height: 7px;
  border-right: 2px solid var(--muted);
  border-bottom: 2px solid var(--muted);
  transform: rotate(-45deg);
}
.inspect-main details[open] > summary::before {
  transform: rotate(45deg);
}
.inspect-main details[open]:not(.evidence-details) {
  padding-bottom: 12px;
}
.audit-raw pre,
.audit-code {
  margin: 0;
  max-height: 420px;
  overflow: auto;
  padding: 12px 14px;
  border-radius: var(--r-sm);
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.codebox .audit-code {
  border-radius: 0;
  background: transparent;
  color: var(--code-ink);
  font-size: 13px;
}
.panel-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px 16px;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--line-2);
}
.panel-foot .info-note {
  font-size: 13.5px;
}
.panel-foot button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  font-weight: 600;
}
.evidence-details {
  padding: 0 20px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
}
.evidence-details[open] {
  padding-bottom: 16px;
}
@media (max-width: 960px) {
  .inspect-shell.is-library {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
  .side {
    position: static;
  }
  .side-title,
  .run-box,
  .side > button {
    display: none;
  }
  .side-list {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .side-item {
    flex: 0 0 220px;
    background: var(--surface);
    border-color: var(--line);
  }
  .stage-nav {
    display: flex;
    overflow-x: auto;
    padding-bottom: 4px;
  }
  .stage-nav button {
    flex: 0 0 200px;
  }
}
@media (max-width: 760px) {
  .result-card,
  .stage-panel {
    padding: 16px;
  }
  .result-title {
    font-size: 21px;
  }
  .result-verdict {
    margin-left: 0;
  }
  .xform {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
  .xform-arrow {
    transform: rotate(90deg);
    height: 24px;
  }
  .loc code {
    font-size: 17px;
  }
  .attempt-pick {
    margin-left: 0;
  }
  .meters,
  .check-grid,
  .proof-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .fn {
    flex: 1 1 40%;
    min-width: 0;
  }
  .fn-arrow {
    display: none;
  }
  .cand {
    grid-template-columns: 36px minmax(0, 1fr) auto;
    gap: 10px;
    padding: 12px;
  }
  .rule dl div {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }
  .panel-foot button {
    width: 100%;
    justify-content: center;
  }
}
`;
