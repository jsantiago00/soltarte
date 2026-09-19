const TYPE_LABELS = { cancion: 'Canción', poema: 'Poema', otro: 'Otro' };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function timestampToArDate(ts) {
  const date = ts?.toDate ? ts.toDate() : typeof ts === 'number' ? new Date(ts) : new Date();
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function downloadBlob(content, mime, filename) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportNotesAsText(notes) {
  const body = notes
    .map((note) => {
      const title = note.title?.trim() || 'Sin título';
      const type = TYPE_LABELS[note.type] || 'Otro';
      return `${title}\n(${type})\n${'-'.repeat(24)}\n${note.content || ''}`;
    })
    .join('\n\n' + '='.repeat(40) + '\n\n');
  downloadBlob(body, 'text/plain', `soltarte_${todayISO()}.txt`);
}

// Formato que espera Pentagrama (src/components/SongsModal.jsx y, para la
// integración directa, src/lib/importQueue.js del repo pentagrama): un array
// de objetos { id, title, artist, text, created, updated, source },
// deduplicados por "source" al importar.
// El prefijo "cuaderno" en id/source queda igual a propósito (era el nombre de
// esta app): es la clave que Pentagrama usa para no duplicar canciones ya
// importadas - cambiarlo re-importaría como nuevas las que ya se pasaron antes.
function buildPentagramaSongs(notes, artist) {
  return notes
    .filter((n) => n.type === 'cancion')
    .map((n) => ({
      id: `cuaderno_${n.id}`,
      title: n.title?.trim() || 'Sin título',
      artist: (artist || '').trim(),
      text: n.content || '',
      source: `cuaderno:${n.id}`,
      created: timestampToArDate(n.createdAt),
      updated: timestampToArDate(n.updatedAt),
    }));
}

export function exportNotesForPentagrama(notes, artist) {
  const songs = buildPentagramaSongs(notes, artist);
  downloadBlob(JSON.stringify(songs, null, 2), 'application/json', `canciones_para_pentagrama_${todayISO()}.json`);
  return songs.length;
}

// Pentagrama vive en el mismo dominio (santiagososa.com.ar), así que en vez de
// bajar un archivo, dejamos las canciones en una cola compartida vía
// localStorage (mismo origen = mismo storage) y redirigimos: Pentagrama la
// lee sola al abrir, importa, y limpia la cola.
const PENTAGRAMA_QUEUE_KEY = 'pentagrama_import_queue';
const PENTAGRAMA_URL = 'https://santiagososa.com.ar/pentagrama/';

export function sendNotesToPentagrama(notes, artist) {
  const songs = buildPentagramaSongs(notes, artist);
  if (!songs.length) return 0;

  let queued = [];
  try {
    const raw = JSON.parse(localStorage.getItem(PENTAGRAMA_QUEUE_KEY) || '[]');
    if (Array.isArray(raw)) queued = raw;
  } catch (err) {
    console.error('Error leyendo la cola de Pentagrama', err);
  }
  localStorage.setItem(PENTAGRAMA_QUEUE_KEY, JSON.stringify([...queued, ...songs]));

  window.location.href = PENTAGRAMA_URL;
  return songs.length;
}
