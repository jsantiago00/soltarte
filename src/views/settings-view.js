import { PALETTES, PALETTE_ORDER, FONTS, FONT_ORDER, FONT_SIZES, FONT_SIZE_ORDER } from '../palettes.js';
import { getTheme, setTheme, getPalette, setPalette, getFont, setFont, getFontSize, setFontSize } from '../settings.js';
import { getNotesSnapshot, TYPE_LABELS } from './notes-view.js';
import { exportNotesAsText, exportNotesForPentagrama, sendNotesToPentagrama } from '../export.js';

let exportTypeFilter = 'todos';
let exportSelectedIds = null; // null = "todas las que matchean el filtro"
let exportArtist = '';

export function openSettingsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal settings-modal">
      <div class="modal-header">
        <span class="modal-title">Configuración</span>
        <button class="modal-close" id="settings-close">✕</button>
      </div>
      <div class="modal-tabs">
        <button class="modal-tab is-active" data-tab="apariencia">Apariencia</button>
        <button class="modal-tab" data-tab="exportar">Exportar</button>
      </div>
      <div class="modal-panel" data-panel="apariencia">${renderAppearancePanel()}</div>
      <div class="modal-panel" data-panel="exportar" hidden>${renderExportPanel()}</div>
    </div>
  `;
  document.body.appendChild(overlay);

  function close() {
    document.removeEventListener('keydown', onKeydown);
    overlay.remove();
  }
  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKeydown);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector('#settings-close').addEventListener('click', close);

  overlay.querySelectorAll('.modal-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('.modal-tab').forEach((b) => b.classList.toggle('is-active', b === btn));
      overlay.querySelectorAll('.modal-panel').forEach((p) => {
        p.hidden = p.dataset.panel !== btn.dataset.tab;
      });
    });
  });

  wireAppearancePanel(overlay);
  wireExportPanel(overlay);
}

function renderAppearancePanel() {
  const theme = getTheme();
  const palette = getPalette();
  const font = getFont();
  const fontSize = getFontSize();

  const paletteSwatches = PALETTE_ORDER.map((key) => {
    const p = PALETTES[key];
    const colors = p[theme] || p.light;
    return `
      <button class="palette-option ${key === palette ? 'is-active' : ''}" data-palette="${key}" title="${escapeAttr(p.label)}">
        <span class="palette-dots">
          <span class="palette-dot" style="background:${colors.paper}"></span>
          <span class="palette-dot" style="background:${colors.accent}"></span>
          <span class="palette-dot" style="background:${colors.brown}"></span>
        </span>
        <span class="palette-option-label">${escapeHtml(p.label)}</span>
      </button>
    `;
  }).join('');

  const fontOptions = FONT_ORDER.map((key) => {
    const f = FONTS[key];
    return `
      <button class="font-option ${key === font ? 'is-active' : ''}" data-font="${key}" style="font-family:${f.serif}">
        ${escapeHtml(f.label)}
      </button>
    `;
  }).join('');

  const sizeOptions = FONT_SIZE_ORDER.map((key) => {
    const s = FONT_SIZES[key];
    return `<button class="segmented-option ${key === fontSize ? 'is-active' : ''}" data-size="${key}">${escapeHtml(s.label)}</button>`;
  }).join('');

  return `
    <section class="settings-section">
      <h3>Tema</h3>
      <div class="segmented">
        <button class="segmented-option ${theme === 'light' ? 'is-active' : ''}" data-theme-choice="light">☀️ Claro</button>
        <button class="segmented-option ${theme === 'dark' ? 'is-active' : ''}" data-theme-choice="dark">🌙 Oscuro</button>
      </div>
    </section>
    <section class="settings-section">
      <h3>Paleta de colores</h3>
      <div class="palette-grid">${paletteSwatches}</div>
    </section>
    <section class="settings-section">
      <h3>Tipografía</h3>
      <div class="font-grid">${fontOptions}</div>
    </section>
    <section class="settings-section">
      <h3>Tamaño de letra</h3>
      <div class="segmented">${sizeOptions}</div>
    </section>
  `;
}

function wireAppearancePanel(overlay) {
  const panel = overlay.querySelector('[data-panel="apariencia"]');

  panel.querySelectorAll('[data-theme-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.themeChoice);
      panel.innerHTML = renderAppearancePanel();
      wireAppearancePanel(overlay);
    });
  });
  panel.querySelectorAll('[data-palette]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setPalette(btn.dataset.palette);
      panel.innerHTML = renderAppearancePanel();
      wireAppearancePanel(overlay);
    });
  });
  panel.querySelectorAll('[data-font]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setFont(btn.dataset.font);
      panel.innerHTML = renderAppearancePanel();
      wireAppearancePanel(overlay);
    });
  });
  panel.querySelectorAll('[data-size]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setFontSize(btn.dataset.size);
      panel.innerHTML = renderAppearancePanel();
      wireAppearancePanel(overlay);
    });
  });
}

function filteredExportNotes() {
  const notes = getNotesSnapshot();
  return notes.filter((n) => exportTypeFilter === 'todos' || n.type === exportTypeFilter);
}

function renderExportPanel() {
  const notes = filteredExportNotes();
  const selected = exportSelectedIds || new Set(notes.map((n) => n.id));

  const TYPE_LABELS_PLURAL = { cancion: 'Canciones', poema: 'Poemas', otro: 'Otros' };
  const typeChips = ['todos', 'cancion', 'poema', 'otro'].map((t) => {
    const label = t === 'todos' ? 'Todo' : TYPE_LABELS_PLURAL[t];
    return `<button class="chip ${exportTypeFilter === t ? 'is-active' : ''}" data-export-type="${t}">${label}</button>`;
  }).join('');

  const items = notes.length
    ? notes.map((n) => `
      <li>
        <label class="export-item">
          <input type="checkbox" data-export-id="${n.id}" ${selected.has(n.id) ? 'checked' : ''} />
          <span class="export-item-title">${escapeHtml(n.title?.trim() || 'Sin título')}</span>
          <span class="note-item-type">${TYPE_LABELS[n.type] || 'Otro'}</span>
        </label>
      </li>
    `).join('')
    : '<li class="notes-list-empty">No hay escritos de este tipo.</li>';

  const cancionesSeleccionadas = notes.filter((n) => n.type === 'cancion' && selected.has(n.id)).length;

  const pentagramaSection = cancionesSeleccionadas
    ? `
      <section class="settings-section">
        <h3>Enviar a Pentagrama</h3>
        <input type="text" id="export-artist" class="select-control" placeholder="Nombre del artista (opcional)" value="${escapeAttr(exportArtist)}" />
        <div class="export-actions">
          <button class="btn btn-primary" id="export-pentagrama-open">Abrir en Pentagrama (${cancionesSeleccionadas})</button>
          <button class="btn btn-ghost" id="export-pentagrama-download">Descargar .json en cambio</button>
        </div>
        <p class="login-hint">"Abrir en Pentagrama" te lleva directo a la app con las canciones ya importadas.</p>
      </section>
    `
    : '';

  return `
    <section class="settings-section">
      <h3>Qué exportar</h3>
      <div class="type-filters">${typeChips}</div>
    </section>
    <section class="settings-section">
      <div class="export-list-header">
        <h3>Elegí los escritos (${selected.size}/${notes.length})</h3>
        <button class="btn btn-ghost" id="export-toggle-all">${selected.size === notes.length ? 'Ninguno' : 'Todos'}</button>
      </div>
      <ul class="export-list">${items}</ul>
    </section>
    ${pentagramaSection}
    <section class="settings-section export-actions">
      <button class="btn btn-primary" id="export-txt" ${!selected.size ? 'disabled' : ''}>Descargar como .txt</button>
    </section>
  `;
}

function wireExportPanel(overlay) {
  const panel = overlay.querySelector('[data-panel="exportar"]');

  function rerender() {
    panel.innerHTML = renderExportPanel();
    wireExportPanel(overlay);
  }

  panel.querySelectorAll('[data-export-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      exportTypeFilter = btn.dataset.exportType;
      exportSelectedIds = null;
      rerender();
    });
  });

  panel.querySelectorAll('[data-export-id]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const notes = filteredExportNotes();
      const current = exportSelectedIds || new Set(notes.map((n) => n.id));
      const id = checkbox.dataset.exportId;
      checkbox.checked ? current.add(id) : current.delete(id);
      exportSelectedIds = current;
      rerender();
    });
  });

  const toggleAllBtn = panel.querySelector('#export-toggle-all');
  toggleAllBtn?.addEventListener('click', () => {
    const notes = filteredExportNotes();
    const selected = exportSelectedIds || new Set(notes.map((n) => n.id));
    exportSelectedIds = selected.size === notes.length ? new Set() : new Set(notes.map((n) => n.id));
    rerender();
  });

  panel.querySelector('#export-txt')?.addEventListener('click', () => {
    const notes = selectedNotes();
    if (notes.length) exportNotesAsText(notes);
  });

  panel.querySelector('#export-artist')?.addEventListener('input', (e) => {
    exportArtist = e.target.value;
  });

  panel.querySelector('#export-pentagrama-open')?.addEventListener('click', () => {
    const notes = selectedNotes();
    const count = sendNotesToPentagrama(notes, exportArtist);
    if (!count) alert('No hay canciones en la selección actual.');
  });

  panel.querySelector('#export-pentagrama-download')?.addEventListener('click', () => {
    const notes = selectedNotes();
    const count = exportNotesForPentagrama(notes, exportArtist);
    if (!count) alert('No hay canciones en la selección actual.');
  });
}

function selectedNotes() {
  const notes = filteredExportNotes();
  const selected = exportSelectedIds || new Set(notes.map((n) => n.id));
  return notes.filter((n) => selected.has(n.id));
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
