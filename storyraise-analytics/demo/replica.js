/*
 * Storyraise Analytics demo: read-only behavior for the captured Insights page.
 *
 * The markup and styles are captured from the real dashboard (see
 * tools/storyraise-analytics/replica). This file restores the interactions a
 * visitor can safely use (tabs, date ranges, detail modals, the map, and the
 * Section Retention strip) and turns everything that would change data into a
 * gentle "read-only demo" notice. The landing page drives the guided tour
 * through window.SRReplica.
 */
(function () {
    'use strict';

    var doc = document;
    var root = doc.getElementById('dashboard');
    if (!root) return;

    var DATA = JSON.parse(doc.getElementById('replica-data').textContent);
    var state = { tab: 'overview', range: 30, modal: null };
    var listeners = [];

    function reducedMotion() {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function emit(type, detail) {
        listeners.slice().forEach(function (fn) {
            try { fn(type, detail); } catch (err) { /* a listener must never break the page */ }
        });
    }

    // ---- Tabs: The Numbers / The Story ----
    function setTab(view) {
        state.tab = view === 'summary' ? 'summary' : 'overview';
        root.querySelectorAll('[data-tab]').forEach(function (tab) {
            var on = tab.getAttribute('data-tab') === state.tab;
            tab.classList.toggle('tab-active', on);
            tab.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        root.querySelector('[data-insights-pane="overview"]').style.display = state.tab === 'overview' ? '' : 'none';
        root.querySelector('[data-insights-narrative]').closest('main').style.display = state.tab === 'summary' ? '' : 'none';
        if (state.tab === 'overview') {
            resizeMap();
            updateFlowArrows();
        }
        emit('tab', state.tab);
    }

    // ---- Date range chips (heatmap + trend are pre-rendered per range) ----
    function setRange(days) {
        var tpl = doc.querySelector('template[data-range="' + days + '"]');
        if (!tpl) return;
        ['[data-engagement-heatmap-wrap]', '[data-visits-trend-wrap]'].forEach(function (sel) {
            root.querySelector(sel).replaceWith(tpl.content.querySelector(sel).cloneNode(true));
        });
        state.range = Number(days);
        emit('range', state.range);
    }

    // ---- Modals (daisyUI checkbox toggles) ----
    var focusBeforeModal = null;

    function openModal(id) {
        var toggle = doc.getElementById(id);
        if (!toggle) return;
        focusBeforeModal = doc.activeElement;
        toggle.checked = true;
        state.modal = id;
        var close = toggle.nextElementSibling.querySelector('label[for="' + id + '"]');
        window.setTimeout(function () { if (close) close.focus(); }, 60);
        emit('modal', id);
    }

    function closeModals() {
        var closed = false;
        doc.querySelectorAll('input.modal-toggle').forEach(function (toggle) {
            if (toggle.checked) { toggle.checked = false; closed = true; }
        });
        if (!closed) return;
        state.modal = null;
        if (focusBeforeModal && focusBeforeModal.focus) focusBeforeModal.focus();
        emit('modal', null);
    }

    function toggleRegion(row) {
        var open = row.getAttribute('data-expanded') !== 'true';
        row.setAttribute('data-expanded', open ? 'true' : 'false');
        row.setAttribute('aria-expanded', open ? 'true' : 'false');
        var panel = row.nextElementSibling;
        if (panel && panel.hasAttribute('data-cities-panel')) panel.style.display = open ? '' : 'none';
    }

    // ---- World map (ECharts, loaded when the card scrolls into view) ----
    // Options ported from the dashboard's _worldmap_focus / _render_worldmap.
    var chart = null;
    var mapZoom = 2;

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = doc.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            doc.head.appendChild(s);
        });
    }

    function mapFocus(points) {
        var byCountry = {};
        points.forEach(function (p) { byCountry[p.country] = (byCountry[p.country] || 0) + p.views; });
        var topCountry = Object.keys(byCountry).sort(function (a, b) { return byCountry[b] - byCountry[a]; })[0];
        var core = points.filter(function (p) { return p.country === topCountry; });
        if (!core.length) core = points;
        var minLat = 90, maxLat = -90, minLng = 180, maxLng = -180, wLat = 0, wLng = 0, wSum = 0;
        core.forEach(function (p) {
            if (p.lat < minLat) minLat = p.lat;
            if (p.lat > maxLat) maxLat = p.lat;
            if (p.lng < minLng) minLng = p.lng;
            if (p.lng > maxLng) maxLng = p.lng;
            wLat += p.lat * p.views; wLng += p.lng * p.views; wSum += p.views;
        });
        var spanLat = Math.max(1, maxLat - minLat);
        var spanLng = Math.max(1, maxLng - minLng);
        var zoom = Math.min(360 / (spanLng * 1.5 + 12), 180 / (spanLat * 1.5 + 12));
        return { center: [wLng / wSum, wLat / wSum], zoom: Math.max(1.5, Math.min(6, zoom)) };
    }

    function renderMap() {
        var points = DATA.geo_points || [];
        var maxViews = points.reduce(function (m, p) { return p.views > m ? p.views : m; }, 1);
        var focus = mapFocus(points);
        mapZoom = focus.zoom;
        chart.setOption({
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: '#1b2734',
                borderColor: '#395061',
                borderWidth: 1,
                textStyle: { color: 'rgba(255,255,255,0.88)', fontSize: 12 },
                formatter: function (p) {
                    var d = p.data || {};
                    var place = d.country ? (d.region + ', ' + d.country) : d.region;
                    return '<div style="font-weight:700;color:#fff">' + d.city + '</div>'
                        + '<div style="color:rgba(255,255,255,0.6);font-size:11px">' + place + '</div>'
                        + '<div style="margin-top:2px"><span style="color:#c5dfff;font-weight:700">'
                        + Number(d.views).toLocaleString() + '</span> views</div>';
                }
            },
            geo: {
                map: 'world',
                roam: 'move',
                silent: true,
                center: focus.center,
                zoom: focus.zoom,
                scaleLimit: { min: 1, max: 12 },
                layoutCenter: ['50%', '50%'],
                layoutSize: '100%',
                itemStyle: { areaColor: '#48596b', borderColor: 'rgba(214,228,245,0.35)', borderWidth: 0.8 },
                emphasis: { disabled: true }
            },
            visualMap: {
                show: false, min: 1, max: maxViews, dimension: 2,
                inRange: { color: ['#2c7f8a', '#7fc55f', '#f5e04e'] }
            },
            series: [{
                type: 'scatter',
                coordinateSystem: 'geo',
                zlevel: 1,
                symbolSize: function (v) { return 5 + Math.sqrt(v[2] / maxViews) * 22; },
                itemStyle: { borderColor: 'rgba(255,255,255,0.85)', borderWidth: 1 },
                emphasis: { scale: 1.25 },
                data: points.map(function (c) {
                    return { city: c.city, region: c.region, country: c.country, views: c.views, value: [c.lng, c.lat, c.views] };
                })
            }]
        });
    }

    function initMap() {
        var el = root.querySelector('[data-worldmap-canvas]');
        if (!el || chart) return;
        Promise.all([
            window.echarts ? null : loadScript('vendor/echarts.min.js'),
            fetch('data/world.geo.json').then(function (r) { return r.json(); })
        ]).then(function (res) {
            window.echarts.registerMap('world', res[1]);
            chart = window.echarts.init(el);
            renderMap();
            el.classList.add('is-live');
        }).catch(function () { /* the static map image stays in place */ });
    }

    function resizeMap() {
        if (chart) chart.resize();
    }

    function zoomMap(factor) {
        if (!chart) return;
        mapZoom = Math.max(1, Math.min(12, mapZoom * factor));
        chart.setOption({ geo: { zoom: mapZoom } });
    }

    // ---- Section Retention strip ----
    function flowScroller() {
        return root.querySelector('[data-reader-flow-scroll]');
    }

    function updateFlowArrows() {
        var el = flowScroller();
        if (!el) return;
        var max = el.scrollWidth - el.clientWidth;
        var left = root.querySelector('.reader-flow__nav--left');
        var right = root.querySelector('.reader-flow__nav--right');
        if (left) left.classList.toggle('is-hidden', !(el.scrollLeft > 1));
        if (right) right.classList.toggle('is-hidden', !(el.scrollLeft < max - 1));
    }

    // Page one viewport across, keeping a column of overlap (as the dashboard does).
    function flowPage(dir) {
        var el = flowScroller();
        if (!el) return;
        var svg = el.querySelector('svg');
        var cols = el.querySelectorAll('.reader-flow__head').length;
        var width = svg ? svg.getBoundingClientRect().width : 0;
        var colW = cols && width ? width / cols : el.clientWidth * 0.25;
        var step = Math.max(el.clientWidth * 0.5, el.clientWidth - colW);
        el.scrollBy({ left: dir * step, behavior: reducedMotion() ? 'auto' : 'smooth' });
    }

    function bindFlowDrag() {
        var el = flowScroller();
        if (!el) return;
        var startX = 0, startLeft = 0, dragging = false;
        el.addEventListener('pointerdown', function (e) {
            if (e.pointerType !== 'mouse') return; // touch scrolls natively
            dragging = true;
            startX = e.clientX;
            startLeft = el.scrollLeft;
            el.classList.add('is-dragging');
            el.setPointerCapture(e.pointerId);
        });
        el.addEventListener('pointermove', function (e) {
            if (dragging) el.scrollLeft = startLeft - (e.clientX - startX);
        });
        ['pointerup', 'pointercancel'].forEach(function (type) {
            el.addEventListener(type, function () {
                dragging = false;
                el.classList.remove('is-dragging');
            });
        });
        el.addEventListener('scroll', function () {
            updateFlowArrows();
            emit('scroll');
        }, { passive: true });
    }

    // ---- The Story: jump links ----
    function tocJump(index) {
        var heads = root.querySelectorAll('[data-insights-narrative] [data-insights] h2');
        var head = heads[index];
        if (!head) return;
        head.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
        root.querySelectorAll('[data-narrative-toc] a').forEach(function (a, i) {
            a.classList.toggle('active', i === index);
        });
    }

    // ---- Read-only notice ----
    var toastTimer = null;

    function toast(message) {
        var el = doc.getElementById('replica-toast');
        el.textContent = message;
        el.classList.add('is-visible');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(function () { el.classList.remove('is-visible'); }, 2400);
    }

    // ---- Tour support ----
    function getTarget(id) {
        return root.querySelector('[data-tour="' + id + '"]');
    }

    function getTargets(id) {
        return Array.prototype.slice.call(root.querySelectorAll('[data-tour="' + id + '"], [data-tour-also="' + id + '"]'));
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
            window.setTimeout(finish, reducedMotion() ? 50 : 700);
        });
    }

    /** Scroll a tour target into the middle of the frame; resolves once settled. */
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

    // ---- Events ----
    doc.addEventListener('click', function (e) {
        var t = e.target.closest('[data-tab], [data-range], [data-open-modal], [data-map-zoom], [data-flow-page], [data-toc-index], [data-download-pdf], [data-drill-row="true"], [data-inert]');
        if (!t) return;
        e.preventDefault();
        if (t.hasAttribute('data-tab')) setTab(t.getAttribute('data-tab'));
        else if (t.hasAttribute('data-range')) setRange(t.getAttribute('data-range'));
        else if (t.hasAttribute('data-open-modal')) openModal(t.getAttribute('data-open-modal'));
        else if (t.hasAttribute('data-map-zoom')) zoomMap(Number(t.getAttribute('data-map-zoom')));
        else if (t.hasAttribute('data-flow-page')) flowPage(Number(t.getAttribute('data-flow-page')));
        else if (t.hasAttribute('data-toc-index')) tocJump(Number(t.getAttribute('data-toc-index')));
        else if (t.hasAttribute('data-download-pdf')) window.open('sample-summary.pdf', '_blank', 'noopener');
        else if (t.hasAttribute('data-drill-row')) toggleRegion(t);
        else toast('This is a read-only demo, so nothing here can be changed.');
    });

    doc.addEventListener('change', function (e) {
        if (e.target.matches('input.modal-toggle') && !e.target.checked) {
            state.modal = null;
            emit('modal', null);
        }
    });

    doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModals();
            return;
        }
        if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-tab], [data-drill-row="true"], label[role="button"]')) {
            e.preventDefault();
            e.target.click();
        }
    });

    doc.addEventListener('submit', function (e) { e.preventDefault(); });

    var scrollQueued = false;
    window.addEventListener('scroll', function () {
        if (scrollQueued) return;
        scrollQueued = true;
        window.requestAnimationFrame(function () {
            scrollQueued = false;
            emit('scroll');
        });
    }, { passive: true });

    window.addEventListener('resize', function () {
        resizeMap();
        updateFlowArrows();
        emit('resize');
    });

    // ---- Start ----
    bindFlowDrag();
    updateFlowArrows();

    var mapCard = root.querySelector('[data-worldmap-canvas]');
    if (mapCard && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
            if (entries.some(function (entry) { return entry.isIntersecting; })) {
                io.disconnect();
                initMap();
            }
        }, { rootMargin: '200px' });
        io.observe(mapCard);
    } else {
        initMap();
    }

    window.SRReplica = {
        setTab: setTab,
        setRange: setRange,
        openModal: openModal,
        closeModals: closeModals,
        getTarget: getTarget,
        getTargets: getTargets,
        scrollToTarget: scrollToTarget,
        getState: function () { return { tab: state.tab, range: state.range, modal: state.modal }; },
        onChange: function (fn) { listeners.push(fn); }
    };
    emit('ready');
})();
