// Runtime for the Send screen: swaps captured states (and the stylesheet each one was
// captured under: the composer and the /send/ flow are two different pages), keeps
// everything read-only, and exposes window.SRScreen for the tour. Inlined into send.html
// by build.mjs.
(function () {
    var meta = JSON.parse(document.getElementById('sr-screen-meta').textContent);
    var screen = document.body.getAttribute('data-sr-screen');
    var mount = document.getElementById('sr-mount');
    var state = null;
    var listeners = [];
    var RO = 'This is a read-only demo.';

    function tpl(name) { return document.querySelector('template[data-sr-state="' + name + '"]'); }

    var toastTimer = null;
    function toast(message) {
        var el = document.getElementById('sr-replica-toast');
        el.textContent = message || RO;
        el.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2400);
    }

    function useSheet(key) {
        Array.prototype.forEach.call(document.querySelectorAll('link[data-sr-css]'), function (l) {
            l.disabled = l.getAttribute('data-sr-css') !== key;
        });
    }

    // Resolves once the stylesheet and any email frame in the state have loaded.
    function settle() {
        var waits = [];
        var link = document.querySelector('link[data-sr-css]:not([disabled])');
        if (link && !link.sheet) waits.push(new Promise(function (r) { link.addEventListener('load', r, { once: true }); }));
        Array.prototype.forEach.call(mount.querySelectorAll('iframe[srcdoc]'), function (f) {
            if (!(f.contentDocument && f.contentDocument.readyState === 'complete' && f.contentDocument.body && f.contentDocument.body.childNodes.length)) {
                waits.push(new Promise(function (r) { f.addEventListener('load', r, { once: true }); }));
            }
        });
        return Promise.all(waits).then(function () { return document.fonts ? document.fonts.ready : null; });
    }

    var ready = Promise.resolve();
    function restoreScroll() {
        Array.prototype.forEach.call(mount.querySelectorAll('[data-sr-scroll]'), function (el) {
            var xy = el.getAttribute('data-sr-scroll').split(',');
            el.scrollLeft = Number(xy[0]) || 0;
            el.scrollTop = Number(xy[1]) || 0;
        });
    }
    function setState(name) {
        var t = tpl(name);
        if (!t) throw new Error('Unknown state: ' + name);
        useSheet(t.getAttribute('data-sr-css'));
        var body = meta.body[name] || {};
        Array.prototype.slice.call(document.body.attributes).forEach(function (at) {
            if (at.name !== 'data-sr-screen') document.body.removeAttribute(at.name);
        });
        Object.keys(body).forEach(function (k) { document.body.setAttribute(k, body[k]); });
        mount.replaceChildren(t.content.cloneNode(true));
        state = name;
        window.scrollTo(0, 0);
        restoreScroll();
        // Again once the stylesheet and frames are in: until then nothing overflows to scroll.
        ready = settle().then(restoreScroll);
        var detail = { sr: 'state', screen: screen, state: name };
        listeners.forEach(function (fn) { try { fn(detail); } catch (e) { /* ignore */ } });
        if (window.parent && window.parent !== window) window.parent.postMessage(detail, '*');
        return ready;
    }

    function run(action) {
        var i = action.indexOf(':');
        var verb = i === -1 ? action : action.slice(0, i);
        var arg = i === -1 ? '' : action.slice(i + 1);
        if (verb === 'state') return setState(arg);
        if (verb === 'toast') return toast(arg);
        return toast(RO);
    }

    document.addEventListener('click', function (e) {
        var a = e.target.closest('[data-sr-action]');
        if (a) { e.preventDefault(); e.stopPropagation(); run(a.getAttribute('data-sr-action')); return; }
        var inert = e.target.closest('[data-inert], a, button, label, input, select, textarea, [contenteditable]');
        if (inert) { e.preventDefault(); e.stopPropagation(); toast(RO); }
    }, true);
    document.addEventListener('submit', function (e) { e.preventDefault(); }, true);
    document.addEventListener('keydown', function (e) {
        if (e.target && e.target.closest && e.target.closest('input, textarea, [contenteditable]') && e.key !== 'Tab') e.preventDefault();
    }, true);

    function find(id) { return mount.querySelector('[data-tour="' + id + '"]'); }

    window.SRScreen = {
        name: screen,
        states: meta.states.slice(),
        setState: setState,
        getState: function () { return state; },
        ready: function () { return ready; },
        getTarget: find,
        getTargets: function () {
            return Array.prototype.map.call(mount.querySelectorAll('[data-tour]'), function (el) { return el.getAttribute('data-tour'); });
        },
        getTargetRect: function (id) { var el = find(id); return el ? el.getBoundingClientRect() : null; },
        scrollToTarget: function (id, block) { var el = find(id); if (el) el.scrollIntoView({ block: block || 'center', behavior: 'instant' }); },
        onChange: function (fn) { listeners.push(fn); },
    };

    var initial = new URLSearchParams(window.location.search).get('state') || (window.location.hash.match(/state=([\w-]+)/) || [])[1];
    setState(initial && tpl(initial) ? initial : '__DEFAULT_STATE__');
})();
