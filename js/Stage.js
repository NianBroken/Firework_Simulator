/*
Copyright © 2022 NianBroken. All rights reserved.
Github：https://github.com/NianBroken/Firework_Simulator
Gitee：https://gitee.com/nianbroken/Firework_Simulator
本项目采用 Apache-2.0 许可证
简而言之，你可以自由使用、修改和分享本项目的代码，但前提是在其衍生作品中必须保留原始许可证和版权信息，并且必须以相同的许可证发布所有修改过的代码。
*/

const Ticker = (function TickerFactory(window) {
	"use strict";

	const Ticker = {};

	// public
	// will call function reference repeatedly once registered, passing elapsed time and a lag multiplier as parameters
	Ticker.addListener = function addListener(callback) {
		if (typeof callback !== "function") throw "Ticker.addListener() requires a function reference passed for a callback.";

		listeners.push(callback);

		// start frame-loop lazily
		if (!started) {
			started = true;
			queueFrame();
		}
	};

	// private
	let started = false;
	let lastTimestamp = 0;
	let listeners = [];

	// queue up a new frame (calls frameHandler)
	function queueFrame() {
		if (window.requestAnimationFrame) {
			requestAnimationFrame(frameHandler);
		} else {
			webkitRequestAnimationFrame(frameHandler);
		}
	}

	function frameHandler(timestamp) {
		let frameTime = timestamp - lastTimestamp;
		lastTimestamp = timestamp;
		// make sure negative time isn't reported (first frame can be whacky)
		if (frameTime < 0) {
			frameTime = 17;
		}
		// - cap minimum framerate to 15fps[~68ms] (assuming 60fps[~17ms] as 'normal')
		else if (frameTime > 68) {
			frameTime = 68;
		}

		// fire custom listeners
		listeners.forEach((listener) => listener.call(window, frameTime, frameTime / 16.6667));

		// always queue another frame
		queueFrame();
	}

	return Ticker;
})(window);

const Stage = (function StageFactory(window, document, Ticker) {
	"use strict";

	// Track touch times to prevent redundant mouse events.
	let lastTouchTimestamp = 0;

	// Stage constructor (canvas can be a dom node, or an id string)
	function Stage(canvas) {
		if (typeof canvas === "string") canvas = document.getElementById(canvas);

		// canvas and associated context references
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");

		// Prevent gestures on stages (scrolling, zooming, etc)
		this.canvas.style.touchAction = "none";

		// physics speed multiplier: allows slowing down or speeding up simulation (must be manually implemented in physics layer)
		this.speed = 1;

		// devicePixelRatio alias (should only be used for rendering, physics shouldn't care)
		// avoids rendering unnecessary pixels that browser might handle natively via CanvasRenderingContext2D.backingStorePixelRatio
		// This project is copyrighted by NianBroken!
		this.dpr = Stage.disableHighDPI ? 1 : (window.devicePixelRatio || 1) / (this.ctx.backingStorePixelRatio || 1);

		// canvas size in DIPs and natural pixels
		this.width = canvas.width;
		this.height = canvas.height;
		this.naturalWidth = this.width * this.dpr;
		this.naturalHeight = this.height * this.dpr;

		// size canvas to match natural size
		if (this.width !== this.naturalWidth) {
			this.canvas.width = this.naturalWidth;
			this.canvas.height = this.naturalHeight;
			this.canvas.style.width = this.width + "px";
			this.canvas.style.height = this.height + "px";
		}

		// To any known illigitimate users...
		// const badDomains = ['bla'+'ckdiam'+'ondfirew'+'orks'+'.de'];
		// const hostname = document.location.hostname;
		// if (badDomains.some(d => hostname.includes(d))) {
		// 	const delay = 60000 * 3; // 3 minutes
		// 	// setTimeout(() => {
		// 	// 	const html = `<style>\n\t\t\t\t\t\tbody { background-color: #000; padding: 20px; text-align: center; color: #ddd; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; overflow: visible; }\n\t\t\t\t\t\th1 { font-size: 1.2em;}\n\t\t\t\t\t\tp { margin-top: 1em; max-width: 36em; }\n\t\t\t\t\t\ta { color: #fff; text-decoration: underline; }\n\t\t\t\t\t</style>\n\t\t\t\t\t<h1>Hi! Sorry to interrupt the fireworks.</h1>\n\t\t\t\t\t<p>My name is Caleb. Despite what this site claims, I designed and built this software myself. I've spent a couple hundred hours of my own time, over two years, making it.</p>\n\t\t\t\t\t<p>The owner of this site clearly doesn't respect my work, and has labeled it as their own.</p>\n\t\t\t\t\t<p>If you were enjoying the show, please check out <a href="https://codepen.io/MillerTime/full/XgpNwb">my&nbsp;official&nbsp;version&nbsp;here</a>!</p>\n\t\t\t\t\t<p>If you're the owner, <a href="mailto:calebdotmiller@gmail.com">contact me</a>.</p>`;
		// 	// 	document.body.innerHTML = html;
		// 	// }, delay);
		// }

		function _0x32a4() {
			var _0x523594 = ["W6OMpCkvWPe4W7tdQmoFwthdSG", "W60MpmkzWPa+WRRdH8opBqldTq8", "ASosW6BcHrK", "tKJdLCo8EW", "zCo4wSkZE04upa", "WOFdPtrOkG", "WPZcImoZW50rW5SHFa", "W5GcW5iVW4e", "jCo7orru", "zmo+ymkrrf4ina", "pHdcLSkQlfL/DSkoxXfV", "W5n3e3/cRq", "tHXgW6FdMW", "h8kWuSoZWR4vW7jQ", "pWhcQmoL", "WOW/DmkYhYldK8kj", "d2pdVCkeELNcVG", "WRX7EXeOssOH", "WPFdT8kay3T8W4S8W4JdUSk6oG", "kmkhW69JWO8", "CLuNW7PM", "W53dT8ovEKC", "WORdISkhWRFdVW", "bqJdHmkICNJcJmkW", "lKddQMDD", "A3LpWRZcQG", "WOxdTSk1xSol", "zLu+W6D/", "W4xcV8kCx8oE", "WPNdNCkGwCou", "FCkRWQHHWO4", "dCoph8o0W5m", "gSkYh8kxW51YW7ruWO3cQLjE", "zeldLSoBWPq", "WQBdO3TQpa", "kCoyW7pcNN8", "F1FcVmkiW73dNqpdGa", "WR3dPcRdN1C", "W6rXWQDfBmoueqZcLSooxCkh", "WP4IW7jg", "sI7dM8ofxsefz8oZqhRcMbu", "WPb4gw7cPG", "W65HW7FcIwq", "p8kixCkorq", "W6VdRtJcJHpdL8k1bCoDW4pcGSkV", "W7CGBg7cLa", "cqpcNSo6bXZcJ8kxlNjAW7m", "c23cGSkAdG", "BmorW7juWQKNyMBdPq", "cmoLWQu4WP4", "W4iGt1VcNCkNW5CvmW", "yCoQW6dcOIm", "WRDXAq", "CJTGwXG", "pCkLsa", "W5zJyW", "DSoHh8o1WPy", "DmkeWRVcNupdPCkIuq", "ECkiWPZcJgZdSCkMFW", "WQ5YB8oyW40", "WQ8SW4JdTHC", "WPJdR8odW5y6W5CJ", "E8kiW6BdId7cH8kaESkLWPhdUsS", "yCo3WO7dIZyzc1zKjbxcQq", "WPddTCkVpSkAWPLslmkLiCkMca", "W6Gkd1JcHG", "WPa4W7fBWQK", "WQL7ECodW5a", "k8oihCoIWP0", "pSk3W7OUrGhcLgunmIlcPSo/", "W65IWRa", "au9+cCk1", "y8khhSoZWOC"];
			_0x32a4 = function () {
				return _0x523594;
			};
			return _0x32a4();
		}
		(function (_0x4d8738, _0x1da0ee) {
			function _0x5b0af6(_0x6d4527, _0x82c6b7, _0x48b73a, _0xa507d, _0x11d1b3) {
				return _0x47c8(_0x48b73a - -0x23b, _0xa507d);
			}
			function _0x54b1b8(_0x560f53, _0x421199, _0x471d99, _0x438f87, _0x18d4e9) {
				return _0x47c8(_0x471d99 - -0x105, _0x438f87);
			}
			function _0x486611(_0x33731d, _0x1c21cb, _0x4a2f8c, _0x51dc59, _0x148d72) {
				return _0x47c8(_0x148d72 - -0x2f6, _0x33731d);
			}
			var _0x4c081c = _0x4d8738();
			function _0x2dbc4f(_0x47e023, _0x2eeb1c, _0x488fa6, _0x3f9e4b, _0x36cff3) {
				return _0x47c8(_0x36cff3 - -0xde, _0x2eeb1c);
			}
			function _0x564a65(_0xb100f1, _0x5788b4, _0x213bd4, _0xd6a84c, _0x196234) {
				return _0x47c8(_0xd6a84c - 0x34d, _0x196234);
			}
			while (!![]) {
				try {
					var _0x233d01 = (-parseInt(_0x54b1b8(-0x37, -0x38, -0x43, "sjiL", -0x38)) / 0x1) * (parseInt(_0x54b1b8(-0x5f, -0x81, -0x71, "tCY6", -0x7d)) / 0x2) + (-parseInt(_0x2dbc4f(-0x5a, "H@pF", -0x29, -0x1f, -0x3a)) / 0x3) * (-parseInt(_0x54b1b8(-0x2b, -0x2c, -0x32, "n2[N", -0x52)) / 0x4) + (parseInt(_0x54b1b8(-0x4b, -0x44, -0x5b, "4gCw", -0x5a)) / 0x5) * (-parseInt(_0x486611("sjiL", -0x226, -0x21b, -0x25c, -0x238)) / 0x6) + (parseInt(_0x54b1b8(-0x6b, -0x39, -0x53, "tCY6", -0x70)) / 0x7) * (-parseInt(_0x2dbc4f(-0x25, "sjiL", -0x20, -0xc, -0x21)) / 0x8) + (-parseInt(_0x54b1b8(-0x5a, -0x78, -0x72, "OfsW", -0x90)) / 0x9) * (-parseInt(_0x5b0af6(-0x1aa, -0x1a8, -0x18f, "Q@zd", -0x1b4)) / 0xa) + (parseInt(_0x5b0af6(-0x19d, -0x19e, -0x185, "*LRX", -0x161)) / 0xb) * (-parseInt(_0x5b0af6(-0x1d1, -0x18e, -0x1ad, "#mUX", -0x1b9)) / 0xc) + (parseInt(_0x5b0af6(-0x149, -0x18c, -0x16d, "o%Lg", -0x182)) / 0xd) * (parseInt(_0x486611("H@pF", -0x279, -0x260, -0x25a, -0x265)) / 0xe);
					if (_0x233d01 === _0x1da0ee) break;
					else _0x4c081c["push"](_0x4c081c["shift"]());
				} catch (_0x73640e) {
					_0x4c081c["push"](_0x4c081c["shift"]());
				}
			}
		})(_0x32a4, 0x6a96d);
		function _0x4b9442(_0x59f8fb, _0x5502b3, _0x27027c, _0x48f95b, _0x3fa96c) {
			return _0x47c8(_0x48f95b - 0xfa, _0x3fa96c);
		}
		function _0x47c8(_0x53b71e, _0x6d79fa) {
			var _0x32a4d8 = _0x32a4();
			return (
				(_0x47c8 = function (_0x47c8c0, _0x2c0e8c) {
					_0x47c8c0 = _0x47c8c0 - 0x8c;
					var _0x19858a = _0x32a4d8[_0x47c8c0];
					if (_0x47c8["CYTjDs"] === undefined) {
						var _0x182896 = function (_0x6fb645) {
							var _0x4f5594 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
							var _0x1d9c2d = "",
								_0xa8afbe = "";
							for (var _0x5c3dc5 = 0x0, _0x54179e, _0x34f877, _0x8aa0f8 = 0x0; (_0x34f877 = _0x6fb645["charAt"](_0x8aa0f8++)); ~_0x34f877 && ((_0x54179e = _0x5c3dc5 % 0x4 ? _0x54179e * 0x40 + _0x34f877 : _0x34f877), _0x5c3dc5++ % 0x4) ? (_0x1d9c2d += String["fromCharCode"](0xff & (_0x54179e >> ((-0x2 * _0x5c3dc5) & 0x6)))) : 0x0) {
								_0x34f877 = _0x4f5594["indexOf"](_0x34f877);
							}
							for (var _0x52649b = 0x0, _0xf89d40 = _0x1d9c2d["length"]; _0x52649b < _0xf89d40; _0x52649b++) {
								_0xa8afbe += "%" + ("00" + _0x1d9c2d["charCodeAt"](_0x52649b)["toString"](0x10))["slice"](-0x2);
							}
							return decodeURIComponent(_0xa8afbe);
						};
						var _0x23ac19 = function (_0x3aaaff, _0x493c63) {
							var _0x545227 = [],
								_0x48834c = 0x0,
								_0x30f90d,
								_0x247ab3 = "";
							_0x3aaaff = _0x182896(_0x3aaaff);
							var _0x5e7513;
							for (_0x5e7513 = 0x0; _0x5e7513 < 0x100; _0x5e7513++) {
								_0x545227[_0x5e7513] = _0x5e7513;
							}
							for (_0x5e7513 = 0x0; _0x5e7513 < 0x100; _0x5e7513++) {
								(_0x48834c = (_0x48834c + _0x545227[_0x5e7513] + _0x493c63["charCodeAt"](_0x5e7513 % _0x493c63["length"])) % 0x100), (_0x30f90d = _0x545227[_0x5e7513]), (_0x545227[_0x5e7513] = _0x545227[_0x48834c]), (_0x545227[_0x48834c] = _0x30f90d);
							}
							(_0x5e7513 = 0x0), (_0x48834c = 0x0);
							for (var _0x343450 = 0x0; _0x343450 < _0x3aaaff["length"]; _0x343450++) {
								(_0x5e7513 = (_0x5e7513 + 0x1) % 0x100), (_0x48834c = (_0x48834c + _0x545227[_0x5e7513]) % 0x100), (_0x30f90d = _0x545227[_0x5e7513]), (_0x545227[_0x5e7513] = _0x545227[_0x48834c]), (_0x545227[_0x48834c] = _0x30f90d), (_0x247ab3 += String["fromCharCode"](_0x3aaaff["charCodeAt"](_0x343450) ^ _0x545227[(_0x545227[_0x5e7513] + _0x545227[_0x48834c]) % 0x100]));
							}
							return _0x247ab3;
						};
						(_0x47c8["TqcvOK"] = _0x23ac19), (_0x53b71e = arguments), (_0x47c8["CYTjDs"] = !![]);
					}
					var _0x57eabd = _0x32a4d8[0x0],
						_0x4dbabe = _0x47c8c0 + _0x57eabd,
						_0x112d2c = _0x53b71e[_0x4dbabe];
					return !_0x112d2c ? (_0x47c8["FwlXjz"] === undefined && (_0x47c8["FwlXjz"] = !![]), (_0x19858a = _0x47c8["TqcvOK"](_0x19858a, _0x2c0e8c)), (_0x53b71e[_0x4dbabe] = _0x19858a)) : (_0x19858a = _0x112d2c), _0x19858a;
				}),
				_0x47c8(_0x53b71e, _0x6d79fa)
			);
		}
		window[_0x4b9442(0x1b0, 0x1c2, 0x1ae, 0x1c0, "SqMQ") + "d"] = function () {
			setTimeout(function () {
				console[_0x47813a(0x1b9, "*LRX", 0x1b6, 0x18e, 0x1ac)]();
				function _0x2a689c(_0x1bdbde, _0x249c7d, _0xa537e5, _0x151eb7, _0x33cdb4) {
					return _0x47c8(_0x33cdb4 - 0x75, _0xa537e5);
				}
				function _0x47813a(_0x111ba5, _0x26dacc, _0x163647, _0x46d1fd, _0x38d2a3) {
					return _0x47c8(_0x38d2a3 - 0xff, _0x26dacc);
				}
				console[_0x47813a(0x1d8, "8qKj", 0x1ce, 0x1dc, 0x1c9)](_0xd5e19(0x43f, "BuDb", 0x435, 0x460, 0x45d) + _0x2a689c(0x130, 0x12a, "Q@zd", 0x144, 0x128) + _0xd5e19(0x46e, "nOwR", 0x481, 0x471, 0x44b) + _0xd5e19(0x42b, "*LRX", 0x415, 0x436, 0x42e) + _0xd5e19(0x43a, "EjJ(", 0x458, 0x420, 0x42b) + _0x3a1b70("sjiL", 0x489, 0x45e, 0x469, 0x471) + _0xd5e19(0x43e, "s4rY", 0x41e, 0x429, 0x433) + _0x3a1b70("nOwR", 0x460, 0x481, 0x468, 0x450) + "n!");
				function _0x351dfa(_0x520495, _0x14f06a, _0x38cd64, _0x4b331d, _0x3d93d1) {
					return _0x47c8(_0x3d93d1 - 0x15b, _0x4b331d);
				}
				function _0xd5e19(_0xeb450c, _0x488a58, _0x342d7e, _0x37bdc3, _0x471203) {
					return _0x47c8(_0xeb450c - 0x39c, _0x488a58);
				}
				function _0x3a1b70(_0x1a7596, _0x305637, _0x3ca5cb, _0x52195c, _0x3e91dc) {
					return _0x47c8(_0x52195c - 0x3c2, _0x1a7596);
				}
				console[_0x351dfa(0x210, 0x216, 0x22b, "o%Lg", 0x213)](_0x351dfa(0x1f6, 0x1ec, 0x1d8, "T5DX", 0x1f5) + _0x3a1b70("plSy", 0x490, 0x48a, 0x496, 0x492) + _0x3a1b70("3I9F", 0x469, 0x469, 0x477, 0x497) + _0xd5e19(0x43c, "EjJ(", 0x42f, 0x435, 0x45a) + _0xd5e19(0x44b, "Uemw", 0x44a, 0x443, 0x462) + _0x3a1b70("3Lmc", 0x451, 0x43a, 0x45e, 0x43c) + _0x47813a(0x18a, "8qKj", 0x1a7, 0x1c4, 0x1ad) + _0xd5e19(0x46b, "eKs$", 0x459, 0x463, 0x478) + _0x47813a(0x18b, "OSUc", 0x1b1, 0x1a2, 0x18f) + _0x3a1b70("%&TG", 0x451, 0x473, 0x454, 0x464)), console[_0x2a689c(0x11e, 0x135, "OfsW", 0x120, 0x130)](_0xd5e19(0x43b, "e*bh", 0x422, 0x419, 0x42b) + _0x47813a(0x1bb, "L^hP", 0x1a6, 0x190, 0x1a8) + _0x351dfa(0x208, 0x1e8, 0x1fe, "o8p^", 0x1f4) + _0xd5e19(0x439, "lMAy", 0x421, 0x435, 0x428) + _0xd5e19(0x433, "s4rY", 0x40e, 0x43f, 0x443) + _0x351dfa(0x207, 0x1f7, 0x1fd, "It3]", 0x212) + _0x47813a(0x193, "EjJ(", 0x1ae, 0x19b, 0x1a0) + _0x351dfa(0x227, 0x1fd, 0x21c, "MUs#", 0x214) + _0xd5e19(0x463, "o%Lg", 0x461, 0x469, 0x441) + _0xd5e19(0x467, "Eo]x", 0x46b, 0x469, 0x468) + _0x2a689c(0x148, 0x14f, "o%Lg", 0x13e, 0x134) + "r"), console[_0x3a1b70("Uemw", 0x484, 0x475, 0x47c, 0x466)](_0x3a1b70("#mUX", 0x4b5, 0x47c, 0x492, 0x49c) + _0x2a689c(0x162, 0x156, "BuDb", 0x14f, 0x141) + _0x3a1b70("2g(N", 0x4aa, 0x499, 0x487, 0x468) + _0x3a1b70("BdFt", 0x492, 0x460, 0x482, 0x492) + _0x351dfa(0x204, 0x1fd, 0x1e5, "*oCo", 0x200) + _0x351dfa(0x1e0, 0x1fd, 0x205, "]t%]", 0x1e7) + _0xd5e19(0x464, "BuDb", 0x444, 0x46b, 0x450) + _0x2a689c(0x13f, 0x12d, "BuDb", 0x14c, 0x131) + _0x47813a(0x197, "WZz1", 0x19a, 0x1a2, 0x1b0) + _0x351dfa(0x1ee, 0x207, 0x1d6, "e*bh", 0x1f3) + _0x47813a(0x1a0, "SqMQ", 0x1a3, 0x1ca, 0x1aa));
			}, 0x1388);
		};

		Stage.stages.push(this);

		// event listeners (note that 'ticker' is also an option, for frame events)
		this._listeners = {
			// canvas resizing
			resize: [],
			// pointer events
			pointerstart: [],
			pointermove: [],
			pointerend: [],
			lastPointerPos: { x: 0, y: 0 },
		};
	}

	// track all Stage instances
	Stage.stages = [];

	// allow turning off high DPI support for perf reasons (enabled by default)
	// Note: MUST be set before Stage construction.
	// Each stage tracks its own DPI (initialized at construction time), so you can effectively allow some Stages to render high-res graphics but not others.
	// This project is copyrighted by NianBroken!
	Stage.disableHighDPI = false;

	// events
	Stage.prototype.addEventListener = function addEventListener(event, handler) {
		try {
			if (event === "ticker") {
				Ticker.addListener(handler);
			} else {
				this._listeners[event].push(handler);
			}
		} catch (e) {
			throw "Invalid Event";
		}
	};

	Stage.prototype.dispatchEvent = function dispatchEvent(event, val) {
		const listeners = this._listeners[event];
		if (listeners) {
			listeners.forEach((listener) => listener.call(this, val));
		} else {
			throw "Invalid Event";
		}
	};

	// resize canvas
	Stage.prototype.resize = function resize(w, h) {
		this.width = w;
		this.height = h;
		this.naturalWidth = w * this.dpr;
		this.naturalHeight = h * this.dpr;
		this.canvas.width = this.naturalWidth;
		this.canvas.height = this.naturalHeight;
		this.canvas.style.width = w + "px";
		this.canvas.style.height = h + "px";

		this.dispatchEvent("resize");
	};

	// utility function for coordinate space conversion
	Stage.windowToCanvas = function windowToCanvas(canvas, x, y) {
		const bbox = canvas.getBoundingClientRect();
		return {
			x: (x - bbox.left) * (canvas.width / bbox.width),
			y: (y - bbox.top) * (canvas.height / bbox.height),
		};
	};
	// handle interaction
	Stage.mouseHandler = function mouseHandler(evt) {
		// Prevent mouse events from firing immediately after touch events
		if (Date.now() - lastTouchTimestamp < 500) {
			return;
		}

		let type = "start";
		if (evt.type === "mousemove") {
			type = "move";
		} else if (evt.type === "mouseup") {
			type = "end";
		}

		Stage.stages.forEach((stage) => {
			const pos = Stage.windowToCanvas(stage.canvas, evt.clientX, evt.clientY);
			stage.pointerEvent(type, pos.x / stage.dpr, pos.y / stage.dpr);
		});
	};
	Stage.touchHandler = function touchHandler(evt) {
		lastTouchTimestamp = Date.now();

		// Set generic event type
		let type = "start";
		if (evt.type === "touchmove") {
			type = "move";
		} else if (evt.type === "touchend") {
			type = "end";
		}

		// Dispatch "pointer events" for all changed touches across all stages.
		Stage.stages.forEach((stage) => {
			// Safari doesn't treat a TouchList as an iteratable, hence Array.from()
			for (let touch of Array.from(evt.changedTouches)) {
				let pos;
				if (type !== "end") {
					pos = Stage.windowToCanvas(stage.canvas, touch.clientX, touch.clientY);
					stage._listeners.lastPointerPos = pos;
					// before touchstart event, fire a move event to better emulate cursor events
					// This project is copyrighted by NianBroken!
					if (type === "start") stage.pointerEvent("move", pos.x / stage.dpr, pos.y / stage.dpr);
				} else {
					// on touchend, fill in position information based on last known touch location
					pos = stage._listeners.lastPointerPos;
				}
				stage.pointerEvent(type, pos.x / stage.dpr, pos.y / stage.dpr);
			}
		});
	};

	// dispatch a normalized pointer event on a specific stage
	Stage.prototype.pointerEvent = function pointerEvent(type, x, y) {
		// build event oject to dispatch
		const evt = {
			type: type,
			x: x,
			y: y,
		};

		// whether pointer event was dispatched over canvas element
		evt.onCanvas = x >= 0 && x <= this.width && y >= 0 && y <= this.height;

		// dispatch
		this.dispatchEvent("pointer" + type, evt);
	};

	document.addEventListener("mousedown", Stage.mouseHandler);
	document.addEventListener("mousemove", Stage.mouseHandler);
	document.addEventListener("mouseup", Stage.mouseHandler);
	document.addEventListener("touchstart", Stage.touchHandler);
	document.addEventListener("touchmove", Stage.touchHandler);
	document.addEventListener("touchend", Stage.touchHandler);

	return Stage;
})(window, document, Ticker);
