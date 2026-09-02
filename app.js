/* ═══════════════════════════════════════════════════════════
   ANIKET — PORTFOLIO
   Slice 1: nav behaviour
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // If the visitor has asked their device for less motion, we keep
  // everything calm — no hiding nav, no sliding.
  var calmMode = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 0. Reveal-on-scroll ──
     Anything carrying `data-reveal` starts hidden and fades up the
     first time it comes into view. The hidden state lives behind the
     `js` class we add here, so if this script never runs the content
     is simply visible — nothing is ever left stranded invisible.

     Set once and left alone: things don't re-hide when you scroll
     back past them, which is fidgety to watch.                      */

  // (the `js` class itself is set by an inline script in <head>, so it
  //  lands before the first paint — see index.html)
  document.documentElement.classList.add('js');

  var reveals = Array.prototype.slice.call(
    document.querySelectorAll('[data-reveal]')
  );

  function showAll() {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* The hero plays its own arrival on load. Anything already on screen
     when the page opens waits for that to finish first, so the note
     comes AFTER the hero rather than fading up alongside it.

     ⚠️ It waits on the hero's last animation ITSELF, not on a number of
     milliseconds. Two reasons: retiming the choreography in the CSS
     retimes this automatically, and there is no second clock to drift.
     A timer counted from page-load drifts because CSS animations don't
     start at page-load — they start at the first paint — so the note
     kept arriving a fraction early.                                   */

  function afterHeroIntro(done) {
    var last = document.querySelector('.hero__tools-caption');
    var anims = (last && last.getAnimations) ? last.getAnimations() : [];

    if (!anims.length || !document.timeline) { done(); return; }

    // How much of the hero's last arrival is still to run, measured on
    // the very clock the animation itself uses. No second clock, so
    // nothing can drift, and retiming the CSS retimes this with it.
    //
    // ⚠️ Deliberately NOT `animation.finished`. That promise never
    // settles under headless Chrome's virtual clock, which left the
    // note hidden forever in testing — and a reveal that depends on a
    // promise settling can strand content invisible.
    var left = 0;
    anims.forEach(function (a) {
      if (!a.effect) return;
      var runs = a.effect.getComputedTiming().endTime;   // delay + duration

      // ⚠️ `startTime` is null while an animation is still pending, and
      // it IS still pending here — this runs the moment the observer
      // fires, which is before the first animation frame. Treating that
      // as "nothing left to wait for" is what made the note arrive
      // 1.4 seconds early. Not started yet means ALL of it is ahead.
      var remaining = (a.startTime === null)
        ? runs
        : a.startTime + runs - document.timeline.currentTime;

      if (remaining > left) left = remaining;
    });

    // Scrolled down to it later? `left` is 0 and this is just the beat.
    window.setTimeout(done, left + 60);
  }

  if (!reveals.length) {
    // nothing to do
  } else if (calmMode || !('IntersectionObserver' in window)) {
    showAll();
  } else {
    var revealer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        obs.unobserve(entry.target);

        // Scrolled down to it later? The hero's animation has long
        // finished, so this resolves straight away and it just goes.
        var el = entry.target;
        afterHeroIntro(function () { el.classList.add('is-in'); });
      });
    }, {
      // start it once a decent slice of the thing has come up the screen
      rootMargin: '0px 0px -12% 0px',
      threshold: 0.15
    });

    reveals.forEach(function (el) { revealer.observe(el); });
  }


  /* ── The projects carousel (phones) ──
     The track is a plain horizontal scroller with CSS scroll-snap, so
     swiping already works with no JavaScript at all. This only wires
     up the arrow button the Figma puts under it, for anyone who'd
     rather tap than swipe.

     It steps on by one card and wraps round at the end, because
     there's only the one button — a dead arrow at the last card would
     look broken.                                                     */

  var track = document.querySelector('.projects__list');
  var nextBtn = document.querySelector('.projects__next');
  var prevBtn = document.querySelector('.projects__prev');

  if (track && nextBtn) {
    // card pitch, measured rather than assumed, so it stays right
    // if the sizes change
    function pitch() {
      var cards = track.children;
      if (!cards.length) return 0;
      return (cards.length > 1)
        ? cards[1].getBoundingClientRect().left - cards[0].getBoundingClientRect().left
        : cards[0].getBoundingClientRect().width;
    }

    function step(to) {
      track.scrollTo({ left: to, behavior: calmMode ? 'auto' : 'smooth' });
    }

    nextBtn.addEventListener('click', function () {
      if (!pitch()) return;
      var atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
      step(atEnd ? 0 : track.scrollLeft + pitch());
    });

    /* ── The back arrow ──
       Aniket's call (2026-09-02): it is NOT there at the first card,
       because there is nothing behind you to go back to, and it comes
       in as soon as you have swiped.

       ⚠️ It is driven by the TRACK'S OWN SCROLL POSITION, not by
       counting button presses. The track is a plain scroll-snap
       scroller, so most people will reach card 2 by swiping and the
       button would never hear about it. Reading `scrollLeft` catches
       swipe, arrow tap, keyboard and trackpad alike, from one place.

       The 4px slack is the same one the forward arrow uses for its
       end test: sub-pixel scroll positions mean `scrollLeft` lands on
       0.5 or 1.5 rather than a clean 0, and without the slack the
       arrow flickers at the very start of the track. */
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        if (!pitch()) return;
        step(Math.max(0, track.scrollLeft - pitch()));
      });

      function syncPrev() {
        var canGoBack = track.scrollLeft > 4;
        prevBtn.classList.toggle('is-on', canGoBack);
        /* ⚠️ `disabled` is what does the ACCESSIBILITY half. The CSS
           only fades the button; a faded button is still focusable
           and still announced, so without this you could tab to an
           invisible control that goes nowhere. It starts `disabled`
           in the markup, so this holds even if the script is late. */
        prevBtn.disabled = !canGoBack;
      }

      track.addEventListener('scroll', syncPrev, { passive: true });
      window.addEventListener('resize', syncPrev);
      syncPrev();
    }
  }


  /* ── The scroll flowers turn with the page ──
     Scroll down and they go clockwise; scroll back up and they unwind.
     That falls out of the maths rather than being tested for: the
     angle is just the scroll position times a constant, so reversing
     the scroll reverses the turn on its own.

     ⚠️ ONE STYLE WRITE PER FRAME, FOR ALL NINE. `--scroll-spin` goes
     on <html>; each flower's CSS multiplies it by its own `--speed`
     (see the .petal block in styles.css). Writing `rotate` on each
     element instead would be nine writes a frame and would let them
     drift apart. The speeds are all POSITIVE on purpose — they vary
     how fast, never which way, or the page would look like it was
     arguing with itself.

     ⚠️ The angle is EASED TOWARD the scroll, not pinned to it. Pinned,
     it tracks a trackpad's own jitter and reads as twitchy; chasing it
     at 12% a frame gives it a little weight, so it keeps turning for a
     breath after you stop and settles. That lag IS the effect — if you
     ever want it tighter, raise CHASE, don't remove it.

     0.04° per pixel is about two-thirds of a turn over the whole page:
     enough that you notice it moved, not enough to look like a fan. */

  var petalTargets = document.querySelectorAll('.petal');

  if (petalTargets.length && !calmMode) {
    var SPIN  = 0.04;   // degrees per pixel scrolled
    var CHASE = 0.12;   // how hard the angle chases the scroll, per frame

    var spinTo = window.scrollY * SPIN;
    var spinAt = spinTo;
    var spinning = false;

    function writeSpin() {
      document.documentElement.style.setProperty(
        '--scroll-spin', spinAt.toFixed(2) + 'deg'
      );
    }

    function spinFrame() {
      spinAt += (spinTo - spinAt) * CHASE;
      // close enough: land it exactly and stop, so we're not running a
      // frame loop forever over a hundredth of a degree
      if (Math.abs(spinTo - spinAt) < 0.05) { spinAt = spinTo; spinning = false; }
      writeSpin();
      if (spinning) requestAnimationFrame(spinFrame);
    }

    writeSpin();

    window.addEventListener('scroll', function () {
      spinTo = window.scrollY * SPIN;
      if (!spinning) { spinning = true; requestAnimationFrame(spinFrame); }
    }, { passive: true });
  }


  /* ── Playground videos: play only while they're on screen ──
     MarkIT and Fisshy are <video> elements wearing their PNG as the
     poster. Silent, looping, and started when they scroll into view
     rather than on load, so the page doesn't pull video down for a
     section most people never reach.

     ⚠️ There is no <source> in them yet — Aniket's clips aren't in.
     A <video> with nothing to play just keeps showing its poster, and
     `play()` rejects; the catch below swallows that, which is why this
     is silent and harmless until the files land. It also covers the
     real case of a browser refusing autoplay.

     ⚠️ Reduced motion means reduced motion. If the visitor asked for
     less, the videos stay on their poster and never start.           */

  var clips = Array.prototype.slice.call(
    document.querySelectorAll('.lab__media[poster]')
  );

  if (clips.length && !calmMode && 'IntersectionObserver' in window) {
    var player = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          // .play() returns a promise that rejects when there is
          // nothing to play, or when autoplay is blocked
          var p = v.play();
          if (p && p.catch) p.catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.35 });

    clips.forEach(function (v) { player.observe(v); });
  }


  var nav = document.getElementById('nav');
  if (!nav) return;


  /* ── 1. The nav on scroll ──
     Two behaviours, and the PAGE picks which one by putting
     `data-hide-on-scroll` on the bar or leaving it off:

       home page      — no attribute. The bar never hides; Aniket's
                        call, it is always stuck. All that happens on
                        scroll is a soft shadow once we leave the top.
       case studies   — the attribute is there. The bar slides away as
                        you read down and comes straight back the moment
                        you scroll up, because those pages are very long
                        and the back arrow lives up there.

     Either way the shadow behaves the same.                          */

  var HIDE_ON_SCROLL = nav.hasAttribute('data-hide-on-scroll');

  var lastY = window.scrollY;
  var ticking = false;

  var HIDE_AFTER = 140;   // don't hide until we're this far down the page
  var THRESHOLD  = 8;     // ignore scroll moves smaller than this

  function onScroll() {
    var y = window.scrollY;

    // shadow appears the moment we leave the very top
    nav.classList.toggle('is-stuck', y > 4);

    if (HIDE_ON_SCROLL && !calmMode) {
      var moved = y - lastY;
      if (Math.abs(moved) > THRESHOLD) {
        nav.classList.toggle('is-hidden', moved > 0 && y > HIDE_AFTER);
        lastY = y;
      }
    }

    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });


  /* ── 2. Highlight the section you're currently looking at ──
     As each section crosses the middle of the screen it takes over
     the highlight. Uses IntersectionObserver so there's no constant
     measuring on every scroll frame.                                */

  var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var sections = links
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  function setActive(id) {
    links.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      // pick whichever visible section is closest to the top of the screen
      var best = null;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (!best || entry.boundingClientRect.top < best.boundingClientRect.top) {
          best = entry;
        }
      });
      if (best) setActive(best.target.id);
    }, {
      // a band across the middle of the screen: a section counts as
      // "current" while it's passing through there
      rootMargin: '-45% 0px -45% 0px',
      threshold: 0
    });

    sections.forEach(function (section) { spy.observe(section); });
  }


  /* ── The "View Project" cursor ──
     `view.png` rides the pointer on a desktop. One shared element for
     the whole page; the CSS parks it transparent and
     `pointer-events: none` until we say otherwise.

     ⚠️ WHERE IT FIRES IS DELIBERATELY OPPOSITE ON THE TWO KINDS OF
     CARD (Aniket, 2026-09-02):
       · a project card — ONLY over the cover image
       · a vibe-coding card — everywhere EXCEPT the video/still, so
         over the name and the blurb
     Both are one `closest()` test against the card's own media
     element, just read in opposite directions — see ZONES below. The
     listeners sit on the whole link either way, so moving between a
     live area and a dead one inside the same card is just another
     `pointermove` and the pill answers it.

     ⚠️ THE GATE IS HERE, NOT IN THE CSS. Two conditions, and both
     matter: the collage layout (>=1024, below which the project cards
     become a swipeable carousel and a pill under your thumb would be
     nonsense), and a real hovering pointer. `(hover: hover)` alone is
     not enough — a laptop with a touchscreen reports it — so each
     event also has to come from `pointerType === 'mouse'`. A stylus or
     a finger on a desktop-width tablet gets the normal tap.

     ⚠️ THE ARROW IS NOT HIDDEN. An earlier build did that; Aniket
     wants both, so the CSS offsets the pill down-and-right instead. */

  var viewCursor = document.querySelector('.view-cursor');

  /* ZONES — [the cards, the media inside one, does the media TRIGGER it]
     `false` reads as "the media is the dead spot, the rest is live". */
  var viewZones = [
    ['.project__link', '.project__cover', true],
    ['.lab__card',     '.lab__media',     false]
  ];

  if (viewCursor) {
    var deskMq = window.matchMedia('(min-width: 1024px) and (hover: hover)');

    /* ⚠️ THE SMOOTHING. `tx/ty` is where the pointer is, `px/py` is
       where the pill has got to, and each frame closes the gap by
       CHASE. That lag IS the effect — the pill arrives a beat after
       the cursor and settles, instead of being welded to it. Same
       shape as the scroll flowers' spin, and the same reason it is
       done here rather than as a CSS transition: a transition would
       restart from a moving start point every frame and never settle.

       Someone who has asked for less motion gets 1 — no chase at all,
       the pill simply is where the pointer is. */
    var CHASE = calmMode ? 1 : 0.19;
    var tx = 0, ty = 0;
    var px = 0, py = 0;
    var running = false;

    function write() {
      viewCursor.style.setProperty('--vx', px.toFixed(1) + 'px');
      viewCursor.style.setProperty('--vy', py.toFixed(1) + 'px');
    }

    function chase() {
      px += (tx - px) * CHASE;
      py += (ty - py) * CHASE;
      // close enough: land it exactly and stop, so we are not running a
      // frame loop forever over a third of a pixel
      if (Math.abs(tx - px) < 0.3 && Math.abs(ty - py) < 0.3) {
        px = tx;
        py = ty;
        running = false;
      }
      write();
      if (running) requestAnimationFrame(chase);
    }

    function start() {
      if (!running) {
        running = true;
        requestAnimationFrame(chase);
      }
    }

    function hide() {
      viewCursor.classList.remove('is-on');
    }

    viewZones.forEach(function (zone) {
      var cards = Array.prototype.slice.call(
        document.querySelectorAll(zone[0])
      );

      cards.forEach(function (card) {
        function live(event) {
          if (!deskMq.matches || event.pointerType !== 'mouse') return false;
          var onMedia = !!(event.target.closest && event.target.closest(zone[1]));
          return zone[2] ? onMedia : !onMedia;
        }

        card.addEventListener('pointermove', function (event) {
          if (!live(event)) { hide(); return; }

          tx = event.clientX;
          ty = event.clientY;

          /* ⚠️ Snap on the way IN, chase after that. Without the snap
             the pill still carries wherever it was left last time and
             you watch it sail across the page while it fades up. */
          if (!viewCursor.classList.contains('is-on')) {
            px = tx;
            py = ty;
            write();
            viewCursor.classList.add('is-on');
          }

          start();
        });

        card.addEventListener('pointerleave', hide);
        /* a click takes you to the case page; don't leave it lit on
           the way out */
        card.addEventListener('pointercancel', hide);
        card.addEventListener('click', hide);
      });
    });

    function syncMode() {
      if (!deskMq.matches) hide();
    }

    /* Safari before 14 has no `addEventListener` on a MediaQueryList,
       and this file supports whatever the rest of it supports. */
    if (deskMq.addEventListener) {
      deskMq.addEventListener('change', syncMode);
    } else if (deskMq.addListener) {
      deskMq.addListener(syncMode);
    }
  }


  /* ── 3. Smooth scrolling for the nav links ──
     CSS `scroll-behavior: smooth` already does this in every current
     browser. We only step in to make sure the nav is visible when you
     land, and to move keyboard focus to the section you asked for.   */

  links.forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('is-hidden');

      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;

      // let screen readers and keyboards follow along too
      target.setAttribute('tabindex', '-1');
      window.setTimeout(function () { target.focus({ preventScroll: true }); }, 600);
    });
  });

})();
