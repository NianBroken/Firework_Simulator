/*
Copyright © 2022 NianBroken. All rights reserved.
Github：https://github.com/NianBroken/Firework_Simulator
Gitee：https://gitee.com/nianbroken/Firework_Simulator
本项目采用 Apache-2.0 许可证
简而言之，你可以自由使用、修改和分享本项目的代码，但前提是在其衍生作品中必须保留原始许可证和版权信息，并且必须以相同的许可证发布所有修改过的代码。
*/

const Ticker = (function TickerFactory(window) {
	"use strict";

	let started = false;
	let lastTimestamp = 0;
	const listeners = [];

	function queueFrame() {
		if (window.requestAnimationFrame) {
			window.requestAnimationFrame(handleFrame);
			return;
		}

		window.webkitRequestAnimationFrame(handleFrame);
	}

	function handleFrame(timestamp) {
		let frameTime = timestamp - lastTimestamp;
		lastTimestamp = timestamp;

		if (frameTime < 0) {
			frameTime = 17;
		} else if (frameTime > 68) {
			frameTime = 68;
		}

		listeners.forEach((listener) => listener.call(window, frameTime, frameTime / 16.6667));
		queueFrame();
	}

	return {
		addListener(callback) {
			if (typeof callback !== "function") {
				throw new Error("Ticker.addListener() 需要传入函数。");
			}

			listeners.push(callback);
			if (!started) {
				started = true;
				queueFrame();
			}
		},
	};
})(window);

const Stage = (function StageFactory(window, document, Ticker) {
	"use strict";

	let lastTouchTimestamp = 0;

	function ensureCanvasNode(canvas) {
		if (typeof canvas === "string") {
			return document.getElementById(canvas);
		}

		return canvas;
	}

	function getDevicePixelRatio(context) {
		if (Stage.disableHighDPI) {
			return 1;
		}

		const backingStoreRatio = context.backingStorePixelRatio || 1;
		return (window.devicePixelRatio || 1) / backingStoreRatio;
	}

	function Stage(canvas) {
		this.canvas = ensureCanvasNode(canvas);
		if (!this.canvas) {
			throw new Error("未找到目标画布节点。");
		}

		this.ctx = this.canvas.getContext("2d");
		if (!this.ctx) {
			throw new Error("当前环境不支持 2D 画布。");
		}

		this.speed = 1;
		this.canvas.style.touchAction = "none";
		this.dpr = getDevicePixelRatio(this.ctx);
		this.width = this.canvas.width;
		this.height = this.canvas.height;
		this.naturalWidth = this.width * this.dpr;
		this.naturalHeight = this.height * this.dpr;
		this._listeners = {
			resize: [],
			pointerstart: [],
			pointermove: [],
			pointerend: [],
			lastPointerPos: { x: 0, y: 0 },
		};

		if (this.width !== this.naturalWidth) {
			this.canvas.width = this.naturalWidth;
			this.canvas.height = this.naturalHeight;
			this.canvas.style.width = `${this.width}px`;
			this.canvas.style.height = `${this.height}px`;
		}

		Stage.stages.push(this);
	}

	Stage.stages = [];
	Stage.disableHighDPI = false;

	Stage.prototype.addEventListener = function addEventListener(event, handler) {
		if (event === "ticker") {
			Ticker.addListener(handler);
			return;
		}

		if (!this._listeners[event]) {
			throw new Error("无效事件类型");
		}

		this._listeners[event].push(handler);
	};

	Stage.prototype.dispatchEvent = function dispatchEvent(event, payload) {
		const listeners = this._listeners[event];
		if (!listeners) {
			throw new Error("无效事件类型");
		}

		listeners.forEach((listener) => listener.call(this, payload));
	};

	Stage.prototype.resize = function resize(width, height) {
		this.width = width;
		this.height = height;
		this.naturalWidth = width * this.dpr;
		this.naturalHeight = height * this.dpr;
		this.canvas.width = this.naturalWidth;
		this.canvas.height = this.naturalHeight;
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		this.dispatchEvent("resize");
	};

	Stage.prototype.pointerEvent = function pointerEvent(type, x, y) {
		const event = {
			type,
			x,
			y,
			onCanvas: x >= 0 && x <= this.width && y >= 0 && y <= this.height,
		};

		this.dispatchEvent(`pointer${type}`, event);
	};

	Stage.windowToCanvas = function windowToCanvas(canvas, x, y) {
		const bounds = canvas.getBoundingClientRect();
		return {
			x: (x - bounds.left) * (canvas.width / bounds.width),
			y: (y - bounds.top) * (canvas.height / bounds.height),
		};
	};

	Stage.mouseHandler = function mouseHandler(event) {
		if (Date.now() - lastTouchTimestamp < 500) {
			return;
		}

		let type = "start";
		if (event.type === "mousemove") {
			type = "move";
		} else if (event.type === "mouseup") {
			type = "end";
		}

		Stage.stages.forEach((stage) => {
			const position = Stage.windowToCanvas(stage.canvas, event.clientX, event.clientY);
			stage.pointerEvent(type, position.x / stage.dpr, position.y / stage.dpr);
		});
	};

	Stage.touchHandler = function touchHandler(event) {
		lastTouchTimestamp = Date.now();

		let type = "start";
		if (event.type === "touchmove") {
			type = "move";
		} else if (event.type === "touchend") {
			type = "end";
		}

		Stage.stages.forEach((stage) => {
			Array.from(event.changedTouches).forEach((touch) => {
				let position;
				if (type !== "end") {
					position = Stage.windowToCanvas(stage.canvas, touch.clientX, touch.clientY);
					stage._listeners.lastPointerPos = position;
					if (type === "start") {
						stage.pointerEvent("move", position.x / stage.dpr, position.y / stage.dpr);
					}
				} else {
					position = stage._listeners.lastPointerPos;
				}

				stage.pointerEvent(type, position.x / stage.dpr, position.y / stage.dpr);
			});
		});
	};

	document.addEventListener("mousedown", Stage.mouseHandler);
	document.addEventListener("mousemove", Stage.mouseHandler);
	document.addEventListener("mouseup", Stage.mouseHandler);
	document.addEventListener("touchstart", Stage.touchHandler);
	document.addEventListener("touchmove", Stage.touchHandler);
	document.addEventListener("touchend", Stage.touchHandler);

	return Stage;
})(window, document, Ticker);
