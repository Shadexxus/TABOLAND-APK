/* TABOLAND: persistent music service (survives Phaser scene changes). */
(() => {
  'use strict';
  if (window.TabolandMusic) return;
  const KEY = 'taboland.music.v1';
  const TRACKS = ['music/taboland-1.mp3', 'music/taboland-2.mp3'];
  const SILENCE_MS = 15000;
  const FADE_MS = 2400;
  let volume = 0.5;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (typeof saved.volume === 'number' && Number.isFinite(saved.volume)) {
      volume = Math.max(0, Math.min(1, saved.volume));
    }
  } catch (_) {}
  let audio = null;
  let firstTrack = Math.random() < 0.5 ? 0 : 1;
  let trackIndex = firstTrack;
  let firstStartScheduled = false;
  let begun = false;
  let fading = false;
  let fadeId = 0;
  let trackTimer = null;
  let targetReached = false;
  const notify = () => window.dispatchEvent(new CustomEvent('taboland:musicvolume', {detail: {volume}}));

  function setVolume(next) {
    const value = Number(next);
    if (!Number.isFinite(value)) return;
    volume = Math.max(0, Math.min(1, value));
    try { localStorage.setItem(KEY, JSON.stringify({volume})); } catch (_) {}
    if (audio && !fading) audio.volume = volume;
    notify();
  }

  function fadeIn(el) {
    cancelAnimationFrame(fadeId);
    fading = true;
    targetReached = false;
    const startedAt = performance.now();
    el.volume = 0;
    function frame(now) {
      if (el !== audio) { fading = false; return; }
      const progress = Math.min(1, Math.max(0, (now - startedAt) / FADE_MS));
      el.volume = Math.min(1, Math.max(0, volume * (progress * progress * (3 - 2 * progress))));
      if (progress < 1) fadeId = requestAnimationFrame(frame);
      else { fading = false; targetReached = true; el.volume = volume; }
    }
    fadeId = requestAnimationFrame(frame);
  }

  function playPending() {
    if (!audio || !audio.paused || !begun || document.visibilityState === 'hidden') return;
    const requested = audio;
    let result;
    try { result = requested.play(); } catch (_) { return; }
    if (result && typeof result.then === 'function') {
      result.then(() => { if (audio === requested) fadeIn(requested); }).catch(() => {
        // Mobile WebView sometimes needs a real user gesture; pointer/key listeners retry.
      });
    } else if (audio === requested) fadeIn(requested);
  }

  function playTrack(index) {
    clearTimeout(trackTimer);
    trackTimer = null;
    cancelAnimationFrame(fadeId);
    fading = false;
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    trackIndex = index;
    const current = new Audio(TRACKS[index]);
    current.preload = 'auto';
    current.loop = false;
    current.volume = 0;
    audio = current;
    current.addEventListener('ended', () => {
      if (audio !== current) return;
      audio = null;
      fading = false;
      cancelAnimationFrame(fadeId);
      trackTimer = setTimeout(() => playTrack(1 - index), SILENCE_MS);
    }, {once: true});
    current.addEventListener('error', () => {
      if (audio !== current) return;
      audio = null;
      fading = false;
      cancelAnimationFrame(fadeId);
      trackTimer = setTimeout(() => playTrack(1 - index), SILENCE_MS);
    }, {once: true});
    playPending();
  }

  function start() {
    if (begun) return;
    begun = true;
    playTrack(firstTrack);
  }

  const service = {
    get volume() { return volume; },
    get trackNumber() { return trackIndex + 1; },
    get playing() { return Boolean(audio && !audio.paused); },
    setVolume,
    // Called when the splash starts fading, approximately 3.1 seconds after logo appears.
    startWhenLogoFades(delayMs = 3100) {
      if (firstStartScheduled) return;
      firstStartScheduled = true;
      setTimeout(start, Math.max(0, Number(delayMs) || 0));
    },
    retryAfterGesture: playPending
  };
  window.TabolandMusic = service;
  document.addEventListener('pointerdown', playPending, {passive: true});
  document.addEventListener('keydown', playPending);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') playPending();
  });
})();
