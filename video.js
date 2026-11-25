// Background video loader.
// The page starts dark; a black cover fades away once the video has real frames
// on screen. The video element itself is never faded (see style.css). The poster
// image is only a fallback: it is revealed when the video is slow (POSTER_DELAY)
// or blocked, and on Data Saver, slow connections or "reduce motion".
// Playback only starts while the tab is visible (Chrome refuses background
// video-only playback), and is retried whenever the visitor comes back.
(function () {
  const bg = document.querySelector(".bg");
  const video = bg && bg.querySelector("video");
  if (!video) return;
  const POSTER_DELAY = 1800;
  let live = false, blocked = false, fallback = null, loaded = false, retries = 0;

  const reveal = () => bg.classList.add("revealed");
  const showPoster = () => { if (!live) { bg.classList.add("poster"); reveal(); } };

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const slow = conn && (conn.saveData || /(^|-)2g$|^3g$/.test(conn.effectiveType || ""));
  const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (slow || reduceMotion) { showPoster(); return; }

  const px = Math.max(window.innerWidth, window.innerHeight) * Math.min(window.devicePixelRatio || 1, 2);
  // Phones and small tablets always get the light 720p file (3.4 MB vs 6.9 MB).
  video.src = window.innerWidth > 960 && px > 1400 ? "bg-1080.mp4" : "bg-720.mp4";

  // Reveal only when frames are really advancing, so the fade never runs over a
  // frozen or still-decoding first frame.
  const goLive = () => {
    if (live) return;
    live = true;
    clearTimeout(fallback);
    bg.classList.add("live");
    document.dispatchEvent(new Event("bgvideo:live")); // lets the Sound button appear
    if (bg.classList.contains("poster")) {
      // Poster was already showing: dip to dark, swap to the video, fade back in.
      bg.classList.add("dip");
      setTimeout(() => { bg.classList.remove("poster"); bg.classList.remove("dip"); }, 500);
    } else {
      reveal();
    }
  };
  const onTime = () => {
    if (video.currentTime > 0.15) {
      video.removeEventListener("timeupdate", onTime);
      requestAnimationFrame(() => requestAnimationFrame(goLive));
    }
  };
  video.addEventListener("timeupdate", onTime);
  video.addEventListener("error", () => { clearTimeout(fallback); showPoster(); document.dispatchEvent(new Event("bgvideo:failed")); });

  const tryPlay = () => {
    if (blocked || !loaded || document.hidden) return;
    if (!fallback && !live) fallback = setTimeout(showPoster, POSTER_DELAY);
    const p = video.play();
    if (p && p.catch) p.catch((e) => {
      // NotAllowedError = autoplay blocked for good (e.g. iPhone Low Power Mode).
      // Anything else (e.g. paused to save power) is retried on the next visit to the tab.
      if (e && e.name === "NotAllowedError") { blocked = true; clearTimeout(fallback); showPoster(); document.dispatchEvent(new Event("bgvideo:failed")); }
      else if (retries < 5) { retries++; setTimeout(tryPlay, 1000); }
    });
  };
  const onLoad = () => { loaded = true; tryPlay(); };
  if (document.readyState === "complete") onLoad();
  else window.addEventListener("load", onLoad, { once: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause(); // save battery and data in the background
    else tryPlay();
  });
})();
