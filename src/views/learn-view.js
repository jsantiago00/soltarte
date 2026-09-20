import { poeticForms } from '../forms-data.js';
import { countLineSyllables } from '../syllables.js';

let onUseTemplateCallback = null;
let practiceInterval = null;

export function mountLearnView(container, { onUseTemplate }) {
  onUseTemplateCallback = onUseTemplate;

  container.innerHTML = `
    <div class="learn-layout">
      <aside class="learn-list">
        <h2>Formas poéticas</h2>
        <p class="learn-list-hint">Elegí una para ver cómo se escribe y probarla.</p>
        <ul id="forms-list"></ul>
      </aside>
      <section class="learn-detail" id="learn-detail">
        <div class="editor-empty"><p>Elegí una forma de la lista para aprender a escribirla.</p></div>
      </section>
    </div>
  `;

  const list = container.querySelector('#forms-list');
  list.innerHTML = poeticForms
    .map(
      (f) => `
        <li>
          <button class="form-item" data-id="${f.id}">
            <span class="form-item-name">${f.name}</span>
            <span class="form-item-scheme">${f.scheme}</span>
          </button>
        </li>
      `,
    )
    .join('');

  list.querySelectorAll('.form-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      list.querySelectorAll('.form-item').forEach((b) => b.classList.toggle('is-active', b === btn));
      renderDetail(container, btn.dataset.id);
    });
  });
}

export function unmountLearnView() {
  onUseTemplateCallback = null;
  if (practiceInterval) clearInterval(practiceInterval);
}

function renderDetail(container, formId) {
  const form = poeticForms.find((f) => f.id === formId);
  const detail = container.querySelector('#learn-detail');
  if (!form) return;

  const practiceRows = form.template.syllableTargets
    ? form.template.syllableTargets
        .map(
          (target, i) => `
            <div class="practice-row">
              <span class="practice-line-label">Verso ${i + 1} <em>(${target} sílabas)</em></span>
              <input type="text" class="practice-input" data-target="${target}" data-index="${i}" />
              <span class="practice-count" id="practice-count-${i}">0/${target}</span>
            </div>
          `,
        )
        .join('')
    : '';

  detail.innerHTML = `
    <div class="learn-detail-inner">
      <button class="btn btn-ghost icon-btn learn-back-btn" id="learn-back-to-list" title="Volver a las formas" aria-label="Volver a las formas">←</button>
      <h2>${form.name}</h2>
      <p class="form-origin">${form.origin}</p>
      <p class="form-summary">${form.summary}</p>
      <div class="form-scheme-box"><strong>Esquema:</strong> ${form.scheme}</div>

      <h3>Consejos</h3>
      <ul class="form-tips">
        ${form.tips.map((t) => `<li>${t}</li>`).join('')}
      </ul>

      <h3>Ejemplo</h3>
      <pre class="form-example">${escapeHtml(form.example)}</pre>

      ${
        practiceRows
          ? `<h3>Probá acá (opcional)</h3>
             <p class="practice-hint">El conteo de sílabas es aproximado: usalo como guía, no como regla estricta.</p>
             <div class="practice-box">${practiceRows}</div>`
          : ''
      }

      <button class="btn btn-primary" id="use-template-btn">Usar esta forma para un escrito nuevo</button>
    </div>
  `;

  detail.querySelectorAll('.practice-input').forEach((input) => {
    input.addEventListener('input', () => {
      const target = Number(input.dataset.target);
      const idx = input.dataset.index;
      const count = countLineSyllables(input.value);
      const counter = detail.querySelector(`#practice-count-${idx}`);
      counter.textContent = `${count}/${target}`;
      counter.classList.toggle('ok', count === target);
    });
  });

  detail.querySelector('#use-template-btn').addEventListener('click', () => {
    onUseTemplateCallback?.(form);
  });

  detail.querySelector('#learn-back-to-list').addEventListener('click', () => {
    container.querySelector('.learn-layout')?.classList.remove('show-detail');
  });

  container.querySelector('.learn-layout')?.classList.add('show-detail');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
