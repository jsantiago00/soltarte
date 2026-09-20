import { signIn, signOutUser } from '../auth.js';
import { openSettingsModal } from './settings-view.js';
import { mountNotesView, unmountNotesView, createNoteFromTemplate } from './notes-view.js';
import { mountLearnView, unmountLearnView } from './learn-view.js';

const BOOK_ICON = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 5.5c1.9-.95 4.1-.95 6 0v13.2c-1.9-.95-4.1-.95-6 0V5.5Z" />
    <path d="M20 5.5c-1.9-.95-4.1-.95-6 0v13.2c1.9-.95 4.1-.95 6 0V5.5Z" />
  </svg>
`;

export function mountAppShell(root, user) {
  root.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <div class="brand">
          <svg viewBox="0 0 512 512" width="28" height="28" aria-hidden="true">
            <rect width="512" height="512" rx="112" fill="#5b4636"/>
            <rect x="120" y="96" width="272" height="336" rx="18" fill="#faf6ef"/>
            <path d="M300 380 L392 152 C400 132 424 128 440 140 C456 152 458 176 444 194 L360 380 Z" fill="#c1653a"/>
          </svg>
          <span>SoltArte</span>
        </div>
        <div class="user-menu">
          <button id="learn-btn" class="btn btn-ghost icon-btn" title="Aprender formas" aria-label="Aprender formas">${BOOK_ICON}</button>
          <button id="settings-btn" class="btn btn-ghost icon-btn" title="Configuración" aria-label="Configuración">⚙️</button>
          ${
            user
              ? user.photoURL
                ? `<img class="avatar" src="${user.photoURL}" alt="" referrerpolicy="no-referrer" />`
                : `<span class="avatar avatar-fallback">${(user.displayName || user.email || '?')[0].toUpperCase()}</span>`
              : ''
          }
          <button id="auth-btn" class="btn btn-ghost" title="${user ? 'Cerrar sesión' : 'Iniciar sesión para sincronizar tus escritos'}">${user ? 'Salir' : 'Iniciar sesión'}</button>
        </div>
      </header>
      <main class="app-main">
        <div id="view-notes" class="view"></div>
      </main>
      <div class="learn-overlay" id="learn-overlay">
        <div class="learn-overlay-header">
          <button id="learn-overlay-back" class="btn btn-ghost icon-btn" title="Volver" aria-label="Volver">←</button>
          <span class="learn-overlay-title">Aprender formas</span>
        </div>
        <div id="view-learn" class="learn-overlay-body"></div>
      </div>
    </div>
  `;

  mountNotesView(document.getElementById('view-notes'), user);

  function openLearn() {
    document.getElementById('learn-overlay').classList.add('open');
    mountLearnView(document.getElementById('view-learn'), {
      onUseTemplate: (form) => {
        createNoteFromTemplate(form);
        closeLearn();
      },
    });
  }

  function closeLearn() {
    document.getElementById('learn-overlay').classList.remove('open');
    unmountLearnView();
    document.getElementById('view-learn').innerHTML = '';
  }

  document.getElementById('learn-btn').addEventListener('click', openLearn);
  document.getElementById('learn-overlay-back').addEventListener('click', closeLearn);

  document.getElementById('settings-btn').addEventListener('click', () => {
    openSettingsModal();
  });

  document.getElementById('auth-btn').addEventListener('click', () => {
    if (user) {
      signOutUser();
    } else {
      signIn().catch((err) => {
        console.error(err);
        alert('No se pudo iniciar sesión. Probá de nuevo.');
      });
    }
  });
}

export function unmountAppShell() {
  unmountNotesView();
  unmountLearnView();
}
