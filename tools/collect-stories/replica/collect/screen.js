// Runtime for the Collect screens: swaps captured states, keeps everything read-only,
// and exposes window.SRScreen for the tour. Inlined into each screen by
// build-collect.mjs. Adapted from the personalization kit's report screens, without the
// builder canvas (the Collect app has no iframes).
(function () {
    var meta = JSON.parse(document.getElementById('sr-screen-meta').textContent);
    var screen = document.body.getAttribute('data-sr-screen');
    var mount = document.getElementById('sr-mount');
    var state = null;
    var ready = Promise.resolve();
    var listeners = [];
    var RO = 'This is a read-only demo.';

    function tpl(name) { return document.querySelector('template[data-sr-state="' + name + '"]'); }
    function attrs(obj) {
        return Object.keys(obj || {}).map(function (k) {
            return ' ' + k + '="' + String(obj[k]).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
        }).join('');
    }

    var toastTimer = null;
    function toast(message) {
        var el = document.getElementById('sr-replica-toast');
        el.textContent = message || RO;
        el.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2400);
    }


    function setState(name) {
        if (!tpl(name)) throw new Error('Unknown state: ' + name);
        var y = window.scrollY;
        mount.replaceChildren(tpl(name).content.cloneNode(true));
        state = name;
        if (meta.stateScroll && meta.stateScroll[name] !== undefined) window.scrollTo(0, meta.stateScroll[name]);
        else if (meta.scroll === 'window') window.scrollTo(0, y);
        // Inner scrollers return to where the capture had them.
        Array.prototype.forEach.call(mount.querySelectorAll('[data-sr-scroll-top]'), function (el) {
            el.scrollTop = Number(el.getAttribute('data-sr-scroll-top')) || 0;
        });
        ready = (document.fonts && document.fonts.ready) ? document.fonts.ready.then(function () {}) : Promise.resolve();
        var detail = { sr: 'state', screen: screen, state: name };
        listeners.forEach(function (fn) { try { fn(detail); } catch (e) { /* ignore */ } });
        if (window.parent && window.parent !== window) window.parent.postMessage(detail, '*');
        return ready;
    }

    function navigate(target) {
        if (window.parent && window.parent !== window) window.parent.postMessage({ sr: 'navigate', screen: target }, '*');
        else window.location.href = target + '.html';
    }

    function copy(text, button, label) {
        var done = function () {
            if (label && button) {
                var was = button.textContent;
                button.textContent = label;
                setTimeout(function () { button.textContent = was; }, 2000);
            } else {
                toast('Link copied.');
            }
        };
        try { navigator.clipboard.writeText(text).then(done, done); } catch (e) { done(); }
    }

    function run(action, el) {
        var i = action.indexOf(':');
        var verb = i === -1 ? action : action.slice(0, i);
        var arg = i === -1 ? '' : action.slice(i + 1);
        if (verb === 'state') return setState(arg);
        if (verb === 'navigate') return navigate(arg);
        if (verb === 'toast') return toast(arg);
        if (verb === 'copy-link') return copy(meta.links.link);
        return undefined;
    }

    document.addEventListener('click', function (e) {
        var a = e.target.closest('[data-sr-action]');
        if (a) { e.preventDefault(); e.stopPropagation(); run(a.getAttribute('data-sr-action'), a); return; }
        var inert = e.target.closest('[data-inert], a, button, label, input, select, textarea');
        if (inert) { e.preventDefault(); e.stopPropagation(); toast(RO); }
    }, true);
    document.addEventListener('submit', function (e) { e.preventDefault(); }, true);

    function find(id) {
        var el = mount.querySelector('[data-tour="' + id + '"]');
        return el ? { el: el } : null;
    }

    window.SRScreen = {
        name: screen,
        states: meta.states.slice(),
        setState: setState,
        getState: function () { return state; },
        ready: function () { return ready; },
        getTarget: function (id) { var hit = find(id); return hit ? hit.el : null; },
        getTargets: function () {
            return Array.prototype.map.call(mount.querySelectorAll('[data-tour]'), function (el) { return el.getAttribute('data-tour'); });
        },
        // One box for the stop's element and any data-tour-also partners (a column's cells).
        getTargetRect: function (id) {
            var els = mount.querySelectorAll('[data-tour="' + id + '"], [data-tour-also="' + id + '"]');
            if (!els.length) return null;
            var l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
            Array.prototype.forEach.call(els, function (el) {
                var x = el.getBoundingClientRect();
                if (!x.width && !x.height) return;
                l = Math.min(l, x.left); t = Math.min(t, x.top); r = Math.max(r, x.right); b = Math.max(b, x.bottom);
            });
            if (l === Infinity) return null;
            return { x: l, y: t, left: l, top: t, right: r, bottom: b, width: r - l, height: b - t };
        },
        getTargetAlso: function (id) {
            return Array.prototype.slice.call(mount.querySelectorAll('[data-tour-also="' + id + '"]'));
        },
        scrollToTarget: function (id, block) {
            var hit = find(id);
            if (!hit) return;
            hit.el.scrollIntoView({ block: block || 'center', behavior: 'instant' });
        },
        onChange: function (fn) { listeners.push(fn); },
    };

    var initial = new URLSearchParams(window.location.search).get('state') || (window.location.hash.match(/state=([\w-]+)/) || [])[1];
    setState(initial && tpl(initial) ? initial : '__DEFAULT_STATE__');
})();
