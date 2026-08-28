/* ==========================================================
   FIT TO SCREEN
   Keeps the whole intro visible in the window, with no scrolling.

   The stage is always 1739 x 1033 on the inside, so every left/top
   number in style.css stays exactly as designed. This just shrinks
   or grows the finished result to match the window size.
   ========================================================== */

// The design size of the stage. Must match .stage in style.css.
var DESIGN_WIDTH  = 1739;
var DESIGN_HEIGHT = 1033;

var stage = document.querySelector('.stage');

function fitToScreen() {
  // How much room the window gives us.
  var roomWide = window.innerWidth  / DESIGN_WIDTH;
  var roomTall = window.innerHeight / DESIGN_HEIGHT;

  // Use whichever is smaller, so nothing gets cut off.
  var scale = Math.min(roomWide, roomTall);

  stage.style.transform = 'scale(' + scale + ')';

  // Tell the paper layer how much we shrank, so it can grow back out
  // to the full window size and leave no bare edges.
  stage.style.setProperty('--inv', 1 / scale);
}

// Run it now, and again whenever the window changes size.
fitToScreen();
window.addEventListener('resize', fitToScreen);
