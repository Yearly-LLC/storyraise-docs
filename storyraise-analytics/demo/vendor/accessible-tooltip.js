/**
 * Accessible Tooltip — WCAG 2.1 SC 1.4.13 compliant tooltips.
 * Progressively enhances DaisyUI CSS-only tooltips with real DOM elements
 * that are hoverable, dismissible (Escape), and keyboard-accessible.
 * Zero HTML changes required — reads existing data-tip and tooltip-* classes.
 */
(function () {
  'use strict';

  var HIDE_DELAY = 100;
  var uid = 0;
  var activeTooltip = null;
  var openTooltips = new Map();

  injectStyles();
  document.addEventListener('DOMContentLoaded', init);

  /** Attach delegated listeners and start observing mutations. */
  function init() {
    document.addEventListener('mouseenter', onEnter, true);
    document.addEventListener('mouseleave', onLeave, true);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('keydown', onKeydown);
    observeMutations();
    syncForcedTooltips();
  }

  // ── Event Handlers ──────────────────────────────────────────

  /** @param {EventTarget} target — @returns {HTMLElement|null} */
  function findTrigger(target) {
    return target && typeof target.closest === 'function'
      ? target.closest('.tooltip[data-tip]')
      : null;
  }

  /** @param {MouseEvent} e */
  function onEnter(e) {
    var trigger = findTrigger(e.target);
    if (!trigger || !trigger.getAttribute('data-tip')) return;
    cancelHide();
    show(trigger);
  }

  /** @param {MouseEvent} e */
  function onLeave(e) {
    var trigger = findTrigger(e.target);
    if (trigger && activeTooltip && activeTooltip.trigger === trigger) {
      scheduleHide();
    }
  }

  /** @param {FocusEvent} e */
  function onFocusIn(e) {
    var trigger = findTrigger(e.target);
    if (trigger && trigger.getAttribute('data-tip')) show(trigger);
  }

  /** @param {FocusEvent} e */
  function onFocusOut(e) {
    var trigger = findTrigger(e.target);
    if (trigger && activeTooltip && activeTooltip.trigger === trigger) {
      hide(trigger);
      activeTooltip = null;
    }
  }

  /** @param {KeyboardEvent} e */
  function onKeydown(e) {
    if (e.key === 'Escape' && activeTooltip) {
      hide(activeTooltip.trigger);
      activeTooltip = null;
    }
  }

  // ── Show / Hide ─────────────────────────────────────────────

  /** @param {HTMLElement} trigger */
  function show(trigger) {
    if (activeTooltip && activeTooltip.trigger === trigger) return;
    if (activeTooltip) hide(activeTooltip.trigger);

    var el = createTooltipEl(trigger);
    positionTooltip(trigger, el);
    trigger.classList.add('tooltip--enhanced');
    trigger.appendChild(el);
    linkAria(trigger, el.id);

    el.addEventListener('mouseenter', cancelHide);
    el.addEventListener('mouseleave', scheduleHide);

    activeTooltip = { trigger: trigger, el: el, hideTimer: null };
    requestAnimationFrame(function () { el.classList.add('a11y-tooltip--visible'); });
  }

  /** @param {HTMLElement} trigger */
  function hide(trigger) {
    if (!activeTooltip || activeTooltip.trigger !== trigger) return;
    if (openTooltips.has(trigger)) return;
    activeTooltip.el.remove();
    unlinkAria(trigger);
    trigger.classList.remove('tooltip--enhanced');
    activeTooltip = null;
  }

  // ── Timer ───────────────────────────────────────────────────

  function scheduleHide() {
    if (!activeTooltip) return;
    cancelHide();
    var trigger = activeTooltip.trigger;
    activeTooltip.hideTimer = setTimeout(function () {
      hide(trigger);
    }, HIDE_DELAY);
  }

  function cancelHide() {
    if (activeTooltip && activeTooltip.hideTimer) {
      clearTimeout(activeTooltip.hideTimer);
      activeTooltip.hideTimer = null;
    }
  }

  // ── Tooltip Element ─────────────────────────────────────────

  /** @param {HTMLElement} trigger — @returns {HTMLDivElement} */
  function createTooltipEl(trigger) {
    var el = document.createElement('div');
    el.role = 'tooltip';
    el.className = 'a11y-tooltip';
    el.id = 'a11y-tip-' + (++uid);
    el.textContent = trigger.getAttribute('data-tip') || '';
    if (trigger.classList.contains('tooltip-broadcast')) {
      el.classList.add('a11y-tooltip--broadcast');
    }
    return el;
  }

  /** @param {HTMLElement} trigger — @param {HTMLElement} el */
  function positionTooltip(trigger, el) {
    var dir = getDirection(trigger);
    var offset = 'calc(100% + 1px + var(--tooltip-tail, 0px))';

    el.style.top = el.style.bottom = el.style.left = el.style.right = '';
    el.style.transform = '';

    if (dir === 'bottom') {
      el.style.top = offset; el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
    } else if (dir === 'left') {
      el.style.top = '50%'; el.style.right = offset;
      el.style.transform = 'translateY(-50%)';
    } else if (dir === 'right') {
      el.style.top = '50%'; el.style.left = offset;
      el.style.transform = 'translateY(-50%)';
    } else {
      el.style.bottom = offset; el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
    }
  }

  /** @param {HTMLElement} trigger — @returns {string} */
  function getDirection(trigger) {
    if (trigger.classList.contains('tooltip-bottom')) return 'bottom';
    if (trigger.classList.contains('tooltip-left')) return 'left';
    if (trigger.classList.contains('tooltip-right')) return 'right';
    return 'top';
  }

  // ── ARIA ────────────────────────────────────────────────────

  /** @param {HTMLElement} trigger — @param {string} tooltipId */
  function linkAria(trigger, tooltipId) {
    var target = trigger.querySelector('button, [tabindex], a, input, label') || trigger;
    target.setAttribute('aria-describedby', tooltipId);
  }

  /** @param {HTMLElement} trigger */
  function unlinkAria(trigger) {
    var target = trigger.querySelector('[aria-describedby]') || trigger;
    target.removeAttribute('aria-describedby');
  }

  // ── Forced Tooltips (tooltip-open) ──────────────────────────

  function syncForcedTooltips() {
    document.querySelectorAll('.tooltip.tooltip-open[data-tip]').forEach(function (trigger) {
      if (!openTooltips.has(trigger)) showForced(trigger);
    });
    openTooltips.forEach(function (_el, trigger) {
      if (!trigger.classList.contains('tooltip-open')) hideForced(trigger);
    });
  }

  /** @param {HTMLElement} trigger */
  function showForced(trigger) {
    var el = createTooltipEl(trigger);
    positionTooltip(trigger, el);
    trigger.classList.add('tooltip--enhanced');
    trigger.appendChild(el);
    linkAria(trigger, el.id);
    requestAnimationFrame(function () { el.classList.add('a11y-tooltip--visible'); });
    openTooltips.set(trigger, el);
  }

  /** @param {HTMLElement} trigger */
  function hideForced(trigger) {
    var el = openTooltips.get(trigger);
    if (el) el.remove();
    unlinkAria(trigger);
    openTooltips.delete(trigger);
    if (!activeTooltip || activeTooltip.trigger !== trigger) {
      trigger.classList.remove('tooltip--enhanced');
    }
  }

  // ── MutationObserver ────────────────────────────────────────

  function observeMutations() {
    var obs = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.attributeName === 'data-tip') updateText(m.target);
        if (m.attributeName === 'class') handleClassChange(m.target);
      }
    });
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-tip', 'class'],
      subtree: true
    });
  }

  /** @param {HTMLElement} el */
  function updateText(el) {
    var text = el.getAttribute('data-tip') || '';
    if (activeTooltip && activeTooltip.trigger === el) {
      activeTooltip.el.textContent = text;
    }
    if (openTooltips.has(el)) {
      openTooltips.get(el).textContent = text;
    }
  }

  /** @param {HTMLElement} el */
  function handleClassChange(el) {
    if (!el.hasAttribute('data-tip')) return;
    if (el.classList.contains('tooltip') && el.classList.contains('tooltip-open')) {
      if (!openTooltips.has(el)) showForced(el);
    } else if (openTooltips.has(el)) {
      hideForced(el);
    }
    if (activeTooltip && activeTooltip.trigger === el && !el.classList.contains('tooltip')) {
      hide(el);
      activeTooltip = null;
    }
  }

  // ── Injected Styles ─────────────────────────────────────────

  function injectStyles() {
    var css = [
      '.tooltip--enhanced::before,',
      '.tooltip--enhanced::after {',
      '  opacity: 0 !important;',
      '  pointer-events: none !important;',
      '  transition: none !important;',
      '}',
      '.tooltip--enhanced.tooltip-open::before,',
      '.tooltip--enhanced.tooltip-open::after {',
      '  opacity: 0 !important;',
      '}',
      '[role="tooltip"].a11y-tooltip {',
      '  position: absolute;',
      '  z-index: 999;',
      '  max-width: 20rem;',
      '  width: max-content;',
      '  border-radius: 0.25rem;',
      '  padding: 0.25rem 0.5rem;',
      '  font-size: 0.875rem;',
      '  line-height: 1.25rem;',
      '  background-color: rgba(var(--buiilderBaseRGB, 27,29,33), 1);',
      '  color: rgb(198, 223, 255);',
      '  font-weight: 600;',
      '  pointer-events: auto;',
      '  user-select: text;',
      '  cursor: text;',
      '  opacity: 0;',
      '  transition: opacity 0.15s ease;',
      '}',
      '[role="tooltip"].a11y-tooltip.a11y-tooltip--visible {',
      '  opacity: 1;',
      '}',
      '[role="tooltip"].a11y-tooltip--broadcast {',
      '  background-color: #fff !important;',
      '  color: #000 !important;',
      '  max-width: 25rem !important;',
      '  text-align: left;',
      '  padding: 0.75rem 1rem;',
      '  border-radius: 0.75rem;',
      '  box-shadow: 0 1rem 2rem #000;',
      '  font-weight: 600;',
      '}'
    ].join('\n');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }
})();
