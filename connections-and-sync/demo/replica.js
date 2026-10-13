/*
 * Storyraise Connections demo: read-only behavior for the captured page.
 *
 * The markup and styles are captured from the real dashboard (see
 * tools/connections-and-sync/replica). Every dialog was rendered by the product's
 * own Vue code and ships here as a <template>, so opening one swaps in real output
 * rather than re-deriving it. Anything that would connect, sync, write, or send
 * becomes a gentle "read-only demo" notice, except "Save & send now", which shows
 * the captured result line. The landing page drives the tour through
 * window.SRReplica.
 */
(function () {
    'use strict';

    var doc = document;
    var root = doc.getElementById('dashboard');
    if (!root) return;

    var state = { dialog: null, menu: null };
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

    // ---- Dialogs: daisyUI checkbox + .modal pairs ----
    function openDialog(name) {
        var html = template('template[data-dialog="' + name + '"]');
        if (html == null) return;
        closeDialog(true);
        closeMenu(true);
        focusBeforeDialog = doc.activeElement;
        var host = doc.createElement('div');
        host.id = 'replica-dialog';
        host.innerHTML = html;
        // Inside #dashboard: the modal rules are scoped to it.
        root.appendChild(host);
        state.dialog = name;
        var first = host.querySelector('.modal-action .btn');
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

    // ---- The ⋯ menu: daisyUI opens it on focus; the tour opens it by class ----
    function menuFor(vendor) {
        return root.querySelector('[data-sr-menu="' + vendor + '"]');
    }
    function openMenu(vendor) {
        var el = menuFor(vendor);
        if (!el) return;
        closeMenu(true);
        el.classList.add('dropdown-open');
        state.menu = vendor;
        emit('menu', vendor);
    }
    function closeMenu(quiet) {
        Array.prototype.forEach.call(root.querySelectorAll('[data-sr-menu].dropdown-open'), function (el) {
            el.classList.remove('dropdown-open');
        });
        if (!state.menu) return;
        state.menu = null;
        if (!quiet) emit('menu', null);
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
        if (state.menu && !ev.target.closest('[data-sr-menu]')) closeMenu();
        var inert = ev.target.closest('[data-inert]');
        if (inert) {
            ev.preventDefault();
            toast(inert.getAttribute('data-inert') || 'This is a read-only demo.');
            return;
        }
        var modal = ev.target.closest('#replica-dialog .modal');
        if (modal && ev.target === modal) { closeDialog(); return; }
        if (ev.target.closest('[data-dialog-close]')) { ev.preventDefault(); closeDialog(); return; }
        var openDlg = ev.target.closest('[data-open-dialog]');
        if (openDlg) { ev.preventDefault(); openDialog(openDlg.getAttribute('data-open-dialog')); return; }
    });

    doc.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') {
            if (state.dialog) { closeDialog(); return; }
            if (state.menu) { closeMenu(); return; }
        }
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        var el = ev.target.closest('[data-open-dialog],[data-dialog-close],[data-inert]');
        if (!el || el.tagName === 'BUTTON') return;
        ev.preventDefault();
        el.click();
    });

    // Form controls are captured, not live: stop them changing under a click.
    doc.addEventListener('change', function (ev) {
        var el = ev.target;
        if (!el.matches || !el.matches('input, select, textarea')) return;
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = el.hasAttribute('checked');
        if (el.tagName === 'SELECT') {
            Array.prototype.forEach.call(el.options, function (o) { o.selected = o.hasAttribute('selected'); });
        }
        toast('This is a read-only demo.');
    }, true);

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
        openDialog: openDialog,
        closeDialog: closeDialog,
        openMenu: openMenu,
        closeMenu: closeMenu,
        getTarget: getTarget,
        getTargets: getTargets,
        scrollToTarget: scrollToTarget,
        getState: function () { return { dialog: state.dialog, menu: state.menu }; },
        onChange: function (fn) { listeners.push(fn); }
    };
    emit('ready');
})();
