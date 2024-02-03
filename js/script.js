"use strict";
console.clear();
const IS_MOBILE = window.innerWidth <= 640,
	IS_DESKTOP = window.innerWidth > 800,
	IS_HEADER = IS_DESKTOP && window.innerHeight < 300,
	IS_HIGH_END_DEVICE = (() => {
		const e = navigator.hardwareConcurrency;
		return !!e && e >= (window.innerWidth <= 1024 ? 4 : 8);
	})(),
	MAX_WIDTH = 7680,
	MAX_HEIGHT = 4320,
	GRAVITY = 0.9;
let stageW,
	stageH,
	simSpeed = 1;
function getDefaultScaleFactor() {
	return IS_MOBILE ? 0.9 : IS_HEADER ? 0.75 : 1;
}
let quality = 1,
	isLowQuality = !1,
	isNormalQuality = !0,
	isHighQuality = !1;
const QUALITY_LOW = 1,
	QUALITY_NORMAL = 2,
	QUALITY_HIGH = 3,
	SKY_LIGHT_NONE = 0,
	SKY_LIGHT_DIM = 1,
	SKY_LIGHT_NORMAL = 2,
	COLOR = { Red: "#ff0043", Green: "#14fc56", Blue: "#1e7fff", Purple: "#e60aff", Gold: "#ffbf36", White: "#ffffff" },
	INVISIBLE = "_INVISIBLE_",
	PI_2 = 2 * Math.PI,
	PI_HALF = 0.5 * Math.PI,
	trailsStage = new Stage("trails-canvas"),
	mainStage = new Stage("main-canvas"),
	stages = [trailsStage, mainStage];
function fullscreenEnabled() {
	return fscreen.fullscreenEnabled;
}
function isFullscreen() {
	return !!fscreen.fullscreenElement;
}
function toggleFullscreen() {
	fullscreenEnabled() && (isFullscreen() ? fscreen.exitFullscreen() : fscreen.requestFullscreen(document.documentElement));
}
fscreen.addEventListener("fullscreenchange", () => {
	store.setState({ fullscreen: isFullscreen() });
});
const store = {
	_listeners: new Set(),
	_dispatch(e) {
		this._listeners.forEach((t) => t(this.state, e));
	},
	state: { paused: !0, soundEnabled: !0, menuOpen: !1, openHelpTopic: null, fullscreen: isFullscreen(), config: { quality: String(IS_HIGH_END_DEVICE ? QUALITY_HIGH : QUALITY_NORMAL), shell: "Random", size: IS_DESKTOP ? "3" : IS_HEADER ? "1.2" : "2", autoLaunch: !0, finale: !0, skyLighting: SKY_LIGHT_NORMAL + "", hideControls: IS_HEADER, longExposure: !1, scaleFactor: getDefaultScaleFactor() } },
	setState(e) {
		const t = this.state;
		(this.state = Object.assign({}, this.state, e)), this._dispatch(t), this.persist();
	},
	subscribe(e) {
		return this._listeners.add(e), () => this._listeners.remove(e);
	},
	load() {
		const e = localStorage.getItem("cm_fireworks_data");
		if (e) {
			const { schemaVersion: t, data: a } = JSON.parse(e),
				o = this.state.config;
			switch (t) {
				case "1.1":
					(o.quality = a.quality), (o.size = a.size), (o.skyLighting = a.skyLighting);
					break;
				case "1.2":
					(o.quality = a.quality), (o.size = a.size), (o.skyLighting = a.skyLighting), (o.scaleFactor = a.scaleFactor);
					break;
				default:
					throw new Error("version switch should be exhaustive");
			}
			console.log(`Loaded config (schema version ${t})`);
		} else if ("1" === localStorage.getItem("schemaVersion")) {
			let e;
			try {
				const t = localStorage.getItem("configSize");
				e = "string" == typeof t && JSON.parse(t);
			} catch (e) {
				return console.log("Recovered from error parsing saved config:"), void console.error(e);
			}
			const t = parseInt(e, 10);
			t >= 0 && t <= 4 && (this.state.config.size = String(t));
		}
	},
	persist() {
		const e = this.state.config;
		localStorage.setItem("cm_fireworks_data", JSON.stringify({ schemaVersion: "1.2", data: { quality: e.quality, size: e.size, skyLighting: e.skyLighting, scaleFactor: e.scaleFactor } }));
	},
};
function togglePause(e) {
	const t = store.state.paused;
	let a;
	t !== (a = "boolean" == typeof e ? e : !t) && store.setState({ paused: a });
}
function toggleSound(e) {
	"boolean" == typeof e ? store.setState({ soundEnabled: e }) : store.setState({ soundEnabled: !store.state.soundEnabled });
}
function toggleMenu(e) {
	"boolean" == typeof e ? store.setState({ menuOpen: e }) : store.setState({ menuOpen: !store.state.menuOpen });
}
function updateConfig(e) {
	(e = e || getConfigFromDOM()), store.setState({ config: Object.assign({}, store.state.config, e) }), configDidUpdate();
}
function configDidUpdate() {
	store.state.config;
	(quality = qualitySelector()), (isLowQuality = quality === QUALITY_LOW), (isNormalQuality = quality === QUALITY_NORMAL), (isHighQuality = quality === QUALITY_HIGH), skyLightingSelector() === SKY_LIGHT_NONE && (appNodes.canvasContainer.style.backgroundColor = "#000"), (Spark.drawWidth = quality === QUALITY_HIGH ? 0.75 : 1);
}
IS_HEADER || store.load();
const isRunning = (e = store.state) => !e.paused && !e.menuOpen,
	soundEnabledSelector = (e = store.state) => e.soundEnabled,
	canPlaySoundSelector = (e = store.state) => isRunning(e) && soundEnabledSelector(e),
	qualitySelector = () => +store.state.config.quality,
	shellNameSelector = () => store.state.config.shell,
	shellSizeSelector = () => +store.state.config.size,
	finaleSelector = () => store.state.config.finale,
	skyLightingSelector = () => +store.state.config.skyLighting,
	scaleFactorSelector = () => store.state.config.scaleFactor,
	helpContent = { shellType: { header: "烟花类型", body: "你要放的烟花的类型，选择“随机（Random）”可以获得非常好的体验！" }, shellSize: { header: "烟花大小", body: "烟花越大绽放范围就越大，但是烟花越大，设备所需的性能也会增多，大的烟花可能导致你的设备卡顿。" }, quality: { header: "画质", body: "如果动画运行不流畅，你可以试试降低画质。画质越高，烟花绽放后的火花数量就越多，但高画质可能导致你的设备卡顿。" }, skyLighting: { header: "照亮天空", body: "烟花爆炸时，背景会被照亮。如果你的屏幕看起来太亮了，可以把它改成“暗”或者“不”。" }, scaleFactor: { header: "缩放", body: "使你与烟花离得更近或更远。对于较大的烟花，你可以选择更小的缩放值，尤其是在手机或平板电脑上。" }, autoLaunch: { header: "自动放烟花", body: "开启后你就可以坐在你的设备屏幕前面欣赏烟花了，你也可以关闭它，但关闭后你就只能通过点击屏幕的方式来放烟花。" }, finaleMode: { header: "同时放更多的烟花", body: "可以在同一时间自动放出更多的烟花（但需要开启先开启“自动放烟花”）。" }, hideControls: { header: "隐藏控制按钮", body: "隐藏屏幕顶部的按钮。如果你要截图，或者需要一个无缝的体验，你就可以将按钮隐藏，隐藏按钮后你仍然可以在右上角打开设置。" }, fullscreen: { header: "全屏", body: "切换至全屏模式" }, longExposure: { header: "保留烟花的火花", body: "可以保留烟花留下的火花" } },
	nodeKeyToHelpKey = { shellTypeLabel: "shellType", shellSizeLabel: "shellSize", qualityLabel: "quality", skyLightingLabel: "skyLighting", scaleFactorLabel: "scaleFactor", autoLaunchLabel: "autoLaunch", finaleModeLabel: "finaleMode", hideControlsLabel: "hideControls", fullscreenLabel: "fullscreen", longExposureLabel: "longExposure" },
	appNodes = { stageContainer: ".stage-container", canvasContainer: ".canvas-container", controls: ".controls", menu: ".menu", menuInnerWrap: ".menu__inner-wrap", pauseBtn: ".pause-btn", pauseBtnSVG: ".pause-btn use", soundBtn: ".sound-btn", soundBtnSVG: ".sound-btn use", shellType: ".shell-type", shellTypeLabel: ".shell-type-label", shellSize: ".shell-size", shellSizeLabel: ".shell-size-label", quality: ".quality-ui", qualityLabel: ".quality-ui-label", skyLighting: ".sky-lighting", skyLightingLabel: ".sky-lighting-label", scaleFactor: ".scaleFactor", scaleFactorLabel: ".scaleFactor-label", autoLaunch: ".auto-launch", autoLaunchLabel: ".auto-launch-label", finaleModeFormOption: ".form-option--finale-mode", finaleMode: ".finale-mode", finaleModeLabel: ".finale-mode-label", hideControls: ".hide-controls", hideControlsLabel: ".hide-controls-label", fullscreenFormOption: ".form-option--fullscreen", fullscreen: ".fullscreen", fullscreenLabel: ".fullscreen-label", longExposure: ".long-exposure", longExposureLabel: ".long-exposure-label", helpModal: ".help-modal", helpModalOverlay: ".help-modal__overlay", helpModalHeader: ".help-modal__header", helpModalBody: ".help-modal__body", helpModalCloseBtn: ".help-modal__close-btn" };
function renderApp(e) {
	const t = `#icon-${e.paused ? "play" : "pause"}`,
		a = `#icon-sound-${soundEnabledSelector() ? "on" : "off"}`;
	if ((appNodes.pauseBtnSVG.setAttribute("href", t), appNodes.pauseBtnSVG.setAttribute("xlink:href", t), appNodes.soundBtnSVG.setAttribute("href", a), appNodes.soundBtnSVG.setAttribute("xlink:href", a), appNodes.controls.classList.toggle("hide", e.menuOpen || e.config.hideControls), appNodes.canvasContainer.classList.toggle("blur", e.menuOpen), appNodes.menu.classList.toggle("hide", !e.menuOpen), (appNodes.finaleModeFormOption.style.opacity = e.config.autoLaunch ? 1 : 0.32), (appNodes.quality.value = e.config.quality), (appNodes.shellType.value = e.config.shell), (appNodes.shellSize.value = e.config.size), (appNodes.autoLaunch.checked = e.config.autoLaunch), (appNodes.finaleMode.checked = e.config.finale), (appNodes.skyLighting.value = e.config.skyLighting), (appNodes.hideControls.checked = e.config.hideControls), (appNodes.fullscreen.checked = e.fullscreen), (appNodes.longExposure.checked = e.config.longExposure), (appNodes.scaleFactor.value = e.config.scaleFactor.toFixed(2)), (appNodes.menuInnerWrap.style.opacity = e.openHelpTopic ? 0.12 : 1), appNodes.helpModal.classList.toggle("active", !!e.openHelpTopic), e.openHelpTopic)) {
		const { header: t, body: a } = helpContent[e.openHelpTopic];
		(appNodes.helpModalHeader.textContent = t), (appNodes.helpModalBody.textContent = a);
	}
}
function handleStateChange(e, t) {
	const a = canPlaySoundSelector(e);
	a !== canPlaySoundSelector(t) && (a ? soundManager.resumeAll() : soundManager.pauseAll());
}
function getConfigFromDOM() {
	return { quality: appNodes.quality.value, shell: appNodes.shellType.value, size: appNodes.shellSize.value, autoLaunch: appNodes.autoLaunch.checked, finale: appNodes.finaleMode.checked, skyLighting: appNodes.skyLighting.value, longExposure: appNodes.longExposure.checked, hideControls: appNodes.hideControls.checked, scaleFactor: parseFloat(appNodes.scaleFactor.value) };
}
Object.keys(appNodes).forEach((e) => {
	appNodes[e] = document.querySelector(appNodes[e]);
}),
	fullscreenEnabled() || appNodes.fullscreenFormOption.classList.add("remove"),
	store.subscribe(renderApp),
	store.subscribe(handleStateChange);
const updateConfigNoEvent = () => updateConfig();
appNodes.quality.addEventListener("input", updateConfigNoEvent),
	appNodes.shellType.addEventListener("input", updateConfigNoEvent),
	appNodes.shellSize.addEventListener("input", updateConfigNoEvent),
	appNodes.autoLaunch.addEventListener("click", () => setTimeout(updateConfig, 0)),
	appNodes.finaleMode.addEventListener("click", () => setTimeout(updateConfig, 0)),
	appNodes.skyLighting.addEventListener("input", updateConfigNoEvent),
	appNodes.longExposure.addEventListener("click", () => setTimeout(updateConfig, 0)),
	appNodes.hideControls.addEventListener("click", () => setTimeout(updateConfig, 0)),
	appNodes.fullscreen.addEventListener("click", () => setTimeout(toggleFullscreen, 0)),
	appNodes.scaleFactor.addEventListener("input", () => {
		updateConfig(), handleResize();
	}),
	Object.keys(nodeKeyToHelpKey).forEach((e) => {
		const t = nodeKeyToHelpKey[e];
		appNodes[e].addEventListener("click", () => {
			store.setState({ openHelpTopic: t });
		});
	}),
	appNodes.helpModalCloseBtn.addEventListener("click", () => {
		store.setState({ openHelpTopic: null });
	}),
	appNodes.helpModalOverlay.addEventListener("click", () => {
		store.setState({ openHelpTopic: null });
	});
const COLOR_NAMES = Object.keys(COLOR),
	COLOR_CODES = COLOR_NAMES.map((e) => COLOR[e]),
	COLOR_CODES_W_INVIS = [...COLOR_CODES, INVISIBLE],
	COLOR_CODE_INDEXES = COLOR_CODES_W_INVIS.reduce((e, t, a) => ((e[t] = a), e), {}),
	COLOR_TUPLES = {};
function randomColorSimple() {
	return COLOR_CODES[(Math.random() * COLOR_CODES.length) | 0];
}
let lastColor;
function randomColor(e) {
	const t = e && e.notSame,
		a = e && e.notColor,
		o = e && e.limitWhite;
	let l = randomColorSimple();
	if ((o && l === COLOR.White && Math.random() < 0.6 && (l = randomColorSimple()), t)) for (; l === lastColor; ) l = randomColorSimple();
	else if (a) for (; l === a; ) l = randomColorSimple();
	return (lastColor = l), l;
}
function whiteOrGold() {
	return Math.random() < 0.5 ? COLOR.Gold : COLOR.White;
}
function makePistilColor(e) {
	return e === COLOR.White || e === COLOR.Gold ? randomColor({ notColor: e }) : whiteOrGold();
}
COLOR_CODES.forEach((e) => {
	COLOR_TUPLES[e] = { r: parseInt(e.substr(1, 2), 16), g: parseInt(e.substr(3, 2), 16), b: parseInt(e.substr(5, 2), 16) };
});
const crysanthemumShell = (e = 1) => {
		const t = Math.random() < 0.25,
			a = Math.random() < 0.72,
			o = a ? randomColor({ limitWhite: !0 }) : [randomColor(), randomColor({ notSame: !0 })],
			l = a && Math.random() < 0.42,
			r = l && makePistilColor(o),
			s = a && (Math.random() < 0.2 || o === COLOR.White) ? r || randomColor({ notColor: o, limitWhite: !0 }) : null,
			n = !l && o !== COLOR.White && Math.random() < 0.42;
		let i = t ? 1.1 : 1.25;
		return isLowQuality && (i *= 0.8), isHighQuality && (i = 1.2), { shellSize: e, spreadSize: 300 + 100 * e, starLife: 900 + 200 * e, starDensity: i, color: o, secondColor: s, glitter: t ? "light" : "", glitterColor: whiteOrGold(), pistil: l, pistilColor: r, streamers: n };
	},
	ghostShell = (e = 1) => {
		const t = crysanthemumShell(e);
		t.starLife *= 1.5;
		let a = randomColor({ notColor: COLOR.White });
		t.streamers = !0;
		Math.random() < 0.42 && makePistilColor(a);
		return (t.color = INVISIBLE), (t.secondColor = a), (t.glitter = ""), t;
	},
	strobeShell = (e = 1) => {
		const t = randomColor({ limitWhite: !0 });
		return { shellSize: e, spreadSize: 280 + 92 * e, starLife: 1100 + 200 * e, starLifeVariation: 0.4, starDensity: 1.1, color: t, glitter: "light", glitterColor: COLOR.White, strobe: !0, strobeColor: Math.random() < 0.5 ? COLOR.White : null, pistil: Math.random() < 0.5, pistilColor: makePistilColor(t) };
	},
	palmShell = (e = 1) => {
		const t = randomColor(),
			a = Math.random() < 0.5;
		return { shellSize: e, color: t, spreadSize: 250 + 75 * e, starDensity: a ? 0.15 : 0.4, starLife: 1800 + 200 * e, glitter: a ? "thick" : "heavy" };
	},
	ringShell = (e = 1) => {
		const t = randomColor(),
			a = Math.random() < 0.75;
		return { shellSize: e, ring: !0, color: t, spreadSize: 300 + 100 * e, starLife: 900 + 200 * e, starCount: 2.2 * PI_2 * (e + 1), pistil: a, pistilColor: makePistilColor(t), glitter: a ? "" : "light", glitterColor: t === COLOR.Gold ? COLOR.Gold : COLOR.White, streamers: Math.random() < 0.3 };
	},
	crossetteShell = (e = 1) => {
		const t = randomColor({ limitWhite: !0 });
		return { shellSize: e, spreadSize: 300 + 100 * e, starLife: 750 + 160 * e, starLifeVariation: 0.4, starDensity: 0.85, color: t, crossette: !0, pistil: Math.random() < 0.5, pistilColor: makePistilColor(t) };
	},
	floralShell = (e = 1) => ({ shellSize: e, spreadSize: 300 + 120 * e, starDensity: 0.12, starLife: 500 + 50 * e, starLifeVariation: 0.5, color: Math.random() < 0.65 ? "random" : Math.random() < 0.15 ? randomColor() : [randomColor(), randomColor({ notSame: !0 })], floral: !0 }),
	fallingLeavesShell = (e = 1) => ({ shellSize: e, color: INVISIBLE, spreadSize: 300 + 120 * e, starDensity: 0.12, starLife: 500 + 50 * e, starLifeVariation: 0.5, glitter: "medium", glitterColor: COLOR.Gold, fallingLeaves: !0 }),
	willowShell = (e = 1) => ({ shellSize: e, spreadSize: 300 + 100 * e, starDensity: 0.6, starLife: 3e3 + 300 * e, glitter: "willow", glitterColor: COLOR.Gold, color: INVISIBLE }),
	crackleShell = (e = 1) => {
		const t = Math.random() < 0.75 ? COLOR.Gold : randomColor();
		return { shellSize: e, spreadSize: 380 + 75 * e, starDensity: isLowQuality ? 0.65 : 1, starLife: 600 + 100 * e, starLifeVariation: 0.32, glitter: "light", glitterColor: COLOR.Gold, color: t, crackle: !0, pistil: Math.random() < 0.65, pistilColor: makePistilColor(t) };
	},
	horsetailShell = (e = 1) => {
		const t = randomColor();
		return { shellSize: e, horsetail: !0, color: t, spreadSize: 250 + 38 * e, starDensity: 0.9, starLife: 2500 + 300 * e, glitter: "medium", glitterColor: Math.random() < 0.5 ? whiteOrGold() : t, strobe: t === COLOR.White };
	};
function randomShellName() {
	return Math.random() < 0.5 ? "Crysanthemum" : shellNames[(Math.random() * (shellNames.length - 1) + 1) | 0];
}
function randomShell(e) {
	return IS_HEADER ? randomFastShell()(e) : shellTypes[randomShellName()](e);
}
function shellFromConfig(e) {
	return shellTypes[shellNameSelector()](e);
}
const fastShellBlacklist = ["Falling Leaves", "Floral", "Willow"];
function randomFastShell() {
	const e = "Random" === shellNameSelector();
	let t = e ? randomShellName() : shellNameSelector();
	if (e) for (; fastShellBlacklist.includes(t); ) t = randomShellName();
	return shellTypes[t];
}
const shellTypes = { Random: randomShell, Crackle: crackleShell, Crossette: crossetteShell, Crysanthemum: crysanthemumShell, "Falling Leaves": fallingLeavesShell, Floral: floralShell, Ghost: ghostShell, "Horse Tail": horsetailShell, Palm: palmShell, Ring: ringShell, Strobe: strobeShell, Willow: willowShell },
	shellNames = Object.keys(shellTypes);
function init() {
	function e(e, t) {
		e.innerHTML = t.reduce((e, t) => (e += `<option value="${t.value}">${t.label}</option>`), "");
	}
	document.querySelector(".loading-init").remove(), appNodes.stageContainer.classList.remove("remove");
	let t = "";
	shellNames.forEach((e) => (t += `<option value="${e}">${e}</option>`)),
		(appNodes.shellType.innerHTML = t),
		(t = ""),
		['3"', '4"', '6"', '8"', '12"', '16"'].forEach((e, a) => (t += `<option value="${a}">${e}</option>`)),
		(appNodes.shellSize.innerHTML = t),
		e(appNodes.quality, [
			{ label: "低", value: QUALITY_LOW },
			{ label: "正常", value: QUALITY_NORMAL },
			{ label: "高", value: QUALITY_HIGH },
		]),
		e(appNodes.skyLighting, [
			{ label: "不", value: SKY_LIGHT_NONE },
			{ label: "暗", value: SKY_LIGHT_DIM },
			{ label: "正常", value: SKY_LIGHT_NORMAL },
		]),
		e(
			appNodes.scaleFactor,
			[0.5, 0.62, 0.75, 0.9, 1, 1.5, 2].map((e) => ({ value: e.toFixed(2), label: `${100 * e}%` }))
		),
		togglePause(!1),
		renderApp(store.state),
		configDidUpdate();
}
function fitShellPositionInBoundsH(e) {
	return 0.64 * e + 0.18;
}
function fitShellPositionInBoundsV(e) {
	return 0.75 * e;
}
function getRandomShellPositionH() {
	return fitShellPositionInBoundsH(Math.random());
}
function getRandomShellPositionV() {
	return fitShellPositionInBoundsV(Math.random());
}
function getRandomShellSize() {
	const e = shellSizeSelector(),
		t = Math.min(2.5, e),
		a = Math.random() * t,
		o = e - a,
		l = 0 === t ? Math.random() : 1 - a / t,
		r = Math.random() * (1 - 0.65 * l) * 0.5;
	return { size: o, x: fitShellPositionInBoundsH(Math.random() < 0.5 ? 0.5 - r : 0.5 + r), height: fitShellPositionInBoundsV(l) };
}
function launchShellFromConfig(e) {
	const t = new Shell(shellFromConfig(shellSizeSelector())),
		a = mainStage.width,
		o = mainStage.height;
	t.launch(e ? e.x / a : getRandomShellPositionH(), e ? 1 - e.y / o : getRandomShellPositionV());
}
function seqRandomShell() {
	const e = getRandomShellSize(),
		t = new Shell(shellFromConfig(e.size));
	t.launch(e.x, e.height);
	let a = t.starLife;
	return t.fallingLeaves && (a = 4600), 900 + 600 * Math.random() + a;
}
function seqRandomFastShell() {
	const e = randomFastShell(),
		t = getRandomShellSize(),
		a = new Shell(e(t.size));
	a.launch(t.x, t.height);
	let o = a.starLife;
	return 900 + 600 * Math.random() + o;
}
function seqTwoRandom() {
	const e = getRandomShellSize(),
		t = getRandomShellSize(),
		a = new Shell(shellFromConfig(e.size)),
		o = new Shell(shellFromConfig(t.size)),
		l = 0.2 * Math.random() - 0.1,
		r = 0.2 * Math.random() - 0.1;
	a.launch(0.3 + l, e.height),
		setTimeout(() => {
			o.launch(0.7 + r, t.height);
		}, 100);
	let s = Math.max(a.starLife, o.starLife);
	return (a.fallingLeaves || o.fallingLeaves) && (s = 4600), 900 + 600 * Math.random() + s;
}
function seqTriple() {
	const e = randomFastShell(),
		t = shellSizeSelector(),
		a = Math.max(0, t - 1.25),
		o = 0.08 * Math.random() - 0.04;
	new Shell(e(t)).launch(0.5 + o, 0.7);
	const l = 1e3 + 400 * Math.random(),
		r = 1e3 + 400 * Math.random();
	return (
		setTimeout(() => {
			const t = 0.08 * Math.random() - 0.04;
			new Shell(e(a)).launch(0.2 + t, 0.1);
		}, l),
		setTimeout(() => {
			const t = 0.08 * Math.random() - 0.04;
			new Shell(e(a)).launch(0.8 + t, 0.1);
		}, r),
		4e3
	);
}
function seqPyramid() {
	const e = IS_DESKTOP ? 7 : 4,
		t = shellSizeSelector(),
		a = Math.max(0, t - 3),
		o = Math.random() < 0.78 ? crysanthemumShell : ringShell,
		l = randomShell;
	function r(e, r) {
		let s = "Random" === shellNameSelector() ? (r ? l : o) : shellTypes[shellNameSelector()];
		const n = e <= 0.5 ? e / 0.5 : (1 - e) / 0.5;
		new Shell(s(r ? t : a)).launch(e, r ? 0.75 : 0.42 * n);
	}
	let s = 0,
		n = 0;
	for (; s <= e; ) {
		if (s === e)
			setTimeout(() => {
				r(0.5, !0);
			}, n);
		else {
			const t = (s / e) * 0.5,
				a = 30 * Math.random() + 30;
			setTimeout(() => {
				r(t, !1);
			}, n),
				setTimeout(() => {
					r(1 - t, !1);
				}, n + a);
		}
		s++, (n += 200);
	}
	return 3400 + 250 * e;
}
function seqSmallBarrage() {
	seqSmallBarrage.lastCalled = Date.now();
	const e = IS_DESKTOP ? 11 : 5,
		t = IS_DESKTOP ? 3 : 1,
		a = Math.max(0, shellSizeSelector() - 2),
		o = Math.random() < 0.78 ? crysanthemumShell : ringShell,
		l = randomFastShell();
	function r(e, t) {
		let r = "Random" === shellNameSelector() ? (t ? l : o) : shellTypes[shellNameSelector()];
		const s = new Shell(r(a)),
			n = (Math.cos(5 * e * Math.PI + PI_HALF) + 1) / 2;
		s.launch(e, 0.75 * n);
	}
	let s = 0,
		n = 0;
	for (; s < e; ) {
		if (0 === s) r(0.5, !1), (s += 1);
		else {
			const a = (s + 1) / e / 2,
				o = 30 * Math.random() + 30,
				l = s === t;
			setTimeout(() => {
				r(0.5 + a, l);
			}, n),
				setTimeout(() => {
					r(0.5 - a, l);
				}, n + o),
				(s += 2);
		}
		n += 200;
	}
	return 3400 + 120 * e;
}
(seqSmallBarrage.cooldown = 15e3), (seqSmallBarrage.lastCalled = Date.now());
const sequences = [seqRandomShell, seqTwoRandom, seqTriple, seqPyramid, seqSmallBarrage];
let isFirstSeq = !0;
const finaleCount = 32;
let currentFinaleCount = 0;
function startSequence() {
	if (isFirstSeq) {
		if (((isFirstSeq = !1), IS_HEADER)) return seqTwoRandom();
		return new Shell(crysanthemumShell(shellSizeSelector())).launch(0.5, 0.5), 2400;
	}
	if (finaleSelector()) return seqRandomFastShell(), currentFinaleCount < finaleCount ? (currentFinaleCount++, 170) : ((currentFinaleCount = 0), 6e3);
	const e = Math.random();
	return e < 0.08 && Date.now() - seqSmallBarrage.lastCalled > seqSmallBarrage.cooldown ? seqSmallBarrage() : e < 0.1 ? seqPyramid() : e < 0.6 && !IS_HEADER ? seqRandomShell() : e < 0.8 ? seqTwoRandom() : e < 1 ? seqTriple() : void 0;
}
let activePointerCount = 0,
	isUpdatingSpeed = !1;
function handlePointerStart(e) {
	activePointerCount++;
	if (e.y < 50) {
		if (e.x < 50) return void togglePause();
		if (e.x > mainStage.width / 2 - 25 && e.x < mainStage.width / 2 + 25) return void toggleSound();
		if (e.x > mainStage.width - 50) return void toggleMenu();
	}
	isRunning() && (updateSpeedFromEvent(e) ? (isUpdatingSpeed = !0) : e.onCanvas && launchShellFromConfig(e));
}
function handlePointerEnd(e) {
	activePointerCount--, (isUpdatingSpeed = !1);
}
function handlePointerMove(e) {
	isRunning() && isUpdatingSpeed && updateSpeedFromEvent(e);
}
function handleKeydown(e) {
	80 === e.keyCode ? togglePause() : 79 === e.keyCode ? toggleMenu() : 27 === e.keyCode && toggleMenu(!1);
}
function handleResize() {
	const e = window.innerWidth,
		t = window.innerHeight,
		a = Math.min(e, MAX_WIDTH),
		o = e <= 420 ? t : Math.min(t, MAX_HEIGHT);
	(appNodes.stageContainer.style.width = a + "px"), (appNodes.stageContainer.style.height = o + "px"), stages.forEach((e) => e.resize(a, o));
	const l = scaleFactorSelector();
	(stageW = a / l), (stageH = o / l);
}
mainStage.addEventListener("pointerstart", handlePointerStart), mainStage.addEventListener("pointerend", handlePointerEnd), mainStage.addEventListener("pointermove", handlePointerMove), window.addEventListener("keydown", handleKeydown), handleResize(), window.addEventListener("resize", handleResize);
let currentFrame = 0,
	speedBarOpacity = 0,
	autoLaunchTime = 0;
function updateSpeedFromEvent(e) {
	if (isUpdatingSpeed || e.y >= mainStage.height - 44) {
		const t = 16,
			a = (e.x - t) / (mainStage.width - 2 * t);
		return (simSpeed = Math.min(Math.max(a, 0), 1)), (speedBarOpacity = 1), !0;
	}
	return !1;
}
function updateGlobals(e, t) {
	currentFrame++, isUpdatingSpeed || ((speedBarOpacity -= t / 30) < 0 && (speedBarOpacity = 0)), store.state.config.autoLaunch && (autoLaunchTime -= e) <= 0 && (autoLaunchTime = 1.25 * startSequence());
}
function update(e, t) {
	if (!isRunning()) return;
	const a = e * simSpeed,
		o = simSpeed * t;
	updateGlobals(a, t);
	const l = 1 - (1 - Star.airDrag) * o,
		r = 1 - (1 - Star.airDragHeavy) * o,
		s = 1 - (1 - Spark.airDrag) * o,
		n = (a / 1e3) * GRAVITY;
	COLOR_CODES_W_INVIS.forEach((e) => {
		const t = Star.active[e];
		for (let e = t.length - 1; e >= 0; e -= 1) {
			const s = t[e];
			if (s.updateFrame !== currentFrame)
				if (((s.updateFrame = currentFrame), (s.life -= a), s.life <= 0)) t.splice(e, 1), Star.returnInstance(s);
				else {
					const i = Math.pow(s.life / s.fullLife, 0.5),
						c = 1 - i;
					if (((s.prevX = s.x), (s.prevY = s.y), (s.x += s.speedX * o), (s.y += s.speedY * o), s.heavy ? ((s.speedX *= r), (s.speedY *= r)) : ((s.speedX *= l), (s.speedY *= l)), (s.speedY += n), s.spinRadius && ((s.spinAngle += s.spinSpeed * o), (s.x += Math.sin(s.spinAngle) * s.spinRadius * o), (s.y += Math.cos(s.spinAngle) * s.spinRadius * o)), s.sparkFreq)) for (s.sparkTimer -= a; s.sparkTimer < 0; ) (s.sparkTimer += 0.75 * s.sparkFreq + s.sparkFreq * c * 4), Spark.add(s.x, s.y, s.sparkColor, Math.random() * PI_2, Math.random() * s.sparkSpeed * i, 0.8 * s.sparkLife + Math.random() * s.sparkLifeVariation * s.sparkLife);
					s.life < s.transitionTime && (s.secondColor && !s.colorChanged && ((s.colorChanged = !0), (s.color = s.secondColor), t.splice(e, 1), Star.active[s.secondColor].push(s), s.secondColor === INVISIBLE && (s.sparkFreq = 0)), s.strobe && (s.visible = Math.floor(s.life / s.strobeFreq) % 3 == 0));
				}
		}
		const i = Spark.active[e];
		for (let e = i.length - 1; e >= 0; e -= 1) {
			const t = i[e];
			(t.life -= a), t.life <= 0 ? (i.splice(e, 1), Spark.returnInstance(t)) : ((t.prevX = t.x), (t.prevY = t.y), (t.x += t.speedX * o), (t.y += t.speedY * o), (t.speedX *= s), (t.speedY *= s), (t.speedY += n));
		}
	}),
		render(o);
}
function render(e) {
	const { dpr: t } = mainStage,
		a = stageW,
		o = stageH,
		l = trailsStage.ctx,
		r = mainStage.ctx;
	skyLightingSelector() !== SKY_LIGHT_NONE && colorSky(e);
	const s = scaleFactorSelector();
	for (l.scale(t * s, t * s), r.scale(t * s, t * s), l.globalCompositeOperation = "source-over", l.fillStyle = `rgba(0, 0, 0, ${store.state.config.longExposure ? 0.0025 : 0.175 * e})`, l.fillRect(0, 0, a, o), r.clearRect(0, 0, a, o); BurstFlash.active.length; ) {
		const e = BurstFlash.active.pop(),
			t = l.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.radius);
		t.addColorStop(0.024, "rgba(255, 255, 255, 1)"), t.addColorStop(0.125, "rgba(255, 160, 20, 0.2)"), t.addColorStop(0.32, "rgba(255, 140, 20, 0.11)"), t.addColorStop(1, "rgba(255, 120, 20, 0)"), (l.fillStyle = t), l.fillRect(e.x - e.radius, e.y - e.radius, 2 * e.radius, 2 * e.radius), BurstFlash.returnInstance(e);
	}
	if (
		((l.globalCompositeOperation = "lighten"),
		(l.lineWidth = Star.drawWidth),
		(l.lineCap = isLowQuality ? "square" : "round"),
		(r.strokeStyle = "#fff"),
		(r.lineWidth = 1),
		r.beginPath(),
		COLOR_CODES.forEach((e) => {
			const t = Star.active[e];
			(l.strokeStyle = e),
				l.beginPath(),
				t.forEach((e) => {
					e.visible && (l.moveTo(e.x, e.y), l.lineTo(e.prevX, e.prevY), r.moveTo(e.x, e.y), r.lineTo(e.x - 1.6 * e.speedX, e.y - 1.6 * e.speedY));
				}),
				l.stroke();
		}),
		r.stroke(),
		(l.lineWidth = Spark.drawWidth),
		(l.lineCap = "butt"),
		COLOR_CODES.forEach((e) => {
			const t = Spark.active[e];
			(l.strokeStyle = e),
				l.beginPath(),
				t.forEach((e) => {
					l.moveTo(e.x, e.y), l.lineTo(e.prevX, e.prevY);
				}),
				l.stroke();
		}),
		speedBarOpacity)
	) {
		const e = 6;
		(r.globalAlpha = speedBarOpacity), (r.fillStyle = COLOR.Blue), r.fillRect(0, o - e, a * simSpeed, e), (r.globalAlpha = 1);
	}
	l.setTransform(1, 0, 0, 1, 0, 0), r.setTransform(1, 0, 0, 1, 0, 0);
}
const currentSkyColor = { r: 0, g: 0, b: 0 },
	targetSkyColor = { r: 0, g: 0, b: 0 };
function colorSky(e) {
	const t = 15 * skyLightingSelector();
	let a = 0;
	(targetSkyColor.r = 0),
		(targetSkyColor.g = 0),
		(targetSkyColor.b = 0),
		COLOR_CODES.forEach((e) => {
			const t = COLOR_TUPLES[e],
				o = Star.active[e].length;
			(a += o), (targetSkyColor.r += t.r * o), (targetSkyColor.g += t.g * o), (targetSkyColor.b += t.b * o);
		});
	const o = Math.pow(Math.min(1, a / 500), 0.3),
		l = Math.max(1, targetSkyColor.r, targetSkyColor.g, targetSkyColor.b);
	(targetSkyColor.r = (targetSkyColor.r / l) * t * o), (targetSkyColor.g = (targetSkyColor.g / l) * t * o), (targetSkyColor.b = (targetSkyColor.b / l) * t * o);
	(currentSkyColor.r += ((targetSkyColor.r - currentSkyColor.r) / 10) * e), (currentSkyColor.g += ((targetSkyColor.g - currentSkyColor.g) / 10) * e), (currentSkyColor.b += ((targetSkyColor.b - currentSkyColor.b) / 10) * e), (appNodes.canvasContainer.style.backgroundColor = `rgb(${0 | currentSkyColor.r}, ${0 | currentSkyColor.g}, ${0 | currentSkyColor.b})`);
}
function createParticleArc(e, t, a, o, l) {
	const r = t / a,
		s = e + t - 0.5 * r;
	if (s > e) for (let t = e; t < s; t += r) l(t + Math.random() * r * o);
	else for (let t = e; t > s; t += r) l(t + Math.random() * r * o);
}
function createBurst(e, t, a = 0, o = PI_2) {
	const l = 2 * (0.5 * Math.sqrt(e / Math.PI)) * Math.PI,
		r = l / 2;
	for (let e = 0; e <= r; e++) {
		const s = (e / r) * PI_HALF,
			n = Math.cos(s),
			i = l * n,
			c = i * (o / PI_2),
			d = PI_2 / i,
			h = Math.random() * d + a,
			u = 0.33 * d;
		for (let e = 0; e < c; e++) {
			t(d * e + h + Math.random() * u, n);
		}
	}
}
function crossetteEffect(e) {
	createParticleArc(Math.random() * PI_HALF, PI_2, 4, 0.5, (t) => {
		Star.add(e.x, e.y, e.color, t, 0.6 * Math.random() + 0.75, 600);
	});
}
function floralEffect(e) {
	createBurst(12 + 6 * quality, (t, a) => {
		Star.add(e.x, e.y, e.color, t, 2.4 * a, 1e3 + 300 * Math.random(), e.speedX, e.speedY);
	}),
		BurstFlash.add(e.x, e.y, 46),
		soundManager.playSound("burstSmall");
}
function fallingLeavesEffect(e) {
	createBurst(7, (t, a) => {
		const o = Star.add(e.x, e.y, INVISIBLE, t, 2.4 * a, 2400 + 600 * Math.random(), e.speedX, e.speedY);
		(o.sparkColor = COLOR.Gold), (o.sparkFreq = 144 / quality), (o.sparkSpeed = 0.28), (o.sparkLife = 750), (o.sparkLifeVariation = 3.2);
	}),
		BurstFlash.add(e.x, e.y, 46),
		soundManager.playSound("burstSmall");
}
function crackleEffect(e) {
	createParticleArc(0, PI_2, isHighQuality ? 32 : 16, 1.8, (t) => {
		Spark.add(e.x, e.y, COLOR.Gold, t, 2.4 * Math.pow(Math.random(), 0.45), 300 + 200 * Math.random());
	});
}
mainStage.addEventListener("ticker", update);
class Shell {
	constructor(e) {
		if ((Object.assign(this, e), (this.starLifeVariation = e.starLifeVariation || 0.125), (this.color = e.color || randomColor()), (this.glitterColor = e.glitterColor || this.color), !this.starCount)) {
			const t = e.starDensity || 1,
				a = this.spreadSize / 54;
			this.starCount = Math.max(6, a * a * t);
		}
	}
	launch(e, t) {
		const a = stageH - 0.45 * stageH,
			o = e * (stageW - 120) + 60,
			l = stageH,
			r = l - (a - t * (a - 50)),
			s = Math.pow(0.04 * r, 0.64),
			n = (this.comet = Star.add(o, l, "string" == typeof this.color && "random" !== this.color ? this.color : COLOR.White, Math.PI, s * (this.horsetail ? 1.2 : 1), s * (this.horsetail ? 100 : 400)));
		(n.heavy = !0), (n.spinRadius = MyMath.random(0.32, 0.85)), (n.sparkFreq = 32 / quality), isHighQuality && (n.sparkFreq = 8), (n.sparkLife = 320), (n.sparkLifeVariation = 3), ("willow" === this.glitter || this.fallingLeaves) && ((n.sparkFreq = 20 / quality), (n.sparkSpeed = 0.5), (n.sparkLife = 500)), this.color === INVISIBLE && (n.sparkColor = COLOR.Gold), Math.random() > 0.4 && !this.horsetail && ((n.secondColor = INVISIBLE), (n.transitionTime = 700 * Math.pow(Math.random(), 1.5) + 500)), (n.onDeath = (e) => this.burst(e.x, e.y)), soundManager.playSound("lift");
	}
	burst(e, t) {
		const a = this.spreadSize / 96;
		let o,
			l,
			r,
			s,
			n,
			i = 0.25,
			c = !1;
		this.crossette &&
			(l = (e) => {
				c || (soundManager.playSound("crackleSmall"), (c = !0)), crossetteEffect(e);
			}),
			this.crackle &&
				(l = (e) => {
					c || (soundManager.playSound("crackle"), (c = !0)), crackleEffect(e);
				}),
			this.floral && (l = floralEffect),
			this.fallingLeaves && (l = fallingLeavesEffect),
			"light" === this.glitter ? ((r = 400), (s = 0.3), (n = 300), (i = 2)) : "medium" === this.glitter ? ((r = 200), (s = 0.44), (n = 700), (i = 2)) : "heavy" === this.glitter ? ((r = 80), (s = 0.8), (n = 1400), (i = 2)) : "thick" === this.glitter ? ((r = 16), (s = isHighQuality ? 1.65 : 1.5), (n = 1400), (i = 3)) : "streamer" === this.glitter ? ((r = 32), (s = 1.05), (n = 620), (i = 2)) : "willow" === this.glitter && ((r = 120), (s = 0.34), (n = 1400), (i = 3.8)),
			(r /= quality);
		const d = (c, d) => {
			const h = this.spreadSize / 1800,
				u = Star.add(e, t, o || randomColor(), c, d * a, this.starLife + Math.random() * this.starLife * this.starLifeVariation, this.horsetail ? this.comet && this.comet.speedX : 0, this.horsetail ? this.comet && this.comet.speedY : -h);
			this.secondColor && ((u.transitionTime = this.starLife * (0.05 * Math.random() + 0.32)), (u.secondColor = this.secondColor)), this.strobe && ((u.transitionTime = this.starLife * (0.08 * Math.random() + 0.46)), (u.strobe = !0), (u.strobeFreq = 20 * Math.random() + 40), this.strobeColor && (u.secondColor = this.strobeColor)), (u.onDeath = l), this.glitter && ((u.sparkFreq = r), (u.sparkSpeed = s), (u.sparkLife = n), (u.sparkLifeVariation = i), (u.sparkColor = this.glitterColor), (u.sparkTimer = Math.random() * u.sparkFreq));
		};
		if ("string" == typeof this.color)
			if (((o = "random" === this.color ? null : this.color), this.ring)) {
				const l = Math.random() * Math.PI,
					c = 0.85 * Math.pow(Math.random(), 2) + 0.15;
				createParticleArc(0, PI_2, this.starCount, 0, (d) => {
					const h = Math.sin(d) * a * c,
						u = Math.cos(d) * a,
						p = MyMath.pointDist(0, 0, h, u),
						S = MyMath.pointAngle(0, 0, h, u) + l,
						m = Star.add(e, t, o, S, p, this.starLife + Math.random() * this.starLife * this.starLifeVariation);
					this.glitter && ((m.sparkFreq = r), (m.sparkSpeed = s), (m.sparkLife = n), (m.sparkLifeVariation = i), (m.sparkColor = this.glitterColor), (m.sparkTimer = Math.random() * m.sparkFreq));
				});
			} else createBurst(this.starCount, d);
		else {
			if (!Array.isArray(this.color)) throw new Error("Invalid shell color. Expected string or array of strings, but got: " + this.color);
			if (Math.random() < 0.5) {
				const e = Math.random() * Math.PI,
					t = e + Math.PI,
					a = Math.PI;
				(o = this.color[0]), createBurst(this.starCount, d, e, a), (o = this.color[1]), createBurst(this.starCount, d, t, a);
			} else (o = this.color[0]), createBurst(this.starCount / 2, d), (o = this.color[1]), createBurst(this.starCount / 2, d);
		}
		if (this.pistil) {
			new Shell({ spreadSize: 0.5 * this.spreadSize, starLife: 0.6 * this.starLife, starLifeVariation: this.starLifeVariation, starDensity: 1.4, color: this.pistilColor, glitter: "light", glitterColor: this.pistilColor === COLOR.Gold ? COLOR.Gold : COLOR.White }).burst(e, t);
		}
		if (this.streamers) {
			new Shell({ spreadSize: 0.9 * this.spreadSize, starLife: 0.8 * this.starLife, starLifeVariation: this.starLifeVariation, starCount: Math.floor(Math.max(6, this.spreadSize / 45)), color: COLOR.White, glitter: "streamer" }).burst(e, t);
		}
		if ((BurstFlash.add(e, t, this.spreadSize / 4), this.comet)) {
			const e = 2,
				t = 0.3 * (1 - Math.min(e, shellSizeSelector() - this.shellSize) / e) + 0.7;
			soundManager.playSound("burst", t);
		}
	}
}
const BurstFlash = {
	active: [],
	_pool: [],
	_new: () => ({}),
	add(e, t, a) {
		const o = this._pool.pop() || this._new();
		return (o.x = e), (o.y = t), (o.radius = a), this.active.push(o), o;
	},
	returnInstance(e) {
		this._pool.push(e);
	},
};
function createParticleCollection() {
	const e = {};
	return (
		COLOR_CODES_W_INVIS.forEach((t) => {
			e[t] = [];
		}),
		e
	);
}
const Star = {
		drawWidth: 3,
		airDrag: 0.98,
		airDragHeavy: 0.992,
		active: createParticleCollection(),
		_pool: [],
		_new: () => ({}),
		add(e, t, a, o, l, r, s, n) {
			const i = this._pool.pop() || this._new();
			return (i.visible = !0), (i.heavy = !1), (i.x = e), (i.y = t), (i.prevX = e), (i.prevY = t), (i.color = a), (i.speedX = Math.sin(o) * l + (s || 0)), (i.speedY = Math.cos(o) * l + (n || 0)), (i.life = r), (i.fullLife = r), (i.spinAngle = Math.random() * PI_2), (i.spinSpeed = 0.8), (i.spinRadius = 0), (i.sparkFreq = 0), (i.sparkSpeed = 1), (i.sparkTimer = 0), (i.sparkColor = a), (i.sparkLife = 750), (i.sparkLifeVariation = 0.25), (i.strobe = !1), this.active[a].push(i), i;
		},
		returnInstance(e) {
			e.onDeath && e.onDeath(e), (e.onDeath = null), (e.secondColor = null), (e.transitionTime = 0), (e.colorChanged = !1), this._pool.push(e);
		},
	},
	Spark = {
		drawWidth: 0,
		airDrag: 0.9,
		active: createParticleCollection(),
		_pool: [],
		_new: () => ({}),
		add(e, t, a, o, l, r) {
			const s = this._pool.pop() || this._new();
			return (s.x = e), (s.y = t), (s.prevX = e), (s.prevY = t), (s.color = a), (s.speedX = Math.sin(o) * l), (s.speedY = Math.cos(o) * l), (s.life = r), this.active[a].push(s), s;
		},
		returnInstance(e) {
			this._pool.push(e);
		},
	},
	soundManager = {
		baseURL: "../audio/",
		ctx: new (window.AudioContext || window.webkitAudioContext)(),
		sources: { lift: { volume: 1, playbackRateMin: 0.85, playbackRateMax: 0.95, fileNames: ["lift1.mp3", "lift2.mp3", "lift3.mp3"] }, burst: { volume: 1, playbackRateMin: 0.8, playbackRateMax: 0.9, fileNames: ["lift3.mp3", "burst2.mp3"] }, burstSmall: { volume: 0.25, playbackRateMin: 0.8, playbackRateMax: 1, fileNames: ["burst-sm-1.mp3", "burst-sm-2.mp3"] }, crackle: { volume: 0.2, playbackRateMin: 1, playbackRateMax: 1, fileNames: ["crackle1.mp3"] }, crackleSmall: { volume: 0.3, playbackRateMin: 1, playbackRateMax: 1, fileNames: ["crackle-sm-1.mp3"] } },
		preload() {
			const e = [];
			function t(e) {
				if (e.status >= 200 && e.status < 300) return e;
				const t = new Error(e.statusText);
				throw ((t.response = e), t);
			}
			return (
				Object.keys(this.sources).forEach((a) => {
					const o = this.sources[a],
						{ fileNames: l } = o,
						r = [];
					l.forEach((a) => {
						const o = this.baseURL + a,
							l = fetch(o)
								.then(t)
								.then((e) => e.arrayBuffer())
								.then(
									(e) =>
										new Promise((t) => {
											this.ctx.decodeAudioData(e, t);
										})
								);
						r.push(l), e.push(l);
					}),
						Promise.all(r).then((e) => {
							o.buffers = e;
						});
				}),
				Promise.all(e)
			);
		},
		pauseAll() {
			this.ctx.suspend();
		},
		resumeAll() {
			this.playSound("lift", 0),
				setTimeout(() => {
					this.ctx.resume();
				}, 250);
		},
		_lastSmallBurstTime: 0,
		playSound(e, t = 1) {
			if (((t = MyMath.clamp(t, 0, 1)), !canPlaySoundSelector() || simSpeed < 0.95)) return;
			if ("burstSmall" === e) {
				const e = Date.now();
				if (e - this._lastSmallBurstTime < 20) return;
				this._lastSmallBurstTime = e;
			}
			const a = this.sources[e];
			if (!a) throw new Error(`Sound of type "${e}" doesn't exist.`);
			const o = a.volume * t,
				l = MyMath.random(a.playbackRateMin, a.playbackRateMax) * (2 - t),
				r = this.ctx.createGain();
			r.gain.value = o;
			const s = MyMath.randomChoice(a.buffers),
				n = this.ctx.createBufferSource();
			(n.playbackRate.value = l), (n.buffer = s), n.connect(r), r.connect(this.ctx.destination), n.start(0);
		},
	};
function setLoadingStatus(e) {
	document.querySelector(".loading-init__status").textContent = e;
}
IS_HEADER
	? init()
	: (setLoadingStatus("正在点燃导火线"),
	  setTimeout(() => {
			soundManager.preload().then(init, (e) => (init(), Promise.reject(e)));
	  }, 0));
