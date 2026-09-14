/*
 * Automated donor journeys page: video chapter chips, read from the chapters track so
 * the chips and the video can't disagree (same behavior as the Storyraise Analytics page),
 * and the merge tag tool further down.
 */

/*
 * Merge tag tool: paste a report link, find an email platform, copy a link carrying that
 * platform's email merge tag. Mirrors the link rules in the product (public/js/sr-links.js):
 * the tag goes in ?for= before any #, and it is never encoded, because an encoded tag is
 * one the email platform won't recognize and fill in.
 */
(function mergeTags() {
    'use strict';

    var list = document.getElementById('tags-list');
    if (!list) return;
    var linkInput = document.getElementById('tags-link');
    var search = document.getElementById('tags-search');
    var status = document.getElementById('tags-status');
    var custom = document.getElementById('tags-custom');
    var customLink = document.getElementById('tags-custom-link');
    var rows = Array.prototype.slice.call(list.querySelectorAll('.sra-tag-row'));

    var empty = document.createElement('li');
    empty.className = 'sra-tags-empty';
    empty.hidden = true;
    empty.textContent = "No platforms match. Paste your platform's merge tag in the box below.";
    list.appendChild(empty);

    function parseLink(value) {
        var input = String(value || '').trim();
        if (!input) return {};
        if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) input = 'https://' + input;
        var url;
        try { url = new URL(input); } catch (e) { return { error: "That doesn't look like a link yet." }; }
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return { error: "Paste your report's web link." };
        return { url: input };
    }

    // A link someone already personalized keeps its other parameters but loses its ?for=.
    function withFor(link, tag) {
        var hashAt = link.indexOf('#');
        var base = hashAt === -1 ? link : link.slice(0, hashAt);
        var fragment = hashAt === -1 ? '' : link.slice(hashAt);
        var queryAt = base.indexOf('?');
        var path = queryAt === -1 ? base : base.slice(0, queryAt);
        var params = (queryAt === -1 ? '' : base.slice(queryAt + 1)).split('&').filter(function (p) {
            return p && !/^for(=|$)/i.test(p);
        });
        params.push('for=' + tag);
        return path + '?' + params.join('&') + fragment;
    }

    function copy(button, text) {
        var label = button.getAttribute('data-label') || button.textContent;
        button.setAttribute('data-label', label);
        function done() {
            button.textContent = 'Copied';
            button.setAttribute('data-copied', 'true');
            setTimeout(function () {
                button.textContent = button.getAttribute('data-label');
                button.removeAttribute('data-copied');
            }, 1600);
        }
        function fallback() {
            var area = document.createElement('textarea');
            area.value = text;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            try { if (document.execCommand('copy')) done(); } catch (e) {}
            document.body.removeChild(area);
        }
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
        else fallback();
    }

    function setLabel(button, label) {
        button.setAttribute('data-label', label);
        if (!button.hasAttribute('data-copied')) button.textContent = label;
    }

    function render() {
        var parsed = parseLink(linkInput.value);
        var term = search.value.trim().toLowerCase();
        var shown = 0;
        rows.forEach(function (row) {
            var match = !term || row.getAttribute('data-search').indexOf(term) !== -1;
            row.hidden = !match;
            if (match) shown++;
            var box = row.querySelector('.sra-tag-link');
            var button = row.querySelector('.sra-copy');
            if (parsed.url) {
                box.querySelector('code').textContent = withFor(parsed.url, row.getAttribute('data-tag'));
                box.hidden = false;
                setLabel(button, 'Copy link');
            } else {
                box.hidden = true;
                setLabel(button, 'Copy tag');
            }
        });
        empty.hidden = shown !== 0;

        var tag = custom.value.trim();
        if (tag && parsed.url) {
            customLink.querySelector('code').textContent = withFor(parsed.url, tag);
            customLink.hidden = false;
        } else {
            customLink.hidden = true;
        }

        var count = 'Showing ' + shown + ' of ' + rows.length + ' platforms.';
        status.textContent = parsed.error
            ? parsed.error + ' ' + count
            : (parsed.url ? count + ' Each link below is ready to paste into your email.' : count + ' Paste your report link above to get complete links.');
    }

    list.addEventListener('click', function (event) {
        var button = event.target.closest('.sra-copy');
        if (!button) return;
        var row = button.closest('.sra-tag-row');
        var box = row.querySelector('.sra-tag-link');
        copy(button, box.hidden ? row.getAttribute('data-tag') : box.querySelector('code').textContent);
    });
    customLink.querySelector('.sra-copy').addEventListener('click', function (event) {
        copy(event.currentTarget, customLink.querySelector('code').textContent);
    });
    [linkInput, search, custom].forEach(function (el) { el.addEventListener('input', render); });
    render();
})();
(function () {
    'use strict';

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
