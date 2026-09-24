/*
 * Storyraise Donor Signals demo: read-only behavior for the captured page.
 *
 * The markup and styles are captured from the real dashboard (see
 * tools/donor-signals/replica). Every tile x view combination and every
 * follow-up dialog was rendered by the product's own Vue code and shipped here
 * as a <template>, so switching groups swaps in real output rather than
 * re-deriving it. Anything that would write, send, or leave the page becomes a
 * gentle "read-only demo" notice. The landing page drives the tour through
 * window.SRReplica.
 */
(function () {
    'use strict';

    var doc = document;
    var root = doc.getElementById('dashboard');
    if (!root) return;

    var card = root.querySelector('section[data-signals] .sig-block');
    var state = { tile: 'new_gifts', view: 'feed', dialog: null };
    var listeners = [];
    var toastTimer = null;
    var focusBeforeDialog = null;

    function reducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function emit(type, detail) {
        listeners.slice().forEach(function (fn) {
            try { fn(type, detail); } catch (err) { /* a listener must never break the page */ }
        });
    }

    function template(selector) {
        var t = doc.querySelector(selector);
        return t ? t.innerHTML : null;
    }

    // ---- Groups and list view: swap in the captured state ----
    function apply() {
        var html = template('template[data-state="' + state.tile + '|' + state.view + '"]');
        if (html == null) return;
        card.innerHTML = html;
        emit('state', { tile: state.tile, view: state.view });
    }

    function setTile(key) {
        if (!key || key === state.tile) return;
        state.tile = key;
        apply();
    }

    function setView(view) {
        view = view === 'table' ? 'table' : 'feed';
        if (view === state.view) return;
        state.view = view;
        apply();
    }

    // ---- The follow-up dialog ----
    function openDialog(name) {
        var html = template('template[data-dialog="' + name + '"]');
        if (html == null) return;
        closeDialog(true);
        focusBeforeDialog = doc.activeElement;
        var host = doc.createElement('div');
        host.id = 'replica-dialog';
        host.innerHTML = html;
        /*
            Mount inside the signals section, not on <body>. Every rule the modal
            needs is scoped `#dashboard [data-signals] ...`, so a host on <body> got
            none of them and the dialog rendered as a run of unstyled text below the
            page. The backdrop is position:fixed, so it still covers the viewport.
        */
        (doc.querySelector('#dashboard [data-signals]') || doc.body).appendChild(host);
        state.dialog = name;
        var first = host.querySelector('.sig-route, button');
        window.setTimeout(function () { if (first) first.focus(); }, 60);
        emit('dialog', name);
    }

    function closeDialog(quiet) {
        var host = doc.getElementById('replica-dialog');
        if (host) host.remove();
        if (!state.dialog) return;
        state.dialog = null;
        if (!quiet) {
            if (focusBeforeDialog && focusBeforeDialog.focus) focusBeforeDialog.focus();
            emit('dialog', null);
        }
    }

    // Routes inside the dialog swap to that route's captured markup.
    function setRoute(route) {
        if (!state.dialog) return;
        var name = route === 'ai' ? 'report-ai' : route === 'template' ? 'report-template' : 'report-existing';
        if (name === state.dialog) return;
        var keep = state.dialog;
        openDialog(name);
        if (!state.dialog) state.dialog = keep;
    }

    function toast(message) {
        var el = doc.getElementById('replica-toast');
        if (!el) return;
        el.textContent = message;
        el.classList.add('is-visible');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () { el.classList.remove('is-visible'); }, 2400);
    }

    // ---- One delegated listener, so swapped markup needs no rebinding ----
    doc.addEventListener('click', function (ev) {
        var inert = ev.target.closest('[data-inert]');
        if (inert) {
            ev.preventDefault();
            toast('This is a read-only demo.');
            return;
        }
        var backdrop = ev.target.closest('[data-dialog-backdrop]');
        if (backdrop && ev.target === backdrop) { closeDialog(); return; }
        var route = ev.target.closest('[data-sr-route]');
        if (route) { ev.preventDefault(); setRoute(route.getAttribute('data-sr-route')); return; }
        var openDlg = ev.target.closest('[data-open-dialog]');
        if (openDlg) { ev.preventDefault(); openDialog(openDlg.getAttribute('data-open-dialog')); return; }
        var tile = ev.target.closest('[data-tile]');
        if (tile) { ev.preventDefault(); setTile(tile.getAttribute('data-tile')); return; }
        var view = ev.target.closest('[data-view]');
        if (view) { ev.preventDefault(); setView(view.getAttribute('data-view')); return; }
        var row = ev.target.closest('.sig-feed-row, .sig-tr:not(.sig-th)');
        if (row && root.contains(row)) { toast('Opening a donor is disabled in this demo.'); }
    });

    doc.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && state.dialog) { closeDialog(); return; }
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        var el = ev.target.closest('[data-tile],[data-view],[data-open-dialog],[data-sr-route]');
        if (!el) return;
        ev.preventDefault();
        el.click();
    });

    // ---- Tour support ----
    function getTarget(id) {
        return doc.querySelector('[data-tour="' + id + '"]');
    }
    function getTargets(id) {
        return Array.prototype.slice.call(doc.querySelectorAll('[data-tour="' + id + '"], [data-tour-also="' + id + '"]'));
    }
    function waitForScroll() {
        return new Promise(function (resolve) {
            var done = false;
            function finish() {
                if (done) return;
                done = true;
                window.removeEventListener('scrollend', finish);
                resolve();
            }
            window.addEventListener('scrollend', finish);
            window.setTimeout(finish, reducedMotion() ? 0 : 700);
        });
    }
    function scrollToTarget(id) {
        var el = getTarget(id);
        if (!el) return Promise.resolve(null);
        var rects = getTargets(id).map(function (t) { return t.getBoundingClientRect(); });
        var top = Math.min.apply(null, rects.map(function (r) { return r.top; }));
        var bottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
        var height = bottom - top;
        var margin = Math.max(24, (window.innerHeight - height) / 2);
        var destination = Math.max(0, window.scrollY + top - (height > window.innerHeight - 48 ? 24 : margin));
        if (Math.abs(destination - window.scrollY) < 2) return Promise.resolve(el);
        window.scrollTo({ top: destination, behavior: reducedMotion() ? 'auto' : 'smooth' });
        return waitForScroll().then(function () { return el; });
    }

    window.SRReplica = {
        setTile: setTile,
        setView: setView,
        openDialog: openDialog,
        closeDialog: closeDialog,
        getTarget: getTarget,
        getTargets: getTargets,
        scrollToTarget: scrollToTarget,
        getState: function () { return { tile: state.tile, view: state.view, dialog: state.dialog }; },
        onChange: function (fn) { listeners.push(fn); }
    };
    emit('ready');
})();
