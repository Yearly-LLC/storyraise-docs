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
        // Re-applied as the panel's thumbnails load: until then it is too short to scroll that far.
        Array.prototype.forEach.call(mount.querySelectorAll('[data-sr-scroll-top]'), function (el) {
            var top = Number(el.getAttribute('data-sr-scroll-top')) || 0;
            var apply = function () { el.scrollTop = top; };
            apply();
            Array.prototype.forEach.call(el.querySelectorAll('img'), function (img) {
                if (!img.complete) img.addEventListener('load', apply, { once: true });
            });
        });
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

    // An anchor is one element (data-tour) or several pieces (data-tour-part) whose
    // boxes are joined, e.g. the three Repeat When fields or every story card.
    var ALIASES = { 'story-1': 'card-1', 'story-2': 'card-2' };
    function find(id) {
        if (ALIASES[id] && !mount.querySelector('[data-tour="' + id + '"]')) id = ALIASES[id];
        var f = canvasFrame();
        var d = f && f.contentDocument;
        var scopes = [[mount, null], [d, f]];
        for (var i = 0; i < scopes.length; i++) {
            var root = scopes[i][0];
            if (!root) continue;
            var el = root.querySelector('[data-tour="' + id + '"]');
            if (el) return { el: el, frame: scopes[i][1], parts: [el] };
            var parts = Array.prototype.slice.call(root.querySelectorAll('[data-tour-part="' + id + '"]'));
            if (parts.length) return { el: parts[0], frame: scopes[i][1], parts: parts };
        }
        return null;
    }
    function unionRect(parts) {
        var l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
        parts.forEach(function (p) {
            var x = p.getBoundingClientRect();
            if (!x.width && !x.height) return;
            l = Math.min(l, x.left); t = Math.min(t, x.top); r = Math.max(r, x.right); b = Math.max(b, x.bottom);
        });
        if (l === Infinity) return parts[0].getBoundingClientRect();
        return { left: l, top: t, right: r, bottom: b, width: r - l, height: b - t, x: l, y: t };
    }

    window.SRScreen = {
        name: screen,
        states: meta.states.slice(),
        setState: setState,
        getState: function () { return state; },
        ready: function () { return ready; },
        getTarget: function (id) { var hit = find(id); return hit ? hit.el : null; },
        getTargets: function () {
            var ids = [];
            var add = function (root) {
                Array.prototype.forEach.call(root.querySelectorAll('[data-tour], [data-tour-part]'), function (el) {
                    var id = el.getAttribute('data-tour') || el.getAttribute('data-tour-part');
                    if (ids.indexOf(id) === -1) ids.push(id);
                });
            };
            add(mount);
            var f = canvasFrame();
            if (f && f.contentDocument) add(f.contentDocument);
            return ids;
        },
        // Viewport rect in this screen's document, including targets on the canvas.
        getTargetRect: function (id) {
            var hit = find(id);
            if (!hit) return null;
            var r = unionRect(hit.parts);
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
