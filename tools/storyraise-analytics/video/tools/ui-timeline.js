// Timeline for compositions/ui.html. Inlined into the template by
// build-compositions.mjs; reads the plan it wrote to window.SR_UI.
(function () {
  var P = window.SR_UI;
  var L = function (t) { return Math.max(0, t - P.start); };
  gsap.config({ force3D: false }); // re-rasterize text at every zoom level so it stays crisp
  var tl = gsap.timeline({ paused: true });

  // Window in and out.
  tl.fromTo('#ui-window', { autoAlpha: 0, scale: 0.9, y: 60 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0);
  tl.to('#ui-window', { autoAlpha: 0, scale: 0.96, duration: 0.45, ease: 'power2.in' }, P.duration - 0.5);

  // Camera: shots are pre-computed transforms of the 1200px page.
  var first = P.shots[0].to;
  P.shots.slice(1).forEach(function (shot, i) {
    var vars = { x: shot.to.x, y: shot.to.y, scale: shot.to.scale, duration: shot.dur, ease: 'power2.inOut' };
    if (i === 0) tl.fromTo('#ui-page', { x: first.x, y: first.y, scale: first.scale }, vars, L(shot.t));
    else tl.to('#ui-page', vars, L(shot.t));
  });

  // Highlight rings ride the camera; labels sit on the stage.
  P.rings.forEach(function (r) {
    tl.fromTo('#' + r.id, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out' }, L(r.on));
    tl.to('#' + r.id, { autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, Math.max(L(r.on) + 0.4, L(r.off)));
  });
  P.labels.forEach(function (l) {
    tl.fromTo('#' + l.id, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, L(l.on));
    tl.to('#' + l.id, { autoAlpha: 0, y: -10, duration: 0.25, ease: 'power1.in' }, Math.max(L(l.on) + 0.45, L(l.off) - 0.25));
  });

  // Numbers count up as they are named.
  P.counters.forEach(function (c) {
    var el = document.querySelector(c.selector);
    var state = { value: 0 };
    tl.fromTo(state, { value: 0 }, {
      value: c.to,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: function () { el.textContent = Math.round(state.value).toLocaleString('en-US'); }
    }, L(c.t));
  });
  tl.fromTo('#ui-time', { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, L(P.time));

  // Where The Clicks Go: the donut sweeps in.
  tl.fromTo('#ui-donut', { '--sweep': 0 }, { '--sweep': 1, duration: 1.3, ease: 'power2.inOut' }, L(P.donut));

  // Top Visit Times fills in column by column; Visits Over Time draws left to right.
  var columns = document.querySelectorAll('#ui-page .heatmap__row:first-child .heatmap__cell').length;
  for (var c = 0; c < columns; c++) {
    tl.fromTo('#ui-page .heatmap__cell[data-col="' + c + '"]', { opacity: 0.08 }, { opacity: 1, duration: 0.35, ease: 'power1.out' }, L(P.heatmap) + c * 0.035);
  }
  tl.fromTo('#ui-trend-svg', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.5, ease: 'power1.inOut' }, L(P.trend));

  // The Story: the cursor clicks the tab, the underline slides, and the panes cross-fade.
  var click = L(P.storyClick);
  tl.fromTo('#ui-cursor', { autoAlpha: 0, x: P.cursor.x + 260, y: P.cursor.y + 240 },
    { autoAlpha: 1, x: P.cursor.x + 130, y: P.cursor.y + 120, duration: 0.35, ease: 'power1.out' }, click - 1.25);
  tl.to('#ui-cursor', { x: P.cursor.x - 8, y: P.cursor.y - 5, duration: 0.8, ease: 'power2.inOut' }, click - 0.9);
  // A set at the click, not a fromTo: a fromTo renders its start state immediately,
  // which left a stray ring on screen for the whole scene.
  tl.set('#ui-click', { autoAlpha: 0.9, scale: 0.3 }, click);
  tl.to('#ui-click', { autoAlpha: 0, scale: 1.4, duration: 0.5, ease: 'power2.out' }, click);
  tl.fromTo('#ui-tab-underline', { x: 0, scaleX: 1 }, {
    x: P.underline.to.x - P.underline.from.x,
    scaleX: P.underline.to.w / P.underline.from.w,
    duration: 0.35,
    ease: 'power2.inOut'
  }, click + 0.05);
  tl.to('#ui-pane', { autoAlpha: 0, duration: 0.35, ease: 'power1.in' }, click + 0.1);
  tl.fromTo('#ui-story', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, click + 0.3);
  tl.to('#ui-cursor', { autoAlpha: 0, duration: 0.3 }, click + 0.9);

  window.__timelines['ui'] = tl;
})();
