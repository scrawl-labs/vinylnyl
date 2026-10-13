(function () {
  const api = globalThis.browser || chrome;

  function text(sel) {
    const el = document.querySelector(sel);
    return el ? (el.title || el.textContent || '').trim() : '';
  }

  function thumbnail() {
    const img = document.querySelector('ytmusic-player-bar img');
    return img && img.src ? img.src.replace(/=w\d+-h\d+.*$/, '=w300-h300-l90-rj') : '';
  }

  function readState() {
    const video = document.querySelector('video');
    const title = text('.title.style-scope.ytmusic-player-bar') || document.title.replace(/ - YouTube Music$/, '');
    const byline = text('.byline.style-scope.ytmusic-player-bar');
    return {
      type: 'nowPlaying',
      title,
      artist: (byline.split(' • ')[0] || '').trim(),
      thumbnail: thumbnail(),
      isPlaying: !!video && !video.paused && !video.ended,
      duration: video ? video.duration || 0 : 0,
      currentTime: video ? video.currentTime || 0 : 0
    };
  }

  function report() {
    try {
      api.runtime.sendMessage({ type: 'state', data: readState() });
    } catch (e) { /* extension was reloaded; this tab needs a refresh */ }
  }

  const BUTTONS = { playPause: '.play-pause-button', next: '.next-button', prev: '.previous-button' };

  api.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== 'control') return;
    const sel = BUTTONS[msg.action];
    const btn = sel && document.querySelector(sel);
    if (btn) btn.click();
    setTimeout(report, 200);
  });

  setInterval(report, 1000);
  document.addEventListener('play', report, true);
  document.addEventListener('pause', report, true);
  report();
})();
