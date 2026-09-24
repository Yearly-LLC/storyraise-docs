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

  /*
    Which group is on screen. Each state is a whole page, stacked in the same place,
    and only its opacity moves: swapping markup mid-render would not survive a seek.
    `set` before `to` rather than `fromTo`, because a fromTo paints its start state
    at t=0 and every state would be visible in the first frame.
  */
  P.states.forEach(function (s) {
    tl.set('#' + s.id, { opacity: 0 }, 0);
    tl.to('#' + s.id, { opacity: 1, duration: 0.4, ease: 'power1.inOut' }, L(s.on));
    tl.to('#' + s.id, { opacity: 0, duration: 0.4, ease: 'power1.inOut' }, Math.max(L(s.on) + 0.5, L(s.off)));
  });

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

  // The follow-up dialog rises over the window, above the camera so it stays sharp.
  tl.set('#ui-dialog', { autoAlpha: 0 }, 0);
  tl.fromTo('#ui-dialog', { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'power3.out' }, L(P.dialog.on));
  tl.to('#ui-dialog', { autoAlpha: 0, scale: 0.98, duration: 0.35, ease: 'power2.in' }, L(P.dialog.off));

  window.__timelines['ui'] = tl;
})();
