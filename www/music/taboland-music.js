/* TABOLAND v3 - one persistent music player shared by all scenes. */
(() => {
  'use strict';
  if (window.TabolandMusic) return;

  const KEY = 'taboland.music.v1';
  const TRACKS = ['music/taboland-1.mp3', 'music/taboland-2.mp3'];
  const GAP_MS = 15000;
  const FADE_MS = 2600;
  let volume = 0.5;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (typeof saved.volume === 'number' && Number.isFinite(saved.volume)) {
      volume = Math.min(1, Math.max(0, saved.volume));
    }
  } catch (_) {}

  let audio = null;
  let trackIndex = Math.random() < 0.5 ? 0 : 1;
  let began = false;
  let scheduled = false;
  let inFlight = false;
  let inGap = false;
  let status = 'waiting';
  let errorMessage = '';
  let trackTimer = null;
  let fadeId = 0;
  let fadeStartedAt = 0;

  function emitState() {
    window.dispatchEvent(new CustomEvent('taboland:musicstate', {
      detail: {status, track: trackIndex + 1, volume, error: errorMessage}
    }));
  }
  function setStatus(next, error = '') {
    if (next === status && error === errorMessage) return;
    status = next;
    errorMessage = error;
    emitState();
  }
  function setVolume(next) {
    const n = Number(next);
    if (!Number.isFinite(n)) return;
    volume = Math.max(0, Math.min(1, n));
    try {localStorage.setItem(KEY, JSON.stringify({volume}));} catch (_) {}
    if (audio && !fadeId) audio.volume = volume;
    window.dispatchEvent(new CustomEvent('taboland:musicvolume', {detail: {volume}}));
    emitState();
  }
  function clearFade() {
    if (fadeId) cancelAnimationFrame(fadeId);
    fadeId = 0;
  }
  function fadeIn(current) {
    if (audio !== current || current.paused || fadeId) return;
    fadeStartedAt = performance.now();
    current.volume = 0;
    function frame(now) {
      if (audio !== current || current.paused) {clearFade(); return;}
      const p = Math.min(1, (now - fadeStartedAt) / FADE_MS);
      const eased = p * p * (3 - 2 * p);
      current.volume = Math.min(1, Math.max(0, volume * eased));
      if (p < 1) fadeId = requestAnimationFrame(frame);
      else {fadeId = 0; current.volume = volume;}
    }
    fadeId = requestAnimationFrame(frame);
  }
  function tryPlay(force = false) {
    if (!began || !audio || inGap || (inFlight && !force)) return;
    const current = audio;
    if (!current.paused) {setStatus('playing'); return;}
    let result;
    try {result = current.play();}
    catch (e) {setStatus('blocked', String(e?.message || e)); return;}
    if (result?.then) {
      inFlight = true;
      result.then(() => {
        inFlight = false;
        if (audio !== current) return;
        setStatus('playing');
        fadeIn(current);
      }).catch(err => {
        inFlight = false;
        if (audio !== current) return;
        // Most Android WebViews require a tap before HTML audio may play.
        // The retry happens inside the next trusted pointer/touch/click event.
        console.warn('TABOLAND background music needs activation:', err);
        setStatus('blocked', String(err?.message || err));
      });
    } else {
      setStatus('playing');
      fadeIn(current);
    }
  }
  function openTrack(index) {
    clearTimeout(trackTimer);
    trackTimer = null;
    inGap = false;
    clearFade();
    inFlight = false;
    if (audio) {audio.pause(); audio.removeAttribute('src'); audio.load();}
    trackIndex = index;
    const current = document.createElement('audio');
    // A resolved URL works both for localhost and Capacitor's local WebView origin.
    current.src = new URL(TRACKS[index], document.baseURI).href;
    current.preload = 'auto';
    current.loop = false;
    current.volume = 0;
    current.setAttribute('playsinline', '');
    audio = current;
    setStatus('loading');
    current.addEventListener('playing', () => {
      if (audio === current) {setStatus('playing'); fadeIn(current);}
    });
    current.addEventListener('ended', () => {
      if (audio !== current) return;
      audio = null;
      clearFade();
      inGap = true;
      setStatus('gap');
      trackTimer = setTimeout(() => openTrack(1 - index), GAP_MS);
    }, {once: true});
    current.addEventListener('error', () => {
      if (audio !== current) return;
      const code = current.error?.code ?? '?';
      console.error('TABOLAND music asset could not load', current.src, code);
      inFlight = false;
      setStatus('error', 'Ses dosyasi acilamadi (' + code + ')');
      // Do not silently cycle forever. A user action retries this track.
    });
    try {current.load();} catch (_) {}
    tryPlay();
  }
  function start() {
    if (began) return;
    began = true;
    openTrack(trackIndex);
  }
  function retryFromGesture() {
    if (began && !inGap) {
      if (status === 'error') openTrack(trackIndex);
      else tryPlay(true);
    }
  }
  const service = {
    get volume() {return volume;},
    get trackNumber() {return trackIndex + 1;},
    get status() {return status;},
    get error() {return errorMessage;},
    get playing() {return !!(audio && !audio.paused);},
    setVolume,
    startWhenLogoFades(delayMs = 3100) {
      if (scheduled) return;
      scheduled = true;
      setTimeout(start, Math.max(0, Number(delayMs) || 0));
    },
    // IMPORTANT: invoke directly in a real user event if autoplay is blocked.
    activate() {
      if (!began) {
        clearTimeout(trackTimer);
        start();
      } else retryFromGesture();
    },
    retryAfterGesture: retryFromGesture
  };
  window.TabolandMusic = service;
  document.addEventListener('pointerdown', retryFromGesture, true);
  document.addEventListener('touchstart', retryFromGesture, {capture: true, passive: true});
  document.addEventListener('keydown', retryFromGesture, true);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && status !== 'gap') retryFromGesture();
  });
  window.addEventListener('pageshow', () => {if (began) retryFromGesture();});
})();
