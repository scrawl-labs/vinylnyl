(function () {
  const widget = document.getElementById('widget');
  const disc = document.getElementById('disc');
  const cover = document.getElementById('cover');
  const titleEl = document.getElementById('title');
  const titleDupEl = document.getElementById('titleDup');
  const artistEl = document.getElementById('artist');
  const marquee = document.getElementById('marquee');
  const statusEl = document.getElementById('status');
  const iconPlay = document.getElementById('icon-play');
  const iconPause = document.getElementById('icon-pause');

  const btnClose = document.getElementById('btn-close');
  const btnPrev = document.getElementById('btn-prev');
  const btnPlay = document.getElementById('btn-play');
  const btnNext = document.getElementById('btn-next');

  let connected = false;
  let lastThumb = '';
  let lastTitleKey = null;

  // If a thumbnail URL 404s or fails to load for any reason, fall back to
  // the empty record label instead of leaving a broken-image icon on it.
  cover.addEventListener('error', () => {
    if (cover.getAttribute('src')) {
      lastThumb = '';
      cover.removeAttribute('src');
    }
  });

  // Long-form videos (full concerts, mixes, live streams) don't have a
  // per-song thumbnail -- the video's own thumbnail is just one fixed
  // frame that has nothing to do with whichever song is playing right
  // now. Past this length, skip the thumbnail instead of showing a
  // mismatched image.
  const LONG_FORM_THRESHOLD_SEC = 20 * 60;

  function setIdle() {
    widget.classList.remove('playing');
    widget.classList.add('idle');
    lastTitleKey = null;
    titleEl.textContent = 'Vinylnyl';
    artistEl.textContent = 'YouTube Music 위젯';
    statusEl.textContent = connected ? '재생 대기 중…' : 'YouTube Music 연결 대기 중…';
    iconPlay.style.display = '';
    iconPause.style.display = 'none';
    resetMarquee();
  }

  function resetMarquee() {
    marquee.classList.remove('scroll');
    marquee.style.removeProperty('--marquee-duration');
  }

  const MARQUEE_PX_PER_SEC = 8;

  function fitMarquee() {
    resetMarquee();
    titleDupEl.textContent = titleEl.textContent;
    requestAnimationFrame(() => {
      const containerWidth = marquee.clientWidth;
      const singleWidth = titleEl.scrollWidth + 28; // include the right padding gap
      if (singleWidth > containerWidth + 2) {
        const duration = Math.max(4, singleWidth / MARQUEE_PX_PER_SEC);
        marquee.style.setProperty('--marquee-duration', duration + 's');
        marquee.classList.add('scroll');
      }
    });
  }

  function update(data) {
    if (!data) return;
    connected = true;
    widget.classList.remove('idle');

    const title = (data.title || '').trim() || '알 수 없는 곡';
    const artist = (data.artist || '').trim();
    const titleKey = title + '\u0000' + artist;

    artistEl.textContent = artist || 'YouTube Music';

    if (titleKey !== lastTitleKey) {
      lastTitleKey = titleKey;
      titleEl.textContent = title;
      fitMarquee();
    }

    const isLongForm = !!(data.duration && data.duration > LONG_FORM_THRESHOLD_SEC);
    if (isLongForm) {
      if (lastThumb !== '') {
        lastThumb = '';
        cover.removeAttribute('src');
      }
    } else if (data.thumbnail && data.thumbnail !== lastThumb) {
      lastThumb = data.thumbnail;
      cover.src = data.thumbnail;
    }

    if (data.isPlaying) {
      widget.classList.add('playing');
      iconPlay.style.display = 'none';
      iconPause.style.display = '';
      statusEl.textContent = '';
    } else {
      widget.classList.remove('playing');
        iconPlay.style.display = '';
      iconPause.style.display = 'none';
      statusEl.textContent = '일시정지';
    }
  }

  window.vinyl.onNowPlaying(update);

  window.vinyl.onConnectionStatus((status) => {
    connected = !!status.connected;
    if (!connected) {
      lastThumb = '';
      cover.removeAttribute('src');
      setIdle();
    }
  });

  btnClose.addEventListener('click', () => window.vinyl.quit());
  btnPrev.addEventListener('click', () => window.vinyl.sendControl('prev'));
  btnNext.addEventListener('click', () => window.vinyl.sendControl('next'));
  btnPlay.addEventListener('click', () => window.vinyl.sendControl('playPause'));

  window.addEventListener('resize', fitMarquee);

  setIdle();
})();
