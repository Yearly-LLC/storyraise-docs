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
    // `fade` lets the group cycle flick past in a fifth of a second while the ordinary
    // state changes keep their slower cross-dissolve.
    var f = s.fade || 0.4;
    tl.set('#' + s.id, { opacity: 0 }, 0);
    tl.to('#' + s.id, { opacity: 1, duration: f, ease: 'power1.inOut' }, L(s.on));
    if (s.hiddenAt != null) {
      // Fully covered by the layer above, so drop it in one frame. Fading it out here
      // instead would uncover the stage mid-transition and flash.
      tl.set('#' + s.id, { opacity: 0 }, L(s.hiddenAt));
    } else {
      tl.to('#' + s.id, { opacity: 0, duration: f, ease: 'power1.inOut' }, Math.max(L(s.on) + f + 0.1, L(s.off)));
    }
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

  /*
    Counting numbers and filling bars.

    Every tween is driven from the timeline, never from a timer, so seeking to any
    frame recomputes the right value and the render stays deterministic. The final text
    is read out of the DOM first and put back verbatim at the end, so whatever the
    product rendered is what the viewer is left looking at.
  */
  function parseNumber(text) {
    var m = String(text).match(/^(\D*?)([\d,]+(?:\.\d+)?)(\D*)$/);
    if (!m) return null;
    var digits = m[2];
    return {
      prefix: m[1],
      suffix: m[3],
      value: parseFloat(digits.replace(/,/g, '')),
      decimals: (digits.split('.')[1] || '').length,
      grouped: digits.indexOf(',') !== -1,
    };
  }

  function render(n, v) {
    var body = v.toFixed(n.decimals);
    if (n.grouped) {
      var parts = body.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      body = parts.join('.');
    }
    return n.prefix + body + n.suffix;
  }

  function countText(node, at, dur) {
    var n = parseNumber(node.textContent.trim());
    if (!n || !isFinite(n.value)) return;
    var final = node.textContent;
    var box = { v: 0 };
    /*
      Hold the node at zero from the first frame until its moment. Without this the
      number reads its final value until the tween starts and then snaps back to zero
      to count, which is worse than not animating it at all.
    */
    if (at > 0) {
      tl.fromTo(box, { v: 0 }, {
        v: 0,
        duration: at,
        ease: 'none',
        onUpdate: function () { node.textContent = render(n, 0); },
      }, 0);
    }
    tl.to(box, {
      v: n.value,
      duration: dur,
      ease: 'power2.out',
      onUpdate: function () { node.textContent = render(n, box.v); },
      onComplete: function () { node.textContent = final; },
      onReverseComplete: function () { node.textContent = render(n, 0); },
    }, at);
  }

  (P.counts || []).forEach(function (c) {
    var scope = document.getElementById(c.scope);
    if (!scope) return;
    Array.prototype.forEach.call(scope.querySelectorAll(c.sel), function (el, i) {
      var at = L(c.at) + i * (c.stagger || 0);
      if (!c.bars) { countText(el, at, c.dur); return; }
      /*
        A band cell is `<i class="sig-band-bar"><b style="width:NN%"></b></i>34.5%`.
        The bar grows from nothing and the rate beside it counts with it, so the two
        finish together.
      */
      var bar = el.querySelector('.sig-band-bar b');
      if (bar) {
        var width = bar.style.width;
        tl.fromTo(bar, { width: '0%' }, { width: width, duration: c.dur, ease: 'power2.out' }, at);
      }
      Array.prototype.forEach.call(el.childNodes, function (node) {
        if (node.nodeType === 3 && parseNumber(node.textContent.trim())) {
          var holder = document.createElement('span');
          holder.textContent = node.textContent;
          node.parentNode.replaceChild(holder, node);
          countText(holder, at, c.dur);
        }
      });
    });
  });

  // The follow-up dialog rises over the window, above the camera so it stays sharp.
  tl.set('#ui-dialog', { autoAlpha: 0 }, 0);
  tl.fromTo('#ui-dialog', { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: 'power3.out' }, L(P.dialog.on));
  tl.to('#ui-dialog', { autoAlpha: 0, scale: 0.98, duration: 0.35, ease: 'power2.in' }, L(P.dialog.off));

  /*
    The three routes, lit one at a time as the narration names them. The ring is a
    child of its own button, so it moves with the modal and needs no measuring.
  */
  (P.dialogRoutes || []).forEach(function (r) {
    tl.set('#' + r.id, { opacity: 0 }, 0);
    tl.to('#' + r.id, { opacity: 1, duration: 0.25, ease: 'power2.out' }, L(r.on));
    tl.to('#' + r.id, { opacity: 0, duration: 0.25, ease: 'power2.in' }, L(r.off) - 0.1);
  });

  window.__timelines['ui'] = tl;
})();
