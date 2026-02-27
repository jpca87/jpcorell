// ======================
// Player Retro - JPCORELLA
// ======================

// --------- Referencias DOM ----------
const audio = document.getElementById('audio');
const cover = document.getElementById('audioImage');
const titleEl = document.getElementById('track-title');
const currentEl = document.getElementById('current');
const totalEl = document.getElementById('total');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const playPauseBtn = document.getElementById('playPauseBtn');
const playPauseIcon = document.getElementById('playPauseIcon');
const vinylEl = document.querySelector('.vinyl');
const tonearmEl = document.querySelector('.tonearm');
const eq = document.querySelector('.equalizer-chrome');

// Offcanvas
const menuBtn = document.getElementById('menuBtn');
const playlistListEl = document.getElementById('playlistList');
let playlistOffcanvas;

// Volumen
const volumeSlider = document.getElementById('volumeSlider');
const volumePct = document.getElementById('volumePct');
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');

// Seek
const seekSlider = document.getElementById('seekSlider');

// --------- Config ----------
const DEFAULT_IMAGE = 'img/albums/Default.png';

// --------- Playlist ----------
const playlist = [
  { title: 'Me dediqué a perderte — Alejandro Fernández', src: 'musica/Alejandro Fernandez - Me dedique a perderte.mp3', img: 'img/albums/Alejandro Fernandez - Me dedique a perderte.png' },
  { title: 'Alejandro fernandez - Te lo dije cantando',     src: 'musica/Alejandro fernandez - te lo dije cantando.mp3', img: 'img/albums/Alejandro fernandez - te lo dije cantando.png' },
  { title: 'Billie jean',                                   src: 'musica/Billie jean.mp3',                               img: 'img/albums/Billie jean.png' },
  { title: 'Bille',                                         src: 'musica/Billie_Eilish_Bad_Guy.mp3',                     img: 'img/albums/Billie_Eilish_Bad_Guy.png' },
  { title: 'Bob Marley',                                    src: 'musica/Bob Marley - Red Red Wine.mp3',                 img: 'img/albums/Bob Marley - Red Red Wine.png' },
  { title: 'Busy Signal',                                   src: 'musica/Busy Signal Up In Her Belly.mp3',               img: 'img/albums/Busy Signal Up In Her Belly.png' },
  { title: 'Franco De Vita',                                src: 'musica/Franco De Vita - Y Te Pienso.mp3',              img: 'img/albums/Franco De Vita - Y Te Pienso.png' },
  { title: 'THIS LOVE',                                     src: 'musica/IS THIS LOVE.mp3',                              img: 'img/albums/IS THIS LOVE.png' },
  { title: 'PABLO MONTERO',                                 src: 'musica/PABLO MONTERO - ENTREGA TOTAL.mp3',             img: 'img/albums/PABLO MONTERO - ENTREGA TOTAL.png' },
  { title: 'Pitbull - Shut It Down',                        src: 'musica/Pitbull - Shut It Down.mp3',                    img: 'img/albums/Pitbull - Shut It Down.png' },
];

// --------- Estado ----------
let index = 0;
let lastVolume = 1.0;  // 0..1
let isSeeking = false; // arrastrando seek
let wasPlaying = false;

// --------- Utilidades ----------
function formatTime(sec) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function renderPlaylist() {
  if (!playlistListEl) return;
  playlistListEl.innerHTML = '';

  playlist.forEach((track, i) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center py-2 playlist-item';
    li.setAttribute('role', 'option');
    li.setAttribute('data-index', i);

    const spanTitle = document.createElement('span');
    spanTitle.textContent = track.title || `Pista ${i + 1}`;

    const badge = document.createElement('span');
    badge.className = 'badge bg-secondary rounded-pill small';
    badge.textContent = i === index ? 'Reproduciendo' : `${i + 1}`;

    li.appendChild(spanTitle);
    li.appendChild(badge);

    li.addEventListener('click', () => {
      loadTrack(i);
      play(); // interacción de usuario => permitido
      if (playlistOffcanvas) playlistOffcanvas.hide();
    });

    playlistListEl.appendChild(li);
  });

  highlightActiveItem();
}

function highlightActiveItem() {
  const items = playlistListEl?.querySelectorAll('.playlist-item') || [];
  items.forEach((el, i) => {
    el.classList.toggle('active', i === index);
    const badge = el.querySelector('.badge');
    if (!badge) return;
    if (i === index) {
      badge.textContent = 'Reproduciendo';
      badge.classList.remove('bg-secondary');
      badge.classList.add('bg-danger');
    } else {
      badge.textContent = `${i + 1}`;
      badge.classList.remove('bg-danger');
      badge.classList.add('bg-secondary');
    }
  });
}

// Arco de progreso (si existe en el DOM)
function setArcProgress(ratio01) {
  const bar = document.getElementById('bar');
  if (!bar) return;
  const maxLen = 999;
  const r = Math.max(0, Math.min(1, Number(ratio01) || 0));
  bar.setAttribute('stroke-dasharray', `${r * maxLen} ${maxLen - r * maxLen}`);
}

// Play/Pausa icon
function setPlayIcon(isPlaying) {
  if (!playPauseIcon) return;
  while (playPauseIcon.firstChild) playPauseIcon.removeChild(playPauseIcon.firstChild);

  if (isPlaying) {
    const left = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    left.setAttribute('x', '16'); left.setAttribute('y', '12');
    left.setAttribute('width', '6'); left.setAttribute('height', '24');
    left.setAttribute('fill', '#ffffff');

    const right = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    right.setAttribute('x', '26'); right.setAttribute('y', '12');
    right.setAttribute('width', '6'); right.setAttribute('height', '24');
    right.setAttribute('fill', '#ffffff');

    playPauseIcon.appendChild(left);
    playPauseIcon.appendChild(right);
  } else {
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', '18,12 36,24 18,36');
    poly.setAttribute('fill', '#ffffff');
    playPauseIcon.appendChild(poly);
  }
}

// Animaciones disco/brazo
function setPlayingAnimations(isPlaying) {
  if (vinylEl) vinylEl.classList.toggle('spinning', isPlaying);
  if (tonearmEl) tonearmEl.classList.toggle('on-disc', isPlaying);
}

// Portada con fallback “inteligente”
function setCoverSmart(rawUrl) {
  if (!cover) return;

  cover.dataset.retry = '0';
  const firstUrl  = rawUrl ? encodeURI(rawUrl) : DEFAULT_IMAGE;

  function trimSpaceBeforeExt(url) {
    if (!url) return url;
    return url.replace(/\s+(\.(png|jpg|jpeg|webp|gif))$/i, '$1');
  }
  function collapseSpaces(url) {
    if (!url) return url;
    return url.replace(/\s{2,}/g, ' ');
  }

  const secondUrl = rawUrl ? encodeURI(trimSpaceBeforeExt(rawUrl)) : DEFAULT_IMAGE;
  const thirdUrl  = rawUrl ? encodeURI(trimSpaceBeforeExt(collapseSpaces(rawUrl))) : DEFAULT_IMAGE;

  cover.onerror = () => {
    const retry = parseInt(cover.dataset.retry || '0', 10);
    if (retry === 0 && rawUrl) { cover.dataset.retry = '1'; cover.src = secondUrl; return; }
    if (retry === 1 && rawUrl) { cover.dataset.retry = '2'; cover.src = thirdUrl;  return; }
    if (!cover.src.endsWith(DEFAULT_IMAGE)) { cover.dataset.retry = '3'; cover.src = DEFAULT_IMAGE; }
  };

  cover.src = firstUrl;
}

// --------- Core ----------
function loadTrack(i) {
  index = (i + playlist.length) % playlist.length;
  const t = playlist[index];
  if (!t || !audio) return;

  audio.src = t.src ? encodeURI(t.src) : '';
  setCoverSmart(t.img);
  if (titleEl) titleEl.textContent = t.title || `Pista ${index + 1}`;

  // Reset visual
  setArcProgress(0);
  if (currentEl) currentEl.textContent = formatTime(0);
  if (totalEl)   totalEl.textContent = '0:00';

  highlightActiveItem();
  updateSeekUIFromAudio(); // sincroniza barra al cargar
}

async function play() {
  if (!audio) return;
  try {
    await audio.play();
    setPlayIcon(true);
    setPlayingAnimations(true);
  } catch (err) {
    console.warn('El navegador bloqueó la reproducción automática hasta que haya interacción.', err);
  }
}

function pause() {
  if (!audio) return;
  audio.pause();
  setPlayIcon(false);
  setPlayingAnimations(false);
}

function togglePlay() {
  if (!audio) return;
  if (audio.paused) play(); else pause();
}

// --------- SEEK BAR ----------
function updateSeekUIFromAudio() {
  if (!seekSlider || !audio || isNaN(audio.duration) || audio.duration <= 0) return;
  const ratio = audio.currentTime / audio.duration; // 0..1
  const pct = Math.max(0, Math.min(100, ratio * 100));
  seekSlider.value = pct;
  seekSlider.style.setProperty('--seek-fill', `${pct}%`);
  if (currentEl) currentEl.textContent = formatTime(audio.currentTime);
  if (totalEl)   totalEl.textContent   = formatTime(audio.duration);
}

seekSlider?.addEventListener('input', (e) => {
  if (!audio || isNaN(audio.duration) || audio.duration <= 0) return;
  isSeeking = true;
  const pct = Math.max(0, Math.min(100, Number(e.target.value || 0)));
  seekSlider.style.setProperty('--seek-fill', `${pct}%`);
  const targetTime = (pct / 100) * audio.duration;
  if (currentEl) currentEl.textContent = formatTime(targetTime);
});

['pointerdown','touchstart','mousedown'].forEach(evt =>
  seekSlider?.addEventListener(evt, () => {
    if (!audio) return;
    wasPlaying = !audio.paused;
  })
);

['change','pointerup','touchend','mouseup'].forEach(evt =>
  seekSlider?.addEventListener(evt, () => {
    if (!audio || isNaN(audio.duration) || audio.duration <= 0) return;
    const pct = Math.max(0, Math.min(100, Number(seekSlider.value || 0)));
    audio.currentTime = (pct / 100) * audio.duration;
    isSeeking = false;
    if (wasPlaying) { audio.play().catch(() => {}); }
  })
);

// --------- Volumen ----------
(function initVolume() {
  if (!audio) return;
  const savedVol = parseFloat(localStorage.getItem('player.volume'));
  const vol = Number.isFinite(savedVol) ? Math.max(0, Math.min(1, savedVol)) : 1;
  audio.volume = vol;
  if (volumeSlider) volumeSlider.value = Math.round(vol * 100);
  if (volumePct)    volumePct.textContent = `${Math.round(vol * 100)}%`;
  updateMuteUI(vol === 0);
})();

audio?.addEventListener('volumechange', () => {
  const vol = Math.round((audio.volume || 0) * 100);
  if (volumeSlider && Number(volumeSlider.value) !== vol) volumeSlider.value = vol;
  if (volumePct) volumePct.textContent = `${vol}%`;
  updateMuteUI((audio.volume || 0) === 0);
  localStorage.setItem('player.volume', (audio.volume || 0).toString());
});

function updateMuteUI(isMuted) {
  const wrapper = document.querySelector('.volume-control');
  if (wrapper) wrapper.classList.toggle('volume-muted', isMuted);
}

volumeSlider?.addEventListener('input', (e) => {
  const pct = Math.max(0, Math.min(100, Number(e.target.value || 0)));
  const vol = pct / 100;
  if (vol > 0) lastVolume = vol;
  if (audio) audio.volume = vol;
});

muteBtn?.addEventListener('click', () => {
  if (!audio) return;
  if (audio.volume > 0) {
    lastVolume = audio.volume || lastVolume || 1;
    audio.volume = 0;
  } else {
    audio.volume = lastVolume > 0 ? lastVolume : 1;
  }
});

// --------- Eventos de audio (CONSOLIDADOS) ----------
if (audio) {
  audio.addEventListener('loadedmetadata', updateSeekUIFromAudio);
  audio.addEventListener('durationchange', updateSeekUIFromAudio);
  audio.addEventListener('loadeddata',     updateSeekUIFromAudio);
  audio.addEventListener('canplay',        updateSeekUIFromAudio);

  audio.addEventListener('timeupdate', () => {
    if (!isSeeking) updateSeekUIFromAudio();
    if (isFinite(audio.duration) && audio.duration > 0) {
      setArcProgress(audio.currentTime / audio.duration);
    } else {
      setArcProgress(0);
    }
  });

  audio.addEventListener('play', () => {
    setPlayIcon(true);
    setPlayingAnimations(true);
    if (eq) eq.classList.add('active');
  });

  audio.addEventListener('pause', () => {
    setPlayIcon(false);
    setPlayingAnimations(false);
    if (eq) eq.classList.remove('active');
  });

  audio.addEventListener('ended', () => {
    if (eq) eq.classList.remove('active');
    loadTrack(index + 1);
    play(); // permitido: ya hubo interacción
  });

  audio.addEventListener('error', (e) => {
    console.error('Error al cargar/reproducir el audio:', e);
    if (titleEl) titleEl.textContent = 'Error con la pista, saltando…';
    setTimeout(() => {
      loadTrack(index + 1);
      play();
    }, 400);
  });
}

// --------- Controles ----------
prevBtn?.addEventListener('click', () => { loadTrack(index - 1); play(); });
nextBtn?.addEventListener('click', () => { loadTrack(index + 1); play(); });
playPauseBtn?.addEventListener('click', togglePlay);

// Teclado (si quieres que las flechas hagan SEEK, descomenta el bloque de SEEK y comenta el de cambio de pista)
document.addEventListener('keydown', (ev) => {
  if (['INPUT', 'TEXTAREA'].includes(ev.target.tagName)) return;
  switch (ev.key) {
    case ' ':
      ev.preventDefault();
      togglePlay();
      break;

  
    case 'ArrowRight':
      ev.preventDefault();
      loadTrack(index + 1);
      play();
      break;
    case 'ArrowLeft':
      ev.preventDefault();
      loadTrack(index - 1);
      play();
      break;

    case 'ArrowUp':
      ev.preventDefault();
      if (audio) audio.volume = Math.min(1, (audio.volume || 0) + 0.05);
      break;
    case 'ArrowDown':
      ev.preventDefault();
      if (audio) audio.volume = Math.max(0, (audio.volume || 0) - 0.05);
      break;
  }
});

// --------- Inicio ----------
document.addEventListener('DOMContentLoaded', () => {
  const offcanvasEl = document.getElementById('playlistOffcanvas');
  if (offcanvasEl && window.bootstrap?.Offcanvas) {
    playlistOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
  }

  loadTrack(0);  // sin autoplay
  renderPlaylist();

  menuBtn?.addEventListener('click', () => {
    renderPlaylist();
    if (playlistOffcanvas) playlistOffcanvas.toggle();
  });
});