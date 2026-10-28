// Timeline for compositions/ui.html. Inlined into the template by
// build-compositions.mjs; reads the plan it wrote to window.SR_UI.
(function () {
  var P = window.SR_UI;
  var L = function (t) { return Math.max(0, t - P.start); };
  gsap.config({ force3D: false });
  var tl = gsap.timeline({ paused: true });

  // Window in and out.
  gsap.set('#ui-window', { autoAlpha: 0, scale: 0.9, y: 60 });
  tl.to('#ui-window', { autoAlpha: 1, scale: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0);
  tl.to('#ui-window', { autoAlpha: 0, scale: 0.96, duration: 0.45, ease: 'power2.in' }, P.duration - 0.5);

  /*
    Which still is on screen. A still can come back later (the builder, then the
    preview, then the builder again), so each run raises its layer above the last
    one before fading in, and the layer it covers is dropped once the fade is done.
    `set` before `to`: a fromTo paints its start state at t=0.
  */
  var FADE = 0.4;
  var layers = {};
  P.states.forEach(function (s) { layers[s.layer] = true; });
  Object.keys(layers).forEach(function (id) { tl.set('#' + id, { opacity: 0, zIndex: 0 }, 0); });
  P.states.forEach(function (s, i) {
    var on = L(s.on);
    tl.set('#' + s.layer, { zIndex: i + 1 }, on);
    if (i === 0) tl.set('#' + s.layer, { opacity: 1 }, on);
    else tl.to('#' + s.layer, { opacity: 1, duration: FADE, ease: 'power1.inOut' }, on);
    var next = P.states[i + 1];
    if (next && next.layer !== s.layer) tl.set('#' + s.layer, { opacity: 0 }, L(next.on) + FADE);
  });

  // Camera: pre-computed transforms of the 1440px page.
  var first = P.shots[0].to;
  tl.set('#ui-page', { x: first.x, y: first.y, scale: first.scale }, 0);
  P.shots.slice(1).forEach(function (shot) {
    tl.to('#ui-page', { x: shot.to.x, y: shot.to.y, scale: shot.to.scale, duration: shot.dur, ease: 'power2.inOut' }, L(shot.t));
  });

  // Rings ride the camera inside their still; labels sit on the stage.
  P.rings.forEach(function (r) {
    tl.set('#' + r.id, { autoAlpha: 0, scale: 1.06 }, 0);
    tl.to('#' + r.id, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out' }, L(r.on));
    tl.to('#' + r.id, { autoAlpha: 0, duration: 0.3, ease: 'power1.in' }, Math.max(L(r.on) + 0.4, L(r.off)));
  });
  P.labels.forEach(function (l) {
    tl.set('#' + l.id, { autoAlpha: 0, y: 20 }, 0);
    tl.to('#' + l.id, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power3.out' }, L(l.on));
    tl.to('#' + l.id, { autoAlpha: 0, y: -10, duration: 0.25, ease: 'power1.in' }, Math.max(L(l.on) + 0.45, L(l.off) - 0.25));
  });

  // The URL pill cross-fades when the screen changes.
  P.urls.forEach(function (u, i) {
    tl.set('#' + u.id, { opacity: 0 }, 0);
    if (i === 0) tl.set('#' + u.id, { opacity: 1 }, 0);
    else tl.to('#' + u.id, { opacity: 1, duration: 0.3 }, L(u.on));
    if (i < P.urls.length - 1) tl.to('#' + u.id, { opacity: 0, duration: 0.3 }, L(u.off));
  });

  window.__timelines['ui'] = tl;
})();
