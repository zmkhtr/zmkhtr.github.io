// Update copyright year
defineYear();

function defineYear() {
  const year = document.getElementById('current-year');
  if (year) year.textContent = new Date().getFullYear();
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Hero feature slider.
// Arrow keys, the two arrows, the dots, a tap on a neighbour, and a horizontal
// drag all move between the seven screens.
function startFeatureSlider() {
  const slider = document.getElementById('feature-slider');
  if (!slider) return;

  const track = slider.querySelector('.feature-slider__track');
  const slides = [...slider.querySelectorAll('.feature-slide')];
  const dots = [...slider.querySelectorAll('.feature-dot')];
  const arrows = [...slider.querySelectorAll('.feature-slider__arrow')];
  const title = slider.querySelector('.feature-slider__title');
  const desc = slider.querySelector('.feature-slider__desc');
  const total = slides.length;
  if (!total) return;

  let current = 0;
  // How far the rail is from resting, in pixels, while dragging.
  let dragOffset = 0;
  let dragStart = null;

  function paint() {
    slides.forEach((slide, i) => {
      // Every slide is parked behind the current one, then moved out to the
      // left or right. Only the current, the one before and the one after are
      // in a visible position.
      const offset = i - current;

      slide.classList.toggle('is-current', offset === 0);
      slide.classList.toggle('is-left', offset === -1);
      slide.classList.toggle('is-right', offset === 1);
      slide.classList.toggle('is-far', offset < -1 || offset > 1);
      slide.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
    });

    const slide = slides[current];
    const heading = slide.dataset.title;
    const body = slide.dataset.desc;
    if (title && heading) title.textContent = heading;
    if (desc && body) desc.textContent = body;

    dots.forEach((dot, i) => {
      const on = i === current;
      dot.classList.toggle('is-current', on);
      dot.setAttribute('aria-selected', on ? 'true' : 'false');
      dot.tabIndex = on ? 0 : -1;
    });

    track.style.transform = dragOffset
      ? 'translate3d(' + dragOffset + 'px, 0, 0)'
      : '';
  }

  // Distance between two neighbouring slides, measured rather than assumed.
  function perStep() {
    const a = slides[0].getBoundingClientRect();
    const b = slides[1] ? slides[1].getBoundingClientRect() : a;
    return Math.abs(b.left - a.left) || a.width;
  }

  function goTo(index) {
    current = Math.max(0, Math.min(total - 1, index));
    dragOffset = 0;
    paint();
  }

  // A drag has to be mostly horizontal and long enough to mean a swipe rather
  // than an imprecise tap.
  const DRAG = 8;
  const SWIPE = 46;

  // One gesture engine, fed by either pointer or touch events, so the slider
  // behaves the same with a mouse, a trackpad and a finger.
  function pointOf(event) {
    if (event.touches && event.touches.length) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    return { x: event.clientX, y: event.clientY };
  }

  function dragBegin(x, y) {
    dragStart = { x: x, y: y, moved: false };
  }

  function dragMove(x, y) {
    if (!dragStart) return;

    const dx = x - dragStart.x;
    const dy = y - dragStart.y;

    if (!dragStart.moved) {
      if (Math.abs(dx) < DRAG) return;
      // A vertical gesture belongs to the page, not the slider.
      if (Math.abs(dy) > Math.abs(dx)) {
        dragStart = null;
        return;
      }
      dragStart.moved = true;
      slider.classList.add('is-dragging');
    }

    // Resist at the two ends instead of sliding past them.
    const atStart = current === 0 && dx > 0;
    const atEnd = current === total - 1 && dx < 0;
    dragOffset = (atStart || atEnd) ? dx * 0.28 : dx;
    paint();
  }

  function dragFinish(x, y) {
    if (!dragStart) return;

    const started = dragStart.moved;
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    dragStart = null;
    slider.classList.remove('is-dragging');

    if (started) {
      const threshold = Math.min(SWIPE, perStep() * 0.35);
      if (Math.abs(dx) >= threshold) {
        goTo(current + (dx < 0 ? 1 : -1));
      } else {
        dragOffset = 0;
        paint();
      }
      return;
    }

    // A tap: step to the screen that was tapped. A tap on the current screen
    // does nothing, and a tap that wandered is not a tap.
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) return;
    const target = document.elementFromPoint(x, y);
    const slide = target && target.closest ? target.closest('.feature-slide') : null;
    if (!slide) return;

    const index = slides.indexOf(slide);
    if (index >= 0 && index !== current) goTo(index);
  }

  track.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    dragBegin(event.clientX, event.clientY);
  });
  track.addEventListener('pointermove', (event) => dragMove(event.clientX, event.clientY));
  track.addEventListener('pointerup', (event) => dragFinish(event.clientX, event.clientY));
  track.addEventListener('pointercancel', () => {
    dragStart = null;
    dragOffset = 0;
    slider.classList.remove('is-dragging');
    paint();
  });

  // Touch fallback for browsers that do not raise pointer events for touch.
  track.addEventListener('touchstart', (event) => {
    if (dragStart && dragStart.moved) return;
    const p = pointOf(event);
    dragBegin(p.x, p.y);
  }, { passive: true });

  track.addEventListener('touchmove', (event) => {
    const p = pointOf(event);
    // Only claim the gesture once it is clearly horizontal, so the page can
    // still be scrolled normally.
    const horizontal = dragStart && Math.abs(p.x - dragStart.x) > Math.abs(p.y - dragStart.y);
    if (horizontal && event.cancelable) event.preventDefault();
    dragMove(p.x, p.y);
  }, { passive: false });

  track.addEventListener('touchend', (event) => {
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;
    dragFinish(touch.clientX, touch.clientY);
  });

  arrows.forEach((arrow) => {
    arrow.addEventListener('click', () => {
      goTo(current + Number(arrow.dataset.step));
    });
  });

  dots.forEach((dot) => {
    dot.addEventListener('click', () => goTo(Number(dot.dataset.goto)));
  });

  slider.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') goTo(current - 1);
    if (event.key === 'ArrowRight') goTo(current + 1);
  });

  // Auto advance, four seconds a screen.
  // It holds still for a reader who asked for less motion, pauses while the
  // pointer or keyboard is on the slider, waits for a hidden tab, and gives up
  // control for good the moment the reader drives it themselves.
  const EVERY = 4000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer = null;
  let held = false;
  let handedOver = false;

  function stopAuto() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function startAuto() {
    stopAuto();
    if (handedOver || held || reduceMotion.matches) return;
    // Only the last screen has nothing after it.
    if (current === total - 1) return;

    timer = setInterval(() => {
      if (held || document.hidden) return;
      if (current === total - 1) {
        stopAuto();
        return;
      }
      goTo(current + 1);
    }, EVERY);
  }

  // A reader taking the wheel stops the ride.
  function handOver() {
    handedOver = true;
    stopAuto();
  }

  function hold() {
    held = true;
    stopAuto();
  }

  function release() {
    held = false;
    startAuto();
  }

  slider.addEventListener('pointerenter', hold);
  slider.addEventListener('pointerleave', release);
  slider.addEventListener('focusin', hold);
  slider.addEventListener('focusout', release);

  // Any deliberate move restarts the four seconds from that screen.
  const originalGoTo = goTo;
  goTo = function (index) {
    originalGoTo(index);
    if (!handedOver) startAuto();
  };

  ['pointerdown', 'touchstart', 'keydown'].forEach((type) => {
    slider.addEventListener(type, handOver, { once: true, passive: true });
  });

  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) stopAuto();
    else startAuto();
  });

  startAuto();

  // The label is centred next to its icon, so a plain left-align would not
  // line the caption up with it. Measure where the label actually starts and
  // inset the caption by the same amount per button.
  function alignCaptions() {
    document.querySelectorAll('.cta-button').forEach((button) => {
      const label = button.querySelector('.cta-button__label');
      const note = button.querySelector('.cta-button__note');
      if (!label || !note) return;

      // Measure from the caption's own box, not from the button: the caption
      // starts at the group's left edge, not the button's.
      note.style.paddingLeft = '0';
      const inset = label.getBoundingClientRect().left - note.getBoundingClientRect().left;
      note.style.paddingLeft = inset > 0 ? inset.toFixed(1) + 'px' : '0';
    });
  }

  alignCaptions();
  window.addEventListener('resize', alignCaptions);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignCaptions);

  slider.tabIndex = -1;
  paint();
}

startFeatureSlider();
