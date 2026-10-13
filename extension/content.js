(function () {
  const api = globalThis.browser || chrome;
  const isMusic = location.hostname === 'music.youtube.com';

  function text(sel) {
    const el = document.querySelector(sel);
    return el ? (el.title || el.textContent || '').trim() : '';
  }

  function videoState() {
    const video = document.querySelector('video');
    return {
      isPlaying: !!video && !video.paused && !video.ended,
      duration: video ? video.duration || 0 : 0,
      currentTime: video ? video.currentTime || 0 : 0
    };
  }

  // --- YouTube Music ---
  function readMusic() {
    const img = document.querySelector('ytmusic-player-bar img');
    const byline = text('.byline.style-scope.ytmusic-player-bar');
    return {
      type: 'nowPlaying',
      title: text('.title.style-scope.ytmusic-player-bar') || document.title.replace(/ - YouTube Music$/, ''),
      artist: (byline.split(' • ')[0] || '').trim(),
      thumbnail: img && img.src ? img.src.replace(/=w\d+-h\d+.*$/, '=w300-h300-l90-rj') : '',
      ...videoState()
    };
  }

  // --- Regular YouTube (watch pages and shorts only; the home page autoplays muted previews) ---
  function readVideo() {
    if (!/^\/(watch|shorts\/)/.test(location.pathname)) return null;
    const md = navigator.mediaSession && navigator.mediaSession.metadata;
    const title = (md && md.title) || text('h1.ytd-watch-metadata yt-formatted-string') || document.title.replace(/ - YouTube$/, '');
    if (!title) return null;
    const art = md && md.artwork && md.artwork.length ? md.artwork[md.artwork.length - 1].src : '';
    const id = new URLSearchParams(location.search).get('v');
    return {
      type: 'nowPlaying',
      title,
      artist: (md && md.artist) || text('ytd-channel-name a'),
      thumbnail: art || (id ? 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' : ''),
      ...videoState()
    };
  }

  function report() {
    const data = isMusic ? readMusic() : readVideo();
    if (!data) return;
    try {
      api.runtime.sendMessage({ type: 'state', data });
    } catch (e) { /* extension was reloaded; this tab needs a refresh */ }
  }

  const MUSIC_BUTTONS = { playPause: '.play-pause-button', next: '.next-button', prev: '.previous-button' };
  const VIDEO_BUTTONS = { next: '.ytp-next-button', prev: '.ytp-prev-button' };

  function control(action) {
    if (isMusic) {
      const btn = document.querySelector(MUSIC_BUTTONS[action]);
      if (btn) btn.click();
      return;
    }
    const video = document.querySelector('video');
    if (action === 'playPause' && video) {
      if (video.paused) video.play(); else video.pause();
      return;
    }
    const btn = document.querySelector(VIDEO_BUTTONS[action]);
    if (btn && getComputedStyle(btn).display !== 'none') btn.click();
    else if (action === 'prev' && video) video.currentTime = 0;
  }

  api.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== 'control') return;
    control(msg.action);
    setTimeout(report, 200);
  });

  setInterval(report, 1000);
  document.addEventListener('play', report, true);
  document.addEventListener('pause', report, true);
  report();
})();
