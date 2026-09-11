/*
 * Storyraise Analytics page: video chapters and the interactive demo tour.
 *
 * The demo is a same-origin iframe (demo/) that exposes window.SRReplica. This
 * file scales it to fit, draws the spotlight, numbered markers, and popover on
 * top of it, and walks through the stops in annotations.json.
 */
(function () {
    'use strict';

    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // On phones, metric cards start collapsed to their one-line summary.
    if (window.matchMedia && window.matchMedia('(max-width: 760px)').matches) {
        document.querySelectorAll('.sra-metric .sra-more[open]').forEach(function (d) { d.removeAttribute('open'); });
    }

    // ------------------------------------------------------------------
    // Video chapters (read from the chapters track so there is one source)
    // ------------------------------------------------------------------
    (function chapters() {
        var video = document.getElementById('tour-video');
        var list = document.getElementById('tour-chapters');
        if (!video || !list) return;

        function toSeconds(stamp) {
            var parts = stamp.trim().split(':').map(Number);
            return parts.reduce(function (total, n) { return total * 60 + n; }, 0);
        }

        // With preload="none" the video has no metadata yet, and a currentTime set before it
        // loads is dropped, so the first chapter click would start from 0. Load first, then seek.
        function seekAndPlay(seconds) {
            function go() {
                video.currentTime = seconds;
                var playing = video.play();
                if (playing && playing.catch) playing.catch(function () {});
            }
            if (video.readyState >= 1) {
                go();
            } else {
                video.preload = 'metadata';
                video.addEventListener('loadedmetadata', go, { once: true });
                video.load();
            }
        }

        function label(seconds) {
            var m = Math.floor(seconds / 60);
            var s = Math.floor(seconds % 60);
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        fetch('media/chapters.en.vtt').then(function (r) { return r.ok ? r.text() : ''; }).then(function (text) {
            var cues = text.split(/\r?\n\r?\n/).map(function (block) {
                var lines = block.trim().split(/\r?\n/);
                var timing = lines.findIndex(function (l) { return l.indexOf('-->') !== -1; });
                if (timing === -1 || !lines[timing + 1]) return null;
                return { start: toSeconds(lines[timing].split('-->')[0]), title: lines.slice(timing + 1).join(' ') };
            }).filter(Boolean);
            if (!cues.length) return;

            cues.forEach(function (cue) {
                var li = document.createElement('li');
                var button = document.createElement('button');
                button.type = 'button';
                button.innerHTML = '<span class="sra-chapter-time"></span><span class="sra-chapter-title"></span>';
                button.querySelector('.sra-chapter-time').textContent = label(cue.start);
                button.querySelector('.sra-chapter-title').textContent = cue.title;
                button.setAttribute('aria-label', cue.title + ', at ' + label(cue.start));
                button.addEventListener('click', function () { seekAndPlay(cue.start); });
                li.appendChild(button);
                list.appendChild(li);
                cue.button = button;
            });
            list.hidden = false;

            video.addEventListener('timeupdate', function () {
                var active = null;
                cues.forEach(function (cue) { if (video.currentTime + 0.25 >= cue.start) active = cue; });
                cues.forEach(function (cue) {
                    if (cue === active) cue.button.setAttribute('aria-current', 'true');
                    else cue.button.removeAttribute('aria-current');
                });
            });
        }).catch(function () {});
    })();

    // ------------------------------------------------------------------
    // Interactive demo
    // ------------------------------------------------------------------
    var section = document.getElementById('demo');
    if (!section) return;

    var frame = document.getElementById('demo-frame');
    var viewport = frame.querySelector('.sra-frame-viewport');
    var iframe = viewport.querySelector('iframe');
    var layer = viewport.querySelector('.sra-layer');
    var spotlight = layer.querySelector('.sra-spotlight');
    var hotspotBox = layer.querySelector('.sra-hotspots');
    var popover = document.getElementById('sra-popover');
    var live = document.getElementById('sra-live');

    var DESIGN_WIDE = 1200; // the app's content width at a 1440px window
    var DESIGN_MID = 1024;

    var stops = [];
    var replica = null;
    var readyQueue = [];
    var scale = 1;
    var mode = null; // 'tour' | 'explore' | null
    var current = -1;

    function whenReady(fn) {
        if (replica && stops.length) fn();
        else readyQueue.push(fn);
    }

    function flushReady() {
        if (!replica || !stops.length) return;
        var queue = readyQueue;
        readyQueue = [];
        queue.forEach(function (fn) { fn(); });
    }

    fetch('annotations.json').then(function (r) { return r.json(); }).then(function (data) {
        stops = data.stops;
        flushReady();
    });

    function connect() {
        var win = iframe.contentWindow;
        if (!win || !win.SRReplica) {
            window.setTimeout(connect, 120);
            return;
        }
        replica = win.SRReplica;
        replica.onChange(function (type) {
            if (type === 'modal' || type === 'tab' || type === 'range') renderHotspots();
            reposition();
        });
        win.document.addEventListener('keydown', onKey);
        layout();
        flushReady();
    }
    iframe.addEventListener('load', connect);
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') connect();

    // ---- Scale the 1200px-wide page to the frame ----
    function layout() {
        var width = viewport.clientWidth;
        var design = width >= 1100 ? DESIGN_WIDE : (width >= 700 ? DESIGN_MID : width);
        scale = Math.min(1, width / design);
        iframe.style.width = design + 'px';
        iframe.style.height = Math.ceil(viewport.clientHeight / scale) + 'px';
        iframe.style.transform = scale === 1 ? '' : 'scale(' + scale + ')';
        reposition();
    }

    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(viewport);
    window.addEventListener('resize', layout);

    // ---- Geometry: target rectangles in frame-viewport pixels ----
    function targetRect(id) {
        if (!replica) return null;
        var rects = replica.getTargets(id)
            .map(function (el) { return el.getBoundingClientRect(); })
            .filter(function (r) { return r.width > 0 && r.height > 0; });
        if (!rects.length) return null;
        var left = Math.min.apply(null, rects.map(function (r) { return r.left; }));
        var top = Math.min.apply(null, rects.map(function (r) { return r.top; }));
        var right = Math.max.apply(null, rects.map(function (r) { return r.right; }));
        var bottom = Math.max.apply(null, rects.map(function (r) { return r.bottom; }));
        return { left: left * scale, top: top * scale, width: (right - left) * scale, height: (bottom - top) * scale };
    }

    function reposition() {
        positionHotspots();
        if (current === -1 || popover.hidden) return;
        var rect = targetRect(stops[current].id);
        placeSpotlight(rect);
        placePopover(rect);
    }

    function placeSpotlight(rect) {
        if (!rect) { spotlight.hidden = true; return; }
        var pad = 6;
        spotlight.hidden = false;
        spotlight.style.width = (rect.width + pad * 2) + 'px';
        spotlight.style.height = (rect.height + pad * 2) + 'px';
        spotlight.style.transform = 'translate(' + (rect.left - pad) + 'px,' + (rect.top - pad) + 'px)';
    }

    function placePopover(rect) {
        if (getComputedStyle(popover).position === 'static') return; // docked under the frame on small screens
        var host = popover.offsetParent || section;
        var hostBox = host.getBoundingClientRect();
        var box = viewport.getBoundingClientRect();
        var ox = box.left - hostBox.left + host.scrollLeft;
        var oy = box.top - hostBox.top + host.scrollTop;
        var vw = viewport.clientWidth;
        var vh = viewport.clientHeight;
        var pw = popover.offsetWidth;
        var ph = popover.offsetHeight;
        var gap = 18;
        var left;
        var top;

        if (!rect) {
            left = ox + (vw - pw) / 2;
            top = oy + 24;
        } else if (rect.left + rect.width + gap + pw <= vw - 8) {
            left = ox + rect.left + rect.width + gap;
            top = oy + Math.max(8, Math.min(rect.top, vh - ph - 8));
        } else if (rect.left - gap - pw >= 8) {
            left = ox + rect.left - gap - pw;
            top = oy + Math.max(8, Math.min(rect.top, vh - ph - 8));
        } else {
            // Wide target: float over its lower right, clear of the heading.
            left = ox + Math.max(8, Math.min(rect.left + rect.width - pw - 16, vw - pw - 8));
            var below = rect.top + rect.height + gap;
            top = oy + (below + ph <= vh - 8 ? below : Math.max(8, Math.min(rect.top + 56, vh - ph - 8)));
        }
        popover.style.left = Math.round(left) + 'px';
        popover.style.top = Math.round(top) + 'px';
    }

    // ---- Numbered markers ----
    function renderHotspots() {
        hotspotBox.innerHTML = '';
        if (mode !== 'explore' || !stops.length) return;
        stops.forEach(function (stop, i) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'sra-hotspot';
            button.textContent = String(i + 1);
            button.setAttribute('aria-label', 'Stop ' + (i + 1) + ': ' + stop.title);
            button.setAttribute('data-stop', stop.id);
            button.addEventListener('click', function () { openStop(i, false); });
            hotspotBox.appendChild(button);
        });
        positionHotspots();
    }

    // A marker sits over its element's top-left corner. Where that corner is text (the tab
    // labels, a badge's icon), the stop sets marker "after" or "before" to put it beside the
    // element instead, vertically centered: after the last child, or before the element.
    function markerPoint(stop, rect) {
        if (stop.marker !== 'after' && stop.marker !== 'before') return { x: rect.left - 10, y: rect.top - 10 };
        var el = replica.getTarget(stop.id);
        var anchor = (stop.marker === 'after' && el.lastElementChild) || el;
        var r = anchor.getBoundingClientRect();
        return {
            x: stop.marker === 'after' ? r.right * scale + 8 : r.left * scale - 36,
            y: (r.top + r.height / 2) * scale - 14,
        };
    }

    function positionHotspots() {
        var vw = viewport.clientWidth;
        var vh = viewport.clientHeight;
        hotspotBox.querySelectorAll('.sra-hotspot').forEach(function (button, i) {
            var rect = targetRect(button.getAttribute('data-stop'));
            if (!rect || rect.top > vh - 20 || rect.top + rect.height < 20 || rect.left > vw - 20) {
                button.hidden = true;
                return;
            }
            button.hidden = false;
            var point = markerPoint(stops[i], rect);
            var x = Math.max(6, Math.min(vw - 34, point.x));
            var y = Math.max(6, Math.min(vh - 34, point.y));
            button.style.transform = 'translate(' + x + 'px,' + y + 'px)';
            button.classList.toggle('is-current', current !== -1 && stops[current].id === button.getAttribute('data-stop') && !popover.hidden);
        });
    }

    // ---- Popover ----
    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function renderPopover(stop, index) {
        popover.innerHTML = '';
        var head = el('div', 'sra-pop-head');
        head.appendChild(el('span', 'sra-pop-step', 'Stop ' + (index + 1) + ' of ' + stops.length));
        var close = el('button', 'sra-pop-close');
        close.type = 'button';
        close.setAttribute('aria-label', 'Close');
        close.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        close.addEventListener('click', closeStop);
        head.appendChild(close);
        popover.appendChild(head);

        var title = el('h3', 'sra-pop-title', stop.title);
        title.id = 'sra-pop-title';
        title.tabIndex = -1;
        popover.appendChild(title);
        popover.appendChild(el('p', 'sra-pop-tells', stop.tells));

        [['Why it matters', stop.why], ['What to do next', stop.next]].forEach(function (pair) {
            var block = el('div', 'sra-pop-block');
            block.appendChild(el('p', 'sra-pop-label', pair[0]));
            block.appendChild(el('p', null, pair[1]));
            popover.appendChild(block);
        });

        if (stop.keepInMind && stop.keepInMind.length) {
            var details = el('details', 'sra-pop-keep');
            details.appendChild(el('summary', null, 'Keep in mind'));
            var ul = el('ul');
            stop.keepInMind.forEach(function (item) { ul.appendChild(el('li', null, item)); });
            details.appendChild(ul);
            popover.appendChild(details);
        }

        var foot = el('div', 'sra-pop-foot');
        if (stop.kb) {
            var link = el('a', 'sra-pop-kb', stop.kb.label);
            link.href = stop.kb.href;
            foot.appendChild(link);
        }
        var nav = el('div', 'sra-pop-nav');
        var back = el('button', 'sra-btn sra-btn--quiet sra-btn--sm', 'Back');
        back.type = 'button';
        back.disabled = index === 0;
        back.addEventListener('click', prev);
        var next = el('button', 'sra-btn sra-btn--primary sra-btn--sm', index === stops.length - 1 ? 'Finish' : 'Next');
        next.type = 'button';
        next.addEventListener('click', index === stops.length - 1 ? closeStop : nextStop);
        nav.appendChild(back);
        nav.appendChild(next);
        foot.appendChild(nav);
        popover.appendChild(foot);
    }

    function openStop(index, focusTitle) {
        var stop = stops[index];
        if (!stop || !replica) return;
        current = index;
        replica.closeModals();
        if (stop.prepare && stop.prepare.tab && replica.getState().tab !== stop.prepare.tab) {
            replica.setTab(stop.prepare.tab);
        }
        renderPopover(stop, index);
        popover.hidden = false;
        section.classList.add('is-touring');
        live.textContent = 'Stop ' + (index + 1) + ' of ' + stops.length + ': ' + stop.title;
        reposition();
        replica.scrollToTarget(stop.id).then(function () {
            reposition();
            if (focusTitle !== false) popover.querySelector('#sra-pop-title').focus({ preventScroll: true });
        });
        var url = new URL(window.location.href);
        url.searchParams.set('step', stop.id);
        url.searchParams.delete('explore');
        url.hash = 'demo';
        history.replaceState(null, '', url);
    }

    function closeStop() {
        popover.hidden = true;
        spotlight.hidden = true;
        section.classList.remove('is-touring');
        current = -1;
        if (mode === 'tour') setMode(null);
        positionHotspots();
        var url = new URL(window.location.href);
        url.searchParams.delete('step');
        history.replaceState(null, '', url);
    }

    function nextStop() { if (current < stops.length - 1) openStop(current + 1); }
    function prev() { if (current > 0) openStop(current - 1); }

    function setMode(next) {
        // Markers live on The Numbers (13 of 14 stops); start exploring from there.
        if (next === 'explore' && mode !== 'explore' && replica && popover.hidden) {
            replica.closeModals();
            replica.setTab('overview');
            iframe.contentWindow.scrollTo(0, 0);
        }
        mode = next;
        renderHotspots();
    }

    function onKey(e) {
        if (e.key === 'Escape') {
            if (!popover.hidden) { e.preventDefault(); closeStop(); }
            return;
        }
        if (popover.hidden) return;
        var target = e.target;
        if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); nextStop(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    }
    document.addEventListener('keydown', onKey);

    // ---- "See it in the demo" buttons (on metric cards, when the page has them) ----
    document.addEventListener('click', function (e) {
        var step = e.target.closest('[data-demo-step]');
        if (step) {
            e.preventDefault();
            var id = step.getAttribute('data-demo-step');
            section.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
            whenReady(function () {
                var index = stops.findIndex(function (s) { return s.id === id; });
                if (mode !== 'explore') setMode('tour');
                openStop(Math.max(0, index));
            });
        }
    });

    // ---- Numbered markers are on by default ----
    whenReady(function () { if (!mode) setMode('explore'); });

    // ---- Deep links: ?step=views or ?explore=1 ----
    var params = new URLSearchParams(window.location.search);
    if (params.get('step') || params.get('explore')) {
        iframe.loading = 'eager';
        section.scrollIntoView({ block: 'start' });
        whenReady(function () {
            if (params.get('explore')) setMode('explore');
            var index = stops.findIndex(function (s) { return s.id === params.get('step'); });
            if (index !== -1) {
                if (mode !== 'explore') setMode('tour');
                openStop(index);
            }
        });
    }
})();
