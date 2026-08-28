/* ==========================================================
   THE NAV BAR — hide on the way down, show on the way up

   Scroll down and the nav slides up out of sight.
   Scroll up, even a little, and it drops straight back in.
   At the very top of the page it is always showing.
   ========================================================== */
(() => {
  const bar = document.getElementById("nav-bar");
  if (!bar) return;

  // Don't start hiding until you are this far down the page. Stops the
  // nav flickering away the instant you nudge the wheel at the top.
  const HIDE_AFTER = 80;

  // Ignore tiny scroll wobbles smaller than this, so a shaky trackpad
  // doesn't make the nav bounce in and out.
  const MIN_MOVE = 5;

  let lastY = window.scrollY;

  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    const moved = y - lastY;

    if (Math.abs(moved) < MIN_MOVE) return;

    if (moved > 0 && y > HIDE_AFTER) {
      bar.classList.add("is-hidden");     // going down — get out of the way
    } else if (moved < 0) {
      bar.classList.remove("is-hidden");  // going up — come back
    }

    lastY = y;
  }, { passive: true });
})();
