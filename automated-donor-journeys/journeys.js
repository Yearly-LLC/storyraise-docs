/*
 * Automated donor journeys page: video chapter chips, read from the chapters track so
 * the chips and the video can't disagree. Same behavior as the Storyraise Analytics page.
 */
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
