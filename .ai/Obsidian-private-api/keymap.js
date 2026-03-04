// scope cb to get the scope on active leaf
i.scope = new Fg(t.scope, (function () {
    var e = i.activeLeaf;
    return e && e.view && e.view.scope ? e.view.scope : null
}
));

// Likely keymap
Ng = function () {
    function e() {
        this.modifiers = "",
            this.rootScope = new Og,
            this.scope = this.rootScope,
            this.prevScopes = [],
            window.addEventListener("keydown", this.onKeyEvent.bind(this), !0),
            window.addEventListener("focusin", this.onFocusIn.bind(this))
    }
    return e.init = function () {
        return e.global || (e.global = new e),
            e.global
    }
        ,
        e.prototype.getRootScope = function () {
            return this.rootScope
        }
        ,
        e.prototype.pushScope = function (e) {
            this.scope !== e && (this.prevScopes.push(this.scope),
                this.scope = e)
        }
        ,
        e.prototype.popScope = function (e) {
            e !== this.rootScope && (this.scope === e ? this.scope = this.prevScopes.pop() || this.rootScope : this.prevScopes.remove(e))
        }
        ,
        e.prototype.onKeyEvent = function (t) {
            this.updateModifiers(t);
            var n = this.scope;
            if (n) {
                var i = Ag(t);
                if (!e.isModifierKey(i)) {
                    var r = Pg(t);
                    54 === t.which && "^" == t.key && "KeyI" === t.code && (r = "KeyI");
                    var o = {
                        modifiers: this.modifiers,
                        key: i,
                        vkey: r
                    };
                    return !1 === n.handleKey(t, o) ? (t.preventDefault(),
                        t.stopPropagation(),
                        !1) : void 0
                }
            }
        }
        ,
        e.prototype.onFocusIn = function (e) {
            var t = this
                , n = this.scope;
            if (n && n.tabFocusContainerEl) {
                var i = n.tabFocusContainerEl
                    , r = e.targetNode;
                r && r !== activeDocument.body && r.instanceOf(Element) && !i.contains(r) && setTimeout((function () {
                    if (t.scope === n && !Jv(i, {
                        preventScroll: !0
                    })) {
                        var e = activeDocument.activeElement;
                        e && e.instanceOf(HTMLElement) && e.blur()
                    }
                }
                ), 0)
            }
        }
        ,
        e.prototype.updateModifiers = function (t) {
            this.modifiers = e.getModifiers(t)
        }
        ,
        e.getModifiers = function (t) {
            var n = [];
            return t.ctrlKey && n.push("Ctrl"),
                t.metaKey && n.push("Meta"),
                t.altKey && n.push("Alt"),
                t.shiftKey && n.push("Shift"),
                e.compileModifiers(n)
        }
        ,
        e.compileModifiers = function (e) {
            return e.map((function (e) {
                return "Mod" === e ? "macOS" === Vl ? "Meta" : "Ctrl" : e
            }
            )).sort().join(",")
        }
        ,
        e.decompileModifiers = function (e) {
            return e.split(",").map((function (e) {
                return "macOS" === Vl && "Meta" === e || "macOS" !== Vl && "Ctrl" === e ? "Mod" : e
            }
            )).filter((function (e) {
                return e
            }
            ))
        }
        ,
        e.isModifierKey = function (e) {
            return "Control" === e || "Alt" === e || "Shift" === e || "OS" === e || "Meta" === e
        }
        ,
        e.prototype.matchModifiers = function (e) {
            return this.modifiers === e
        }
        ,
        e.prototype.hasModifier = function (t) {
            return e.decompileModifiers(this.modifiers).contains(t)
        }
        ,
        e.isModifier = function (e, t) {
            return "Ctrl" === t ? e.ctrlKey : "Meta" === t ? e.metaKey : "Alt" === t ? e.altKey : "Shift" === t ? e.shiftKey : "Mod" === t && ("macOS" === Vl ? e.metaKey : e.ctrlKey)
        }
        ,
        e.isMatch = function (e, t) {
            var n = e.modifiers
                , i = e.key;
            return (null === n || n === t.modifiers) && (!i || (i === t.vkey || !(!t.key || i.toLowerCase() !== t.key.toLowerCase())))
        }
        ,
        e.isModEvent = function (t) {
            return !!t && (function (e) {
                return (e.instanceOf(MouseEvent) || e.instanceOf(PointerEvent)) && 1 === e.button
            }(t) ? "tab" : !!e.isModifier(t, "Mod") && (e.isModifier(t, "Alt") ? e.isModifier(t, "Shift") ? "window" : "split" : "tab"))
        }
        ,
        e
}();

// Scope
var Og = function () {
    function e(e) {
        this.tabFocusContainerEl = null,
            this.keys = [],
            this.parent = e
    }
    return e.prototype.register = function (e, t, n) {
        var i = {
            scope: this,
            modifiers: e ? Ng.compileModifiers(e) : null,
            key: t,
            func: n
        };
        return this.keys.push(i),
            i
    }
        ,
        e.prototype.unregister = function (e) {
            this.keys.remove(e)
        }
        ,
        e.prototype.setTabFocusContainerEl = function (e) {
            this.tabFocusContainerEl = e
        }
        ,
        e.prototype.handleKey = function (e, t) {
            for (var n = 0, i = this.keys; n < i.length; n++) {
                var r = i[n];
                if (Ng.isMatch(r, t)) {
                    var o = r.func(e, t);
                    if (void 0 !== o)
                        return o;
                    if (null !== r.key || null !== r.modifiers)
                        return o
                }
            }
            if (this.parent)
                return this.parent.handleKey(e, t)
        }
        ,
        e
}()
Fg = function (e) {
    function t(t, n) {
        var i = e.call(this, t) || this;
        return i.cb = n,
            i
    }
    return m(t, e),
        t.prototype.handleKey = function (t, n) {
            var i = this.cb();
            return i ? i.handleKey(t, n) : e.prototype.handleKey.call(this, t, n)
        }
        ,
        t
}(Og)
