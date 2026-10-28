// Runtime for one static dashboard screen (inlined into constituents.html / profile.html
// by replica/dashboard/build.mjs). The page holds the first state in #sr-mount and every
// state as a <template data-sr-state>. Controls marked data-sr-action move between states
// (state:<name>) or ask the host page for another screen (screen:<name>); anything marked
// data-inert shows a "read-only demo" toast instead.
(function () {
    var screen = document.body.getAttribute('data-sr-screen');
    var mount = document.getElementById('sr-mount');
    var templates = {};
    Array.prototype.forEach.call(document.querySelectorAll('template[data-sr-state]'), function (t) {
        templates[t.getAttribute('data-sr-state')] = t;
    });
    var states = Object.keys(templates);
    var current = mount.firstElementChild.getAttribute('data-sr-state');
    var embedded = window.parent && window.parent !== window;

    function post(msg) {
        if (embedded) window.parent.postMessage(Object.assign({ sr: 'state', screen: screen }, msg), '*');
    }

    function setState(name) {
        if (!templates[name]) throw new Error('Unknown state ' + name + ' on ' + screen);
        if (name !== current) {
            mount.replaceChildren(templates[name].content.cloneNode(true));
            current = name;
        }
        post({ state: name });
        return name;
    }

    var toast = document.getElementById('replica-toast');
    var toastTimer = null;
    function showToast(text) {
        toast.textContent = text;
        toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2200);
    }

    function go(action) {
        var parts = action.split(':');
        if (parts[0] === 'state') setState(parts[1]);
        else if (parts[0] === 'screen') {
            if (embedded) window.parent.postMessage({ sr: 'navigate', from: screen, screen: parts[1] }, '*');
            else window.location.href = parts[1] + '.html';
        }
    }

    document.addEventListener('click', function (e) {
        var target = e.target.closest('[data-sr-action], [data-inert]');
        if (!target) return;
        e.preventDefault();
        e.stopPropagation();
        if (target.hasAttribute('data-sr-action')) {
            // A dimmed page behind the open card closes it, but a click inside the card does not.
            if (target.matches('.page.dimmed') && e.target.closest('.dropdown-content')) {
                var inert = e.target.closest('[data-inert]');
                if (inert) showToast(inert.getAttribute('data-inert'));
                return;
            }
            go(target.getAttribute('data-sr-action'));
        } else {
            showToast(target.getAttribute('data-inert'));
        }
    }, true);
    // Selects and option controls stay as captured.
    document.addEventListener('mousedown', function (e) {
        if (e.target.closest('select[data-inert]')) { e.preventDefault(); showToast(e.target.closest('select').getAttribute('data-inert')); }
    }, true);
    document.addEventListener('keydown', function (e) {
        if (e.target.closest && e.target.closest('select[data-inert], input[data-inert]') && e.key !== 'Tab') e.preventDefault();
        if (e.key === 'Escape' && (current === 'map' || current === 'add-csv')) setState('list');
    }, true);

    window.SRScreen = {
        name: screen,
        states: states,
        setState: setState,
        getState: function () { return current; },
        getTarget: function (id) { return mount.querySelector('[data-tour="' + id + '"]'); },
        getTargetAlso: function (id) { return Array.prototype.slice.call(mount.querySelectorAll('[data-tour-also="' + id + '"]')); },
        getTargets: function () {
            return Array.prototype.map.call(mount.querySelectorAll('[data-tour]'), function (el) { return el.getAttribute('data-tour'); });
        },
    };
    post({ state: current, ready: true });
})();
