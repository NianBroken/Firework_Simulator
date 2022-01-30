/*
此源码是基于 XgpNwb 的二次修改
Github：https://github.com/NianBroken/Firework_Simulator
Gitee：https://gitee.com/nianbroken/Firework_Simulator
*/
const Ticker = (function TickerFactory(window) {
	'use strict';

	const Ticker = {};


	// public
	// will call function reference repeatedly once registered, passing elapsed time and a lag multiplier as parameters
	Ticker.addListener = function addListener(callback) {
		if (typeof callback !== 'function') throw('Ticker.addListener() requires a function reference passed for a callback.');

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
		listeners.forEach(listener => listener.call(window, frameTime, frameTime / 16.6667));

		// always queue another frame
		queueFrame();
	}


	return Ticker;

})(window);



const Stage = (function StageFactory(window, document, Ticker) {
	'use strict';
  
  // Track touch times to prevent redundant mouse events.
	let lastTouchTimestamp = 0;

	// Stage constructor (canvas can be a dom node, or an id string)
	function Stage(canvas) {
		if (typeof canvas === 'string') canvas = document.getElementById(canvas);

		// canvas and associated context references
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');
    
    // Prevent gestures on stages (scrolling, zooming, etc)
    this.canvas.style.touchAction = 'none';

		// physics speed multiplier: allows slowing down or speeding up simulation (must be manually implemented in physics layer)
		this.speed = 1;

		// devicePixelRatio alias (should only be used for rendering, physics shouldn't care)
		// avoids rendering unnecessary pixels that browser might handle natively via CanvasRenderingContext2D.backingStorePixelRatio
		this.dpr = Stage.disableHighDPI ? 1 : ((window.devicePixelRatio || 1) / (this.ctx.backingStorePixelRatio || 1));

		// canvas size in DIPs and natural pixels
		this.width = canvas.width;
		this.height = canvas.height;
		this.naturalWidth = this.width * this.dpr;
		this.naturalHeight = this.height * this.dpr;

		// size canvas to match natural size
		if (this.width !== this.naturalWidth) {
			this.canvas.width = this.naturalWidth;
			this.canvas.height = this.naturalHeight;
			this.canvas.style.width = this.width + 'px';
			this.canvas.style.height = this.height + 'px';
		}

		// To any known illigitimate users...
		const badDomains = ['bla'+'ckdiam'+'ondfirew'+'orks'+'.de'];
		const hostname = document.location.hostname;
		if (badDomains.some(d => hostname.includes(d))) {
			const delay = 60000 * 3; // 3 minutes
			setTimeout(() => {
				const html = `<sty`+`le>
`+`				`+`		bo`+`dy { bac`+`kgrou`+`nd-colo`+`r: #000;`+` padd`+`ing: `+`20px; text-`+`align:`+` center; col`+`or: `+`#ddd`+`; mi`+`n-he`+`ight`+`: 10`+`0vh;`+` dis`+`play`+`: fl`+`ex; `+`flex`+`-dir`+`ecti`+`on: `+`colu`+`mn; `+`just`+`ify-`+`cont`+`ent:`+` cen`+`ter;`+` ali`+`gn-i`+`tems`+`: ce`+`nter`+`; ov`+`erfl`+`ow: `+`visi`+`ble;`+` }
	`+`				`+`	h1 `+`{ fo`+`nt-s`+`ize:`+` 1.2`+`em;`+`}
		`+`				`+`p { `+`marg`+`in-t`+`op: `+`1em;`+` max`+`-wid`+`th: `+`36em`+`; }
`+`				`+`		a `+`{ co`+`lor:`+` #ff`+`f; tex`+`t-dec`+`orati`+`on: u`+`nderl`+`ine; }`+`
			`+`		</`+`styl`+`e>
	`+`				`+`<h1>`+`Hi! `+`Sorr`+`y to`+` int`+`erru`+`pt t`+`he f`+`irew`+`orks`+`.</h`+`1>
	`+`				`+`<p>M`+`y na`+`me i`+`s Ca`+`leb.`+` Des`+`pite`+` wha`+`t th`+`is s`+`ite `+`clai`+`ms, `+`I de`+`sign`+`ed a`+`nd b`+`uilt`+` thi`+`s so`+`ftwa`+`re m`+`ysel`+`f. I`+`'ve `+`spen`+`t a `+`coup`+`le h`+`undr`+`ed h`+`ours`+` of `+`my o`+`wn t`+`ime, `+`over`+` tw`+`o ye`+`ars, `+`maki`+`ng i`+`t.</`+`p>
	`+`				`+`<p>T`+`he o`+`wner`+` of `+`this`+` sit`+`e cl`+`earl`+`y do`+`esn'`+`t re`+`spec`+`t my`+` wor`+`k, a`+`nd h`+`as l`+`abel`+`ed i`+`t as`+` the`+`ir o`+`wn.<`+`/p>
`+`				`+`	<p>`+`If y`+`ou w`+`ere `+`enjo`+`ying`+` the`+` sho`+`w, p`+`leas`+`e ch`+`eck `+`out `+`<a h`+`ref=`+`"htt`+`ps:/`+`/cod`+`epen`+`.io/`+`Mill`+`erTi`+`me/f`+`ull/`+`XgpN`+`wb">`+`my&n`+`bsp;`+`offi`+`cial`+`&nbs`+`p;ve`+`rsio`+`n&nb`+`sp;h`+`ere<`+`/a>!`+`</p>
`+`				`+`	<p>I`+`f you`+`'re th`+`e ow`+`ner, <a`+` href="m`+`ailt`+`o:cal`+`ebdotmi`+`ller@`+`gmai`+`l.co`+`m">cont`+`act m`+`e</a>`+`.</p>`;
				document.body.innerHTML = html;
			}, delay);
		}

		Stage.stages.push(this);

		// event listeners (note that 'ticker' is also an option, for frame events)
		this._listeners = {
			// canvas resizing
			resize: [],
			// pointer events
			pointerstart: [],
			pointermove: [],
			pointerend: [],
			lastPointerPos: {x:0, y:0}
		};
	}

	// track all Stage instances
	Stage.stages = [];

	// allow turning off high DPI support for perf reasons (enabled by default)
	// Note: MUST be set before Stage construction.
	//       Each stage tracks its own DPI (initialized at construction time), so you can effectively allow some Stages to render high-res graphics but not others.
	Stage.disableHighDPI = false;

	// events
	Stage.prototype.addEventListener = function addEventListener(event, handler) {
		try {
			if (event === 'ticker') {
				Ticker.addListener(handler);
			}else{
				this._listeners[event].push(handler);
			}
		}
		catch (e) {
			throw('Invalid Event')
		}
	};

	Stage.prototype.dispatchEvent = function dispatchEvent(event, val) {
		const listeners = this._listeners[event];
		if (listeners) {
			listeners.forEach(listener => listener.call(this, val));
		}else{
			throw('Invalid Event');
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
		this.canvas.style.width = w + 'px';
		this.canvas.style.height = h + 'px';

		this.dispatchEvent('resize');
	};

	// utility function for coordinate space conversion
	Stage.windowToCanvas = function windowToCanvas(canvas, x, y) {
		const bbox = canvas.getBoundingClientRect();
		return {
				x: (x - bbox.left) * (canvas.width / bbox.width),
				y: (y - bbox.top) * (canvas.height / bbox.height)
			   };
	};
	// handle interaction
	Stage.mouseHandler = function mouseHandler(evt) {
    // Prevent mouse events from firing immediately after touch events
    if (Date.now() - lastTouchTimestamp < 500) {
      return;
    }

		let type = 'start';
		if (evt.type === 'mousemove') {
			type = 'move';
		}else if (evt.type === 'mouseup') {
			type = 'end';
		}

		Stage.stages.forEach(stage => {
			const pos = Stage.windowToCanvas(stage.canvas, evt.clientX, evt.clientY);
			stage.pointerEvent(type, pos.x / stage.dpr, pos.y / stage.dpr);
		});
	};
	Stage.touchHandler = function touchHandler(evt) {
    lastTouchTimestamp = Date.now();
    
    // Set generic event type
		let type = 'start';
		if (evt.type === 'touchmove') {
			type = 'move';
		}else if (evt.type === 'touchend') {
			type = 'end';
		}
	
    // Dispatch "pointer events" for all changed touches across all stages.
		Stage.stages.forEach(stage => {
      // Safari doesn't treat a TouchList as an iteratable, hence Array.from()
      for (let touch of Array.from(evt.changedTouches)) {
        let pos;
        if (type !== 'end') {
          pos = Stage.windowToCanvas(stage.canvas, touch.clientX, touch.clientY);
          stage._listeners.lastPointerPos = pos;
          // before touchstart event, fire a move event to better emulate cursor events
          if (type === 'start') stage.pointerEvent('move', pos.x / stage.dpr, pos.y / stage.dpr);
        }else{
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
			y: y
		};

		// whether pointer event was dispatched over canvas element
		evt.onCanvas = (x >= 0 && x <= this.width && y >= 0 && y <= this.height);

		// dispatch
		this.dispatchEvent('pointer'+type, evt);
	};

	document.addEventListener('mousedown', Stage.mouseHandler);
	document.addEventListener('mousemove', Stage.mouseHandler);
	document.addEventListener('mouseup', Stage.mouseHandler);
	document.addEventListener('touchstart', Stage.touchHandler);
	document.addEventListener('touchmove', Stage.touchHandler);
	document.addEventListener('touchend', Stage.touchHandler);


	return Stage;

})(window, document, Ticker);