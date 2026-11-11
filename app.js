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
  var hint = document.querySelector('.projects__hint');

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
        /* the swipe cue rides the same signal: the moment you have
           moved the track at all, you have learnt the gesture */
        if (hint) hint.classList.toggle('is-off', canGoBack);
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

     ⚠️ MARKIT HAS ITS CLIP (2026-09-10); FISSHY STILL HAS NO <source>.
     A <video> with nothing to play just keeps showing its poster, and
     `play()` rejects; the catch below swallows that, which is why this
     is silent and harmless until that file lands too. It also covers
     the real case of a browser refusing autoplay.

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
    .map(function (link) {
      var href = link.getAttribute('href');
      return (href && href.charAt(0) === '#') ? document.querySelector(href) : null;
    })
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


  /* ── The cursor ──
     The page draws its own pointer: a blue dot that follows the mouse
     and grows into a "View Project" pill over a project's cover. See
     `.cursor` in styles.css for the shapes; this file decides where it
     is and which state it is in.

     ⚠️ IT REPLACED A SEPARATE CHIP. `view.png` used to ride along
     BESIDE the native cursor. Aniket asked for the blue cursor itself
     to become that state (2026-09-08) — and a native `cursor:` cannot
     animate, so the pointer had to become an element first.

     ⚠️ WHERE IT FIRES IS DELIBERATELY OPPOSITE ON THE TWO KINDS OF
     CARD (Aniket, 2026-09-02):
       · a project card — ONLY over the cover image
       · a vibe-coding card — everywhere EXCEPT the video/still, so
         over the name and the blurb
     Both are one `closest()` test against the card's own media
     element, just read in opposite directions — see ZONES below.

     ⚠️ THE GATE IS HERE, NOT IN THE CSS, and it is what stops a phone
     ending up with no pointer at all. Three conditions: the collage
     layout (>=1024, below which the project cards become a swipeable
     carousel), a real hovering pointer, and `pointerType === 'mouse'`
     on the event itself — `(hover: hover)` alone is not enough, a
     laptop with a touchscreen reports it. Only once all three pass
     does `has-cursor` go on <html> and hide the native cursor. */

  var cursor = document.querySelector('.cursor');

  /* ZONES — [what you hover, the media inside it, does the media
     TRIGGER it, what the pill says, and optionally a CARD to draw
     instead of the pill].

     `false` in the third slot reads as "the media is the dead spot,
     the rest is live". `null` in the second reads as "no dead spot at
     all, the whole thing is live" — which is the IITG mark, a picture
     with nothing inside it to divide.

     A fifth value `{ src, w, h }` turns the cursor into that picture
     at that size; the fourth is then `null`, because a zone is either
     a worded pill or a card and never both.

     ⚠️ THE FIRST SELECTOR IS THE `<li>`, NOT THE CARD, AND THAT IS
     LOAD-BEARING. Both kinds of card shrink 3% under the cursor, so
     the card's own box — and every box inside it — MOVES while you
     are pointing at it. The list item does not move: a child's
     transform never touches its parent. Name the card here instead
     and the ring it vacates falls outside the zone, which is what
     made the pill blink around every edge (fixed 2026-09-10). See
     `zoneFor` for the other half of that fix.

     ⚠️ ADD A ZONE HERE AND NOTHING ELSE NEEDS TOUCHING. The wording
     travels with the zone and the pill measures itself to fit it; a
     card brings its own size and is preloaded from this table. */
  /* ⚠️ EVERY HERO CARD RIDES AT THIS WIDTH and takes its height from
     its own drawing. 162 is where Aniket settled them (2026-09-10),
     and it is what the gutter cards these replaced used — `13.889cqw`
     on both of them. `.cursor.is-card`'s `border-radius` in styles.css
     is measured against this; move it far and that wants a look. */
  var CARD_W = 162;

  var viewZones = [
    ['.project', '.project__cover', true,  'View Project'],
    /* ⚠️ THESE TWO MUST STAY ABOVE THE PLAIN `.lab` ROW. Zones are
       read in order and the first match wins, so the specific card has
       to come before the general one — put them after and every
       playground card says "View Project" again. Aniket, 2026-09-10:
       Fisshy and Ariana have no write-up yet. Give one a page and its
       row here comes out. */
    ['.lab--fisshy', '.lab__media', false, 'Coming Soon'],
    ['.lab--ariana', '.lab__media', false, 'Coming Soon'],
    ['.lab',     '.lab__media',     false, 'View Project'],
    ['.hero__iitg',    null,              true,  'IIT GUWAHATI'],

    /* THE TWO HERO TILES — Aniket's ask, 2026-09-10. These carry a
       FIFTH value, a card, and a zone that has one draws that picture
       instead of a worded pill: the cursor grows into the very card
       that used to open in the gutter beside the tile. The two PNGs
       are already the cursor's own blue, which is why this reads as
       the dot unfolding rather than a picture appearing.

       ℹ `w`/`h` ARE ONLY A FALLBACK. Every card is measured from its
       own file as it preloads (see below) and rides at `CARD_W` wide
       with the picture's own proportions, so these two numbers are
       just the shape of the box for the instant before the file lands.
       Redraw a card at any size and drop it in — nothing here has to
       follow it.

       ⚠️ MUSIC IS THE ODD ONE OUT: A WORDED PILL, NOT A CARD. There is
       no `music hover.png` to unfold into, so Aniket asked for it to say
       its line instead (2026-09-11) — which is why its row has a FOURTH
       value and no fifth, the same shape as the IITG mark above. Draw a
       card for it one day and the swap is: wording out, `{ src, w, h }`
       in. A zone is one or the other, never both. */
    ['.hero__doodle--camera, .hero__doodle-wrap--camera', null, true, null,
      { src: 'assests/camera hover.png', w: 162, h: 82 }],
    ['.hero__doodle--walks',  null, true, null,
      { src: 'assests/long walk hover.png', w: 162, h: 122 }],
    ['.hero__doodle--music',  null, true, 'I want to make a song']
  ];

  if (cursor) {
    var deskMq = window.matchMedia('(min-width: 1024px)');
    var CLICKABLE = 'a, button, summary, [role="button"]';
    var root = document.documentElement;

    var label = cursor.querySelector('.cursor__label');
    var cardEl = cursor.querySelector('.cursor__card');

    /* ⚠️ PRELOADED, OR THE FIRST HOVER IS A BLANK BLUE BOX. Setting
       `src` at the moment of the hover starts the fetch then and there
       and the card unfolds around nothing. These `Image()`s are never
       added to the page — they exist only to put the files in the
       browser's cache before they are wanted.

       ⚠️ AND THE SAME LOAD SIZES THE CARD. Every card rides at
       `CARD_W` and takes its height from the picture's own proportions,
       read off the file itself — so a card can be redrawn at any size
       or any shape and simply dropped into assests/. The `w`/`h` in
       the table are only the fallback for the instant before the file
       lands; keep them roughly right and nobody ever sees them.

       This is deliberate history: the sizes used to be typed in by
       hand, and they were wrong twice — once from trusting a display
       size in index.html, once from a card being re-exported at a new
       resolution. Nothing to keep in step now. */
    viewZones.forEach(function (zone) {
      var card = zone[4];
      if (!card) return;

      var probe = new Image();
      probe.onload = function () {
        if (!probe.naturalWidth) return;
        card.w = CARD_W;
        card.h = Math.round(
          CARD_W * probe.naturalHeight / probe.naturalWidth
        );
      };
      probe.src = card.src;
    });

    /* the card for a zone that has one, swapped only when it changes —
       re-setting the same `src` would decode the picture again */
    function showCard(card) {
      if (cardEl.getAttribute('src') !== card.src) {
        cardEl.setAttribute('src', card.src);
      }
      cursor.style.setProperty('--card-w', card.w + 'px');
      cursor.style.setProperty('--card-h', card.h + 'px');
    }

    /* ⚠️ MEASURED ONCE PER WORDING, THEN REMEMBERED. Reading a width
       forces the browser to lay out then and there, so it must never
       happen on a pointermove that changed nothing — hence the cache
       and the `!==` guard in `say()` below. */
    var widths = {};
    var PILL_PAD = 32;

    function say(text) {
      if (label.textContent === text) return;
      label.textContent = text;

      if (widths[text] === undefined) {
        widths[text] = label.offsetWidth + PILL_PAD;
      }
      cursor.style.setProperty('--pill-w', widths[text] + 'px');
    }

    /* THE CARD THE POINTER WAS LAST INSIDE, AND THE ANSWER IT GAVE.

       ⚠️ THIS PAIR IS WHY THE PILL NO LONGER BLINKS. The cards shrink
       3% while you point at them, so the cover, the name and the blurb
       all slide a few pixels out from under a pointer that has not
       moved — and `pointermove` does not fire for geometry that moves
       on its own, so the next flick of the mouse would answer from a
       box that had quietly changed shape. Hovering anywhere near an
       edge blinked the pill on and off.

       So the pointer landing on the card's OWN BODY — the ring it
       vacated as it shrank, and the gaps between its parts — is read
       as "no news" and keeps the answer it already had. The card's
       real parts, the cover and the text, still answer for themselves,
       and Aniket's live/dead split is untouched. */
    var lastBox = null;
    var lastLive = false;

    /* also the element the pointer is inside, for `is-over` below */
    var zoneBox = null;

    /* the ZONE the pointer is inside, or null for nowhere. It hands
       back the whole row rather than just the wording, because a row
       may carry a card instead — see the table above. */
    function zoneFor(target) {
      zoneBox = null;
      if (!target || !target.closest) { lastBox = null; return null; }

      for (var i = 0; i < viewZones.length; i++) {
        var zone = viewZones[i];
        var box = target.closest(zone[0]);
        if (!box) continue;

        zoneBox = box;
        var live;

        if (zone[1] === null) {
          /* no media element named: the whole zone is live */
          live = true;
        } else {
          /* ⚠️ `parentElement === box` IS THE CARD ITSELF. The zone is
             the <li> and its only child is the card, so a hit on the
             card element rather than on one of its parts means the
             pointer is on bare card — the vacated ring or a margin
             between the parts. Neither has an answer of its own. */
          var vague = target === box || target.parentElement === box;
          var inMedia = !!target.closest(zone[1]);
          var plain = zone[2] ? inMedia : !inMedia;

          live = (vague && box === lastBox) ? lastLive : plain;
        }

        lastBox = box;
        lastLive = live;
        return live ? zone : null;
      }

      /* out of every zone: the next card starts with a clean slate */
      lastBox = null;
      return null;
    }

    function follow(event) {
      if (!deskMq.matches || event.pointerType === 'touch') { hide(); return; }

      /* ⚠️ WRITTEN STRAIGHT FROM THE EVENT, EVERY MOVE, WITH NO
         SMOOTHING. The old chip was a label chasing the cursor and an
         eased lag suited it; this IS the cursor, and any gap between
         the mouse and the drawing of it reads as the page lagging. */
      cursor.style.setProperty('--cx', event.clientX + 'px');
      cursor.style.setProperty('--cy', event.clientY + 'px');

      root.classList.add('has-cursor');
      cursor.classList.add('is-live');

      /* ⚠️ A ZONE IS EITHER A PILL OR A CARD, NEVER BOTH — the two
         states set the same width and height, so leaving both on would
         hand the browser two answers for one box. */
      var zone = zoneFor(event.target);
      var card = zone && zone[4];
      var wording = card ? null : (zone && zone[3]);

      if (card) showCard(card);
      if (wording) say(wording);

      cursor.classList.toggle('is-view', !!wording);
      cursor.classList.toggle('is-card', !!card);
      /* ⚠️ THE SAME RING WOULD BLINK THIS ONE TOO. On bare card the
         target is the <li>, which is not itself a link — so the dot
         would drop from 28 back to 20 for a few pixels at the edge.
         If the zone we are in holds a link, the pointer is over
         something clickable whatever it technically landed on. */
      var over = !!(event.target.closest && event.target.closest(CLICKABLE));
      if (!over && zoneBox) { over = !!zoneBox.querySelector(CLICKABLE); }
      cursor.classList.toggle('is-over', over);
    }

    /* hand the pointer back: the native cursor returns with it, so the
       user is never left without one */
    function hide() {
      lastBox = null;
      zoneBox = null;
      cursor.classList.remove('is-live', 'is-view', 'is-card', 'is-over');
      root.classList.remove('has-cursor');
    }

    document.addEventListener('pointermove', follow, { passive: true });
    document.addEventListener('pointerdown', follow, { passive: true });

    /* out of the window, into another tab, or onto a browser control */
    document.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);

    /* Safari before 14 has no `addEventListener` on a MediaQueryList,
       and this file supports whatever the rest of it supports. */
    function syncMode() { if (!deskMq.matches) hide(); }
    if (deskMq.addEventListener) {
      deskMq.addEventListener('change', syncMode);
    } else if (deskMq.addListener) {
      deskMq.addListener(syncMode);
    }
  }


  /* ── 2b. The hero tiles on phones — TAP, not hover ──

     Desktop answers a tile by turning the cursor into its card. A phone
     has no cursor and no hover, so Aniket asked for the same three
     answers on tap, each up for 5 seconds (2026-09-12).

     ⚠️ IT READS THE SAME `viewZones` TABLE THE CURSOR DOES. The rows
     are filtered to the three `.hero__doodle--*` selectors and used
     exactly as they are — fifth value is a card, fourth is a wording,
     never both. Redraw a card or change a line up there and this
     follows with nothing to edit here.

     ⚠️ IT LIVES BELOW 1024, WHICH IS WHERE THE TILES' MOBILE LAYOUT
     LIVES TOO. The cluster becomes its own 390-wide stage in the 1023
     band of styles.css, not the 767 one, and that is the same band the
     tap card is styled in — phones and tablets both.

     ⚠️ IT DOES NOT WAIT FOR THE CARD SIZES. The probe images above
     rewrite `card.w`/`card.h` when the files land, and this does not
     read either: the phone card takes its width from styles.css and its
     height from the picture. Only `src` is wanted from the table.  */

  var pop = document.querySelector('.doodle-pop');

  if (pop) {
    /* ⚠️ THE CURSOR'S OWN QUERY, USED INVERTED — deliberately not
       `(max-width: 767px)`. The cursor runs at `min-width: 1024` with a
       real hovering mouse; anything else has no cursor to turn into a
       card, so anything else is where the tap card belongs. Written out
       again rather than borrowed from `deskMq` so this block still
       works if `.cursor` is ever taken out of index.html. Change one of
       these two strings and you open a gap with no answer in it, or an
       overlap with two. */
    var popDeskMq = window.matchMedia('(min-width: 1024px)');
    var popLabel = pop.querySelector('.doodle-pop__label');
    var popCard = pop.querySelector('.doodle-pop__card');
    var popStage = pop.parentElement;

    /* Card stays visible for 2 seconds on tap, then disappears */
    var POP_MS = 2000;
    var popTimer = null;

    /* ⚠️ THE CARDS ARE ALREADY IN THE CACHE BY NOW — the probe up in
       the cursor block preloads every card in the table and it runs
       whatever the screen size is. Nothing here fetches anything; the
       first tap only has to decode a picture the browser already holds.

       ⚠️ AND THE PROBE IS WHERE `card.w`/`card.h` COME FROM, which is
       what lets this size the box BEFORE the picture is in it. See
       `sizeCard` below — that is the difference between a card that
       arrives and a card that snaps into shape a frame later. */
    var popZones = viewZones.filter(function (zone) {
      return zone[0].indexOf('.hero__doodle--') === 0;
    });

    /* ⚠️ THESE TWO MUST MATCH styles.css. The exit's length is how long
       the shape classes have to stay on for (see `closePop`), and the
       entrance's is how long a tile-to-tile swap waits before opening
       the next one. Change either there and change it here. */
    var POP_IN_MS = 200;
    var POP_OUT_MS = 160;

    var shapeTimer = null;
    var swapTimer = null;

    /* ⚠️ IT ONLY TAKES OFF `is-open`, AND THAT IS THE WHOLE FIX. This
       used to drop `is-card`/`is-view` in the same breath — which
       removes the background, the radius and the picture's `display`
       INSTANTLY, so there was nothing left on screen for the fade to
       fade. The card did not leave, it vanished. The shape now stays
       until the exit has actually run. */
    function closePop() {
      window.clearTimeout(popTimer);
      popTimer = null;
      pop.classList.remove('is-open');

      window.clearTimeout(shapeTimer);
      shapeTimer = window.setTimeout(function () {
        pop.classList.remove('is-card', 'is-view');
      }, POP_OUT_MS);
    }

    /* ⚠️ THE BOX IS SIZED BEFORE THE PICTURE IS DECODED. An <img> with
       a fresh `src` measures zero high for a frame or two, and this box
       is centred on the tile from its own height — so without this the
       card opened at the wrong place at the wrong size and then jumped
       to the right one, mid-fade. Width and height ATTRIBUTES give the
       element its intrinsic ratio straight away; the CSS width still
       decides how big it really is, the attributes only tell the
       browser what shape to reserve. */
    function sizeCard(card) {
      if (!card.w || !card.h) return;
      popCard.setAttribute('width', card.w);
      popCard.setAttribute('height', card.h);
    }

    function fill(tile, zone) {
      var card = zone[4];
      var wording = card ? null : zone[3];

      /* ⚠️ A ZONE IS ONE OR THE OTHER, NEVER BOTH — the same rule the
         cursor works to. Both classes on at once would give the box two
         backgrounds and two shapes to be. */
      pop.classList.toggle('is-card', !!card);
      pop.classList.toggle('is-view', !!wording);

      if (card) {
        sizeCard(card);
        if (popCard.getAttribute('src') !== card.src) {
          popCard.setAttribute('src', card.src);
        }
      }
      if (wording) { popLabel.textContent = wording; }

      /* measured with the shape classes on and the box already the
         right size — see `sizeCard` */
      var stageW = popStage.clientWidth;
      var popW = pop.offsetWidth;
      var popH = pop.offsetHeight;

      /* the tile's middle, in cluster pixels — both are absolute
         children of the cluster, so these offsets share one origin */
      var stageRect = popStage.getBoundingClientRect();
      var tileRect = tile.getBoundingClientRect();
      var midX = (tileRect.left - stageRect.left) + tileRect.width / 2;
      var midY = (tileRect.top - stageRect.top) + tileRect.height / 2;

      /* ⚠️ CLAMPED, OR THE WALKER'S CARD HANGS OFF THE RIGHT. That tile
         sits at about 83% of the cluster, so a card centred on it would
         run past the edge on any phone. EDGE is the breathing room left
         at either side. */
      var EDGE = 4;
      var maxX = Math.max(EDGE, stageW - popW - EDGE);
      var x = Math.min(Math.max(midX - popW / 2, EDGE), maxX);

      pop.style.left = Math.round(x) + 'px';
      pop.style.top = Math.round(midY - popH / 2) + 'px';
    }

    /* ⚠️ `is-open` GOES ON IN THE NEXT FRAME, NEVER IN THIS ONE. Set it
       in the same task that wrote the classes, the src and the position
       and the browser has one style to compute, not two — it skips
       straight to the open state and there is no transition at all.
       Handing it a frame is what gives the animation a from and a to. */
    function raise(tile, zone) {
      window.clearTimeout(shapeTimer);
      fill(tile, zone);

      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          pop.classList.add('is-open');
        });
      });

      window.clearTimeout(popTimer);
      popTimer = window.setTimeout(closePop, POP_MS);
    }

    /* ⚠️ A CARD NEVER TELEPORTS FROM ONE TILE TO ANOTHER. Tapping a
       second tile while one is open would otherwise move the box and
       swap the picture inside it in a single frame, which reads as a
       glitch rather than as an answer. The open one leaves first, on
       its own exit, and the new one arrives after it. */
    function openPop(tile, zone) {
      window.clearTimeout(swapTimer);

      if (!pop.classList.contains('is-open')) {
        raise(tile, zone);
        return;
      }

      closePop();
      swapTimer = window.setTimeout(function () {
        raise(tile, zone);
      }, POP_OUT_MS);
    }

    popZones.forEach(function (zone) {
      var sel = zone[0].split(',')[0].trim();
      var tile = document.querySelector(sel);
      if (!tile) return;

      /* ⚠️ `click`, NOT `pointerdown`. A tap that turns into a scroll
         fires pointerdown and would leave a card open behind the
         moving page; click waits to see that the finger stayed put. */
      function handleTap(e) {
        if (popDeskMq.matches) { return; }
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        openPop(tile, zone);
      }

      tile.addEventListener('click', handleTap);
      var wrap = tile.closest('.hero__doodle-wrap');
      if (wrap) {
        wrap.addEventListener('click', handleTap);
      }
    });

    /* widening into the cursor's range mid-card: the cursor takes over
       and this box must not be left hanging in the collage */
    function syncPop() { if (popDeskMq.matches) { closePop(); } }
    if (popDeskMq.addEventListener) {
      popDeskMq.addEventListener('change', syncPop);
    } else if (popDeskMq.addListener) {
      popDeskMq.addListener(syncPop);
    }
  }


  /* ── 3. Smooth scrolling for the nav links ──
     CSS `scroll-behavior: smooth` already does this in every current
     browser. We only step in to make sure the nav is visible when you
     land, and to move keyboard focus to the section you asked for.   */

  links.forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('is-hidden');

      var href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;

      var target = document.querySelector(href);
      if (!target) return;

      // let screen readers and keyboards follow along too
      target.setAttribute('tabindex', '-1');
      window.setTimeout(function () { target.focus({ preventScroll: true }); }, 600);
    });
  });

})();
