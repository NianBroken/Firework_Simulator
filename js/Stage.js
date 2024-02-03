const Ticker = (function (t) {
		"use strict";
		const e = {
			addListener: function (t) {
				if ("function" != typeof t) throw "Ticker.addListener() requires a function reference passed for a callback.";
				s.push(t), i || ((i = !0), o());
			},
		};
		let i = !1,
			n = 0,
			s = [];
		function o() {
			t.requestAnimationFrame ? requestAnimationFrame(a) : webkitRequestAnimationFrame(a);
		}
		function a(e) {
			let i = e - n;
			(n = e), i < 0 ? (i = 17) : i > 68 && (i = 68), s.forEach((e) => e.call(t, i, i / 16.6667)), o();
		}
		return e;
	})(window),
	Stage = (function (t, e, i) {
		"use strict";
		let n = 0;
		function s(i) {
			"string" == typeof i && (i = e.getElementById(i)), (this.canvas = i), (this.ctx = i.getContext("2d")), (this.canvas.style.touchAction = "none"), (this.speed = 1), (this.dpr = s.disableHighDPI ? 1 : (t.devicePixelRatio || 1) / (this.ctx.backingStorePixelRatio || 1)), (this.width = i.width), (this.height = i.height), (this.naturalWidth = this.width * this.dpr), (this.naturalHeight = this.height * this.dpr), this.width !== this.naturalWidth && ((this.canvas.width = this.naturalWidth), (this.canvas.height = this.naturalHeight), (this.canvas.style.width = this.width + "px"), (this.canvas.style.height = this.height + "px"));
			const n = e.location.hostname;
			if (["blackdiamondfireworks.de"].some((t) => n.includes(t))) {
				setTimeout(() => {
					e.body.innerHTML = '<style>\n\t\t\t\t\t\tbody { background-color: #000; padding: 20px; text-align: center; color: #ddd; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; overflow: visible; }\n\t\t\t\t\t\th1 { font-size: 1.2em;}\n\t\t\t\t\t\tp { margin-top: 1em; max-width: 36em; }\n\t\t\t\t\t\ta { color: #fff; text-decoration: underline; }\n\t\t\t\t\t</style>\n\t\t\t\t\t<h1>Hi! Sorry to interrupt the fireworks.</h1>\n\t\t\t\t\t<p>My name is Caleb. Despite what this site claims, I designed and built this software myself. I\'ve spent a couple hundred hours of my own time, over two years, making it.</p>\n\t\t\t\t\t<p>The owner of this site clearly doesn\'t respect my work, and has labeled it as their own.</p>\n\t\t\t\t\t<p>If you were enjoying the show, please check out <a href="https://codepen.io/MillerTime/full/XgpNwb">my official version here</a>!</p>\n\t\t\t\t\t<p>If you\'re the owner, <a href="mailto:calebdotmiller@gmail.com">contact me</a>.</p>';
				}, 18e4);
			}
			s.stages.push(this), (this._listeners = { resize: [], pointerstart: [], pointermove: [], pointerend: [], lastPointerPos: { x: 0, y: 0 } });
		}
		return (
			(s.stages = []),
			(s.disableHighDPI = !1),
			(s.prototype.addEventListener = function (t, e) {
				try {
					"ticker" === t ? i.addListener(e) : this._listeners[t].push(e);
				} catch (t) {
					throw "Invalid Event";
				}
			}),
			(s.prototype.dispatchEvent = function (t, e) {
				const i = this._listeners[t];
				if (!i) throw "Invalid Event";
				i.forEach((t) => t.call(this, e));
			}),
			(s.prototype.resize = function (t, e) {
				(this.width = t), (this.height = e), (this.naturalWidth = t * this.dpr), (this.naturalHeight = e * this.dpr), (this.canvas.width = this.naturalWidth), (this.canvas.height = this.naturalHeight), (this.canvas.style.width = t + "px"), (this.canvas.style.height = e + "px"), this.dispatchEvent("resize");
			}),
			(s.windowToCanvas = function (t, e, i) {
				const n = t.getBoundingClientRect();
				return { x: (e - n.left) * (t.width / n.width), y: (i - n.top) * (t.height / n.height) };
			}),
			(s.mouseHandler = function (t) {
				if (Date.now() - n < 500) return;
				let e = "start";
				"mousemove" === t.type ? (e = "move") : "mouseup" === t.type && (e = "end"),
					s.stages.forEach((i) => {
						const n = s.windowToCanvas(i.canvas, t.clientX, t.clientY);
						i.pointerEvent(e, n.x / i.dpr, n.y / i.dpr);
					});
			}),
			(s.touchHandler = function (t) {
				n = Date.now();
				let e = "start";
				"touchmove" === t.type ? (e = "move") : "touchend" === t.type && (e = "end"),
					s.stages.forEach((i) => {
						for (let n of Array.from(t.changedTouches)) {
							let t;
							"end" !== e ? ((t = s.windowToCanvas(i.canvas, n.clientX, n.clientY)), (i._listeners.lastPointerPos = t), "start" === e && i.pointerEvent("move", t.x / i.dpr, t.y / i.dpr)) : (t = i._listeners.lastPointerPos), i.pointerEvent(e, t.x / i.dpr, t.y / i.dpr);
						}
					});
			}),
			(s.prototype.pointerEvent = function (t, e, i) {
				const n = { type: t, x: e, y: i };
				(n.onCanvas = e >= 0 && e <= this.width && i >= 0 && i <= this.height), this.dispatchEvent("pointer" + t, n);
			}),
			e.addEventListener("mousedown", s.mouseHandler),
			e.addEventListener("mousemove", s.mouseHandler),
			e.addEventListener("mouseup", s.mouseHandler),
			e.addEventListener("touchstart", s.touchHandler),
			e.addEventListener("touchmove", s.touchHandler),
			e.addEventListener("touchend", s.touchHandler),
			s
		);
	})(window, document, Ticker);
