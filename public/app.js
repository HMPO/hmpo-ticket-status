'use strict';

window.addEventListener('load', function () {
    function removeClass(className) {
        var els = document.querySelectorAll && document.querySelectorAll('.' + className);
        for (var i = 0; els && i < els.length; i++) {
            var el = els[i];
            var classNames = el.className.split(' ');
            classNames = classNames.filter(function (name) {
                return name !== className;
            });
            el.className = classNames.join(' ');
        }
    }

    function addClass(id, className) {
        var el = document.getElementById(id);
        if (!el) return;
        var classNames = el.className.split(' ');
        classNames.push(className);
        el.className = classNames.join(' ');
    }

    function addHighlight(className) {
        var hash = window.location.hash.substr(1);
        addClass('release-' + hash, className);
    }

    window.addEventListener('hashchange', function () {
        removeClass('highlight');
        addHighlight('highlight');
    });

    addHighlight('highlight');

    document.addEventListener('click', function (e) {
        let target = e.target.id || (e.target.parentNode && e.target.parentNode.id) || e.target.tagName;
        if (target && target.match(/^release-/)) window.location.hash = target.substr(8);
        if (target === 'HTML') window.location.hash = '';
    });
});

