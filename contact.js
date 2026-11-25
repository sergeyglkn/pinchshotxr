// Email links: still open the mail app (with the subject prefilled in the
// href), and also copy the address with a small note, for people who only
// use webmail and have no mail app set up.
(function () {
  let note = null, hideTimer = null;

  function show(text) {
    if (!note) {
      note = document.createElement("div");
      note.className = "copy-note";
      note.setAttribute("role", "status");
      document.body.appendChild(note);
    }
    note.textContent = text;
    note.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => note.classList.remove("show"), 2600);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const t = document.createElement("textarea");
      t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) {}
      t.remove(); return ok;
    }
  }

  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="mailto:"]');
    if (!a) return;
    const address = a.getAttribute("href").slice(7).split("?")[0];
    copy(address).then((ok) => show(ok ? "Email copied: " + address : address));
    // No preventDefault: the mail app still opens if there is one.
  });
})();
