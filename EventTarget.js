(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(factory((global.EventTargeter = {})));
}(this, (function (exports) { 'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

exports.ShimDOMException = void 0;
var phases = {
    NONE: 0,
    CAPTURING_PHASE: 1,
    AT_TARGET: 2,
    BUBBLING_PHASE: 3
};

if (typeof DOMException === 'undefined') {
    // Todo: Better polyfill (if even needed here)
    exports.ShimDOMException = function DOMException(msg, name) {
        // No need for `toString` as same as for `Error`
        var err = new Error(msg);
        err.name = name;
        return err;
    };
} else {
    exports.ShimDOMException = DOMException;
}

var ev = new WeakMap();
var evCfg = new WeakMap();

// Todo: Set _ev argument outside of this function
/**
* We use an adapter class rather than a proxy not only for compatibility but also since we have to clone
* native event properties anyways in order to properly set `target`, etc.
* @note The regular DOM method `dispatchEvent` won't work with this polyfill as it expects a native event
*/
var ShimEvent = function Event(type) {
    // eslint-disable-line no-native-reassign
    // For WebIDL checks of function's `length`, we check `arguments` for the optional arguments
    this[Symbol.toStringTag] = 'Event';
    this.toString = function () {
        return '[object Event]';
    };
    var evInit = arguments[1];
    var _ev = arguments[2];
    if (!arguments.length) {
        throw new TypeError("Failed to construct 'Event': 1 argument required, but only 0 present.");
    }
    evInit = evInit || {};
    _ev = _ev || {};

    var _evCfg = {};
    if ('composed' in evInit) {
        _evCfg.composed = evInit.composed;
    }

    // _evCfg.isTrusted = true; // We are not always using this for user-created events
    // _evCfg.timeStamp = new Date().valueOf(); // This is no longer a timestamp, but monotonic (elapsed?)

    ev.set(this, _ev);
    evCfg.set(this, _evCfg);
    this.initEvent(type, evInit.bubbles, evInit.cancelable);
    Object.defineProperties(this, ['target', 'currentTarget', 'eventPhase', 'defaultPrevented'].reduce(function (obj, prop) {
        obj[prop] = {
            get: function get$$1() {
                return (/* prop in _evCfg && */_evCfg[prop] !== undefined ? _evCfg[prop] : prop in _ev ? _ev[prop] :
                    // Defaults
                    prop === 'eventPhase' ? 0 : prop === 'defaultPrevented' ? false : null
                );
            }
        };
        return obj;
    }, {}));
    var props = [
    // Event
    'type', 'bubbles', 'cancelable', // Defaults to false
    'isTrusted', 'timeStamp', 'initEvent',
    // Other event properties (not used by our code)
    'composedPath', 'composed'];
    if (this.toString() === '[object CustomEvent]') {
        props.push('detail', 'initCustomEvent');
    }

    Object.defineProperties(this, props.reduce(function (obj, prop) {
        obj[prop] = {
            get: function get$$1() {
                return prop in _evCfg ? _evCfg[prop] : prop in _ev ? _ev[prop] : ['bubbles', 'cancelable', 'composed'].includes(prop) ? false : undefined;
            }
        };
        return obj;
    }, {}));
};

ShimEvent.prototype.preventDefault = function () {
    if (!(this instanceof ShimEvent)) {
        throw new TypeError('Illegal invocation');
    }
    var _ev = ev.get(this);
    var _evCfg = evCfg.get(this);
    if (this.cancelable && !_evCfg._passive) {
        _evCfg.defaultPrevented = true;
        if (typeof _ev.preventDefault === 'function') {
            // Prevent any predefined defaults
            _ev.preventDefault();
        }
    }
};
ShimEvent.prototype.stopImmediatePropagation = function () {
    var _evCfg = evCfg.get(this);
    _evCfg._stopImmediatePropagation = true;
};
ShimEvent.prototype.stopPropagation = function () {
    var _evCfg = evCfg.get(this);
    _evCfg._stopPropagation = true;
};
ShimEvent.prototype.initEvent = function (type, bubbles, cancelable) {
    // Chrome currently has function length 1 only but WebIDL says 3
    // const bubbles = arguments[1];
    // const cancelable = arguments[2];
    var _evCfg = evCfg.get(this);

    if (_evCfg._dispatched) {
        return;
    }

    _evCfg.type = type;
    if (bubbles !== undefined) {
        _evCfg.bubbles = bubbles;
    }
    if (cancelable !== undefined) {
        _evCfg.cancelable = cancelable;
    }
};
['type', 'target', 'currentTarget'].forEach(function (prop) {
    Object.defineProperty(ShimEvent.prototype, prop, {
        enumerable: true,
        configurable: true,
        get: function get$$1() {
            throw new TypeError('Illegal invocation');
        }
    });
});
['eventPhase', 'defaultPrevented', 'bubbles', 'cancelable', 'timeStamp'].forEach(function (prop) {
    Object.defineProperty(ShimEvent.prototype, prop, {
        enumerable: true,
        configurable: true,
        get: function get$$1() {
            throw new TypeError('Illegal invocation');
        }
    });
});
['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE'].forEach(function (prop, i) {
    Object.defineProperty(ShimEvent, prop, {
        enumerable: true,
        writable: false,
        value: i
    });
    Object.defineProperty(ShimEvent.prototype, prop, {
        writable: false,
        value: i
    });
});
ShimEvent[Symbol.toStringTag] = 'Function';
ShimEvent.prototype[Symbol.toStringTag] = 'EventPrototype';
Object.defineProperty(ShimEvent, 'prototype', {
    writable: false
});

var ShimCustomEvent = function CustomEvent(type) {
    var evInit = arguments[1];
    var _ev = arguments[2];
    ShimEvent.call(this, type, evInit, _ev);
    this[Symbol.toStringTag] = 'CustomEvent';
    this.toString = function () {
        return '[object CustomEvent]';
    };
    // var _evCfg = evCfg.get(this);
    evInit = evInit || {};
    this.initCustomEvent(type, evInit.bubbles, evInit.cancelable, 'detail' in evInit ? evInit.detail : null);
};
Object.defineProperty(ShimCustomEvent.prototype, 'constructor', {
    enumerable: false,
    writable: true,
    configurable: true,
    value: ShimCustomEvent
});
ShimCustomEvent.prototype.initCustomEvent = function (type, bubbles, cancelable, detail) {
    if (!(this instanceof ShimCustomEvent)) {
        throw new TypeError('Illegal invocation');
    }
    var _evCfg = evCfg.get(this);
    ShimCustomEvent.call(this, type, {
        bubbles: bubbles, cancelable: cancelable, detail: detail
    }, arguments[4]);

    if (_evCfg._dispatched) {
        return;
    }

    if (detail !== undefined) {
        _evCfg.detail = detail;
    }
    Object.defineProperty(this, 'detail', {
        get: function get$$1() {
            return _evCfg.detail;
        }
    });
};
ShimCustomEvent[Symbol.toStringTag] = 'Function';
ShimCustomEvent.prototype[Symbol.toStringTag] = 'CustomEventPrototype';

Object.defineProperty(ShimCustomEvent.prototype, 'detail', {
    enumerable: true,
    configurable: true,
    get: function get$$1() {
        throw new TypeError('Illegal invocation');
    }
});
Object.defineProperty(ShimCustomEvent, 'prototype', {
    writable: false
});

function copyEvent(ev) {
    if ('detail' in ev) {
        return new ShimCustomEvent(ev.type, { bubbles: ev.bubbles, cancelable: ev.cancelable, detail: ev.detail }, ev);
    }
    return new ShimEvent(ev.type, { bubbles: ev.bubbles, cancelable: ev.cancelable }, ev);
}

function getListenersOptions(listeners, type, options) {
    var listenersByType = listeners[type];
    if (listenersByType === undefined) listeners[type] = listenersByType = [];
    options = typeof options === 'boolean' ? { capture: options } : options || {};
    var stringifiedOptions = JSON.stringify(options);
    var listenersByTypeOptions = listenersByType.filter(function (obj) {
        return stringifiedOptions === JSON.stringify(obj.options);
    });
    return { listenersByTypeOptions: listenersByTypeOptions, options: options, listenersByType: listenersByType };
}

var methods = {
    addListener: function addListener(listeners, listener, type, options) {
        var listenerOptions = getListenersOptions(listeners, type, options);
        var listenersByTypeOptions = listenerOptions.listenersByTypeOptions;
        options = listenerOptions.options;
        var listenersByType = listenerOptions.listenersByType;

        if (listenersByTypeOptions.some(function (l) {
            return l.listener === listener;
        })) return;
        listenersByType.push({ listener: listener, options: options });
    },
    removeListener: function removeListener(listeners, listener, type, options) {
        var listenerOptions = getListenersOptions(listeners, type, options);
        var listenersByType = listenerOptions.listenersByType;
        var stringifiedOptions = JSON.stringify(listenerOptions.options);

        listenersByType.some(function (l, i) {
            if (l.listener === listener && stringifiedOptions === JSON.stringify(l.options)) {
                listenersByType.splice(i, 1);
                if (!listenersByType.length) delete listeners[type];
                return true;
            }
        });
    },
    hasListener: function hasListener(listeners, listener, type, options) {
        var listenerOptions = getListenersOptions(listeners, type, options);
        var listenersByTypeOptions = listenerOptions.listenersByTypeOptions;
        return listenersByTypeOptions.some(function (l) {
            return l.listener === listener;
        });
    }
};

function EventTarget() {
    throw new TypeError('Illegal constructor');
}

Object.assign(EventTarget.prototype, ['Early', '', 'Late', 'Default'].reduce(function (obj, listenerType) {
    ['add', 'remove', 'has'].forEach(function (method) {
        obj[method + listenerType + 'EventListener'] = function (type, listener) {
            var options = arguments[2]; // We keep the listener `length` as per WebIDL
            if (arguments.length < 2) throw new TypeError('2 or more arguments required');
            if (typeof type !== 'string') {
                throw new exports.ShimDOMException('UNSPECIFIED_EVENT_TYPE_ERR', 'UNSPECIFIED_EVENT_TYPE_ERR');
            }
            if (listener.handleEvent) {
                listener = listener.handleEvent.bind(listener);
            }
            var arrStr = '_' + listenerType.toLowerCase() + (listenerType === '' ? 'l' : 'L') + 'isteners';
            if (!this[arrStr]) {
                Object.defineProperty(this, arrStr, { value: {} });
            }
            return methods[method + 'Listener'](this[arrStr], listener, type, options);
        };
    });
    return obj;
}, {}));

Object.assign(EventTarget.prototype, {
    __setOptions: function __setOptions(customOptions) {
        customOptions = customOptions || {};
        // Todo: Make into event properties?
        this._defaultSync = customOptions.defaultSync;
        this._extraProperties = customOptions.extraProperties || [];
        if (customOptions.legacyOutputDidListenersThrowFlag) {
            // IndexedDB
            this._legacyOutputDidListenersThrowCheck = true;
            this._extraProperties.push('__legacyOutputDidListenersThrowError');
        }
    },
    dispatchEvent: function dispatchEvent(ev) {
        return this._dispatchEvent(ev, true);
    },
    _dispatchEvent: function _dispatchEvent(ev, setTarget) {
        var _this = this;

        ['early', '', 'late', 'default'].forEach(function (listenerType) {
            var arrStr = '_' + listenerType + (listenerType === '' ? 'l' : 'L') + 'isteners';
            if (!_this[arrStr]) {
                Object.defineProperty(_this, arrStr, { value: {} });
            }
        });

        var _evCfg = evCfg.get(ev);
        if (_evCfg && setTarget && _evCfg._dispatched) {
            throw new exports.ShimDOMException('The object is in an invalid state.', 'InvalidStateError');
        }

        var eventCopy = void 0;
        if (_evCfg) {
            eventCopy = ev;
        } else {
            eventCopy = copyEvent(ev);
            _evCfg = evCfg.get(eventCopy);
            _evCfg._dispatched = true;
            this._extraProperties.forEach(function (prop) {
                if (prop in ev) {
                    eventCopy[prop] = ev[prop]; // Todo: Put internal to `ShimEvent`?
                }
            });
        }
        var _eventCopy = eventCopy,
            type = _eventCopy.type;


        function finishEventDispatch() {
            _evCfg.eventPhase = phases.NONE;
            _evCfg.currentTarget = null;
            delete _evCfg._children;
        }
        function invokeDefaults() {
            // Ignore stopPropagation from defaults
            _evCfg._stopImmediatePropagation = undefined;
            _evCfg._stopPropagation = undefined;
            // We check here for whether we should invoke since may have changed since timeout (if late listener prevented default)
            if (!eventCopy.defaultPrevented || !_evCfg.cancelable) {
                // 2nd check should be redundant
                _evCfg.eventPhase = phases.AT_TARGET; // Temporarily set before we invoke default listeners
                eventCopy.target.invokeCurrentListeners(eventCopy.target._defaultListeners, eventCopy, type);
            }
            finishEventDispatch();
        }
        var continueEventDispatch = function continueEventDispatch() {
            // Ignore stop propagation of user now
            _evCfg._stopImmediatePropagation = undefined;
            _evCfg._stopPropagation = undefined;
            if (!_this._defaultSync) {
                setTimeout(invokeDefaults, 0);
            } else invokeDefaults();

            _evCfg.eventPhase = phases.AT_TARGET; // Temporarily set before we invoke late listeners
            // Sync default might have stopped
            if (!_evCfg._stopPropagation) {
                _evCfg._stopImmediatePropagation = undefined;
                _evCfg._stopPropagation = undefined;
                // We could allow stopPropagation by only executing upon (_evCfg._stopPropagation)
                eventCopy.target.invokeCurrentListeners(eventCopy.target._lateListeners, eventCopy, type);
            }
            finishEventDispatch();

            return !eventCopy.defaultPrevented;
        };

        if (setTarget) _evCfg.target = this;

        switch (eventCopy.eventPhase) {
            default:case phases.NONE:

                _evCfg.eventPhase = phases.AT_TARGET; // Temporarily set before we invoke early listeners
                this.invokeCurrentListeners(this._earlyListeners, eventCopy, type);
                if (!this.__getParent) {
                    _evCfg.eventPhase = phases.AT_TARGET;
                    return this._dispatchEvent(eventCopy, false);
                }

                var par = this;
                var root = this;
                while (par.__getParent && (par = par.__getParent()) !== null) {
                    if (!_evCfg._children) {
                        _evCfg._children = [];
                    }
                    _evCfg._children.push(root);
                    root = par;
                }
                root._defaultSync = this._defaultSync;
                _evCfg.eventPhase = phases.CAPTURING_PHASE;
                return root._dispatchEvent(eventCopy, false);
            case phases.CAPTURING_PHASE:
                if (_evCfg._stopPropagation) {
                    return continueEventDispatch();
                }
                this.invokeCurrentListeners(this._listeners, eventCopy, type);
                var child = _evCfg._children && _evCfg._children.length && _evCfg._children.pop();
                if (!child || child === eventCopy.target) {
                    _evCfg.eventPhase = phases.AT_TARGET;
                }
                if (child) child._defaultSync = this._defaultSync;
                return (child || this)._dispatchEvent(eventCopy, false);
            case phases.AT_TARGET:
                if (_evCfg._stopPropagation) {
                    return continueEventDispatch();
                }
                this.invokeCurrentListeners(this._listeners, eventCopy, type, true);
                if (!_evCfg.bubbles) {
                    return continueEventDispatch();
                }
                _evCfg.eventPhase = phases.BUBBLING_PHASE;
                return this._dispatchEvent(eventCopy, false);
            case phases.BUBBLING_PHASE:
                if (_evCfg._stopPropagation) {
                    return continueEventDispatch();
                }
                var parent = this.__getParent && this.__getParent();
                if (!parent) {
                    return continueEventDispatch();
                }
                parent.invokeCurrentListeners(parent._listeners, eventCopy, type, true);
                parent._defaultSync = this._defaultSync;
                return parent._dispatchEvent(eventCopy, false);
        }
    },
    invokeCurrentListeners: function invokeCurrentListeners(listeners, eventCopy, type, checkOnListeners) {
        var _this2 = this;

        var _evCfg = evCfg.get(eventCopy);
        _evCfg.currentTarget = this;

        var listOpts = getListenersOptions(listeners, type, {});
        var listenersByType = listOpts.listenersByType.concat();
        var dummyIPos = listenersByType.length ? 1 : 0;

        listenersByType.some(function (listenerObj, i) {
            var onListener = checkOnListeners ? _this2['on' + type] : null;
            if (_evCfg._stopImmediatePropagation) return true;
            if (i === dummyIPos && typeof onListener === 'function') {
                // We don't splice this in as could be overwritten; executes here per
                //    https://html.spec.whatwg.org/multipage/webappapis.html#event-handler-attributes:event-handlers-14
                _this2.tryCatch(eventCopy, function () {
                    var ret = onListener.call(eventCopy.currentTarget, eventCopy);
                    if (ret === false) {
                        eventCopy.preventDefault();
                    }
                });
            }
            var options = listenerObj.options;
            var once = options.once,
                passive = options.passive,
                capture = options.capture;


            _evCfg._passive = passive;

            if (capture && eventCopy.target !== eventCopy.currentTarget && eventCopy.eventPhase === phases.CAPTURING_PHASE || eventCopy.eventPhase === phases.AT_TARGET || !capture && eventCopy.target !== eventCopy.currentTarget && eventCopy.eventPhase === phases.BUBBLING_PHASE) {
                var listener = listenerObj.listener;
                _this2.tryCatch(eventCopy, function () {
                    listener.call(eventCopy.currentTarget, eventCopy);
                });
                if (once) {
                    _this2.removeEventListener(type, listener, options);
                }
            }
        });
        this.tryCatch(eventCopy, function () {
            var onListener = checkOnListeners ? _this2['on' + type] : null;
            if (typeof onListener === 'function' && listenersByType.length < 2) {
                var ret = onListener.call(eventCopy.currentTarget, eventCopy); // Won't have executed if too short
                if (ret === false) {
                    eventCopy.preventDefault();
                }
            }
        });

        return !eventCopy.defaultPrevented;
    },
    tryCatch: function tryCatch(ev, cb) {
        try {
            // Per MDN: Exceptions thrown by event handlers are reported
            //    as uncaught exceptions; the event handlers run on a nested
            //    callstack: they block the caller until they complete, but
            //    exceptions do not propagate to the caller.
            cb();
        } catch (err) {
            this.triggerErrorEvent(err, ev);
        }
    },
    triggerErrorEvent: function triggerErrorEvent(err, ev) {
        var error = err;
        if (typeof err === 'string') {
            error = new Error('Uncaught exception: ' + err);
        }

        var triggerGlobalErrorEvent = void 0;
        var useNodeImpl = false;
        if (typeof window === 'undefined' || typeof ErrorEvent === 'undefined' || window && (typeof window === 'undefined' ? 'undefined' : _typeof(window)) === 'object' && !window.dispatchEvent) {
            useNodeImpl = true;
            triggerGlobalErrorEvent = function triggerGlobalErrorEvent() {
                setTimeout(function () {
                    // Node won't be able to catch in this way if we throw in the main thread
                    // console.log(err); // Should we auto-log for user?
                    throw error; // Let user listen to `process.on('uncaughtException', (err) => {});`
                });
            };
        } else {
            triggerGlobalErrorEvent = function triggerGlobalErrorEvent() {
                // See https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onerror
                //     and https://github.com/w3c/IndexedDB/issues/49

                // Note that a regular Event will properly trigger
                //     `window.addEventListener('error')` handlers, but it will not trigger
                //     `window.onerror` as per https://html.spec.whatwg.org/multipage/webappapis.html#handler-onerror
                // Note also that the following line won't handle `window.addEventListener` handlers
                //        if (window.onerror) window.onerror(error.message, err.fileName, err.lineNumber, error.columnNumber, error);

                // `ErrorEvent` properly triggers `window.onerror` and `window.addEventListener('error')` handlers
                var errEv = new ErrorEvent('error', {
                    error: err,
                    message: error.message || '',
                    // We can't get the actually useful user's values!
                    filename: error.fileName || '',
                    lineno: error.lineNumber || 0,
                    colno: error.columnNumber || 0
                });
                window.dispatchEvent(errEv);
                // console.log(err); // Should we auto-log for user?
            };
        }

        // Todo: This really should always run here but as we can't set the global
        //     `window` (e.g., using jsdom) since `setGlobalVars` becomes unable to
        //     shim `indexedDB` in such a case currently (apparently due to
        //     <https://github.com/axemclion/IndexedDBShim/issues/280>), we can't
        //     avoid the above Node implementation (which, while providing some
        //     fallback mechanism, is unstable)
        if (!useNodeImpl || !this._legacyOutputDidListenersThrowCheck) triggerGlobalErrorEvent();

        // See https://dom.spec.whatwg.org/#concept-event-listener-inner-invoke and
        //    https://github.com/w3c/IndexedDB/issues/140 (also https://github.com/w3c/IndexedDB/issues/49 )
        if (this._legacyOutputDidListenersThrowCheck) {
            ev.__legacyOutputDidListenersThrowError = error;
        }
    }
});
EventTarget.prototype[Symbol.toStringTag] = 'EventTargetPrototype';

Object.defineProperty(EventTarget, 'prototype', {
    writable: false
});

var ShimEventTarget = EventTarget;
var EventTargetFactory = {
    createInstance: function createInstance(customOptions) {
        function EventTarget() {
            this.__setOptions(customOptions);
        }
        EventTarget.prototype = ShimEventTarget.prototype;
        return new EventTarget();
    }
};

EventTarget.ShimEvent = ShimEvent;
EventTarget.ShimCustomEvent = ShimCustomEvent;
EventTarget.ShimDOMException = exports.ShimDOMException;
EventTarget.ShimEventTarget = EventTarget;
EventTarget.EventTargetFactory = EventTargetFactory;

function setPrototypeOfCustomEvent() {
    // TODO: IDL needs but reported as slow!
    Object.setPrototypeOf(ShimCustomEvent, ShimEvent);
    Object.setPrototypeOf(ShimCustomEvent.prototype, ShimEvent.prototype);
}

exports.setPrototypeOfCustomEvent = setPrototypeOfCustomEvent;
exports.EventTargetFactory = EventTargetFactory;
exports.ShimEventTarget = EventTarget;
exports.ShimEvent = ShimEvent;
exports.ShimCustomEvent = ShimCustomEvent;

Object.defineProperty(exports, '__esModule', { value: true });

})));
