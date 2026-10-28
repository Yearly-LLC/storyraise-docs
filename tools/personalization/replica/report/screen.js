// Runtime for the report screens (preview, builder, share): swaps captured states,
// rebuilds the builder canvas from its template, keeps everything read-only, and
// exposes window.SRScreen for the tour. Inlined into each screen by build-report.mjs.
(function () {
    var meta = JSON.parse(document.getElementById('sr-screen-meta').textContent);
    var screen = document.body.getAttribute('data-sr-screen');
    var mount = document.getElementById('sr-mount');
    var state = null;
    var person = 'emily';
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

    function canvasFrame() { return mount.querySelector('iframe[data-sr-canvas]'); }

    function mountCanvas() {
        var f = canvasFrame();
        if (!f) return Promise.resolve();
        var t = document.querySelector('template[data-sr-frame="' + f.getAttribute('data-sr-canvas') + '"]');
        var html = '<!DOCTYPE html><html' + attrs(JSON.parse(t.getAttribute('data-html-attrs'))) + '><head><meta charset="utf-8">'
            + '<link rel="stylesheet" href="' + meta.canvas.css + '"></head><body' + attrs(JSON.parse(t.getAttribute('data-body-attrs'))) + '>'
            + t.innerHTML + '</body></html>';
        return new Promise(function (resolve) {
            f.addEventListener('load', function () {
                var d = f.contentDocument;
                var go = function () {
                    // Land on the selected block where the capture had it (its offset from the
                    // canvas top), whatever width the frame has; the captured scroll is the fallback.
                    var to = t.getAttribute('data-scroll-to');
                    var el = to && d.getElementById(to);
                    var w = f.contentWindow;
                    var off = Number(t.getAttribute('data-scroll-offset'));
                    if (el) w.scrollTo(0, Math.max(0, el.getBoundingClientRect().top + w.scrollY - (isNaN(off) ? 24 : off)));
                    else w.scrollTo(0, Number(t.getAttribute('data-scroll-y')) || 0);
                    var cw = Number(t.getAttribute('data-frame-width'));
                    var resized = !!cw && Math.abs(w.innerWidth - cw) > 2;
                    document.body.classList.toggle('sr-canvas-resized', resized);
                    d.documentElement.classList.toggle('sr-canvas-resized', resized);
                    hookCanvas(d);
                    resolve();
                };
                (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(go, go);
            }, { once: true });
            f.srcdoc = html;
        });
    }

    // Clicking a level section on the canvas selects it, as in the builder.
    function hookCanvas(d) {
        d.addEventListener('click', function (e) {
            e.preventDefault();
            var sections = meta.sections || {};
            var el = e.target;
            while (el && el !== d.body) {
                if (el.id && sections[el.id]) { if (sections[el.id] !== state) setState(sections[el.id]); return; }
                el = el.parentElement;
            }
            toast(RO);
        }, true);
    }

    function setState(name) {
        if (!tpl(name)) throw new Error('Unknown state: ' + name);
        var y = window.scrollY;
        mount.replaceChildren(tpl(name).content.cloneNode(true));
        state = name;
        if (meta.people && meta.people[name]) person = name;
        if (meta.scroll === 'window') window.scrollTo(0, y);
        ready = mountCanvas();
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
        if (verb === 'open-lookup') return setState('lookup');
        if (verb === 'close-lookup') return setState(person);
        if (verb === 'copy-link') return copy(meta.links[state === 'team' ? 'team' : 'link']);
        if (verb === 'copy-team') return copy(meta.links.team.split('?')[0], el, 'Copied!');
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
        if (el) return { el: el, frame: null };
        var f = canvasFrame();
        var d = f && f.contentDocument;
        el = d && d.querySelector('[data-tour="' + id + '"]');
        return el ? { el: el, frame: f } : null;
    }

    window.SRScreen = {
        name: screen,
        states: meta.states.slice(),
        setState: setState,
        getState: function () { return state; },
        ready: function () { return ready; },
        getTarget: function (id) { var hit = find(id); return hit ? hit.el : null; },
        getTargets: function () {
            var ids = Array.prototype.map.call(mount.querySelectorAll('[data-tour]'), function (el) { return el.getAttribute('data-tour'); });
            var f = canvasFrame();
            if (f && f.contentDocument) Array.prototype.forEach.call(f.contentDocument.querySelectorAll('[data-tour]'), function (el) { ids.push(el.getAttribute('data-tour')); });
            return ids;
        },
        // Viewport rect in this screen's document, including targets on the canvas.
        getTargetRect: function (id) {
            var hit = find(id);
            if (!hit) return null;
            var r = hit.el.getBoundingClientRect();
            if (!hit.frame) return r;
            var fr = hit.frame.getBoundingClientRect();
            var x = fr.left + hit.frame.clientLeft;
            var y = fr.top + hit.frame.clientTop;
            var left = Math.max(r.left + x, fr.left);
            var top = Math.max(r.top + y, fr.top);
            var right = Math.min(r.right + x, fr.right);
            var bottom = Math.min(r.bottom + y, fr.bottom);
            return { x: left, y: top, left: left, top: top, width: Math.max(0, right - left), height: Math.max(0, bottom - top), right: right, bottom: bottom, unclipped: { x: r.left + x, y: r.top + y, width: r.width, height: r.height } };
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
