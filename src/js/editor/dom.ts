declare namespace UgsEditorPlus {
  /** dom's checked lookups: the editor's own, so they're not in the shipped Dom type */
  interface Dom {
    /** The element with this id. Throws if the page doesn't have it or it isn't a `type`. */
    byId<T extends Element>(id: string, type: new () => T): T;
    /** The first element matching the selector (within `context`). Throws like byId(). */
    find<T extends Element>(selector: string, type: new () => T, context?: ParentNode): T;
    /** The nearest ancestor of `ele` (or `ele` itself) matching the selector. Throws like byId(). */
    closest<T extends Element>(ele: Element, selector: string, type: new () => T): T;
  }
}

/**
 * Tiny DOM helpers for the editor (replaces what the editor used to get from jQuery):
 * element lookup, show/hide, CSS-transition fades & slides, draggable dialogs, and
 * a JSON POST via fetch. No inline handlers or innerHTML here, so it's CSP friendly.
 * @class dom
 * @namespace ugsEditorPlus
 * @static
 */
ugsEditorPlus.dom = (function() {
  'use strict';

  /**
   * attach public members to this object
   * @property _public
   * @type JsonObject
   */
  const _public = {} as UgsEditorPlus.Dom;

  /**
   * named speeds, in milliseconds (same as jQuery's)
   * @property SPEEDS
   * @private
   */
  const SPEEDS: Record<string, number> = {
    fast: 200,
    normal: 400,
    slow: 600
  };

  // running animations, per element: [{ props: [names], css: 'opacity 400ms ease', id: timer, fade: 'in'|'out' }]
  // (animations of different properties -- say a fade and a slide -- run side by side)
  const _running = new WeakMap<HTMLElement, UgsEditorPlus.DomAnimation[]>();

  // a CSS property you can read and set by name on `element.style`, such as 'opacity' or 'height'
  type CssProperty = {
    [K in keyof CSSStyleDeclaration]: CSSStyleDeclaration[K] extends string ? K : never;
  }[keyof CSSStyleDeclaration] & string;

  const toMs = function(speed?: UgsEditorPlus.Speed) {
    if (typeof speed === 'number') {
      return speed;
    }
    return (speed && SPEEDS[speed]) || SPEEDS.normal;
  };

  /**
   * First element matching the CSS selector (within optional context element)
   * @method one
   * @param selector {string}
   * @param context {DOM-element} (optional) defaults to document
   * @return {DOM-element|null}
   */
  _public.one = function<E extends HTMLElement = HTMLElement>(selector: string, context?: ParentNode | null) {
    return (context || document).querySelector<E>(selector);
  };

  /**
   * All elements matching the CSS selector, as an Array
   * @method all
   * @param selector {string}
   * @param context {DOM-element} (optional) defaults to document
   * @return {Array}
   */
  _public.all = function(selector: string, context?: ParentNode | null) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  };

  /**
   * Returns ele if it's a `type`; throws otherwise. The editor's markup always has the elements
   * it looks up, so a missing one is a broken page: say which, rather than fail later on null.
   * @method checked
   * @private
   * @param ele {DOM-element|null} what the lookup found
   * @param what {string} the lookup, for the error message
   * @param type {function} constructor, e.g. HTMLInputElement
   * @return {DOM-element}
   */
  const checked = function<T extends Element>(ele: Element | null, what: string, type: new () => T): T {
    if (!(ele instanceof type)) {
      throw new Error('ugsEditorPlus: ' + what + (ele ? ' is not a ' + type.name : ' not found'));
    }
    return ele;
  };

  /**
   * The element with this id; throws if the page doesn't have it or it isn't a `type`
   * @method byId
   * @param id {string}
   * @param type {function} constructor, e.g. HTMLInputElement
   * @return {DOM-element}
   */
  _public.byId = function(id, type) {
    return checked(document.getElementById(id), '#' + id, type);
  };

  /**
   * First element matching the CSS selector (within optional context); throws like byId()
   * @method find
   * @param selector {string}
   * @param type {function} constructor, e.g. HTMLElement
   * @param context {DOM-element} (optional) defaults to document
   * @return {DOM-element}
   */
  _public.find = function(selector, type, context) {
    return checked((context || document).querySelector(selector), '"' + selector + '"', type);
  };

  /**
   * Nearest ancestor of ele (or ele itself) matching the CSS selector; throws like byId()
   * @method closest
   * @param ele {DOM-element}
   * @param selector {string}
   * @param type {function} constructor, e.g. HTMLElement
   * @return {DOM-element}
   */
  _public.closest = function(ele, selector, type) {
    return checked(ele.closest(selector), '"' + selector + '" around ' + ele.tagName, type);
  };

  /**
   * Attaches handler to the event on every element matching the selector (or to the element(s) passed in)
   * @method on
   * @param target {string|DOM-element|Array} CSS selector, element, or array of elements
   * @param eventName {string}
   * @param handler {function}
   */
  _public.on = function(target, eventName, handler) {
    const list = (typeof target === 'string') ? _public.all(target) : (Array.isArray(target) ? target : [target]);
    list.forEach(function(ele: EventTarget | null) {
      if (ele) {
        ele.addEventListener(eventName, handler);
      }
    });
  };

  /**
   * Is the element rendered (displayed)? Same rule as jQuery's ":visible"
   * @method isVisible
   * @param ele {DOM-element}
   * @return {bool}
   */
  _public.isVisible = function(ele) {
    return !!(ele && ele.getClientRects().length);
  };

  const running = function(ele: HTMLElement) {
    return _running.get(ele) || [];
  };

  const setTransition = function(ele: HTMLElement) {
    ele.style.transition = running(ele).map(function(anim) {
      return anim.css;
    }).join(', ');
  };

  // cancel running animations on ele (all of them, or just those touching propNames);
  // leaves the current inline values in place
  const stop = function(ele: HTMLElement, propNames?: string[]) {
    const keep = running(ele).filter(function(anim) {
      const isHit = !propNames || anim.props.some(function(name) {
        return propNames.indexOf(name) >= 0;
      });
      if (isHit) {
        clearTimeout(anim.id);
      }
      return !isHit;
    });
    _running.set(ele, keep);
    setTransition(ele);
  };

  const fadeDirection = function(ele: HTMLElement) {
    const fades = running(ele).filter(function(anim) {
      return !!anim.fade;
    });
    const first = fades[0];
    return first ? first.fade : null;
  };

  const isHidden = function(ele: HTMLElement) {
    return window.getComputedStyle(ele).display === 'none';
  };

  // display the element; when a stylesheet (or class) hides it fall back to "block"
  const display = function(ele: HTMLElement) {
    ele.style.display = '';
    if (isHidden(ele)) {
      ele.style.display = 'block';
    }
  };

  /**
   * Transitions CSS properties from their start to end values.
   * @method animate
   * @param ele {DOM-element}
   * @param props {JSON} property name => [from, to] (or just "to", which starts from the current computed value)
   * @param speed {number|string} milliseconds or "fast", "slow"
   * @param onDone {function} (optional) called when complete (not when interrupted)
   * @return {JSON} the running animation
   */
  _public.animate = function(ele, props, speed, onDone) {
    const ms = toMs(speed);
    const computed = window.getComputedStyle(ele);
    // (Object.keys can't type its result: props' keys are CSS property names, as `animate` documents)
    const names = Object.keys(props) as CssProperty[];

    // snapshot the starting values BEFORE dropping any running transition: [property, start, end]
    const ends = names.map(function(name): [CssProperty, string, string] {
      // (never undefined: `names` are props' own keys)
      const value = props[name] ?? '';
      return Array.isArray(value) ? [name, value[0], value[1]] : [name, computed[name], value];
    });
    // drop running transitions of these properties, jump to the start values
    stop(ele, names);
    ends.forEach(function([name, start]) {
      ele.style[name] = start;
    });
    // force a reflow so the browser "sees" the start values before transitioning
    void ele.offsetWidth;

    const anim: UgsEditorPlus.DomAnimation = {
      props: names,
      css: names.map(function(name) {
        return name.replace(/[A-Z]/g, '-$&').toLowerCase() + ' ' + ms + 'ms ease';
      }).join(', ')
    };
    _running.set(ele, running(ele).concat(anim));
    setTransition(ele);
    ends.forEach(function([name, , end]) {
      ele.style[name] = end;
    });

    anim.id = setTimeout(function() {
      _running.set(ele, running(ele).filter(function(other) {
        return other !== anim;
      }));
      setTransition(ele);
      if (onDone) {
        onDone();
      }
    }, ms);
    return anim;
  };

  /**
   * Display element immediately (cancels any fade)
   * @method show
   * @param ele {DOM-element}
   */
  _public.show = function(ele) {
    if (!ele) {
      return;
    }
    stop(ele);
    ele.style.opacity = '';
    display(ele);
  };

  /**
   * Hide element immediately (cancels any fade)
   * @method hide
   * @param ele {DOM-element}
   */
  _public.hide = function(ele) {
    if (!ele) {
      return;
    }
    stop(ele);
    ele.style.opacity = '';
    ele.style.display = 'none';
  };

  /**
   * show() or hide() element
   * @method toggle
   * @param ele {DOM-element}
   * @param isShow {bool}
   */
  _public.toggle = function(ele, isShow) {
    if (isShow) {
      _public.show(ele);
    }
    else {
      _public.hide(ele);
    }
  };

  /**
   * @method fadeIn
   * @param ele {DOM-element}
   * @param speed {number|string} (optional)
   */
  _public.fadeIn = function(ele, speed) {
    if (!ele || (!isHidden(ele) && fadeDirection(ele) !== 'out')) {
      return;
    }
    const from = isHidden(ele) ? 0 : parseFloat(window.getComputedStyle(ele).opacity);
    display(ele);
    _public.animate(ele, { opacity: [String(from), '1'] }, speed, function() {
      ele.style.opacity = '';
    }).fade = 'in';
  };

  /**
   * @method fadeOut
   * @param ele {DOM-element}
   * @param speed {number|string} (optional)
   */
  _public.fadeOut = function(ele, speed) {
    if (!ele || isHidden(ele) || fadeDirection(ele) === 'out') {
      return;
    }
    _public.animate(ele, { opacity: '0' }, speed, function() {
      ele.style.display = 'none';
      ele.style.opacity = '';
    }).fade = 'out';
  };

  /**
   * fadeIn if hidden (or fading out), fadeOut otherwise
   * @method fadeToggle
   * @param ele {DOM-element}
   * @param speed {number|string} (optional)
   */
  _public.fadeToggle = function(ele, speed) {
    if (isHidden(ele) || fadeDirection(ele) === 'out') {
      _public.fadeIn(ele, speed);
    }
    else {
      _public.fadeOut(ele, speed);
    }
  };

  /**
   * Reveals element by growing its height
   * @method slideDown
   * @param ele {DOM-element}
   * @param speed {number|string} (optional)
   */
  _public.slideDown = function(ele, speed) {
    if (!ele || !isHidden(ele)) {
      return;
    }
    display(ele);
    const height = ele.offsetHeight;
    ele.style.overflow = 'hidden';
    _public.animate(ele, { height: ['0px', height + 'px'] }, speed, function() {
      ele.style.height = '';
      ele.style.overflow = '';
    });
  };

  /**
   * Makes the element (a fixed or absolutely positioned dialog) draggable by its handle.
   * Uses pointer events, so mouse, pen & touch all work.
   * @method draggable
   * @param ele {DOM-element} the element that moves
   * @param handleSelector {string} (optional) CSS selector of the "grab" area inside ele; default: ele itself
   */
  _public.draggable = function(ele, handleSelector) {
    const found = handleSelector ? ele.querySelector(handleSelector) : ele;
    if (!(found instanceof HTMLElement)) {
      return;
    }
    const handle = found;
    let drag: { id: number, dx: number, dy: number } | null = null;

    handle.style.cursor = 'move';
    handle.style.touchAction = 'none';

    handle.addEventListener('pointerdown', function(e) {
      if (e.button !== 0 || (e.target instanceof Element && e.target.closest('a, button, input, select, textarea'))) {
        return;
      }
      const rect = ele.getBoundingClientRect();
      drag = {
        id: e.pointerId,
        dx: e.clientX - rect.left,
        dy: e.clientY - rect.top
      };
      // pin position to top/left so moving doesn't stretch/shrink the box
      ele.style.width = window.getComputedStyle(ele).width;
      ele.style.right = 'auto';
      ele.style.bottom = 'auto';
      ele.style.zIndex = '1000';
      ele.classList.add('draggable');
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    handle.addEventListener('pointermove', function(e) {
      if (!drag || e.pointerId !== drag.id) {
        return;
      }
      // keep the handle on screen
      const left = Math.min(Math.max(e.clientX - drag.dx, 40 - ele.offsetWidth), window.innerWidth - 40);
      const top = Math.min(Math.max(e.clientY - drag.dy, 0), window.innerHeight - 30);
      ele.style.left = left + 'px';
      ele.style.top = top + 'px';
    });

    const endDrag = function(e: PointerEvent) {
      if (!drag || e.pointerId !== drag.id) {
        return;
      }
      drag = null;
      ele.style.zIndex = '';
      ele.classList.remove('draggable');
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  };

  /**
   * POSTs data as JSON, expects JSON back.
   * @method postJson
   * @param uri {string}
   * @param data {JSON}
   * @return {Promise} resolves with the parsed response; rejects on network error, non-2xx status, or bad JSON
   */
  _public.postJson = function(uri, data) {
    return fetch(uri, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(function(response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    });
  };

  /**
   * Fires a custom event on document
   * @method trigger
   * @param eventName {string}
   * @param detail {JSON} available to listeners as event.detail
   */
  _public.trigger = function(eventName, detail) {
    document.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
  };

  // ---------------------------------------
  // return public interface "JSON handle"
  // ---------------------------------------
  return _public;
}());
