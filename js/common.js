/* Shared helpers - plain ES5, no fetch/Promise/let/const/arrow functions,
   written to run on old WebKit (iOS 6 Safari / iPod touch 4). */

function $(id) {
    return document.getElementById(id);
}

function on(el, ev, fn) {
    if (el.addEventListener) {
        el.addEventListener(ev, fn, false);
    } else if (el.attachEvent) {
        el.attachEvent('on' + ev, fn);
    }
}

/* Stop the page from scrolling/bouncing while playing a canvas game */
function lockScroll(el) {
    on(el, 'touchmove', function (e) {
        e.preventDefault();
    });
}

/* localStorage wrapper - private browsing / disabled storage can throw */
var Store = {
    get: function (key, fallback) {
        try {
            var raw = window.localStorage.getItem(key);
            if (raw === null || raw === undefined) {
                return fallback;
            }
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    },
    set: function (key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }
};

/* Basic swipe detection. onSwipe(direction) fires with 'up'/'down'/'left'/'right' */
function attachSwipe(el, onSwipe) {
    var startX = 0, startY = 0, tracking = false;

    on(el, 'touchstart', function (e) {
        if (e.touches && e.touches.length === 1) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            tracking = true;
        }
    });

    on(el, 'touchend', function (e) {
        if (!tracking) {
            return;
        }
        tracking = false;
        var t = e.changedTouches && e.changedTouches[0];
        if (!t) {
            return;
        }
        var dx = t.clientX - startX;
        var dy = t.clientY - startY;
        var absX = Math.abs(dx);
        var absY = Math.abs(dy);
        var threshold = 20;

        if (absX < threshold && absY < threshold) {
            return;
        }

        if (absX > absY) {
            onSwipe(dx > 0 ? 'right' : 'left');
        } else {
            onSwipe(dy > 0 ? 'down' : 'up');
        }
    });
}

/* Makes an element respond to tap without the ~300ms click delay feeling
   sluggish, and avoids the "ghost click" double fire on old iOS. Tracks
   finger movement so scrolling the page with a finger that started on a
   button (and lifted off it) does not also fire the button's tap. */
function onTap(el, fn) {
    var fired = false;
    var startX = 0, startY = 0, moved = false;
    var TAP_SLOP = 10;

    on(el, 'touchstart', function (e) {
        moved = false;
        if (e.touches && e.touches.length === 1) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
    });
    on(el, 'touchmove', function (e) {
        if (!e.touches || e.touches.length !== 1) { return; }
        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;
        if (Math.sqrt(dx * dx + dy * dy) > TAP_SLOP) { moved = true; }
    });
    on(el, 'touchend', function (e) {
        if (moved) { return; }
        fired = true;
        e.preventDefault();
        fn(e);
    });
    on(el, 'click', function (e) {
        if (fired) {
            fired = false;
            return;
        }
        fn(e);
    });
}
