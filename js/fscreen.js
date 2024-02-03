!(function (e) {
	"use strict";
	var n = { fullscreenEnabled: 0, fullscreenElement: 1, requestFullscreen: 2, exitFullscreen: 3, fullscreenchange: 4, fullscreenerror: 5 },
		r = ["webkitFullscreenEnabled", "webkitFullscreenElement", "webkitRequestFullscreen", "webkitExitFullscreen", "webkitfullscreenchange", "webkitfullscreenerror"],
		l = ["mozFullScreenEnabled", "mozFullScreenElement", "mozRequestFullScreen", "mozCancelFullScreen", "mozfullscreenchange", "mozfullscreenerror"],
		u = ["msFullscreenEnabled", "msFullscreenElement", "msRequestFullscreen", "msExitFullscreen", "MSFullscreenChange", "MSFullscreenError"],
		t = "undefined" != typeof window && void 0 !== window.document ? window.document : {},
		s = ("fullscreenEnabled" in t && Object.keys(n)) || (r[0] in t && r) || (l[0] in t && l) || (u[0] in t && u) || [],
		c = {
			requestFullscreen: function (e) {
				return e[s[n.requestFullscreen]]();
			},
			requestFullscreenFunction: function (e) {
				return e[s[n.requestFullscreen]];
			},
			get exitFullscreen() {
				return t[s[n.exitFullscreen]].bind(t);
			},
			addEventListener: function (e, r, l) {
				return t.addEventListener(s[n[e]], r, l);
			},
			removeEventListener: function (e, r) {
				return t.removeEventListener(s[n[e]], r);
			},
			get fullscreenEnabled() {
				return Boolean(t[s[n.fullscreenEnabled]]);
			},
			set fullscreenEnabled(e) {},
			get fullscreenElement() {
				return t[s[n.fullscreenElement]];
			},
			set fullscreenElement(e) {},
			get onfullscreenchange() {
				return t[("on" + s[n.fullscreenchange]).toLowerCase()];
			},
			set onfullscreenchange(e) {
				return (t[("on" + s[n.fullscreenchange]).toLowerCase()] = e);
			},
			get onfullscreenerror() {
				return t[("on" + s[n.fullscreenerror]).toLowerCase()];
			},
			set onfullscreenerror(e) {
				return (t[("on" + s[n.fullscreenerror]).toLowerCase()] = e);
			},
		};
	e.fscreen = c;
})(window);
