// Wortality Solutions — Python + Data Science + AI/ML Documentation App
const LOGO_ICON = "./assets/logo-icon.png";

(async function initWorkbookApp() {
  let WORKBOOK_DATA;
  try {
    const res = await fetch("./data/workbook-data.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    WORKBOOK_DATA = await res.json();
  } catch (err) {
    const main = document.getElementById("main-content");
    if (main) {
      main.innerHTML = `<div style="padding:32px;border:1px solid #FECACA;background:#FEF2F2;border-radius:10px;color:#991B1B;">
        <h2 style="margin-top:0;">Unable to load workbook data</h2>
        <p>Serve this folder over HTTP (for example, <code>npx serve .</code> or deploy to Vercel) so <code>./data/workbook-data.json</code> can be fetched.</p>
      </div>`;
    }
    return;
  }

const PAGES = WORKBOOK_DATA.pages;
const ANSWER_MAP = WORKBOOK_DATA.answerMap;
const PAGE_BY_ID = {};
PAGES.forEach(p => { PAGE_BY_ID[p.id] = p; });

// State
let currentPageId = 'overview';
let completedPages = new Set();
let collapsedGroups = new Set();
let solutionsExpanded = false;

try {
  const saved = JSON.parse(localStorage.getItem('wortality_completed_v1') || '[]');
  if (Array.isArray(saved)) completedPages = new Set(saved);
} catch (e) {}

function saveCompleted() {
  try {
    localStorage.setItem('wortality_completed_v1', JSON.stringify(Array.from(completedPages)));
  } catch (e) {}
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Lightweight zero-dependency Python syntax highlighter
function highlightPython(code) {
  const keywords = new Set([
    'def','return','if','elif','else','for','while','in','not','and','or',
    'import','from','as','try','except','finally','with','break','continue',
    'pass','class','True','False','None','lambda','yield','raise','del','is'
  ]);
  const builtins = new Set([
    'print','len','range','int','float','str','bool','list','dict','set','tuple',
    'type','input','round','sum','min','max','abs','sorted','enumerate','zip','open'
  ]);

  const tokenRe = /(#[^\n]*|"{3}[\s\S]*?"{3}|'{3}[\s\S]*?'{3}|f?"(?:\\.|[^"\\])*"|f?'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
  let out = '';
  let lastIdx = 0;
  let m;
  while ((m = tokenRe.exec(code)) !== null) {
    out += escapeHtml(code.slice(lastIdx, m.index));
    const tok = m[0];
    if (tok.startsWith('#')) {
      out += '<span class="py-cm">' + escapeHtml(tok) + '</span>';
    } else if (tok.startsWith('"') || tok.startsWith("'") || tok.startsWith('f"') || tok.startsWith("f'")) {
      out += '<span class="py-str">' + escapeHtml(tok) + '</span>';
    } else if (/^\d/.test(tok)) {
      out += '<span class="py-num">' + escapeHtml(tok) + '</span>';
    } else if (keywords.has(tok)) {
      out += '<span class="py-kw">' + escapeHtml(tok) + '</span>';
    } else if (builtins.has(tok)) {
      out += '<span class="py-bi">' + escapeHtml(tok) + '</span>';
    } else {
      // Check if immediately preceded by 'def '
      const prev = code.slice(Math.max(0, m.index - 4), m.index);
      if (prev === 'def ') {
        out += '<span class="py-fn">' + escapeHtml(tok) + '</span>';
      } else {
        out += escapeHtml(tok);
      }
    }
    lastIdx = tokenRe.lastIndex;
  }
  out += escapeHtml(code.slice(lastIdx));
  return out;
}

function linkifyUrls(escapedText) {
  return escapedText.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

function slugify(txt) {
  return 'sec-' + txt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

function copyText(text, btn) {
  const done = () => {
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
    }
    showToast('Code copied to clipboard');
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  document.body.removeChild(ta);
  cb();
}

// Render Sidebar
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const groups = [];
  const groupMap = {};
  PAGES.forEach(p => {
    if (!groupMap[p.group]) {
      groupMap[p.group] = { name: p.group, items: [] };
      groups.push(groupMap[p.group]);
    }
    groupMap[p.group].items.push(p);
  });

  sidebar.innerHTML = groups.map(g => {
    const isCollapsed = collapsedGroups.has(g.name);
    const itemsHtml = g.items.map(p => {
      const active = p.id === currentPageId ? ' active' : '';
      const done = completedPages.has(p.id) ? ' done' : '';
      const checkMark = completedPages.has(p.id) ? '✓' : '';
      return `<button class="sidebar-item${active}${done}" data-page="${p.id}">
        <span>${escapeHtml(p.title)}</span>
        <span class="sidebar-check">${checkMark}</span>
      </button>`;
    }).join('');
    return `<div class="sidebar-group${isCollapsed ? ' collapsed' : ''}" data-group="${escapeHtml(g.name)}">
      <button class="sidebar-group-btn" type="button">
        <span>${escapeHtml(g.name)}</span>
        <svg class="sidebar-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div class="sidebar-items">${itemsHtml}</div>
    </div>`;
  }).join('');

  sidebar.querySelectorAll('.sidebar-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const grp = btn.parentElement.getAttribute('data-group');
      if (collapsedGroups.has(grp)) collapsedGroups.delete(grp);
      else collapsedGroups.add(grp);
      btn.parentElement.classList.toggle('collapsed');
    });
  });

  sidebar.querySelectorAll('.sidebar-item').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.getAttribute('data-page'));
      closeMobileSidebar();
    });
  });
}

function updateProgressUI() {
  const doneCount = completedPages.size;
  const total = PAGES.length;
  const pct = Math.round((doneCount / total) * 100);
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${doneCount} / ${total} (${pct}%)`;
}

function updateTopNavActive(navKey) {
  document.querySelectorAll('.top-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-nav') === navKey);
  });
}

// Render a Practice Problems Table with Collapsible Solutions
function renderPracticeTable(rows) {
  const hdr = rows[0];
  const bodyRows = rows.slice(1).map((r, idx) => {
    const num = escapeHtml(r[0] || String(idx + 1));
    const prob = escapeHtml(r[1] || '');
    const sol = r[2] || '';
    const exp = r[3] || '';
    const openAttr = solutionsExpanded ? ' open' : '';
    return `<tr>
      <td><strong>${num}</strong></td>
      <td>${prob}</td>
      <td>
        <details class="sol-details"${openAttr}>
          <summary>Show solution</summary>
          <pre class="inline-sol-code">${highlightPython(sol)}</pre>
        </details>
      </td>
      <td><span class="inline-sol-exp">${escapeHtml(exp)}</span></td>
    </tr>`;
  }).join('');

  return `<div class="section-toolbar">
    <span style="font-size:13px;color:var(--ink-muted);">Try each problem before expanding its solution.</span>
    <button type="button" class="toggle-all-btn local-toggle-sol">Show / Hide All Solutions</button>
  </div>
  <div class="table-wrap"><table class="doc-table">
    <thead><tr>${hdr.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table></div>`;
}

// Render Self-Check Q&A Table with Collapsible Answers
function renderSelfCheckTable(rows) {
  const bodyRows = rows.slice(1).map(r => {
    const openAttr = solutionsExpanded ? ' open' : '';
    return `<tr>
      <td><strong>${escapeHtml(r[0] || '')}</strong></td>
      <td>
        <details class="sol-details"${openAttr}>
          <summary>Reveal answer</summary>
          <div style="margin-top:6px;font-size:13.5px;color:var(--ink);">${escapeHtml(r[1] || '')}</div>
        </details>
      </td>
    </tr>`;
  }).join('');
  return `<div class="table-wrap"><table class="doc-table">
    <thead><tr><th>Question</th><th>Answer (Click to Reveal)</th></tr></thead>
    <tbody>${bodyRows}</tbody>
  </table></div>`;
}

// Render Standard Responsive Table (with special Glossary filter if Glossary table)
function renderStandardTable(rows, pageId) {
  const hdr = rows[0] || [];
  const isGlossary = pageId === 'glossary' && hdr.includes('Term');
  const isAnswerKey = pageId === 'answer-keys' && hdr[0] === 'Q';
  const bodyHtml = rows.slice(1).map(r => {
    return `<tr>${r.map(cell => `<td>${linkifyUrls(escapeHtml(cell))}</td>`).join('')}</tr>`;
  }).join('');

  let tableHtml = `<div class="table-wrap"><table class="doc-table${isGlossary ? ' glossary-table' : ''}">
    <thead><tr>${hdr.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table></div>`;

  if (isGlossary) {
    return `<input type="text" class="glossary-filter" id="glossary-filter" placeholder="Filter 40 beginner terms by keyword...">` + tableHtml;
  }
  if (isAnswerKey) {
    const openAttr = solutionsExpanded ? ' open' : '';
    return `<details class="sol-details" style="margin:10px 0 20px;"${openAttr}>
      <summary style="padding:6px 4px;font-size:14px;">Show / Hide Complete Answer Key Table (${rows.length - 1} questions)</summary>
      <div style="margin-top:10px;">${tableHtml}</div>
    </details>`;
  }
  return tableHtml;
}

// Render Interactive Quiz Question Card
function renderQuizQuestion(text, quizNum) {
  const m = text.match(/^(\d+)\.\s*\[([^\]]+)\]\s*([\s\S]+)$/);
  if (!m) return `<p class="doc-p">${escapeHtml(text)}</p>`;
  const qNum = parseInt(m[1], 10);
  const meta = m[2];
  const rest = m[3].trim();
  const ak = (ANSWER_MAP[quizNum] && ANSWER_MAP[quizNum][qNum]) || null;

  let diffClass = 'medium';
  if (/Easy/i.test(meta)) diffClass = 'easy';
  else if (/Hard/i.test(meta)) diffClass = 'hard';

  // Parse MCQ options A. ... B. ... C. ... D. ... or True / False
  let qPrompt = rest;
  let optionsHtml = '';

  const mcqMatch = rest.match(/^([\s\S]*?)\s+A\.\s+([\s\S]*?)\s+B\.\s+([\s\S]*?)\s+C\.\s+([\s\S]*?)\s+D\.\s+([\s\S]*)$/);
  if (mcqMatch) {
    qPrompt = mcqMatch[1].trim();
    const opts = [
      { key: 'A', label: 'A. ' + mcqMatch[2].trim() },
      { key: 'B', label: 'B. ' + mcqMatch[3].trim() },
      { key: 'C', label: 'C. ' + mcqMatch[4].trim() },
      { key: 'D', label: 'D. ' + mcqMatch[5].trim() }
    ];
    optionsHtml = `<div class="quiz-opts">${opts.map(o =>
      `<button type="button" class="quiz-opt-btn" data-quiz="${quizNum}" data-q="${qNum}" data-choice="${o.key}">${escapeHtml(o.label)}</button>`
    ).join('')}</div>`;
  } else if (/True\s*\/\s*False/i.test(rest)) {
    qPrompt = rest.replace(/True\s*\/\s*False/i, '').trim();
    optionsHtml = `<div class="quiz-opts">
      <button type="button" class="quiz-opt-btn" data-quiz="${quizNum}" data-q="${qNum}" data-choice="True">True</button>
      <button type="button" class="quiz-opt-btn" data-quiz="${quizNum}" data-q="${qNum}" data-choice="False">False</button>
    </div>`;
  } else {
    // Short answer or scenario response
    qPrompt = rest.replace(/Response:\s*_+/g, '').trim();
    optionsHtml = `<div>
      <input type="text" class="quiz-short-input" placeholder="Type your answer or code here...">
      <button type="button" class="quiz-check-btn" data-quiz="${quizNum}" data-q="${qNum}">Check Official Answer</button>
    </div>`;
  }

  const fbHtml = ak ? `<div class="quiz-feedback" id="qfb-${quizNum}-${qNum}">
    <strong>Official Answer:</strong> ${escapeHtml(ak.answer)}<br>
    <span>${escapeHtml(ak.explanation)}</span>
    <div style="margin-top:4px;font-size:12px;color:var(--purple-deep);font-weight:600;">Revisit: ${escapeHtml(ak.revisit)}</div>
  </div>` : '';

  return `<div class="quiz-card">
    <div class="quiz-card-top">
      <span class="quiz-qnum">Quiz ${quizNum} &middot; Question ${qNum}</span>
      <div class="quiz-tags">
        <span class="q-tag ${diffClass}">${escapeHtml(meta)}</span>
      </div>
    </div>
    <p class="quiz-qtext">${escapeHtml(qPrompt)}</p>
    ${optionsHtml}
    ${fbHtml}
  </div>`;
}

// Render Paragraph or Semantic Callout
function renderParagraph(b) {
  const txt = b.text;
  const esc = linkifyUrls(escapeHtml(txt));

  if (/^Goal\b/i.test(txt)) {
    const body = txt.replace(/^Goal:?\s*/i, '');
    return `<div class="callout callout-goal"><div class="callout-label">Learning Objective</div><div>${linkifyUrls(escapeHtml(body))}</div></div>`;
  }
  if (/^Analogy:/i.test(txt)) {
    const body = txt.replace(/^Analogy:\s*/i, '');
    return `<div class="callout callout-analogy"><div class="callout-label">Beginner Analogy</div><div>${linkifyUrls(escapeHtml(body))}</div></div>`;
  }
  if (/^Words of the day:/i.test(txt)) {
    const body = txt.replace(/^Words of the day:\s*/i, '');
    return `<div class="callout callout-terms"><div class="callout-label">Key Terminology</div><div>${linkifyUrls(escapeHtml(body))}</div></div>`;
  }
  if (/^(What this does:|What this means:|Remember:)/i.test(txt)) {
    const m = txt.match(/^(What this does:|What this means:|Remember:)\s*([\s\S]*)$/i);
    return `<div class="callout callout-explain"><div class="callout-label">${escapeHtml(m[1].replace(':',''))}</div><div>${linkifyUrls(escapeHtml(m[2]))}</div></div>`;
  }
  if (/^You did it!/i.test(txt)) {
    const body = txt.replace(/^You did it!\s*/i, '');
    return `<div class="callout callout-milestone"><div class="callout-label">Learning Milestone — You Did It!</div><div>${linkifyUrls(escapeHtml(body))}</div></div>`;
  }
  if (/^(Safety note|Final reminder|Think like a programmer)/i.test(txt)) {
    const m = txt.match(/^(Safety note|Final reminder|Think like a programmer):?\s*([\s\S]*)$/i);
    return `<div class="callout callout-analogy"><div class="callout-label">${escapeHtml(m[1])}</div><div>${linkifyUrls(escapeHtml(m[2]))}</div></div>`;
  }
  if (/^Level 1:/i.test(txt)) {
    return `<div class="callout callout-try"><div class="callout-label">Try It Yourself</div><div>${esc}</div></div>`;
  }
  if (/^(SyntaxError:|NameError:|IndentationError:|TypeError:|ValueError:|IndexError:|KeyError:|ZeroDivisionError:|FileNotFoundError:|ModuleNotFoundError:|AttributeError:|Shape mismatch)/i.test(txt)) {
    return `<div class="callout callout-error"><div class="callout-label">Common Errors &amp; Fixes</div><div>${esc}</div></div>`;
  }
  if (b.is_bold) {
    return `<h3 class="section-h3">${esc}</h3>`;
  }
  return `<p class="doc-p">${esc}</p>`;
}

// Render Main Page
function renderPage(pageId) {
  const page = PAGE_BY_ID[pageId] || PAGES[0];
  currentPageId = page.id;
  updateTopNavActive(page.nav);
  renderSidebar();

  const main = document.getElementById('main-content');
  const tocItems = [];
  let html = '';

  // Breadcrumb
  html += `<nav class="breadcrumb" aria-label="Breadcrumb">
    <span>Wortality Solutions</span>
    <span class="breadcrumb-sep">/</span>
    <span>${escapeHtml(page.group)}</span>
    <span class="breadcrumb-sep">/</span>
    <span class="breadcrumb-cur">${escapeHtml(page.title)}</span>
  </nav>`;

  // Page Header
  const isDone = completedPages.has(page.id);
  html += `<div class="page-header">
    <div>
      <h1 class="page-title">${escapeHtml(page.title)}</h1>
      <div class="page-meta-row">
        <span class="badge-purple">${escapeHtml(page.group)}</span>
        <span class="badge-yellow">${escapeHtml(page.badge)}</span>
      </div>
    </div>
    <button type="button" class="complete-btn${isDone ? ' completed' : ''}" id="mark-complete-btn">
      ${isDone ? '✓ Completed' : 'Mark Complete'}
    </button>
  </div>`;

  // Overview Hero Banner
  if (page.id === 'overview') {
    html += `<div class="hero-banner">
      <div class="hero-top">
        <img src="${LOGO_ICON}" alt="Wortality Solutions Icon" class="hero-icon">
        <div>
          <div class="hero-kicker">Wortality Solutions &middot; FROM CAMPUS TALENT TO INDUSTRY EXCELLENCE</div>
          <h2 class="hero-title">Python + Data Science + AI/ML Beginner Course Workbook</h2>
        </div>
      </div>
      <p class="hero-subtitle">A 14-Day Beginner Course and Practice Workbook built around small steps, exact outputs, guided practice, 10 practical projects, 6 quizzes (72 questions), and responsible AI — all runnable in Google Colab.</p>
      <div class="hero-stats">
        <div class="stat-card"><div class="stat-val">14 Days</div><div class="stat-lbl">28 Hours Total (2h/day)</div></div>
        <div class="stat-card"><div class="stat-val">6 Quizzes</div><div class="stat-lbl">72 Questions + Full Keys</div></div>
        <div class="stat-card"><div class="stat-val">10 + 1</div><div class="stat-lbl">Projects &amp; Final Capstone</div></div>
        <div class="stat-card"><div class="stat-val">40 Terms</div><div class="stat-lbl">Glossary + 6 Cheat Sheets</div></div>
      </div>
    </div>`;
  }

  // Quick-jump tabs on Quizzes page
  if (page.id === 'quizzes') {
    html += `<div class="quiz-tabs">
      ${[1,2,3,4,5,6].map(n => `<button type="button" class="quiz-tab-btn" data-jump-quiz="${n}">Quiz ${n}</button>`).join('')}
      <button type="button" class="toggle-all-btn" id="open-ak-btn">Open Separate Answer Keys &rarr;</button>
    </div>`;
  }

  // Walk through blocks
  const blocks = page.blocks;
  let curQuizNum = 0;
  let lastH2 = '';

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];

    // Skip duplicate cover_title / cover_subtitle already in hero, and skip first H1 if identical to page.title
    if (b.type === 'cover_title' || b.type === 'cover_subtitle') continue;
    if (b.type === 'h1' && i === 0 && b.text === page.title) continue;

    if (b.type === 'h1') {
      const id = slugify(b.text + '-' + i);
      tocItems.push({ id, text: b.text });
      html += `<h2 class="section-h2" id="${id}">${escapeHtml(b.text)}</h2>`;
      lastH2 = b.text;
    } else if (b.type === 'h2') {
      const id = slugify(b.text + '-' + i);
      tocItems.push({ id, text: b.text });
      if (page.id === 'quizzes') {
        const qm = b.text.match(/Quiz\s+(\d+)/);
        if (qm) curQuizNum = parseInt(qm[1], 10);
      }
      html += `<h2 class="section-h2" id="${id}"${curQuizNum ? ` data-quiz-section="${curQuizNum}"` : ''}>${escapeHtml(b.text)}</h2>`;
      lastH2 = b.text;
    } else if (b.type === 'code') {
      const codeText = b.text;
      // Check if next block is an output block
      let outHtml = '';
      if (i + 1 < blocks.length && blocks[i + 1].type === 'output') {
        const outText = blocks[i + 1].text;
        outHtml = `<div class="output-panel">
          <div class="output-header">Expected Output</div>
          <pre class="output-pre">${escapeHtml(outText)}</pre>
        </div>`;
        i++; // consume paired output
      }
      const codeId = 'code-' + page.id + '-' + i;
      html += `<div class="code-group">
        <div class="code-header">
          <span class="code-lang"><span class="code-dot"></span>Python</span>
          <button type="button" class="copy-btn" data-copy-id="${codeId}">Copy code</button>
        </div>
        <pre class="code-pre" id="${codeId}">${highlightPython(codeText)}</pre>
        ${outHtml}
      </div>`;
    } else if (b.type === 'output') {
      html += `<div class="standalone-output">
        <div class="output-header">Expected Output</div>
        <pre class="output-pre">${escapeHtml(b.text)}</pre>
      </div>`;
    } else if (b.type === 'table') {
      const hdr = b.rows[0] || [];
      if (hdr.length === 4 && hdr[0] === '#' && hdr[2] && hdr[2].toLowerCase().includes('solution')) {
        html += renderPracticeTable(b.rows);
      } else if (hdr.length === 2 && hdr[0] === 'Question' && hdr[1] === 'Answer') {
        html += renderSelfCheckTable(b.rows);
      } else {
        html += renderStandardTable(b.rows, page.id);
      }
    } else if (b.type === 'para') {
      if (page.id === 'quizzes' && curQuizNum > 0 && /^\d+\.\s*\[/.test(b.text)) {
        html += renderQuizQuestion(b.text, curQuizNum);
      } else {
        html += renderParagraph(b);
      }
    }
  }

  // Previous / Next Lesson Navigation
  const idx = PAGES.findIndex(p => p.id === page.id);
  const prev = idx > 0 ? PAGES[idx - 1] : null;
  const next = idx < PAGES.length - 1 ? PAGES[idx + 1] : null;
  html += `<div class="prev-next-grid">`;
  if (prev) {
    html += `<button type="button" class="pn-card prev" data-nav-page="${prev.id}">
      <span class="pn-dir">&larr; Previous</span>
      <span class="pn-title">${escapeHtml(prev.title)}</span>
    </button>`;
  } else {
    html += `<div></div>`;
  }
  if (next) {
    html += `<button type="button" class="pn-card next" data-nav-page="${next.id}">
      <span class="pn-dir">Next &rarr;</span>
      <span class="pn-title">${escapeHtml(next.title)}</span>
    </button>`;
  }
  html += `</div>`;

  main.innerHTML = html;

  // Populate Right-Side TOC ("On this page")
  const tocList = document.getElementById('toc-list');
  if (tocItems.length) {
    tocList.innerHTML = tocItems.map((t, ti) =>
      `<li><a class="toc-link${ti === 0 ? ' active' : ''}" data-scroll-to="${t.id}">${escapeHtml(t.text)}</a></li>`
    ).join('');
    tocList.querySelectorAll('.toc-link').forEach(a => {
      a.addEventListener('click', () => {
        const target = document.getElementById(a.getAttribute('data-scroll-to'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  } else {
    tocList.innerHTML = `<li style="padding:4px 12px;font-size:12.5px;color:var(--ink-muted);">Overview section</li>`;
  }

  // Bind Page Event Listeners
  const completeBtn = document.getElementById('mark-complete-btn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      if (completedPages.has(page.id)) {
        completedPages.delete(page.id);
        showToast('Marked as incomplete');
      } else {
        completedPages.add(page.id);
        showToast('Lesson marked complete!');
      }
      saveCompleted();
      updateProgressUI();
      renderPage(page.id);
    });
  }

  main.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = document.getElementById(btn.getAttribute('data-copy-id'));
      if (el) copyText(el.textContent, btn);
    });
  });

  main.querySelectorAll('.local-toggle-sol').forEach(btn => {
    btn.addEventListener('click', toggleAllSolutionsOnPage);
  });

  main.querySelectorAll('.pn-card').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.getAttribute('data-nav-page')));
  });

  main.querySelectorAll('.quiz-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qn = btn.getAttribute('data-jump-quiz');
      const target = main.querySelector(`[data-quiz-section="${qn}"]`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const openAkBtn = document.getElementById('open-ak-btn');
  if (openAkBtn) {
    openAkBtn.addEventListener('click', () => navigateTo('answer-keys'));
  }

  // Interactive Quiz Buttons
  main.querySelectorAll('.quiz-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qz = btn.getAttribute('data-quiz');
      const qn = btn.getAttribute('data-q');
      const choice = btn.getAttribute('data-choice');
      const ak = ANSWER_MAP[qz] && ANSWER_MAP[qz][qn];
      const siblings = btn.parentElement.querySelectorAll('.quiz-opt-btn');
      siblings.forEach(s => s.classList.remove('selected-correct', 'selected-wrong'));
      if (ak) {
        const correct = String(ak.answer).trim().toLowerCase() === choice.toLowerCase();
        btn.classList.add(correct ? 'selected-correct' : 'selected-wrong');
      }
      const fb = document.getElementById(`qfb-${qz}-${qn}`);
      if (fb) fb.classList.add('show');
    });
  });

  main.querySelectorAll('.quiz-check-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qz = btn.getAttribute('data-quiz');
      const qn = btn.getAttribute('data-q');
      const fb = document.getElementById(`qfb-${qz}-${qn}`);
      if (fb) fb.classList.toggle('show');
    });
  });

  // Glossary Live Filter
  const gFilter = document.getElementById('glossary-filter');
  if (gFilter) {
    gFilter.addEventListener('input', () => {
      const q = gFilter.value.trim().toLowerCase();
      const rows = main.querySelectorAll('.glossary-table tbody tr');
      rows.forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  window.scrollTo({ top: 0, behavior: 'instant' });
}

function toggleAllSolutionsOnPage() {
  const main = document.getElementById('main-content');
  const details = main.querySelectorAll('details.sol-details');
  if (!details.length) {
    showToast('No collapsible solutions on this page');
    return;
  }
  const anyClosed = Array.from(details).some(d => !d.open);
  details.forEach(d => { d.open = anyClosed; });
  solutionsExpanded = anyClosed;
  showToast(anyClosed ? 'Expanded all solutions' : 'Collapsed all solutions');
}

function navigateTo(pageId, scrollHeadingText) {
  if (!PAGE_BY_ID[pageId]) return;
  try { history.replaceState(null, '', '#' + pageId); } catch (e) {}
  renderPage(pageId);
  if (scrollHeadingText) {
    setTimeout(() => {
      const heads = document.querySelectorAll('#main-content h2.section-h2');
      for (const h of heads) {
        if (h.textContent.toLowerCase().includes(scrollHeadingText.toLowerCase())) {
          h.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
      }
    }, 60);
  }
}

// Global Full-Workbook Search
const searchInput = document.getElementById('global-search');
const searchResults = document.getElementById('search-results');

// Build flat search index
const SEARCH_INDEX = [];
PAGES.forEach(p => {
  SEARCH_INDEX.push({ pageId: p.id, title: p.title, text: p.title + ' ' + p.group, isTitle: true });
  p.blocks.forEach(b => {
    let txt = '';
    if (b.type === 'table') {
      txt = b.rows.map(r => r.join(' ')).join(' | ');
    } else {
      txt = b.text || '';
    }
    if (txt.trim()) {
      SEARCH_INDEX.push({ pageId: p.id, title: p.title, text: txt, isTitle: false });
    }
  });
});

function runSearch(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 2) {
    searchResults.classList.remove('open');
    return;
  }
  const matches = [];
  const seenPerPage = {};
  for (const item of SEARCH_INDEX) {
    const idx = item.text.toLowerCase().indexOf(q);
    if (idx !== -1) {
      seenPerPage[item.pageId] = (seenPerPage[item.pageId] || 0) + 1;
      if (seenPerPage[item.pageId] > 2) continue;
      const start = Math.max(0, idx - 45);
      const end = Math.min(item.text.length, idx + q.length + 75);
      let snip = item.text.slice(start, end);
      if (start > 0) snip = '…' + snip;
      if (end < item.text.length) snip = snip + '…';
      matches.push({ pageId: item.pageId, title: item.title, snip, q });
      if (matches.length >= 16) break;
    }
  }

  if (!matches.length) {
    searchResults.innerHTML = `<div class="search-res-header">No matches found for "${escapeHtml(query)}"</div>`;
  } else {
    const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(' + safeQ + ')', 'gi');
    searchResults.innerHTML = `<div class="search-res-header">${matches.length} matching sections</div>` +
      matches.map(m => {
        const hi = escapeHtml(m.snip).replace(re, '<mark>$1</mark>');
        return `<button type="button" class="search-item" data-search-page="${m.pageId}">
          <div class="search-item-title">${escapeHtml(m.title)}</div>
          <div class="search-item-snip">${hi}</div>
        </button>`;
      }).join('');
    searchResults.querySelectorAll('.search-item').forEach(btn => {
      btn.addEventListener('click', () => {
        navigateTo(btn.getAttribute('data-search-page'));
        searchResults.classList.remove('open');
        searchInput.value = '';
      });
    });
  }
  searchResults.classList.add('open');
}

searchInput.addEventListener('input', () => runSearch(searchInput.value));
document.addEventListener('click', e => {
  if (!e.target.closest('.search-wrap')) searchResults.classList.remove('open');
});
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== searchInput && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    e.preventDefault();
    searchInput.focus();
  }
  if (e.key === 'Escape') {
    searchResults.classList.remove('open');
    closeMobileSidebar();
  }
});

// Top Nav Click Routing
const NAV_DEST = {
  overview: 'overview',
  modules: 'day-1',
  projects: 'projects',
  quizzes: 'quizzes',
  resources: 'glossary'
};
document.querySelectorAll('.top-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = NAV_DEST[btn.getAttribute('data-nav')] || 'overview';
    navigateTo(target);
  });
});
document.getElementById('brand-home').addEventListener('click', () => navigateTo('overview'));

// Mobile Sidebar Drawer
const sidebarEl = document.getElementById('sidebar');
const backdropEl = document.getElementById('sidebar-backdrop');
function closeMobileSidebar() {
  sidebarEl.classList.remove('open');
  backdropEl.classList.remove('open');
}
document.getElementById('menu-toggle').addEventListener('click', () => {
  sidebarEl.classList.toggle('open');
  backdropEl.classList.toggle('open');
});
backdropEl.addEventListener('click', closeMobileSidebar);

// TOC Actions
document.getElementById('toc-toggle-solutions').addEventListener('click', toggleAllSolutionsOnPage);
document.getElementById('toc-print').addEventListener('click', () => window.print());

// Scroll-spy for Right TOC
window.addEventListener('scroll', () => {
  const headings = document.querySelectorAll('#main-content h2.section-h2');
  let activeId = null;
  for (const h of headings) {
    if (h.getBoundingClientRect().top <= 120) activeId = h.id;
  }
  if (activeId) {
    document.querySelectorAll('.toc-link').forEach(a => {
      a.classList.toggle('active', a.getAttribute('data-scroll-to') === activeId);
    });
  }
}, { passive: true });

// Initialize from hash or default to overview
const initHash = (window.location.hash || '').replace('#', '');
updateProgressUI();
renderPage(PAGE_BY_ID[initHash] ? initHash : 'overview');
})();
