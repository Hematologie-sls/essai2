/* ============================================================
   Essais cliniques — Logique applicative
   ============================================================ */

(() => {
  'use strict';

  // ----- État -----
  const state = {
    trials: [],
    filtered: [],
    search: '',
    filters: { categorie: '', phase: '', statut: '', sponsor: '' },
    sort: { key: null, dir: 'asc' },
    view: 'table'
  };

  const STATUT_LABELS = {
    open: 'Ouvert',
    intermittent: 'Intermittent',
    planned: 'Planifié',
    closed: 'Clôturé'
  };

  const normStatut = (s) => {
    if (!s) return '';
    const v = String(s).toLowerCase().trim();
    if (v === 'open') return 'open';
    if (v === 'intermittent') return 'intermittent';
    if (v === 'planned' || v === 'planifié' || v === 'planifie') return 'planned';
    if (v === 'closed' || v === 'fermé' || v === 'ferme' || v === 'clôturé') return 'closed';
    return v;
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(/[\s.-]+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
  };

  const phaseOrder = (p) => {
    if (!p) return 99;
    const s = p.toLowerCase();
    if (s.startsWith('cohorte')) return 50;
    if (s.startsWith('ib') || s.startsWith('i/ii')) return 1.5;
    if (s.startsWith('iia')) return 2.5;
    if (s.startsWith('ii ') || s === 'ii' || s.includes('ii randomis')) return 2;
    if (s.startsWith('iii')) return 3;
    if (s.startsWith('iv')) return 4;
    if (s.startsWith('i')) return 1;
    return 99;
  };

  async function loadData() {
    try {
      const response = await fetch('data/essais.json');
      if (!response.ok) throw new Error('Impossible de charger les données');
      state.trials = await response.json();
      state.trials.forEach(t => { t._statut = normStatut(t.statut); });
      init();
    } catch (err) {
      console.error(err);
      document.getElementById('results').innerHTML =
        `<div class="empty"><h3>Erreur de chargement</h3><p>${err.message}</p></div>`;
    }
  }

  function init() {
    buildFilters();
    bindEvents();
    applyFilters();
    updateStats();
    updateLastUpdate();
  }

  // ----- Chiffres en haut -----
  function updateStats() {
    const total = state.trials.length;
    const ouverts = state.trials.filter(t => t._statut === 'open').length;
    const phases = new Set(state.trials.map(t => t.phase).filter(Boolean)).size;
    const pathologies = new Set(state.trials.map(t => t.categorie).filter(Boolean)).size;

    const html = `
      <div class="figure">
        <div class="figure-num accent">${total}</div>
        <div class="figure-label">Essais</div>
      </div>
      <div class="figure">
        <div class="figure-num">${ouverts}</div>
        <div class="figure-label">Ouverts</div>
      </div>
      <div class="figure">
        <div class="figure-num">${pathologies}</div>
        <div class="figure-label">Pathologies</div>
      </div>
      <div class="figure">
        <div class="figure-num">${phases}</div>
        <div class="figure-label">Phases</div>
      </div>
    `;
    document.getElementById('stats').innerHTML = html;
  }

  // ----- Filtres -----
  function buildFilters() {
    const container = document.getElementById('filters');
    const defs = [
      { key: 'categorie', label: 'Pathologie' },
      { key: 'phase', label: 'Phase' },
      { key: 'statut', label: 'Statut' },
      { key: 'sponsor', label: 'Promoteur' }
    ];

    container.innerHTML = defs.map(def => {
      let values;
      if (def.key === 'statut') {
        values = [...new Set(state.trials.map(t => t._statut).filter(Boolean))];
      } else {
        values = [...new Set(state.trials.map(t => t[def.key]).filter(Boolean))];
      }
      if (def.key === 'phase') {
        values.sort((a, b) => phaseOrder(a) - phaseOrder(b));
      } else {
        values.sort((a, b) => a.localeCompare(b, 'fr'));
      }
      const options = values.map(v => {
        const label = def.key === 'statut' ? (STATUT_LABELS[v] || v) : v;
        return `<option value="${escapeAttr(v)}">${escapeHtml(label)}</option>`;
      }).join('');
      return `
        <div class="filter-group">
          <label for="filter-${def.key}">${def.label}</label>
          <select id="filter-${def.key}" data-filter="${def.key}">
            <option value="">Toutes</option>
            ${options}
          </select>
        </div>
      `;
    }).join('');
  }

  function bindEvents() {
    const search = document.getElementById('search');
    const clearBtn = document.getElementById('clear-search');
    search.addEventListener('input', (e) => {
      state.search = e.target.value.toLowerCase().trim();
      clearBtn.hidden = !state.search;
      applyFilters();
    });
    clearBtn.addEventListener('click', () => {
      search.value = '';
      state.search = '';
      clearBtn.hidden = true;
      applyFilters();
    });

    document.getElementById('filters').addEventListener('change', (e) => {
      if (e.target.matches('select[data-filter]')) {
        state.filters[e.target.dataset.filter] = e.target.value;
        applyFilters();
      }
    });

    document.getElementById('reset-filters').addEventListener('click', resetFilters);

    document.querySelector('.register thead').addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      const key = th.dataset.sort;
      if (state.sort.key === key) {
        state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort.key = key;
        state.sort.dir = 'asc';
      }
      applyFilters();
    });

    document.querySelectorAll('.view-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-opt').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        state.view = btn.dataset.view;
        render();
      });
    });

    document.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', closeDetail);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDetail();
    });

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    initTheme();

    document.getElementById('export-csv').addEventListener('click', exportCSV);
  }

  function resetFilters() {
    state.filters = { categorie: '', phase: '', statut: '', sponsor: '' };
    document.querySelectorAll('select[data-filter]').forEach(s => s.value = '');
    document.getElementById('search').value = '';
    document.getElementById('clear-search').hidden = true;
    state.search = '';
    applyFilters();
  }

  function applyFilters() {
    let list = state.trials.slice();

    Object.entries(state.filters).forEach(([key, val]) => {
      if (!val) return;
      if (key === 'statut') list = list.filter(t => t._statut === val);
      else list = list.filter(t => t[key] === val);
    });

    if (state.search) {
      const q = state.search;
      list = list.filter(t => Object.values(t).some(v => v != null && String(v).toLowerCase().includes(q)));
    }

    if (state.sort.key) {
      const k = state.sort.key;
      const dir = state.sort.dir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        if (k === 'phase') return (phaseOrder(a[k]) - phaseOrder(b[k])) * dir;
        const va = (a[k] || '').toString().toLowerCase();
        const vb = (b[k] || '').toString().toLowerCase();
        return va.localeCompare(vb, 'fr') * dir;
      });
    }

    state.filtered = list;
    render();
  }

  function render() {
    const total = state.trials.length;
    const count = state.filtered.length;

    document.getElementById('result-count').innerHTML =
      `<strong>${count}</strong> essai${count > 1 ? 's' : ''} sur ${total}`;

    const hasActive = state.search || Object.values(state.filters).some(Boolean);
    document.getElementById('reset-filters').hidden = !hasActive;

    const empty = document.getElementById('empty');
    const tableView = document.getElementById('table-view');
    const cardsView = document.getElementById('cards-view');

    if (count === 0) {
      empty.hidden = false;
      tableView.hidden = true;
      cardsView.hidden = true;
      return;
    }
    empty.hidden = true;

    if (state.view === 'table') {
      tableView.hidden = false;
      cardsView.hidden = true;
      renderTable();
    } else {
      tableView.hidden = true;
      cardsView.hidden = false;
      renderCards();
    }

    document.querySelectorAll('.register th[data-sort]').forEach(th => {
      th.classList.remove('sorted-asc', 'sorted-desc');
      if (th.dataset.sort === state.sort.key) {
        th.classList.add(state.sort.dir === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }
    });
  }

  function renderTable() {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = state.filtered.map((t, i) => `
      <tr data-id="${escapeAttr(t.id)}">
        <td class="row-num">${i + 1}</td>
        <td>
          <span class="trial-name">${escapeHtml(t.nom || '—')}</span>
          <span class="trial-meta">${escapeHtml(t.id || '')}</span>
        </td>
        <td>${t.categorie ? `<span class="pill pill-cat">${escapeHtml(t.categorie)}</span>` : '—'}</td>
        <td>${t.phase ? `<span class="pill pill-phase">${escapeHtml(t.phase)}</span>` : '—'}</td>
        <td><span class="sponsor-name">${escapeHtml(t.sponsor || '—')}</span></td>
        <td>${t._statut ? `<span class="pill pill-status" data-status="${escapeAttr(t._statut)}">${escapeHtml(STATUT_LABELS[t._statut] || t.statut)}</span>` : '—'}</td>
        <td>
          ${t.contact_name ? `
            <div class="investigator-row">
              <div class="investigator-avatar">${escapeHtml(getInitials(t.contact_name))}</div>
              <span class="investigator-name">${escapeHtml(t.contact_name)}</span>
            </div>
          ` : '<span style="color: var(--ink-ghost)">—</span>'}
        </td>
        <td>
          <span class="row-action" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => openDetail(tr.dataset.id));
    });
  }

  function renderCards() {
    const grid = document.getElementById('cards-view');
    grid.innerHTML = state.filtered.map(t => `
      <article class="fiche" data-id="${escapeAttr(t.id)}" data-status="${escapeAttr(t._statut)}">
        <header class="fiche-header">
          <div>
            <h3 class="fiche-title">${escapeHtml(t.nom || '—')}</h3>
            <div class="fiche-sponsor">${escapeHtml(t.sponsor || '—')}</div>
          </div>
          <span class="pill pill-status" data-status="${escapeAttr(t._statut)}">${escapeHtml(STATUT_LABELS[t._statut] || t.statut || '—')}</span>
        </header>
        <div class="fiche-tags">
          <span class="pill pill-cat">${escapeHtml(t.categorie || '—')}</span>
          <span class="pill pill-phase">Phase ${escapeHtml(t.phase || '—')}</span>
        </div>
        <div class="fiche-body">
          ${t.interventions ? `<div class="fiche-line"><span class="lbl">Traitement</span>${escapeHtml(truncate(t.interventions, 100))}</div>` : ''}
          ${t.population ? `<div class="fiche-line"><span class="lbl">Population</span>${escapeHtml(truncate(t.population, 120))}</div>` : ''}
        </div>
        <footer class="fiche-footer">
          ${t.contact_name ? `
            <div class="investigator-row">
              <div class="investigator-avatar">${escapeHtml(getInitials(t.contact_name))}</div>
              <span class="investigator-name">${escapeHtml(t.contact_name)}</span>
            </div>` : '<span></span>'}
          <span class="fiche-arrow">consulter →</span>
        </footer>
      </article>
    `).join('');

    grid.querySelectorAll('.fiche').forEach(card => {
      card.addEventListener('click', () => openDetail(card.dataset.id));
    });
  }

  function openDetail(id) {
    const t = state.trials.find(x => x.id === id);
    if (!t) return;

    document.getElementById('detail-title').textContent = t.nom || '—';
    document.getElementById('detail-sponsor').textContent = t.sponsor ? `Promoteur · ${t.sponsor}` : '';

    const phaseEl = document.getElementById('detail-phase');
    phaseEl.textContent = t.phase ? `Phase ${t.phase}` : '';
    phaseEl.hidden = !t.phase;

    const statusEl = document.getElementById('detail-status');
    statusEl.textContent = STATUT_LABELS[t._statut] || t.statut || '';
    statusEl.dataset.status = t._statut;
    statusEl.hidden = !t._statut;

    const catEl = document.getElementById('detail-category');
    catEl.textContent = t.categorie || '';
    catEl.hidden = !t.categorie;

    const sections = [
      { label: 'Traitements & interventions', value: t.interventions },
      { label: 'Population éligible', value: t.population },
      { label: 'Exigences particulières', value: t.exigences },
      { label: 'Notes opérationnelles', value: t.notes }
    ];

    let html = sections
      .filter(s => s.value)
      .map(s => `
        <div class="folio-section">
          <div class="folio-section-label">${escapeHtml(s.label)}</div>
          <p class="folio-section-text">${escapeHtml(s.value).replace(/\n/g, '<br>')}</p>
        </div>
      `).join('');

    if (t.contact_name || t.contact_email || t.contact_phone) {
      html += `
        <div class="folio-section">
          <div class="folio-section-label">Investigateur & contact</div>
          <div class="folio-contact">
            <div class="investigator-avatar">${escapeHtml(getInitials(t.contact_name))}</div>
            <div class="contact-info">
              ${t.contact_name ? `<span class="contact-name">${escapeHtml(t.contact_name)}</span>` : ''}
              ${t.contact_email ? `<a class="contact-email" href="mailto:${escapeAttr(t.contact_email)}">${escapeHtml(t.contact_email)}</a>` : ''}
              ${t.contact_phone ? `<span class="contact-phone">${escapeHtml(t.contact_phone)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }

    html += `
      <div class="folio-section">
        <div class="folio-section-label">Référence interne</div>
        <p class="folio-id">${escapeHtml(t.id || '—')}</p>
      </div>
    `;
    if (t.maj) {
      html += `
        <div class="folio-section">
          <div class="folio-section-label">Mise à jour</div>
          <p class="folio-date">${escapeHtml(formatDate(t.maj))}</p>
        </div>
      `;
    }

    document.getElementById('detail-body').innerHTML = html;
    const panel = document.getElementById('detail-panel');
    panel.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDetail() {
    document.getElementById('detail-panel').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function initTheme() {
    const stored = localStorage.getItem('theme');
    if (stored) {
      document.documentElement.setAttribute('data-theme', stored);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  function exportCSV() {
    const rows = state.filtered.length ? state.filtered : state.trials;
    if (!rows.length) return;

    const headers = ['id', 'nom', 'sponsor', 'phase', 'categorie', 'statut',
                     'interventions', 'population', 'exigences', 'notes',
                     'contact_name', 'contact_email', 'contact_phone', 'maj'];
    const labels = ['ID', 'Nom', 'Promoteur', 'Phase', 'Pathologie', 'Statut',
                    'Interventions', 'Population', 'Exigences', 'Notes',
                    'Investigateur', 'Email', 'Téléphone', 'Mise à jour'];

    const esc = v => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",;\n]/.test(s) ? `"${s}"` : s;
    };

    const csv = [
      labels.join(';'),
      ...rows.map(r => headers.map(h => esc(r[h])).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `essais-cliniques-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function updateLastUpdate() {
    const dates = state.trials.map(t => t.maj).filter(Boolean).sort();
    if (dates.length) {
      const latest = dates[dates.length - 1];
      document.getElementById('last-update').textContent = `Mis à jour le ${formatDate(latest)}`;
    }
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(s) {
    if (s == null) return '';
    return String(s).replace(/"/g, '&quot;');
  }
  function truncate(s, n) {
    if (!s) return '';
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }
  function formatDate(s) {
    if (!s) return '';
    try {
      const d = new Date(s);
      if (isNaN(d)) return s;
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch (_) {
      return s;
    }
  }

  loadData();
})();
