/* ==========================================================
   FIT TO SCREEN — projects page

   Things are drawn at EXACTLY the same size as on the intro page:
   the top screenful (1739 x 1033) is shrunk to fit your window,
   same as always. The stage is then taller than that on purpose,
   and that extra bit is what you scroll down to.

   Every left/top number in style.css is still the real design
   number — nothing here changes those.
   ========================================================== */

// The design size of the stage. Must match .stage in style.css.
var DESIGN_WIDTH  = 1739;

// One screenful. This is what decides HOW BIG everything looks —
// it is the same 1033 as the intro page, so nothing grows or shrinks.
// Leave this alone.
var SCREEN_HEIGHT = 1033;

// The whole page's length. THIS is the number to change if you want
// more or less scroll. Must match .stage height in style.css.
var DESIGN_HEIGHT = 1550;

var screenEl = document.querySelector('.screen');
var stage    = document.querySelector('.stage');
var navEl    = document.querySelector('.el-nav');

function fitToScreen() {
  // How much room the window gives us for one screenful.
  var roomWide = window.innerWidth  / DESIGN_WIDTH;
  var roomTall = window.innerHeight / SCREEN_HEIGHT;

  // Use whichever is smaller, so the top screenful is never cut off.
  var scale = Math.min(roomWide, roomTall);

  stage.style.transform = 'scale(' + scale + ')';

  // Tell the paper layer how much we shrank, so it can grow back out
  // past the sides of the stage and leave no bare edges.
  stage.style.setProperty('--inv', 1 / scale);

  // The nav lives outside the stage now (so it can stay pinned to the
  // window while you scroll), so it has to be shrunk by hand to keep it
  // the same size as the artwork.
  if (navEl) navEl.style.transform = 'scale(' + scale + ')';

  // Scaling does not change how much room an element takes up in the
  // page, so the browser would give you the wrong amount of scroll.
  // This tells it the real, on-screen height of the whole page.
  screenEl.style.height = (DESIGN_HEIGHT * scale) + 'px';
}

// Run it now, and again whenever the window changes size.
fitToScreen();
window.addEventListener('resize', fitToScreen);
