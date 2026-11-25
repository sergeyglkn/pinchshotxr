// Sound toggle for the background video's own sound track.
// The video always starts muted (browsers only allow muted autoplay). The button
// appears once the video is really playing; turning sound on unmutes and fades
// the volume in, turning it off fades out and mutes again.
// (On iPhone the volume can't be set from a page, so there it just unmutes.)
(function () {
  const btn = document.querySelector(".sound");
  const video = document.querySelector(".bg video");
  if (!btn || !video) return;
  const label = btn.querySelector(".sound-label");
  const TARGET = 0.8, FADE_IN_MS = 1400, FADE_OUT_MS = 700;
  let fadeTimer = null, on = false;

  function fadeTo(v, ms, done) {
    clearInterval(fadeTimer);
    const start = video.volume, t0 = performance.now();
    fadeTimer = setInterval(() => {
      const k = Math.min((performance.now() - t0) / ms, 1);
      const e = k * k * (3 - 2 * k); // smoothstep
      video.volume = Math.max(0, Math.min(1, start + (v - start) * e));
      if (k >= 1) { clearInterval(fadeTimer); if (done) done(); }
    }, 25);
  }

  function setUI() {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.classList.toggle("on", on);
    label.textContent = on ? "Sound on" : "Sound off";
  }

  const show = () => { btn.hidden = false; };
  if (document.querySelector(".bg").classList.contains("live")) show();
  document.addEventListener("bgvideo:live", show);
  document.addEventListener("bgvideo:failed", () => { btn.hidden = true; });

  btn.addEventListener("click", () => {
    on = !on;
    setUI();
    if (on) {
      video.volume = 0;
      video.muted = false;
      const p = video.paused ? video.play() : null;
      if (p && p.catch) p.catch(() => {});
      fadeTo(TARGET, FADE_IN_MS);
    } else {
      fadeTo(0, FADE_OUT_MS, () => { if (!on) video.muted = true; });
    }
  });
})();
