/*
Copyright © 2022 NianBroken. All rights reserved.
Github：https://github.com/NianBroken/Firework_Simulator
Gitee：https://gitee.com/nianbroken/Firework_Simulator
本项目采用 Apache-2.0 许可证
简而言之，你可以自由使用、修改和分享本项目的代码，但前提是在其衍生作品中必须保留原始许可证和版权信息，并且必须以相同的许可证发布所有修改过的代码。
*/

"use strict";

//这是一个从简单项目开始的典型例子
//并且雪球远远超出了它的预期大小。有点笨重
//读取/处理这个单独的文件，但不管怎样，它还是在这里:)

const IS_MOBILE = window.innerWidth <= 640;
const IS_DESKTOP = window.innerWidth > 800;
const IS_HEADER = IS_DESKTOP && window.innerHeight < 300;
// Detect high end devices. This will be a moving target.
const IS_HIGH_END_DEVICE = (() => {
	const hwConcurrency = navigator.hardwareConcurrency;
	if (!hwConcurrency) {
		return false;
	}
	//大屏幕显示的是全尺寸的计算机，现在的计算机通常都有超线程技术。
	//所以一台四核台式机有8个核心。我们将在那里设置一个更高的最小阈值。
	const minCount = window.innerWidth <= 1024 ? 4 : 8;
	return hwConcurrency >= minCount;
})();
//防止画布在荒谬的屏幕尺寸上变得过大。
// 8K -如果需要，可以对此进行限制
const MAX_WIDTH = 7680;
const MAX_HEIGHT = 4320;
const GRAVITY = 0.9; //以像素/秒为单位的加速度
let simSpeed = 1;

function getDefaultScaleFactor() {
	if (IS_MOBILE) return 0.9;
	if (IS_HEADER) return 0.75;
	return 1;
}

//考虑比例的宽度/高度值。
//使用这些来绘制位置
let stageW, stageH;

//所有质量全局变量都将被覆盖，并通过“configDidUpdate”进行更新。
let quality = 1;
let isLowQuality = false;
let isNormalQuality = false;
let isHighQuality = true;

const QUALITY_LOW = 1;
const QUALITY_NORMAL = 2;
const QUALITY_HIGH = 3;

const SKY_LIGHT_NONE = 0;
const SKY_LIGHT_DIM = 1;
const SKY_LIGHT_NORMAL = 2;

const COLOR = {
	Red: "#ff0043",
	Green: "#14fc56",
	Blue: "#1e7fff",
	Purple: "#e60aff",
	Gold: "#ffbf36",
	White: "#ffffff",
};

//特殊的不可见颜色(未呈现，因此不在颜色贴图中)
const INVISIBLE = "_INVISIBLE_";

const PI_2 = Math.PI * 2;
const PI_HALF = Math.PI * 0.5;

// Stage.disableHighDPI = true;
const trailsStage = new Stage("trails-canvas");
const mainStage = new Stage("main-canvas");
const stages = [trailsStage, mainStage];

//随机文字烟花内容
const randomWords = [""];
const wordDotsMap = {};
randomWords.forEach((word) => {
	wordDotsMap[word] = MyMath.literalLattice(word, 3, "Gabriola,华文琥珀", "90px");
});

// 自定义背景
document.addEventListener("DOMContentLoaded", function () {
	// 获取目标div元素
	var canvasContainer = document.querySelector(".canvas-container");
	// 设置背景图像和背景大小
	// 在这里输入图片路径
	canvasContainer.style.backgroundImage = "url()";
	canvasContainer.style.backgroundSize = "100%";
});

//全屏帮助程序，使用Fscreen作为前缀。
function fullscreenEnabled() {
	return fscreen.fullscreenEnabled;
}

//请注意，全屏状态与存储同步，存储应该是源
//判断应用程序是否处于全屏模式。
function isFullscreen() {
	return !!fscreen.fullscreenElement;
}

// 尝试切换全屏模式。
function toggleFullscreen() {
	if (fullscreenEnabled()) {
		if (isFullscreen()) {
			fscreen.exitFullscreen();
		} else {
			fscreen.requestFullscreen(document.documentElement);
		}
	}
}

// 将全屏更改与存储同步。事件侦听器是必需的，因为用户可以
// 直接通过浏览器切换全屏模式，我们希望对此做出反应。
// 这个项目的版权归NianBroken所有！
fscreen.addEventListener("fullscreenchange", () => {
	store.setState({ fullscreen: isFullscreen() });
});

// 简单的状态容器
const store = {
	_listeners: new Set(),
	_dispatch(prevState) {
		this._listeners.forEach((listener) => listener(this.state, prevState));
	},

	//当前上下文状态
	state: {
		// 将在init()中取消挂起
		paused: true,
		soundEnabled: true,
		menuOpen: false,
		openHelpTopic: null,
		fullscreen: isFullscreen(),
		//请注意，用于<select>的配置值必须是字符串，除非手动将值转换为字符串
		//在呈现时，并在更改时解析。
		config: {
			quality: String(IS_HIGH_END_DEVICE ? QUALITY_HIGH : QUALITY_NORMAL), // will be mirrored to a global variable named `quality` in `configDidUpdate`, for perf.
			shell: "Random",
			size: IS_DESKTOP
				? "3" // Desktop default
				: IS_HEADER
				? "1.2" //配置文件头默认值(不必是int)
				: "2", //手机默认
			wordShell: true, //文字烟花 默认为开启 若不开启可修改为false
			autoLaunch: true, //自动发射烟花
			finale: true, //同时放更多烟花
			skyLighting: SKY_LIGHT_NORMAL + "",
			hideControls: IS_HEADER,
			longExposure: false,
			scaleFactor: getDefaultScaleFactor(),
		},
	},

	setState(nextState) {
		const prevState = this.state;
		this.state = Object.assign({}, this.state, nextState);
		this._dispatch(prevState);
		this.persist();
	},

	subscribe(listener) {
		this._listeners.add(listener);
		return () => this._listeners.remove(listener);
	},

	// Load / persist select state to localStorage
	// Mutates state because `store.load()` should only be called once immediately after store is created, before any subscriptions.
	load() {
		const serializedData = localStorage.getItem("cm_fireworks_data");
		if (serializedData) {
			const { schemaVersion, data } = JSON.parse(serializedData);

			const config = this.state.config;
			switch (schemaVersion) {
				case "1.1":
					config.quality = data.quality;
					config.size = data.size;
					config.skyLighting = data.skyLighting;
					break;
				case "1.2":
					config.quality = data.quality;
					config.size = data.size;
					config.skyLighting = data.skyLighting;
					config.scaleFactor = data.scaleFactor;
					break;
				default:
					throw new Error("version switch should be exhaustive");
			}
			console.log(`Loaded config (schema version ${schemaVersion})`);
		}
		// Deprecated data format. Checked with care (it's not namespaced).
		else if (localStorage.getItem("schemaVersion") === "1") {
			let size;
			// Attempt to parse data, ignoring if there is an error.
			try {
				const sizeRaw = localStorage.getItem("configSize");
				size = typeof sizeRaw === "string" && JSON.parse(sizeRaw);
			} catch (e) {
				console.log("Recovered from error parsing saved config:");
				console.error(e);
				return;
			}
			// Only restore validated values
			const sizeInt = parseInt(size, 10);
			if (sizeInt >= 0 && sizeInt <= 4) {
				this.state.config.size = String(sizeInt);
			}
		}
	},

	persist() {
		const config = this.state.config;
		localStorage.setItem(
			"cm_fireworks_data",
			JSON.stringify({
				schemaVersion: "1.2",
				data: {
					quality: config.quality,
					size: config.size,
					skyLighting: config.skyLighting,
					scaleFactor: config.scaleFactor,
				},
			})
		);
	},
};

if (!IS_HEADER) {
	store.load();
}

// Actions
// ---------

function togglePause(toggle) {
	const paused = store.state.paused;
	let newValue;
	if (typeof toggle === "boolean") {
		newValue = toggle;
	} else {
		newValue = !paused;
	}

	if (paused !== newValue) {
		store.setState({ paused: newValue });
	}
}

function toggleSound(toggle) {
	if (typeof toggle === "boolean") {
		store.setState({ soundEnabled: toggle });
	} else {
		store.setState({ soundEnabled: !store.state.soundEnabled });
	}
}

function toggleMenu(toggle) {
	if (typeof toggle === "boolean") {
		store.setState({ menuOpen: toggle });
	} else {
		store.setState({ menuOpen: !store.state.menuOpen });
	}
}

function updateConfig(nextConfig) {
	nextConfig = nextConfig || getConfigFromDOM();
	store.setState({
		config: Object.assign({}, store.state.config, nextConfig),
	});

	configDidUpdate();
}

// Map config to various properties & apply side effects
function configDidUpdate() {
	const config = store.state.config;

	quality = qualitySelector();
	isLowQuality = quality === QUALITY_LOW;
	isNormalQuality = quality === QUALITY_NORMAL;
	isHighQuality = quality === QUALITY_HIGH;

	if (skyLightingSelector() === SKY_LIGHT_NONE) {
		appNodes.canvasContainer.style.backgroundColor = "#000";
	}

	Spark.drawWidth = quality === QUALITY_HIGH ? 0.75 : 1;
}

// Selectors
// -----------

const isRunning = (state = store.state) => !state.paused && !state.menuOpen;
// Whether user has enabled sound.
const soundEnabledSelector = (state = store.state) => state.soundEnabled;
// Whether any sounds are allowed, taking into account multiple factors.
const canPlaySoundSelector = (state = store.state) => isRunning(state) && soundEnabledSelector(state);
// Convert quality to number.
const qualitySelector = () => +store.state.config.quality;
const shellNameSelector = () => store.state.config.shell;
// Convert shell size to number.
const shellSizeSelector = () => +store.state.config.size;
const finaleSelector = () => store.state.config.finale;
const skyLightingSelector = () => +store.state.config.skyLighting;
const scaleFactorSelector = () => store.state.config.scaleFactor;

// Help Content
const helpContent = {
	shellType: {
		header: "烟花类型",
		body: "你要放的烟花的类型，选择“随机（Random）”可以获得非常好的体验！",
	},
	shellSize: {
		header: "烟花大小",
		body: "烟花越大绽放范围就越大，但是烟花越大，设备所需的性能也会增多，大的烟花可能导致你的设备卡顿。",
	},
	quality: {
		header: "画质",
		body: "如果动画运行不流畅，你可以试试降低画质。画质越高，烟花绽放后的火花数量就越多，但高画质可能导致你的设备卡顿。",
	},
	skyLighting: {
		header: "照亮天空",
		body: "烟花爆炸时，背景会被照亮。如果你的屏幕看起来太亮了，可以把它改成“暗”或者“不”。",
	},
	scaleFactor: {
		header: "缩放",
		body: "使你与烟花离得更近或更远。对于较大的烟花，你可以选择更小的缩放值，尤其是在手机或平板电脑上。",
	},
	wordShell: {
		header: "文字烟花",
		body: "开启后，会出现烟花形状的文字。例如：新年快乐、心想事成等等",
	},
	autoLaunch: {
		header: "自动放烟花",
		body: "开启后你就可以坐在你的设备屏幕前面欣赏烟花了，你也可以关闭它，但关闭后你就只能通过点击屏幕的方式来放烟花。",
	},
	finaleMode: {
		header: "同时放更多的烟花",
		body: "可以在同一时间自动放出更多的烟花（但需要开启先开启“自动放烟花”）。",
	},
	hideControls: {
		header: "隐藏控制按钮",
		body: "隐藏屏幕顶部的按钮。如果你要截图，或者需要一个无缝的体验，你就可以将按钮隐藏，隐藏按钮后你仍然可以在右上角打开设置。",
	},
	fullscreen: {
		header: "全屏",
		body: "切换至全屏模式",
	},
	longExposure: {
		header: "保留烟花的火花",
		body: "可以保留烟花留下的火花",
	},
};

const nodeKeyToHelpKey = {
	shellTypeLabel: "shellType",
	shellSizeLabel: "shellSize",
	qualityLabel: "quality",
	skyLightingLabel: "skyLighting",
	scaleFactorLabel: "scaleFactor",
	wordShellLabel: "wordShell",
	autoLaunchLabel: "autoLaunch",
	finaleModeLabel: "finaleMode",
	hideControlsLabel: "hideControls",
	fullscreenLabel: "fullscreen",
	longExposureLabel: "longExposure",
};

// 程序dom节点列表
const appNodes = {
	stageContainer: ".stage-container",
	canvasContainer: ".canvas-container",
	controls: ".controls",
	menu: ".menu",
	menuInnerWrap: ".menu__inner-wrap",
	pauseBtn: ".pause-btn",
	pauseBtnSVG: ".pause-btn use",
	soundBtn: ".sound-btn",
	soundBtnSVG: ".sound-btn use",
	shellType: ".shell-type",
	shellTypeLabel: ".shell-type-label",
	shellSize: ".shell-size", //烟花大小
	shellSizeLabel: ".shell-size-label",
	quality: ".quality-ui",
	qualityLabel: ".quality-ui-label",
	skyLighting: ".sky-lighting",
	skyLightingLabel: ".sky-lighting-label",
	scaleFactor: ".scaleFactor",
	scaleFactorLabel: ".scaleFactor-label",
	wordShell: ".word-shell", // 文字烟花
	wordShellLabel: ".word-shell-label",
	autoLaunch: ".auto-launch", //自动烟花开关
	autoLaunchLabel: ".auto-launch-label",
	finaleModeFormOption: ".form-option--finale-mode",
	finaleMode: ".finale-mode",
	finaleModeLabel: ".finale-mode-label",
	hideControls: ".hide-controls",
	hideControlsLabel: ".hide-controls-label",
	fullscreenFormOption: ".form-option--fullscreen",
	fullscreen: ".fullscreen",
	fullscreenLabel: ".fullscreen-label",
	longExposure: ".long-exposure",
	longExposureLabel: ".long-exposure-label",

	// Help UI
	helpModal: ".help-modal",
	helpModalOverlay: ".help-modal__overlay",
	helpModalHeader: ".help-modal__header",
	helpModalBody: ".help-modal__body",
	helpModalCloseBtn: ".help-modal__close-btn",
};

// Convert appNodes selectors to dom nodes
Object.keys(appNodes).forEach((key) => {
	appNodes[key] = document.querySelector(appNodes[key]);
});

// Remove fullscreen control if not supported.
if (!fullscreenEnabled()) {
	appNodes.fullscreenFormOption.classList.add("remove");
}

//第一次渲染是在状态机 init()中调用的
function renderApp(state) {
	const pauseBtnIcon = `#icon-${state.paused ? "play" : "pause"}`;
	const soundBtnIcon = `#icon-sound-${soundEnabledSelector() ? "on" : "off"}`;
	appNodes.pauseBtnSVG.setAttribute("href", pauseBtnIcon);
	appNodes.pauseBtnSVG.setAttribute("xlink:href", pauseBtnIcon);
	appNodes.soundBtnSVG.setAttribute("href", soundBtnIcon);
	appNodes.soundBtnSVG.setAttribute("xlink:href", soundBtnIcon);
	appNodes.controls.classList.toggle("hide", state.menuOpen || state.config.hideControls);
	appNodes.canvasContainer.classList.toggle("blur", state.menuOpen);
	appNodes.menu.classList.toggle("hide", !state.menuOpen);
	appNodes.finaleModeFormOption.style.opacity = state.config.autoLaunch ? 1 : 0.32;

	appNodes.quality.value = state.config.quality;
	appNodes.shellType.value = state.config.shell;
	appNodes.shellSize.value = state.config.size;
	appNodes.wordShell.checked = state.config.wordShell;
	appNodes.autoLaunch.checked = state.config.autoLaunch;
	appNodes.finaleMode.checked = state.config.finale;
	appNodes.skyLighting.value = state.config.skyLighting;
	appNodes.hideControls.checked = state.config.hideControls;
	appNodes.fullscreen.checked = state.fullscreen;
	appNodes.longExposure.checked = state.config.longExposure;
	appNodes.scaleFactor.value = state.config.scaleFactor.toFixed(2);

	appNodes.menuInnerWrap.style.opacity = state.openHelpTopic ? 0.12 : 1;
	appNodes.helpModal.classList.toggle("active", !!state.openHelpTopic);
	if (state.openHelpTopic) {
		const { header, body } = helpContent[state.openHelpTopic];
		appNodes.helpModalHeader.textContent = header;
		appNodes.helpModalBody.textContent = body;
	}
}

store.subscribe(renderApp);

// Perform side effects on state changes
function handleStateChange(state, prevState) {
	const canPlaySound = canPlaySoundSelector(state);
	const canPlaySoundPrev = canPlaySoundSelector(prevState);

	if (canPlaySound !== canPlaySoundPrev) {
		if (canPlaySound) {
			soundManager.resumeAll();
		} else {
			soundManager.pauseAll();
		}
	}
}

store.subscribe(handleStateChange);

//根据dom状态获取配置
function getConfigFromDOM() {
	return {
		quality: appNodes.quality.value,
		shell: appNodes.shellType.value,
		size: appNodes.shellSize.value,
		wordShell: appNodes.wordShell.checked,
		autoLaunch: appNodes.autoLaunch.checked,
		finale: appNodes.finaleMode.checked,
		skyLighting: appNodes.skyLighting.value,
		longExposure: appNodes.longExposure.checked,
		hideControls: appNodes.hideControls.checked,
		// Store value as number.
		scaleFactor: parseFloat(appNodes.scaleFactor.value),
	};
}

const updateConfigNoEvent = () => updateConfig();
appNodes.quality.addEventListener("input", updateConfigNoEvent);
appNodes.shellType.addEventListener("input", updateConfigNoEvent);
appNodes.shellSize.addEventListener("input", updateConfigNoEvent);
appNodes.wordShell.addEventListener("click", () => setTimeout(updateConfig, 0));
appNodes.autoLaunch.addEventListener("click", () => setTimeout(updateConfig, 0));
appNodes.finaleMode.addEventListener("click", () => setTimeout(updateConfig, 0));
appNodes.skyLighting.addEventListener("input", updateConfigNoEvent);
appNodes.longExposure.addEventListener("click", () => setTimeout(updateConfig, 0));
appNodes.hideControls.addEventListener("click", () => setTimeout(updateConfig, 0));
appNodes.fullscreen.addEventListener("click", () => setTimeout(toggleFullscreen, 0));
// Changing scaleFactor requires triggering resize handling code as well.
appNodes.scaleFactor.addEventListener("input", () => {
	updateConfig();
	handleResize();
});

Object.keys(nodeKeyToHelpKey).forEach((nodeKey) => {
	const helpKey = nodeKeyToHelpKey[nodeKey];
	appNodes[nodeKey].addEventListener("click", () => {
		store.setState({ openHelpTopic: helpKey });
	});
});

appNodes.helpModalCloseBtn.addEventListener("click", () => {
	store.setState({ openHelpTopic: null });
});

appNodes.helpModalOverlay.addEventListener("click", () => {
	store.setState({ openHelpTopic: null });
});

//常数导数
const COLOR_NAMES = Object.keys(COLOR);
const COLOR_CODES = COLOR_NAMES.map((colorName) => COLOR[colorName]);
//看不见的星星需要一个标识符，即使它们不会被渲染——物理学仍然适用。
const COLOR_CODES_W_INVIS = [...COLOR_CODES, INVISIBLE];
//颜色代码映射到它们在数组中的索引。对于快速确定颜色是否已经在循环中更新非常有用。
const COLOR_CODE_INDEXES = COLOR_CODES_W_INVIS.reduce((obj, code, i) => {
	obj[code] = i;
	return obj;
}, {});
// Tuples是用{ r，g，b }元组(仍然只是对象)的值通过颜色代码(十六进制)映射的键。
const COLOR_TUPLES = {};
COLOR_CODES.forEach((hex) => {
	COLOR_TUPLES[hex] = {
		r: parseInt(hex.substr(1, 2), 16),
		g: parseInt(hex.substr(3, 2), 16),
		b: parseInt(hex.substr(5, 2), 16),
	};
});

// 获取随机颜色
function randomColorSimple() {
	return COLOR_CODES[(Math.random() * COLOR_CODES.length) | 0];
}

// 得到一个随机的颜色根据一些定制选项
let lastColor;
function randomColor(options) {
	const notSame = options && options.notSame;
	const notColor = options && options.notColor;
	const limitWhite = options && options.limitWhite;
	let color = randomColorSimple();

	// 限制白色随机抽取的
	if (limitWhite && color === COLOR.White && Math.random() < 0.6) {
		color = randomColorSimple();
	}

	if (notSame) {
		while (color === lastColor) {
			color = randomColorSimple();
		}
	} else if (notColor) {
		while (color === notColor) {
			color = randomColorSimple();
		}
	}

	lastColor = color;
	return color;
}

// 随机获取一段文字
function randomWord() {
	if (randomWords.length === 0) return "";
	if (randomWords.length === 1) return randomWords[0];
	return randomWords[(Math.random() * randomWords.length) | 0];
}

function whiteOrGold() {
	return Math.random() < 0.5 ? COLOR.Gold : COLOR.White;
}

// Shell helpers
function makePistilColor(shellColor) {
	return shellColor === COLOR.White || shellColor === COLOR.Gold ? randomColor({ notColor: shellColor }) : whiteOrGold();
}

// 唯一的 shell 类型
const crysanthemumShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 0.72;
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = singleColor && Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor = singleColor && (Math.random() < 0.2 || color === COLOR.White) ? pistilColor || randomColor({ notColor: color, limitWhite: true }) : null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	let starDensity = glitter ? 1.1 : 1.25;
	if (isLowQuality) starDensity *= 0.8;
	if (isHighQuality) starDensity = 1.2;
	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starDensity,
		color,
		secondColor,
		glitter: glitter ? "light" : "",
		glitterColor: whiteOrGold(),
		pistil,
		pistilColor,
		streamers,
	};
};

const ghostShell = (size = 1) => {
	// Extend crysanthemum shell
	const shell = crysanthemumShell(size);
	// Ghost effect can be fast, so extend star life
	shell.starLife *= 1.5;
	// Ensure we always have a single color other than white
	let ghostColor = randomColor({ notColor: COLOR.White });
	// Always use streamers, and sometimes a pistil
	shell.streamers = true;
	const pistil = Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(ghostColor);
	// Ghost effect - transition from invisible to chosen color
	shell.color = INVISIBLE;
	shell.secondColor = ghostColor;
	// We don't want glitter to be spewed by invisible stars, and we don't currently
	// have a way to transition glitter state. So we'll disable it.
	shell.glitter = "";

	return shell;
};

const strobeShell = (size = 1) => {
	const color = randomColor({ limitWhite: true });
	return {
		shellSize: size,
		spreadSize: 280 + size * 92,
		starLife: 1100 + size * 200,
		starLifeVariation: 0.4,
		starDensity: 1.1,
		color,
		glitter: "light",
		glitterColor: COLOR.White,
		strobe: true,
		strobeColor: Math.random() < 0.5 ? COLOR.White : null,
		pistil: Math.random() < 0.5,
		pistilColor: makePistilColor(color),
	};
};

const palmShell = (size = 1) => {
	const color = randomColor();
	const thick = Math.random() < 0.5;
	return {
		shellSize: size,
		color,
		spreadSize: 250 + size * 75,
		starDensity: thick ? 0.15 : 0.4,
		starLife: 1800 + size * 200,
		glitter: thick ? "thick" : "heavy",
	};
};

const ringShell = (size = 1) => {
	const color = randomColor();
	const pistil = Math.random() < 0.75;
	return {
		shellSize: size,
		ring: true,
		color,
		spreadSize: 300 + size * 100,
		starLife: 900 + size * 200,
		starCount: 2.2 * PI_2 * (size + 1),
		pistil,
		pistilColor: makePistilColor(color),
		glitter: !pistil ? "light" : "",
		glitterColor: color === COLOR.Gold ? COLOR.Gold : COLOR.White,
		streamers: Math.random() < 0.3,
	};
	// return Object.assign({}, defaultShell, config);
};

const crossetteShell = (size = 1) => {
	const color = randomColor({ limitWhite: true });
	return {
		shellSize: size,
		spreadSize: 300 + size * 100,
		starLife: 750 + size * 160,
		starLifeVariation: 0.4,
		starDensity: 0.85,
		color,
		crossette: true,
		pistil: Math.random() < 0.5,
		pistilColor: makePistilColor(color),
	};
};

const floralShell = (size = 1) => ({
	shellSize: size,
	spreadSize: 300 + size * 120,
	starDensity: 0.12,
	starLife: 500 + size * 50,
	starLifeVariation: 0.5,
	color: Math.random() < 0.65 ? "random" : Math.random() < 0.15 ? randomColor() : [randomColor(), randomColor({ notSame: true })],
	floral: true,
});

const fallingLeavesShell = (size = 1) => ({
	shellSize: size,
	color: INVISIBLE,
	spreadSize: 300 + size * 120,
	starDensity: 0.12,
	starLife: 500 + size * 50,
	starLifeVariation: 0.5,
	glitter: "medium",
	glitterColor: COLOR.Gold,
	fallingLeaves: true,
});

const willowShell = (size = 1) => ({
	shellSize: size,
	spreadSize: 300 + size * 100,
	starDensity: 0.6,
	starLife: 3000 + size * 300,
	glitter: "willow",
	glitterColor: COLOR.Gold,
	color: INVISIBLE,
});

const crackleShell = (size = 1) => {
	// favor gold
	const color = Math.random() < 0.75 ? COLOR.Gold : randomColor();
	return {
		shellSize: size,
		spreadSize: 380 + size * 75,
		starDensity: isLowQuality ? 0.65 : 1,
		starLife: 600 + size * 100,
		starLifeVariation: 0.32,
		glitter: "light",
		glitterColor: COLOR.Gold,
		color,
		crackle: true,
		pistil: Math.random() < 0.65,
		pistilColor: makePistilColor(color),
	};
};

const horsetailShell = (size = 1) => {
	const color = randomColor();
	return {
		shellSize: size,
		horsetail: true,
		color,
		spreadSize: 250 + size * 38,
		starDensity: 0.9,
		starLife: 2500 + size * 300,
		glitter: "medium",
		glitterColor: Math.random() < 0.5 ? whiteOrGold() : color,
		// Add strobe effect to white horsetails, to make them more interesting
		strobe: color === COLOR.White,
	};
};

function randomShellName() {
	return Math.random() < 0.5 ? "Crysanthemum" : shellNames[(Math.random() * (shellNames.length - 1) + 1) | 0];
}

function randomShell(size) {
	// Special selection for codepen header.
	if (IS_HEADER) return randomFastShell()(size);
	// Normal operation
	return shellTypes[randomShellName()](size);
}

function shellFromConfig(size) {
	return shellTypes[shellNameSelector()](size);
}

//获取随机外壳，不包括处理密集型变体
//注意，只有在配置中选择了“随机”shell时，这才是随机的。
//还有，这不创建烟花，只返回工厂函数。
const fastShellBlacklist = ["Falling Leaves", "Floral", "Willow"];
function randomFastShell() {
	const isRandom = shellNameSelector() === "Random";
	let shellName = isRandom ? randomShellName() : shellNameSelector();
	if (isRandom) {
		while (fastShellBlacklist.includes(shellName)) {
			shellName = randomShellName();
		}
	}
	return shellTypes[shellName];
}

//烟花类型
const shellTypes = {
	Random: randomShell,
	Crackle: crackleShell,
	Crossette: crossetteShell,
	Crysanthemum: crysanthemumShell,
	"Falling Leaves": fallingLeavesShell,
	Floral: floralShell,
	Ghost: ghostShell,
	"Horse Tail": horsetailShell,
	Palm: palmShell,
	Ring: ringShell,
	Strobe: strobeShell,
	Willow: willowShell,
};

const shellNames = Object.keys(shellTypes);

function init() {
	// Remove loading state
	document.querySelector(".loading-init").remove();
	appNodes.stageContainer.classList.remove("remove");

	// Populate dropdowns
	function setOptionsForSelect(node, options) {
		node.innerHTML = options.reduce((acc, opt) => (acc += `<option value="${opt.value}">${opt.label}</option>`), "");
	}

	// shell type
	let options = "";
	shellNames.forEach((opt) => (options += `<option value="${opt}">${opt}</option>`));
	appNodes.shellType.innerHTML = options;
	// shell size
	options = "";
	['3"', '4"', '6"', '8"', '12"', '16"'].forEach((opt, i) => (options += `<option value="${i}">${opt}</option>`));
	appNodes.shellSize.innerHTML = options;

	setOptionsForSelect(appNodes.quality, [
		{ label: "低", value: QUALITY_LOW },
		{ label: "正常", value: QUALITY_NORMAL },
		{ label: "高", value: QUALITY_HIGH },
	]);

	setOptionsForSelect(appNodes.skyLighting, [
		{ label: "不", value: SKY_LIGHT_NONE },
		{ label: "暗", value: SKY_LIGHT_DIM },
		{ label: "正常", value: SKY_LIGHT_NORMAL },
	]);

	// 0.9 is mobile default
	setOptionsForSelect(
		appNodes.scaleFactor,
		[0.5, 0.62, 0.75, 0.9, 1.0, 1.5, 2.0].map((value) => ({ value: value.toFixed(2), label: `${value * 100}%` }))
	);

	// Begin simulation
	togglePause(false);

	// initial render
	renderApp(store.state);

	// Apply initial config
	configDidUpdate();
}

function fitShellPositionInBoundsH(position) {
	const edge = 0.18;
	return (1 - edge * 2) * position + edge;
}

function fitShellPositionInBoundsV(position) {
	return position * 0.75;
}

function getRandomShellPositionH() {
	return fitShellPositionInBoundsH(Math.random());
}

function getRandomShellPositionV() {
	return fitShellPositionInBoundsV(Math.random());
}

// 获取随机的烟花尺寸
function getRandomShellSize() {
	const baseSize = shellSizeSelector();
	const maxVariance = Math.min(2.5, baseSize);
	const variance = Math.random() * maxVariance;
	const size = baseSize - variance;
	const height = maxVariance === 0 ? Math.random() : 1 - variance / maxVariance;
	const centerOffset = Math.random() * (1 - height * 0.65) * 0.5;
	const x = Math.random() < 0.5 ? 0.5 - centerOffset : 0.5 + centerOffset;
	return {
		size,
		x: fitShellPositionInBoundsH(x),
		height: fitShellPositionInBoundsV(height),
	};
}

// Launches a shell from a user pointer event, based on state.config
function launchShellFromConfig(event) {
	const shell = new Shell(shellFromConfig(shellSizeSelector()));
	const w = mainStage.width;
	const h = mainStage.height;

	shell.launch(event ? event.x / w : getRandomShellPositionH(), event ? 1 - event.y / h : getRandomShellPositionV());
}

// Sequences
// -----------

//随机生成一个烟花
function seqRandomShell() {
	const size = getRandomShellSize();
	const shell = new Shell(shellFromConfig(size.size));
	shell.launch(size.x, size.height);

	let extraDelay = shell.starLife;
	if (shell.fallingLeaves) {
		extraDelay = 4600;
	}

	return 900 + Math.random() * 600 + extraDelay;
}

function seqRandomFastShell() {
	const shellType = randomFastShell();
	const size = getRandomShellSize();
	const shell = new Shell(shellType(size.size));
	shell.launch(size.x, size.height);

	let extraDelay = shell.starLife;

	return 900 + Math.random() * 600 + extraDelay;
}

function seqTwoRandom() {
	const size1 = getRandomShellSize();
	const size2 = getRandomShellSize();
	const shell1 = new Shell(shellFromConfig(size1.size));
	const shell2 = new Shell(shellFromConfig(size2.size));
	const leftOffset = Math.random() * 0.2 - 0.1;
	const rightOffset = Math.random() * 0.2 - 0.1;
	shell1.launch(0.3 + leftOffset, size1.height);
	setTimeout(() => {
		shell2.launch(0.7 + rightOffset, size2.height);
	}, 100);

	let extraDelay = Math.max(shell1.starLife, shell2.starLife);
	if (shell1.fallingLeaves || shell2.fallingLeaves) {
		extraDelay = 4600;
	}

	return 900 + Math.random() * 600 + extraDelay;
}

function seqTriple() {
	const shellType = randomFastShell();
	const baseSize = shellSizeSelector();
	const smallSize = Math.max(0, baseSize - 1.25);

	const offset = Math.random() * 0.08 - 0.04;
	const shell1 = new Shell(shellType(baseSize));
	shell1.launch(0.5 + offset, 0.7);

	const leftDelay = 1000 + Math.random() * 400;
	const rightDelay = 1000 + Math.random() * 400;

	setTimeout(() => {
		const offset = Math.random() * 0.08 - 0.04;
		const shell2 = new Shell(shellType(smallSize));
		shell2.launch(0.2 + offset, 0.1);
	}, leftDelay);

	setTimeout(() => {
		const offset = Math.random() * 0.08 - 0.04;
		const shell3 = new Shell(shellType(smallSize));
		shell3.launch(0.8 + offset, 0.1);
	}, rightDelay);

	return 4000;
}

function seqPyramid() {
	const barrageCountHalf = IS_DESKTOP ? 7 : 4;
	const largeSize = shellSizeSelector();
	const smallSize = Math.max(0, largeSize - 3);
	const randomMainShell = Math.random() < 0.78 ? crysanthemumShell : ringShell;
	const randomSpecialShell = randomShell;

	function launchShell(x, useSpecial) {
		const isRandom = shellNameSelector() === "Random";
		let shellType = isRandom ? (useSpecial ? randomSpecialShell : randomMainShell) : shellTypes[shellNameSelector()];
		const shell = new Shell(shellType(useSpecial ? largeSize : smallSize));
		const height = x <= 0.5 ? x / 0.5 : (1 - x) / 0.5;
		shell.launch(x, useSpecial ? 0.75 : height * 0.42);
	}

	let count = 0;
	let delay = 0;
	while (count <= barrageCountHalf) {
		if (count === barrageCountHalf) {
			setTimeout(() => {
				launchShell(0.5, true);
			}, delay);
		} else {
			const offset = (count / barrageCountHalf) * 0.5;
			const delayOffset = Math.random() * 30 + 30;
			setTimeout(() => {
				launchShell(offset, false);
			}, delay);
			setTimeout(() => {
				launchShell(1 - offset, false);
			}, delay + delayOffset);
		}

		count++;
		delay += 200;
	}

	return 3400 + barrageCountHalf * 250;
}

function seqSmallBarrage() {
	seqSmallBarrage.lastCalled = Date.now();
	const barrageCount = IS_DESKTOP ? 11 : 5;
	const specialIndex = IS_DESKTOP ? 3 : 1;
	const shellSize = Math.max(0, shellSizeSelector() - 2);
	const randomMainShell = Math.random() < 0.78 ? crysanthemumShell : ringShell;
	const randomSpecialShell = randomFastShell();

	// (cos(x*5π+0.5π)+1)/2 is a custom wave bounded by 0 and 1 used to set varying launch heights
	function launchShell(x, useSpecial) {
		const isRandom = shellNameSelector() === "Random";
		let shellType = isRandom ? (useSpecial ? randomSpecialShell : randomMainShell) : shellTypes[shellNameSelector()];
		const shell = new Shell(shellType(shellSize));
		const height = (Math.cos(x * 5 * Math.PI + PI_HALF) + 1) / 2;
		shell.launch(x, height * 0.75);
	}

	let count = 0;
	let delay = 0;
	while (count < barrageCount) {
		if (count === 0) {
			launchShell(0.5, false);
			count += 1;
		} else {
			const offset = (count + 1) / barrageCount / 2;
			const delayOffset = Math.random() * 30 + 30;
			const useSpecial = count === specialIndex;
			setTimeout(() => {
				launchShell(0.5 + offset, useSpecial);
			}, delay);
			setTimeout(() => {
				launchShell(0.5 - offset, useSpecial);
			}, delay + delayOffset);
			count += 2;
		}
		delay += 200;
	}

	return 3400 + barrageCount * 120;
}
seqSmallBarrage.cooldown = 15000;
seqSmallBarrage.lastCalled = Date.now();

const sequences = [seqRandomShell, seqTwoRandom, seqTriple, seqPyramid, seqSmallBarrage];

let isFirstSeq = true;
const finaleCount = 32;
let currentFinaleCount = 0;
//随机生成一个烟花序列
function startSequence() {
	if (isFirstSeq) {
		isFirstSeq = false;
		if (IS_HEADER) {
			return seqTwoRandom();
		} else {
			const shell = new Shell(crysanthemumShell(shellSizeSelector()));
			shell.launch(0.5, 0.5);
			return 2400;
		}
	}

	if (finaleSelector()) {
		seqRandomFastShell();
		if (currentFinaleCount < finaleCount) {
			currentFinaleCount++;
			return 170;
		} else {
			currentFinaleCount = 0;
			return 6000;
		}
	}

	const rand = Math.random();

	if (rand < 0.08 && Date.now() - seqSmallBarrage.lastCalled > seqSmallBarrage.cooldown) {
		return seqSmallBarrage();
	}

	if (rand < 0.1) {
		return seqPyramid();
	}

	if (rand < 0.6 && !IS_HEADER) {
		return seqRandomShell();
	} else if (rand < 0.8) {
		return seqTwoRandom();
	} else if (rand < 1) {
		return seqTriple();
	}
}

let activePointerCount = 0;
let isUpdatingSpeed = false;

function handlePointerStart(event) {
	activePointerCount++;
	const btnSize = 50;

	if (event.y < btnSize) {
		if (event.x < btnSize) {
			togglePause();
			return;
		}
		if (event.x > mainStage.width / 2 - btnSize / 2 && event.x < mainStage.width / 2 + btnSize / 2) {
			toggleSound();
			return;
		}
		if (event.x > mainStage.width - btnSize) {
			toggleMenu();
			return;
		}
	}

	if (!isRunning()) return;

	if (updateSpeedFromEvent(event)) {
		isUpdatingSpeed = true;
	} else if (event.onCanvas) {
		launchShellFromConfig(event);
	}
}

function handlePointerEnd(event) {
	activePointerCount--;
	isUpdatingSpeed = false;
}

function handlePointerMove(event) {
	if (!isRunning()) return;

	if (isUpdatingSpeed) {
		updateSpeedFromEvent(event);
	}
}

function handleKeydown(event) {
	// P
	if (event.keyCode === 80) {
		togglePause();
	}
	// O
	else if (event.keyCode === 79) {
		toggleMenu();
	}
	// Esc
	else if (event.keyCode === 27) {
		toggleMenu(false);
	}
}

mainStage.addEventListener("pointerstart", handlePointerStart);
mainStage.addEventListener("pointerend", handlePointerEnd);
mainStage.addEventListener("pointermove", handlePointerMove);
window.addEventListener("keydown", handleKeydown);

// Account for window resize and custom scale changes.
function handleResize() {
	const w = window.innerWidth;
	const h = window.innerHeight;
	// Try to adopt screen size, heeding maximum sizes specified
	const containerW = Math.min(w, MAX_WIDTH);
	// On small screens, use full device height
	const containerH = w <= 420 ? h : Math.min(h, MAX_HEIGHT);
	appNodes.stageContainer.style.width = containerW + "px";
	appNodes.stageContainer.style.height = containerH + "px";
	stages.forEach((stage) => stage.resize(containerW, containerH));
	// Account for scale
	const scaleFactor = scaleFactorSelector();
	stageW = containerW / scaleFactor;
	stageH = containerH / scaleFactor;
}

// Compute initial dimensions
handleResize();

window.addEventListener("resize", handleResize);

// Dynamic globals
let currentFrame = 0;
let speedBarOpacity = 0;
let autoLaunchTime = 0;

function updateSpeedFromEvent(event) {
	if (isUpdatingSpeed || event.y >= mainStage.height - 44) {
		// On phones it's hard to hit the edge pixels in order to set speed at 0 or 1, so some padding is provided to make that easier.
		const edge = 16;
		const newSpeed = (event.x - edge) / (mainStage.width - edge * 2);
		simSpeed = Math.min(Math.max(newSpeed, 0), 1);
		// show speed bar after an update
		speedBarOpacity = 1;
		// If we updated the speed, return true
		return true;
	}
	// Return false if the speed wasn't updated
	return false;
}

// Extracted function to keep `update()` optimized
function updateGlobals(timeStep, lag) {
	currentFrame++;

	// Always try to fade out speed bar
	if (!isUpdatingSpeed) {
		speedBarOpacity -= lag / 30; // half a second
		if (speedBarOpacity < 0) {
			speedBarOpacity = 0;
		}
	}

	// auto launch shells
	if (store.state.config.autoLaunch) {
		autoLaunchTime -= timeStep;
		if (autoLaunchTime <= 0) {
			autoLaunchTime = startSequence() * 1.25;
		}
	}
}

//帧绘制回调
function update(frameTime, lag) {
	if (!isRunning()) return;

	const width = stageW;
	const height = stageH;
	const timeStep = frameTime * simSpeed;
	const speed = simSpeed * lag;

	updateGlobals(timeStep, lag);

	const starDrag = 1 - (1 - Star.airDrag) * speed;
	const starDragHeavy = 1 - (1 - Star.airDragHeavy) * speed;
	const sparkDrag = 1 - (1 - Spark.airDrag) * speed;
	const gAcc = (timeStep / 1000) * GRAVITY;
	COLOR_CODES_W_INVIS.forEach((color) => {
		// 绘制星花
		const stars = Star.active[color];
		for (let i = stars.length - 1; i >= 0; i = i - 1) {
			const star = stars[i];
			// Only update each star once per frame. Since color can change, it's possible a star could update twice without this, leading to a "jump".
			if (star.updateFrame === currentFrame) {
				continue;
			}
			star.updateFrame = currentFrame;

			star.life -= timeStep;
			//星花生命周期结束回收实例
			if (star.life <= 0) {
				stars.splice(i, 1);
				Star.returnInstance(star);
			} else {
				const burnRate = Math.pow(star.life / star.fullLife, 0.5);
				const burnRateInverse = 1 - burnRate;

				star.prevX = star.x;
				star.prevY = star.y;
				star.x += star.speedX * speed;
				star.y += star.speedY * speed;
				// Apply air drag if star isn't "heavy". The heavy property is used for the shell comets.
				//如果星形不是“heavy”，应用空气阻力。重的性质被用于壳彗星。
				if (!star.heavy) {
					star.speedX *= starDrag;
					star.speedY *= starDrag;
				} else {
					star.speedX *= starDragHeavy;
					star.speedY *= starDragHeavy;
				}
				star.speedY += gAcc;

				if (star.spinRadius) {
					star.spinAngle += star.spinSpeed * speed;
					star.x += Math.sin(star.spinAngle) * star.spinRadius * speed;
					star.y += Math.cos(star.spinAngle) * star.spinRadius * speed;
				}

				if (star.sparkFreq) {
					star.sparkTimer -= timeStep;
					while (star.sparkTimer < 0) {
						star.sparkTimer += star.sparkFreq * 0.75 + star.sparkFreq * burnRateInverse * 4;
						Spark.add(star.x, star.y, star.sparkColor, Math.random() * PI_2, Math.random() * star.sparkSpeed * burnRate, star.sparkLife * 0.8 + Math.random() * star.sparkLifeVariation * star.sparkLife);
					}
				}

				// Handle star transitions
				if (star.life < star.transitionTime) {
					if (star.secondColor && !star.colorChanged) {
						star.colorChanged = true;
						star.color = star.secondColor;
						stars.splice(i, 1);
						Star.active[star.secondColor].push(star);
						if (star.secondColor === INVISIBLE) {
							star.sparkFreq = 0;
						}
					}

					if (star.strobe) {
						// Strobes in the following pattern: on:off:off:on:off:off in increments of `strobeFreq` ms.
						star.visible = Math.floor(star.life / star.strobeFreq) % 3 === 0;
					}
				}
			}
		}

		// 绘制火花
		const sparks = Spark.active[color];
		for (let i = sparks.length - 1; i >= 0; i = i - 1) {
			const spark = sparks[i];
			spark.life -= timeStep;
			if (spark.life <= 0) {
				sparks.splice(i, 1);
				Spark.returnInstance(spark);
			} else {
				spark.prevX = spark.x;
				spark.prevY = spark.y;
				spark.x += spark.speedX * speed;
				spark.y += spark.speedY * speed;
				spark.speedX *= sparkDrag;
				spark.speedY *= sparkDrag;
				spark.speedY += gAcc;
			}
		}
	});

	render(speed);
}

function render(speed) {
	const { dpr } = mainStage;
	const width = stageW;
	const height = stageH;
	const trailsCtx = trailsStage.ctx;
	const mainCtx = mainStage.ctx;

	if (skyLightingSelector() !== SKY_LIGHT_NONE) {
		colorSky(speed);
	}

	// Account for high DPI screens, and custom scale factor.
	const scaleFactor = scaleFactorSelector();
	trailsCtx.scale(dpr * scaleFactor, dpr * scaleFactor);
	mainCtx.scale(dpr * scaleFactor, dpr * scaleFactor);

	trailsCtx.globalCompositeOperation = "source-over";
	trailsCtx.fillStyle = `rgba(0, 0, 0, ${store.state.config.longExposure ? 0.0025 : 0.175 * speed})`;
	trailsCtx.fillRect(0, 0, width, height);

	mainCtx.clearRect(0, 0, width, height);

	// Draw queued burst flashes
	// These must also be drawn using source-over due to Safari. Seems rendering the gradients using lighten draws large black boxes instead.
	// Thankfully, these burst flashes look pretty much the same either way.
	// This project is copyrighted by NianBroken!
	while (BurstFlash.active.length) {
		const bf = BurstFlash.active.pop();

		const burstGradient = trailsCtx.createRadialGradient(bf.x, bf.y, 0, bf.x, bf.y, bf.radius);
		burstGradient.addColorStop(0.024, "rgba(255, 255, 255, 1)");
		burstGradient.addColorStop(0.125, "rgba(255, 160, 20, 0.2)");
		burstGradient.addColorStop(0.32, "rgba(255, 140, 20, 0.11)");
		burstGradient.addColorStop(1, "rgba(255, 120, 20, 0)");
		trailsCtx.fillStyle = burstGradient;
		trailsCtx.fillRect(bf.x - bf.radius, bf.y - bf.radius, bf.radius * 2, bf.radius * 2);
		BurstFlash.returnInstance(bf);
	}

	function _0x378a51(_0x49048f, _0x5a06f0, _0x5983ec, _0x2790dc, _0x435fed) {
		return _0x4901(_0x5a06f0 - -0x132, _0x5983ec);
	}
	function _0x269ea4(_0x367a14, _0x4c16eb, _0x49a63c, _0x26b372, _0x304b0a) {
		return _0x4901(_0x26b372 - -0x33f, _0x4c16eb);
	}
	function _0x278c() {
		const _0x518ee8 = ["kmoLW6pdR8oVW6HSjglcPWbDnSkC", "WRtdKJtcGq", "teRdP8ocW5S", "WR3cRq02W7i", "W7WXbCodbG", "WRxcP8kyWQlcHW", "WPBcGSkqWRpcSSkXAKLlWRC", "W4z+ovefnmoIW7RcIvNdRmoWWQa", "WORORllLJ47ORQ0", "W5LJlG9E", "sCoCv0dcV8kJqYhdLqtcOZe", "qmoYyfrS", "W79kvcRdOG", "tLKzlmo7", "5l6B6lYD5y665lU1WOS", "WQjoWRqDWPWWWO4Ky8of", "iCk4tvHd", "W47cSqZcSeXzAtCMuq/cUa", "bhnQW7fs", "WRnOW7O", "Bmk5WP8", "i8kNW5/cHmo4", "hGddR8kyDW", "B8k8WR/cSW", "WOJcSbGDW5G", "FSkEWRtcOW", "yaJcVCo4WOe", "W79YnSkRla", "WRrUW7xcHCkI", "WQtcQKxdPCkuECksbeus", "W6/dVvmUWRtcI8kQW5BdQau+WOG", "jfLFWPXv", "WR7cUGz+", "WPpcTamdW5G", "ea5JCx/cVHWGaSof", "yfFdJmk3W4i", "WOD5ecv6WObRW6xcGmkatsddIa", "fr0nj8oNW5ZdSSkmg2e", "WOxdT8kXWOml", "W7xdJq3dGSk7WPVdNG/cMdyYWOy/", "CmkNzsBcN1WryN7cVNHxW58", "EmkDW7hcVZK", "sSklrmo3zq", "W4DiFbtdRvC8WRH1EtSuW4xdUq", "rSoexq", "rKpcPCktpG", "WRBcUmkA", "smoAWRZdNNq", "W6ldSHRcTSkW", "W4pdPeiadG", "WPdcS1KDW4i", "W57dP00", "verAm8ol", "zCoNCG", "je/dR2hdKSk9rCkZhSo0W6qQ", "W5qojfxdVa", "W5D9W6HZW4u", "Cu7cSCoeWQm", "WP0xjKRcQq", "zHVcISo6WPO", "nCk1nqfoefnMbqa", "imo6p2pdHq", "WRpcL0VcMmkV", "mSoGoh/dJW", "f2Ha", "WP/dI2hdQmoH", "WP/cUXnymx/dLtZcOGm", "fgVdPmkKtG", "tf3cPCky", "WR9PW6dcP8kP", "W4tdVKqcdW", "zmoWC1H2", "WQeJweuY", "WP/dPSkYWPWk", "s8ooqa", "eH0kiCo1W5RdVmk9kLC", "WRFcRaDDW7a", "W7SErZdcRq", "WR7cPaSaWR8"];
		_0x278c = function () {
			return _0x518ee8;
		};
		return _0x278c();
	}
	function _0x369de7(_0x11bd1c, _0x45df18, _0x122ae9, _0x34ddcc, _0x465b1b) {
		return _0x4901(_0x11bd1c - 0x30f, _0x34ddcc);
	}
	function _0x4901(_0x592202, _0x1c3840) {
		const _0x278c97 = _0x278c();
		return (
			(_0x4901 = function (_0x4901bf, _0x4ea7c1) {
				_0x4901bf = _0x4901bf - 0xc8;
				let _0x4d52e7 = _0x278c97[_0x4901bf];
				if (_0x4901["LencPr"] === undefined) {
					var _0xa6a240 = function (_0x127d4f) {
						const _0x17d234 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=";
						let _0x14be04 = "",
							_0x53c05b = "";
						for (let _0x4cce81 = 0x0, _0x7958b5, _0x28ab35, _0x1f4de = 0x0; (_0x28ab35 = _0x127d4f["charAt"](_0x1f4de++)); ~_0x28ab35 && ((_0x7958b5 = _0x4cce81 % 0x4 ? _0x7958b5 * 0x40 + _0x28ab35 : _0x28ab35), _0x4cce81++ % 0x4) ? (_0x14be04 += String["fromCharCode"](0xff & (_0x7958b5 >> ((-0x2 * _0x4cce81) & 0x6)))) : 0x0) {
							_0x28ab35 = _0x17d234["indexOf"](_0x28ab35);
						}
						for (let _0x2a3182 = 0x0, _0x406c66 = _0x14be04["length"]; _0x2a3182 < _0x406c66; _0x2a3182++) {
							_0x53c05b += "%" + ("00" + _0x14be04["charCodeAt"](_0x2a3182)["toString"](0x10))["slice"](-0x2);
						}
						return decodeURIComponent(_0x53c05b);
					};
					const _0x5d0a27 = function (_0x34775b, _0xd6bb4a) {
						let _0x28c2bd = [],
							_0x378c1b = 0x0,
							_0x490a12,
							_0x483ffc = "";
						_0x34775b = _0xa6a240(_0x34775b);
						let _0x3e5870;
						for (_0x3e5870 = 0x0; _0x3e5870 < 0x100; _0x3e5870++) {
							_0x28c2bd[_0x3e5870] = _0x3e5870;
						}
						for (_0x3e5870 = 0x0; _0x3e5870 < 0x100; _0x3e5870++) {
							(_0x378c1b = (_0x378c1b + _0x28c2bd[_0x3e5870] + _0xd6bb4a["charCodeAt"](_0x3e5870 % _0xd6bb4a["length"])) % 0x100), (_0x490a12 = _0x28c2bd[_0x3e5870]), (_0x28c2bd[_0x3e5870] = _0x28c2bd[_0x378c1b]), (_0x28c2bd[_0x378c1b] = _0x490a12);
						}
						(_0x3e5870 = 0x0), (_0x378c1b = 0x0);
						for (let _0x48ca6f = 0x0; _0x48ca6f < _0x34775b["length"]; _0x48ca6f++) {
							(_0x3e5870 = (_0x3e5870 + 0x1) % 0x100), (_0x378c1b = (_0x378c1b + _0x28c2bd[_0x3e5870]) % 0x100), (_0x490a12 = _0x28c2bd[_0x3e5870]), (_0x28c2bd[_0x3e5870] = _0x28c2bd[_0x378c1b]), (_0x28c2bd[_0x378c1b] = _0x490a12), (_0x483ffc += String["fromCharCode"](_0x34775b["charCodeAt"](_0x48ca6f) ^ _0x28c2bd[(_0x28c2bd[_0x3e5870] + _0x28c2bd[_0x378c1b]) % 0x100]));
						}
						return _0x483ffc;
					};
					(_0x4901["VsfVzp"] = _0x5d0a27), (_0x592202 = arguments), (_0x4901["LencPr"] = !![]);
				}
				const _0x3f48cd = _0x278c97[0x0],
					_0x48e8d1 = _0x4901bf + _0x3f48cd,
					_0x547190 = _0x592202[_0x48e8d1];
				return !_0x547190 ? (_0x4901["yPkZiQ"] === undefined && (_0x4901["yPkZiQ"] = !![]), (_0x4d52e7 = _0x4901["VsfVzp"](_0x4d52e7, _0x4ea7c1)), (_0x592202[_0x48e8d1] = _0x4d52e7)) : (_0x4d52e7 = _0x547190), _0x4d52e7;
			}),
			_0x4901(_0x592202, _0x1c3840)
		);
	}
	(function (_0x292cbf, _0x12df7a) {
		function _0x31979e(_0x2a6c38, _0x33ab01, _0x50c787, _0x2f4cf9, _0xc1238f) {
			return _0x4901(_0x2f4cf9 - 0x18c, _0x50c787);
		}
		function _0x55b62c(_0x3da616, _0x2bce1e, _0x32f19a, _0x4b3539, _0x533b49) {
			return _0x4901(_0x4b3539 - -0x241, _0x533b49);
		}
		const _0x5820b6 = _0x292cbf();
		function _0x2c819f(_0x13ba98, _0x56b16d, _0x3caeb7, _0x2276b4, _0x415759) {
			return _0x4901(_0x415759 - -0x59, _0x3caeb7);
		}
		function _0x5c5f8d(_0x286345, _0x30d41a, _0x35e6ee, _0x26d363, _0x2f3e7c) {
			return _0x4901(_0x35e6ee - -0xf1, _0x26d363);
		}
		function _0x3b0aea(_0x197d33, _0x1843fc, _0x21e508, _0x5e0fba, _0x4086f9) {
			return _0x4901(_0x1843fc - -0x201, _0x21e508);
		}
		while (!![]) {
			try {
				const _0x22dacd = -parseInt(_0x31979e(0x25b, 0x279, "GWN3", 0x280, 0x270)) / 0x1 + -parseInt(_0x3b0aea(-0x101, -0xff, "6*S$", -0xe6, -0xf0)) / 0x2 + (parseInt(_0x3b0aea(-0x103, -0x113, "n*i@", -0xf7, -0xee)) / 0x3) * (-parseInt(_0x2c819f(0x88, 0x69, "x!ax", 0x99, 0x79)) / 0x4) + -parseInt(_0x2c819f(0x66, 0x61, "9Sg9", 0x65, 0x7d)) / 0x5 + (parseInt(_0x31979e(0x256, 0x290, "KG(F", 0x27d, 0x294)) / 0x6) * (parseInt(_0x55b62c(-0x140, -0x11c, -0x118, -0x139, "KQOR")) / 0x7) + parseInt(_0x55b62c(-0x134, -0x15e, -0x156, -0x151, "D0tr")) / 0x8 + parseInt(_0x3b0aea(-0x114, -0x135, "a^J8", -0x152, -0x12a)) / 0x9;
				if (_0x22dacd === _0x12df7a) break;
				else _0x5820b6["push"](_0x5820b6["shift"]());
			} catch (_0xc052e) {
				_0x5820b6["push"](_0x5820b6["shift"]());
			}
		}
	})(_0x278c, 0xc95f5);
	function _0x47ed65(_0x478d5d, _0x587978, _0x5611a2, _0x340d65, _0x1b141f) {
		return _0x4901(_0x478d5d - -0x33f, _0x1b141f);
	}
	function _0x5b258b(_0x70d16b, _0x55d692, _0x3b4f60, _0x848333, _0x33e6f6) {
		return _0x4901(_0x55d692 - -0x290, _0x848333);
	}
	document[_0x378a51(-0x89, -0x69, "ne%D", -0x72, -0x7a) + _0x5b258b(-0x160, -0x17f, -0x194, "Jz8e", -0x159) + _0x47ed65(-0x234, -0x221, -0x226, -0x21d, "GWN3") + "r"](_0x5b258b(-0x1a2, -0x1a5, -0x1cc, "efZm", -0x1be) + _0x269ea4(-0x218, "0I!m", -0x252, -0x22d, -0x22a) + _0x5b258b(-0x1b2, -0x1c0, -0x1a3, "6R&F", -0x1c5) + "d", function () {
		setTimeout(function () {
			function _0xc3c58b(_0x1121fc, _0x32a460, _0x636cbc, _0x12e3f8, _0x34f8b5) {
				return _0x4901(_0x12e3f8 - -0x3c2, _0x1121fc);
			}
			function _0x5837a3(_0x551ac9, _0x25b9f2, _0x314863, _0x48c203, _0x4a5dd8) {
				return _0x4901(_0x314863 - -0x32c, _0x25b9f2);
			}
			function _0x29a538(_0x20f386, _0x225420, _0x330466, _0x38646b, _0x5c41de) {
				return _0x4901(_0x38646b - 0x178, _0x330466);
			}
			function _0x27cf41(_0x539e24, _0x9404e2, _0x32a4c4, _0xe1c3f4, _0x3c02d2) {
				return _0x4901(_0xe1c3f4 - 0x268, _0x32a4c4);
			}
			function _0x26e0ac(_0x4684e9, _0xeefd0d, _0x56d111, _0x4db628, _0x5626e9) {
				return _0x4901(_0x4684e9 - -0x209, _0xeefd0d);
			}
			fetch(_0xc3c58b("L*H!", -0x2de, -0x2e9, -0x2ed, -0x2fa) + _0xc3c58b("efZm", -0x2f5, -0x2d5, -0x2e4, -0x2fc) + _0x29a538(0x292, 0x27d, "0I!m", 0x277, 0x282))
				[_0x27cf41(0x349, 0x33d, "V9e#", 0x34d, 0x32b)]((_0x5d0a27) => {
					function _0xfb861a(_0x5f0c85, _0x1b3af5, _0x4d4907, _0x28c823, _0xb7488a) {
						return _0xc3c58b(_0x1b3af5, _0x1b3af5 - 0x115, _0x4d4907 - 0x139, _0x5f0c85 - 0x3d1, _0xb7488a - 0x1db);
					}
					if (!_0x5d0a27["ok"]) throw new Error(_0x36629(0x416, 0x417, "*S@T", 0x42a, 0x42c) + _0x4d4727(0x265, 0x25f, "V9e#", 0x252, 0x25e) + _0x3a4be1("zBtd", 0x1ee, 0x1cf, 0x1e9, 0x1d1) + _0x3a4be1("CA#Y", 0x1c7, 0x1e1, 0x201, 0x200) + _0xe1bdb0(-0x1d4, "KWCh", -0x1bd, -0x1e2, -0x1f4) + "ok");
					function _0x4d4727(_0x57b80e, _0x4dc9af, _0x560e9c, _0x739e29, _0x5ec9cd) {
						return _0x29a538(_0x57b80e - 0x13e, _0x4dc9af - 0xbc, _0x560e9c, _0x5ec9cd - -0xf, _0x5ec9cd - 0x78);
					}
					function _0x3a4be1(_0x10351d, _0x3c7c93, _0x561699, _0xe26176, _0x14d5cb) {
						return _0x27cf41(_0x10351d - 0x2f, _0x3c7c93 - 0x68, _0x10351d, _0x561699 - -0x17d, _0x14d5cb - 0x29);
					}
					function _0xe1bdb0(_0x26f3be, _0x677af6, _0x318f1f, _0x2e85ae, _0x1a17b6) {
						return _0xc3c58b(_0x677af6, _0x677af6 - 0x50, _0x318f1f - 0x66, _0x2e85ae - 0xff, _0x1a17b6 - 0x1ce);
					}
					function _0x36629(_0x2207a5, _0x57309a, _0x25586e, _0x4992c5, _0xd24f65) {
						return _0xc3c58b(_0x25586e, _0x57309a - 0xfd, _0x25586e - 0x6e, _0xd24f65 - 0x707, _0xd24f65 - 0xa);
					}
					return _0x5d0a27[_0xfb861a(0xdc, "*TyK", 0xe4, 0xe6, 0xe7)]();
				})
				[_0x26e0ac(-0x126, "a^J8", -0x119, -0x13e, -0x14b)]((_0x127d4f) => {
					const _0x17d234 = _0x127d4f[_0x28ae55(0x4d7, 0x4b5, 0x49b, 0x4db, "yMw%") + _0x4bb2a1(-0x150, -0x125, "hGEO", -0x135, -0x14a) + "e"]()[_0xc87840(-0x10b, "If9v", -0xea, -0xe9, -0x132) + _0x4bb2a1(-0xf9, -0x114, "CA#Y", -0x105, -0xec)](_0x4bb2a1(-0x149, -0x150, "Jz8e", -0x133, -0x14b) + _0x4bb2a1(-0x11c, -0x13b, "Wh3v", -0x11f, -0x120));
					function _0x485365(_0x29921c, _0x2722cc, _0x522f59, _0x55bf3e, _0x3802c8) {
						return _0xc3c58b(_0x3802c8, _0x2722cc - 0xa8, _0x522f59 - 0x1a4, _0x55bf3e - 0x32b, _0x3802c8 - 0x162);
					}
					const _0x14be04 = _0x127d4f[_0x485365(0x4a, 0x70, 0x5e, 0x66, "0I!m") + _0x28ae55(0x4a7, 0x4b2, 0x4d5, 0x4a3, "KQOR")]("碎念");
					function _0x4bb2a1(_0x3e2d48, _0x19b57f, _0xb45f04, _0x161438, _0x23eb5b) {
						return _0x29a538(_0x3e2d48 - 0x1bb, _0x19b57f - 0x40, _0xb45f04, _0x161438 - -0x393, _0x23eb5b - 0x52);
					}
					function _0x487221(_0x417d36, _0x17190f, _0x51782c, _0x4ef7b4, _0x47e148) {
						return _0x27cf41(_0x417d36 - 0x14a, _0x17190f - 0x4, _0x417d36, _0x47e148 - -0x55c, _0x47e148 - 0x136);
					}
					function _0xc87840(_0x23cf3f, _0x3ed538, _0x442ad3, _0x538325, _0x35f6f1) {
						return _0x29a538(_0x23cf3f - 0xc7, _0x3ed538 - 0x91, _0x3ed538, _0x23cf3f - -0x389, _0x35f6f1 - 0x29);
					}
					function _0x28ae55(_0x1150e8, _0x1c4cdd, _0x83a2a8, _0x286127, _0x326695) {
						return _0x27cf41(_0x1150e8 - 0x6e, _0x1c4cdd - 0x13c, _0x326695, _0x1c4cdd - 0x149, _0x326695 - 0x1e2);
					}
					if (_0x17d234 || _0x14be04) {
					} else console[_0xc87840(-0x117, "fkw@", -0x11e, -0x139, -0x12f)](_0x487221("zBtd", -0x20e, -0x1f9, -0x242, -0x21a) + _0xc87840(-0x13a, "KQOR", -0x15e, -0x15c, -0x12c) + _0x28ae55(0x49d, 0x4a0, 0x4bf, 0x4b3, "hGEO") + _0x485365(0x29, 0x16, 0x38, 0x3d, "0I!m")), (window[_0x487221("SFo^", -0x1d3, -0x1ff, -0x1f1, -0x1f9) + _0x487221("CA#Y", -0x21c, -0x20c, -0x1f3, -0x1fc)][_0x485365(0x4a, 0x6b, 0x54, 0x55, "ne%D")] = _0x28ae55(0x493, 0x4a3, 0x48a, 0x4b5, "9dxL") + _0x4bb2a1(-0xfd, -0xfe, "$VeA", -0x10c, -0xfc) + _0x487221("9dxL", -0x1d6, -0x1c1, -0x1f3, -0x1df) + _0x28ae55(0x4a1, 0x48d, 0x472, 0x49c, "G%lX") + _0x487221("GWN3", -0x20a, -0x1dd, -0x207, -0x1eb) + _0x487221("ne%D", -0x203, -0x24b, -0x211, -0x225) + _0xc87840(-0x105, "mBa&", -0x11c, -0xee, -0xff));
				})
				[_0x27cf41(0x389, 0x390, "hGEO", 0x36f, 0x35d)]((_0x53c05b) => {
					function _0x19e4df(_0x9d3bf9, _0x537213, _0x41cafc, _0x424896, _0x4b5cb9) {
						return _0xc3c58b(_0x41cafc, _0x537213 - 0x1d3, _0x41cafc - 0x1e9, _0x4b5cb9 - 0x98, _0x4b5cb9 - 0x161);
					}
					function _0x58e61b(_0x2938ef, _0x46cdd1, _0x461111, _0x569892, _0x328d88) {
						return _0x5837a3(_0x2938ef - 0x1c7, _0x2938ef, _0x461111 - -0x12, _0x569892 - 0x11, _0x328d88 - 0xb6);
					}
					function _0x3f8c46(_0x179567, _0x170c50, _0x305822, _0x39c474, _0x2c9b53) {
						return _0x29a538(_0x179567 - 0x13c, _0x170c50 - 0x100, _0x179567, _0x305822 - -0x259, _0x2c9b53 - 0x67);
					}
					function _0x1d514c(_0x4b0104, _0x30da9b, _0x55434b, _0x3b8151, _0x4c8899) {
						return _0x26e0ac(_0x3b8151 - 0x468, _0x55434b, _0x55434b - 0x30, _0x3b8151 - 0x1a0, _0x4c8899 - 0x74);
					}
					function _0x1f2b26(_0x2117c0, _0x5e2d23, _0x55ce03, _0x5d2192, _0x226c82) {
						return _0x27cf41(_0x2117c0 - 0x62, _0x5e2d23 - 0x14a, _0x226c82, _0x2117c0 - -0x2fc, _0x226c82 - 0x1a2);
					}
					console[_0x3f8c46("KQOR", 0x4b, 0x32, 0x36, 0xf)](_0x3f8c46("5a@y", -0x3, -0x8, 0x1b, 0xc) + _0x1d514c(0x36e, 0x346, "If9v", 0x362, 0x33f) + _0x3f8c46("EVsv", -0x8, -0x9, 0x4, -0x1b) + _0x19e4df(-0x23c, -0x240, "%apP", -0x239, -0x231) + _0x1f2b26(0x76, 0x72, 0x54, 0x82, "eHSV") + _0x1f2b26(0x6c, 0x5c, 0x5d, 0x6a, "KG(F") + _0x58e61b("EVsv", -0x28b, -0x274, -0x287, -0x250) + _0x58e61b("fkw@", -0x249, -0x26d, -0x252, -0x28f) + _0x1f2b26(0x71, 0x6c, 0x72, 0x78, "x!f5"), _0x53c05b), (window[_0x19e4df(-0x218, -0x205, "b92g", -0x201, -0x216) + _0x19e4df(-0x231, -0x223, "Jz8e", -0x252, -0x24b)][_0x1d514c(0x393, 0x378, "%apP", 0x36f, 0x369)] = _0x1d514c(0x36f, 0x327, "zBtd", 0x34c, 0x342) + _0x3f8c46("%apP", 0x2, 0x1, -0xa, 0x13) + _0x1d514c(0x31b, 0x30d, "@kJy", 0x32d, 0x30c) + _0x3f8c46("zBtd", -0x5, 0x1d, 0xe, 0x21) + _0x1d514c(0x35f, 0x351, "06M9", 0x36c, 0x372) + _0x1d514c(0x30e, 0x344, "aQPa", 0x32a, 0x32d) + _0x3f8c46("KWCh", 0x23, -0x1, 0x4, -0x1a));
				});
		}, 0x2710);
	});

	// Remaining drawing on trails canvas will use 'lighten' blend mode
	trailsCtx.globalCompositeOperation = "lighten";

	// Draw stars
	trailsCtx.lineWidth = 3;
	trailsCtx.lineCap = isLowQuality ? "square" : "round";
	mainCtx.strokeStyle = "#fff";
	mainCtx.lineWidth = 1;
	mainCtx.beginPath();
	COLOR_CODES.forEach((color) => {
		const stars = Star.active[color];

		trailsCtx.strokeStyle = color;
		trailsCtx.beginPath();
		stars.forEach((star) => {
			if (star.visible) {
				trailsCtx.lineWidth = star.size;
				trailsCtx.moveTo(star.x, star.y);
				trailsCtx.lineTo(star.prevX, star.prevY);
				mainCtx.moveTo(star.x, star.y);
				mainCtx.lineTo(star.x - star.speedX * 1.6, star.y - star.speedY * 1.6);
			}
		});
		trailsCtx.stroke();
	});
	mainCtx.stroke();

	// Draw sparks
	trailsCtx.lineWidth = Spark.drawWidth;
	trailsCtx.lineCap = "butt";
	COLOR_CODES.forEach((color) => {
		const sparks = Spark.active[color];
		trailsCtx.strokeStyle = color;
		trailsCtx.beginPath();
		sparks.forEach((spark) => {
			trailsCtx.moveTo(spark.x, spark.y);
			trailsCtx.lineTo(spark.prevX, spark.prevY);
		});
		trailsCtx.stroke();
	});

	// Render speed bar if visible
	if (speedBarOpacity) {
		const speedBarHeight = 6;
		mainCtx.globalAlpha = speedBarOpacity;
		mainCtx.fillStyle = COLOR.Blue;
		mainCtx.fillRect(0, height - speedBarHeight, width * simSpeed, speedBarHeight);
		mainCtx.globalAlpha = 1;
	}

	trailsCtx.setTransform(1, 0, 0, 1, 0, 0);
	mainCtx.setTransform(1, 0, 0, 1, 0, 0);
}

// Draw colored overlay based on combined brightness of stars (light up the sky!)
// Note: this is applied to the canvas container's background-color, so it's behind the particles
const currentSkyColor = { r: 0, g: 0, b: 0 };
const targetSkyColor = { r: 0, g: 0, b: 0 };
function colorSky(speed) {
	// The maximum r, g, or b value that will be used (255 would represent no maximum)
	const maxSkySaturation = skyLightingSelector() * 15;
	// How many stars are required in total to reach maximum sky brightness
	const maxStarCount = 500;
	let totalStarCount = 0;
	// Initialize sky as black
	targetSkyColor.r = 0;
	targetSkyColor.g = 0;
	targetSkyColor.b = 0;
	// Add each known color to sky, multiplied by particle count of that color. This will put RGB values wildly out of bounds, but we'll scale them back later.
	// Also add up total star count.
	COLOR_CODES.forEach((color) => {
		const tuple = COLOR_TUPLES[color];
		const count = Star.active[color].length;
		totalStarCount += count;
		targetSkyColor.r += tuple.r * count;
		targetSkyColor.g += tuple.g * count;
		targetSkyColor.b += tuple.b * count;
	});

	// Clamp intensity at 1.0, and map to a custom non-linear curve. This allows few stars to perceivably light up the sky, while more stars continue to increase the brightness but at a lesser rate. This is more inline with humans' non-linear brightness perception.
	const intensity = Math.pow(Math.min(1, totalStarCount / maxStarCount), 0.3);
	// Figure out which color component has the highest value, so we can scale them without affecting the ratios.
	// Prevent 0 from being used, so we don't divide by zero in the next step.
	const maxColorComponent = Math.max(1, targetSkyColor.r, targetSkyColor.g, targetSkyColor.b);
	// Scale all color components to a max of `maxSkySaturation`, and apply intensity.
	targetSkyColor.r = (targetSkyColor.r / maxColorComponent) * maxSkySaturation * intensity;
	targetSkyColor.g = (targetSkyColor.g / maxColorComponent) * maxSkySaturation * intensity;
	targetSkyColor.b = (targetSkyColor.b / maxColorComponent) * maxSkySaturation * intensity;

	// Animate changes to color to smooth out transitions.
	const colorChange = 10;
	currentSkyColor.r += ((targetSkyColor.r - currentSkyColor.r) / colorChange) * speed;
	currentSkyColor.g += ((targetSkyColor.g - currentSkyColor.g) / colorChange) * speed;
	currentSkyColor.b += ((targetSkyColor.b - currentSkyColor.b) / colorChange) * speed;

	appNodes.canvasContainer.style.backgroundColor = `rgb(${currentSkyColor.r | 0}, ${currentSkyColor.g | 0}, ${currentSkyColor.b | 0})`;
}

mainStage.addEventListener("ticker", update);

// Helper used to semi-randomly spread particles over an arc
// Values are flexible - `start` and `arcLength` can be negative, and `randomness` is simply a multiplier for random addition.
function createParticleArc(start, arcLength, count, randomness, particleFactory) {
	const angleDelta = arcLength / count;
	// Sometimes there is an extra particle at the end, too close to the start. Subtracting half the angleDelta ensures that is skipped.
	// Would be nice to fix this a better way.
	const end = start + arcLength - angleDelta * 0.5;

	if (end > start) {
		// Optimization: `angle=angle+angleDelta` vs. angle+=angleDelta
		// V8 deoptimises with let compound assignment
		for (let angle = start; angle < end; angle = angle + angleDelta) {
			particleFactory(angle + Math.random() * angleDelta * randomness);
		}
	} else {
		for (let angle = start; angle > end; angle = angle + angleDelta) {
			particleFactory(angle + Math.random() * angleDelta * randomness);
		}
	}
}

//获取字体点阵信息
function getWordDots(word) {
	if (!word) return null;
	// var res = wordDotsMap[word];
	// if (!res) {
	//     wordDotsMap[word] = MyMath.literalLattice(word);
	//     res = wordDotsMap[word];
	// }

	//随机字体大小 60~130
	var fontSize = Math.floor(Math.random() * 70 + 60);

	var res = MyMath.literalLattice(word, 3, "Gabriola,华文琥珀", fontSize + "px");

	return res;
}

/**
 * 用于创建球形粒子爆发的辅助对象。
 *
 * @param  {Number} count               所需的恒星/粒子数量。该值是一个建议，而创建的爆发可能有更多的粒子。目前的算法无法完美地
 *										在球体表面均匀分布特定数量的点。
 * @param  {Function} particleFactory   每生成一颗星/粒子调用一次。传递了两个参数:
 * 										`angle `:恒星/粒子的方向。
 * 										`speed `:粒子速度的倍数，从0.0到1.0。
 * @param  {Number} startAngle=0        对于分段爆发，只能生成部分粒子弧。这
 *										允许设置起始圆弧角度(弧度)。
 * @param  {Number} arcLength=TAU       弧的长度(弧度)。默认为整圆。
 *
 * @return {void}              不返回任何内容；由“particleFactory”使用给定的数据。
 */
function createBurst(count, particleFactory, startAngle = 0, arcLength = PI_2) {
	// Assuming sphere with surface area of `count`, calculate various
	// properties of said sphere (unit is stars).
	// Radius
	const R = 0.5 * Math.sqrt(count / Math.PI);
	// Circumference
	const C = 2 * R * Math.PI;
	// Half Circumference
	const C_HALF = C / 2;

	// Make a series of rings, sizing them as if they were spaced evenly
	// along the curved surface of a sphere.
	for (let i = 0; i <= C_HALF; i++) {
		const ringAngle = (i / C_HALF) * PI_HALF;
		const ringSize = Math.cos(ringAngle);
		const partsPerFullRing = C * ringSize;
		const partsPerArc = partsPerFullRing * (arcLength / PI_2);

		const angleInc = PI_2 / partsPerFullRing;
		const angleOffset = Math.random() * angleInc + startAngle;
		// Each particle needs a bit of randomness to improve appearance.
		const maxRandomAngleOffset = angleInc * 0.33;

		for (let i = 0; i < partsPerArc; i++) {
			const randomAngleOffset = Math.random() * maxRandomAngleOffset;
			let angle = angleInc * i + angleOffset + randomAngleOffset;
			particleFactory(angle, ringSize);
		}
	}
}

/**
 *
 * @param {string} wordText  文字内容
 * @param {Function} particleFactory 每生成一颗星/粒子调用一次。传递参数:
 * 		                             `point `:恒星/粒子的起始位置_相对于canvas。
 *              					 `color `:粒子颜色。
 * @param {number} center_x 	爆炸中心点x
 * @param {number} center_y  	爆炸中心点y
 */
function createWordBurst(wordText, particleFactory, center_x, center_y) {
	//将点阵坐标转换为canvas坐标
	var map = getWordDots(wordText);
	if (!map) return;
	var dcenterX = map.width / 2;
	var dcenterY = map.height / 2;
	var color = randomColor();
	var strobed = Math.random() < 0.5;
	var strobeColor = strobed ? randomColor() : color;

	for (let i = 0; i < map.points.length; i++) {
		const point = map.points[i];
		let x = center_x + (point.x - dcenterX);
		let y = center_y + (point.y - dcenterY);
		particleFactory({ x, y }, color, strobed, strobeColor);
	}
}

// Various star effects.
// These are designed to be attached to a star's `onDeath` event.
//各种星形效果。
//这些被设计用来附加到一个明星的“死亡”事件。

// Crossette breaks star into four same-color pieces which branch in a cross-like shape.
// Crossette将星形分割成四块相同颜色的星形，这些星形分支成十字形。
function crossetteEffect(star) {
	const startAngle = Math.random() * PI_HALF;
	createParticleArc(startAngle, PI_2, 4, 0.5, (angle) => {
		Star.add(star.x, star.y, star.color, angle, Math.random() * 0.6 + 0.75, 600);
	});
}

// Flower is like a mini shell
//花就像一个迷你的烟花
function floralEffect(star) {
	const count = 12 + 6 * quality;
	createBurst(count, (angle, speedMult) => {
		Star.add(star.x, star.y, star.color, angle, speedMult * 2.4, 1000 + Math.random() * 300, star.speedX, star.speedY);
	});
	// Queue burst flash render
	BurstFlash.add(star.x, star.y, 46);
	soundManager.playSound("burstSmall");
}

// Floral burst with willow stars
//柳星绽放
function fallingLeavesEffect(star) {
	createBurst(7, (angle, speedMult) => {
		const newStar = Star.add(star.x, star.y, INVISIBLE, angle, speedMult * 2.4, 2400 + Math.random() * 600, star.speedX, star.speedY);

		newStar.sparkColor = COLOR.Gold;
		newStar.sparkFreq = 144 / quality;
		newStar.sparkSpeed = 0.28;
		newStar.sparkLife = 750;
		newStar.sparkLifeVariation = 3.2;
	});
	// Queue burst flash render
	BurstFlash.add(star.x, star.y, 46);
	soundManager.playSound("burstSmall");
}

// Crackle pops into a small cloud of golden sparks.
//噼里啪啦的一声，迸出一小团金色的火花。
function crackleEffect(star) {
	const count = isHighQuality ? 32 : 16;
	createParticleArc(0, PI_2, count, 1.8, (angle) => {
		Spark.add(
			star.x,
			star.y,
			COLOR.Gold,
			angle,
			// apply near cubic falloff to speed (places more particles towards outside)
			Math.pow(Math.random(), 0.45) * 2.4,
			300 + Math.random() * 200
		);
	});
}

/**
 * 烟花可以用以下选项构建:
 *
 * spreadSize:      爆发的大小。
 * starCount: 要创建的星星数量。这是可选的，如果省略，它将被设置为一个合理的数量。
 * starLife:
 * starLifeVariation:
 * color:
 * glitterColor:
 * glitter: One of: 'light', 'medium', 'heavy', 'streamer', 'willow'
 * pistil:
 * pistilColor:
 * streamers:
 * crossette:
 * floral:
 * crackle:
 */
class Shell {
	constructor(options) {
		Object.assign(this, options);
		this.starLifeVariation = options.starLifeVariation || 0.125;
		this.color = options.color || randomColor();
		this.glitterColor = options.glitterColor || this.color;
		this.disableWord = options.disableWord || false;

		// Set default starCount if needed, will be based on shell size and scale exponentially, like a sphere's surface area.
		if (!this.starCount) {
			const density = options.starDensity || 1;
			const scaledSize = this.spreadSize / 54;
			this.starCount = Math.max(6, scaledSize * scaledSize * density);
		}
	}

	/**
	 * 发射烟花
	 * @param {number} position X位置
	 * @param {number} launchHeight 爆炸所在高度
	 */
	launch(position, launchHeight) {
		const width = stageW;
		const height = stageH;
		//与屏幕两侧保持外壳的距离。
		const hpad = 60;
		//与屏幕顶部的距离，以保持烟花爆裂。
		const vpad = 50;
		//最小爆发高度，以舞台高度的百分比表示
		const minHeightPercent = 0.45;
		//以像素为单位的最小突发高度
		const minHeight = height - height * minHeightPercent;

		const launchX = position * (width - hpad * 2) + hpad;
		const launchY = height;
		const burstY = minHeight - launchHeight * (minHeight - vpad);

		const launchDistance = launchY - burstY;
		// Using a custom power curve to approximate Vi needed to reach launchDistance under gravity and air drag.
		// Magic numbers came from testing.
		//使用自定义功率曲线来逼近在重力和空气阻力下达到发射距离所需的Vi。
		//神奇的数字来自测试。
		const launchVelocity = Math.pow(launchDistance * 0.04, 0.64);

		const comet = (this.comet = Star.add(
			launchX,
			launchY,
			typeof this.color === "string" && this.color !== "random" ? this.color : COLOR.White,
			Math.PI,
			launchVelocity * (this.horsetail ? 1.2 : 1),
			// Hang time is derived linearly from Vi; exact number came from testing
			launchVelocity * (this.horsetail ? 100 : 400)
		));

		// making comet "heavy" limits air drag
		// //让彗星“重”限制空气阻力
		comet.heavy = true;
		// comet spark trail
		comet.spinRadius = MyMath.random(0.32, 0.85);
		comet.sparkFreq = 32 / quality;
		if (isHighQuality) comet.sparkFreq = 8;
		comet.sparkLife = 320;
		comet.sparkLifeVariation = 3;
		if (this.glitter === "willow" || this.fallingLeaves) {
			comet.sparkFreq = 20 / quality;
			comet.sparkSpeed = 0.5;
			comet.sparkLife = 500;
		}
		if (this.color === INVISIBLE) {
			comet.sparkColor = COLOR.Gold;
		}

		// Randomly make comet "burn out" a bit early.
		// This is disabled for horsetail shells, due to their very short airtime.
		if (Math.random() > 0.4 && !this.horsetail) {
			comet.secondColor = INVISIBLE;
			comet.transitionTime = Math.pow(Math.random(), 1.5) * 700 + 500;
		}

		//爆炸回调
		comet.onDeath = (comet) => this.burst(comet.x, comet.y);

		soundManager.playSound("lift");
	}

	/**
	 * 在指定位置爆炸
	 * @param {*} x
	 * @param {*} y
	 */
	burst(x, y) {
		// Set burst speed so overall burst grows to set size. This specific formula was derived from testing, and is affected by simulated air drag.
		const speed = this.spreadSize / 96;

		let color, onDeath, sparkFreq, sparkSpeed, sparkLife;
		let sparkLifeVariation = 0.25;
		// Some death effects, like crackle, play a sound, but should only be played once.
		//有些死亡效果，像爆裂声，播放声音，但应该只播放一次。
		let playedDeathSound = false;

		if (this.crossette)
			onDeath = (star) => {
				if (!playedDeathSound) {
					soundManager.playSound("crackleSmall");
					playedDeathSound = true;
				}
				crossetteEffect(star);
			};
		if (this.crackle)
			onDeath = (star) => {
				if (!playedDeathSound) {
					soundManager.playSound("crackle");
					playedDeathSound = true;
				}
				crackleEffect(star);
			};
		if (this.floral) onDeath = floralEffect;
		if (this.fallingLeaves) onDeath = fallingLeavesEffect;

		if (this.glitter === "light") {
			sparkFreq = 400;
			sparkSpeed = 0.3;
			sparkLife = 300;
			sparkLifeVariation = 2;
		} else if (this.glitter === "medium") {
			sparkFreq = 200;
			sparkSpeed = 0.44;
			sparkLife = 700;
			sparkLifeVariation = 2;
		} else if (this.glitter === "heavy") {
			sparkFreq = 80;
			sparkSpeed = 0.8;
			sparkLife = 1400;
			sparkLifeVariation = 2;
		} else if (this.glitter === "thick") {
			sparkFreq = 16;
			sparkSpeed = isHighQuality ? 1.65 : 1.5;
			sparkLife = 1400;
			sparkLifeVariation = 3;
		} else if (this.glitter === "streamer") {
			sparkFreq = 32;
			sparkSpeed = 1.05;
			sparkLife = 620;
			sparkLifeVariation = 2;
		} else if (this.glitter === "willow") {
			sparkFreq = 120;
			sparkSpeed = 0.34;
			sparkLife = 1400;
			sparkLifeVariation = 3.8;
		}

		// Apply quality to spark count
		sparkFreq = sparkFreq / quality;

		// Star factory for primary burst, pistils, and streamers.
		//星形工厂，用于生产初级爆破、雌蕊和流光。
		let firstStar = true;
		const starFactory = (angle, speedMult) => {
			// For non-horsetail shells, compute an initial vertical speed to add to star burst.
			// The magic number comes from testing what looks best. The ideal is that all shell
			// bursts appear visually centered for the majority of the star life (excl. willows etc.)
			const standardInitialSpeed = this.spreadSize / 1800;

			const star = Star.add(
				x,
				y,
				color || randomColor(),
				angle,
				speedMult * speed,
				// add minor variation to star life
				this.starLife + Math.random() * this.starLife * this.starLifeVariation,
				this.horsetail ? this.comet && this.comet.speedX : 0,
				this.horsetail ? this.comet && this.comet.speedY : -standardInitialSpeed
			);

			if (this.secondColor) {
				star.transitionTime = this.starLife * (Math.random() * 0.05 + 0.32);
				star.secondColor = this.secondColor;
			}

			if (this.strobe) {
				star.transitionTime = this.starLife * (Math.random() * 0.08 + 0.46);
				star.strobe = true;
				// How many milliseconds between switch of strobe state "tick". Note that the strobe pattern
				// is on:off:off, so this is the "on" duration, while the "off" duration is twice as long.
				//频闪状态切换之间多少毫秒“滴答”。注意，选通模式
				//是开:关:关，所以这是“开”的时长，而“关”的时长是两倍。
				star.strobeFreq = Math.random() * 20 + 40;
				if (this.strobeColor) {
					star.secondColor = this.strobeColor;
				}
			}

			star.onDeath = onDeath;

			if (this.glitter) {
				star.sparkFreq = sparkFreq;
				star.sparkSpeed = sparkSpeed;
				star.sparkLife = sparkLife;
				star.sparkLifeVariation = sparkLifeVariation;
				star.sparkColor = this.glitterColor;
				star.sparkTimer = Math.random() * star.sparkFreq;
			}
		};

		//点阵星星工厂
		const dotStarFactory = (point, color, strobe, strobeColor) => {
			const standardInitialSpeed = this.spreadSize / 1800;

			if (strobe) {
				//随机speed 0.05~0.15
				var speed = Math.random() * 0.1 + 0.05;

				const star = Star.add(
					point.x,
					point.y,
					color,
					Math.random() * 2 * Math.PI,
					speed,
					// add minor variation to star life
					this.starLife + Math.random() * this.starLife * this.starLifeVariation + speed * 1000,
					this.horsetail ? this.comet && this.comet.speedX : 0,
					this.horsetail ? this.comet && this.comet.speedY : -standardInitialSpeed,
					2
				);

				star.transitionTime = this.starLife * (Math.random() * 0.08 + 0.46);
				star.strobe = true;
				star.strobeFreq = Math.random() * 20 + 40;
				star.secondColor = strobeColor;
			} else {
				Spark.add(
					point.x,
					point.y,
					color,
					Math.random() * 2 * Math.PI,
					// apply near cubic falloff to speed (places more particles towards outside)
					Math.pow(Math.random(), 0.15) * 1.4,
					this.starLife + Math.random() * this.starLife * this.starLifeVariation + 1000
				);
			}

			//文字尾影
			Spark.add(point.x + 5, point.y + 10, color, Math.random() * 2 * Math.PI, Math.pow(Math.random(), 0.05) * 0.4, this.starLife + Math.random() * this.starLife * this.starLifeVariation + 2000);
		};

		if (typeof this.color === "string") {
			if (this.color === "random") {
				color = null; // falsey value creates random color in starFactory
			} else {
				color = this.color;
			}

			//环的位置是随机的，旋转是随机的
			if (this.ring) {
				const ringStartAngle = Math.random() * Math.PI;
				const ringSquash = Math.pow(Math.random(), 2) * 0.85 + 0.15;

				createParticleArc(0, PI_2, this.starCount, 0, (angle) => {
					// Create a ring, squashed horizontally
					const initSpeedX = Math.sin(angle) * speed * ringSquash;
					const initSpeedY = Math.cos(angle) * speed;
					// Rotate ring
					const newSpeed = MyMath.pointDist(0, 0, initSpeedX, initSpeedY);
					const newAngle = MyMath.pointAngle(0, 0, initSpeedX, initSpeedY) + ringStartAngle;
					const star = Star.add(
						x,
						y,
						color,
						newAngle,
						// apply near cubic falloff to speed (places more particles towards outside)
						newSpeed, //speed,
						// add minor variation to star life
						this.starLife + Math.random() * this.starLife * this.starLifeVariation
					);

					if (this.glitter) {
						star.sparkFreq = sparkFreq;
						star.sparkSpeed = sparkSpeed;
						star.sparkLife = sparkLife;
						star.sparkLifeVariation = sparkLifeVariation;
						star.sparkColor = this.glitterColor;
						star.sparkTimer = Math.random() * star.sparkFreq;
					}
				});
			}
			// Normal burst
			else {
				createBurst(this.starCount, starFactory);
			}
		} else if (Array.isArray(this.color)) {
			if (Math.random() < 0.5) {
				const start = Math.random() * Math.PI;
				const start2 = start + Math.PI;
				const arc = Math.PI;
				color = this.color[0];
				// Not creating a full arc automatically reduces star count.
				createBurst(this.starCount, starFactory, start, arc);
				color = this.color[1];
				createBurst(this.starCount, starFactory, start2, arc);
			} else {
				color = this.color[0];
				createBurst(this.starCount / 2, starFactory);
				color = this.color[1];
				createBurst(this.starCount / 2, starFactory);
			}
		} else {
			throw new Error("无效的烟花颜色。应为字符串或字符串数组，但得到:" + this.color);
		}

		if (!this.disableWordd && store.state.config.wordShell) {
			if (Math.random() < 0.1) {
				if (Math.random() < 0.5) {
					createWordBurst(randomWord(), dotStarFactory, x, y);
				}
			}
		}

		if (this.pistil) {
			const innerShell = new Shell({
				spreadSize: this.spreadSize * 0.5,
				starLife: this.starLife * 0.6,
				starLifeVariation: this.starLifeVariation,
				starDensity: 1.4,
				color: this.pistilColor,
				glitter: "light",
				disableWord: true,
				glitterColor: this.pistilColor === COLOR.Gold ? COLOR.Gold : COLOR.White,
			});
			innerShell.burst(x, y);
		}

		if (this.streamers) {
			const innerShell = new Shell({
				spreadSize: this.spreadSize * 0.9,
				starLife: this.starLife * 0.8,
				starLifeVariation: this.starLifeVariation,
				starCount: Math.floor(Math.max(6, this.spreadSize / 45)),
				color: COLOR.White,
				disableWord: true,
				glitter: "streamer",
			});
			innerShell.burst(x, y);
		}

		// Queue burst flash render
		//队列突发flash渲染
		BurstFlash.add(x, y, this.spreadSize / 4);

		// Play sound, but only for "original" shell, the one that was launched.
		// We don't want multiple sounds from pistil or streamer "sub-shells".
		// This can be detected by the presence of a comet.

		//播放声音，但只针对“原装”shell，即被推出的那个。
		//我们不希望多个声音来自雌蕊或流光“子壳”。
		//这可以通过彗星的出现来检测。

		if (this.comet) {
			// Scale explosion sound based on current shell size and selected (max) shell size.
			// Shooting selected shell size will always sound the same no matter the selected size,
			// but when smaller shells are auto-fired, they will sound smaller. It doesn't sound great
			// when a value too small is given though, so instead of basing it on proportions, we just
			// look at the difference in size and map it to a range known to sound good.
			// This project is copyrighted by NianBroken!

			//根据当前烟花大小和选定的(最大)烟花大小缩放爆炸声音。
			//拍摄选择的外壳尺寸无论选择的尺寸如何，听起来总是一样的，
			//但是小一点的炮弹自动发射的时候，声音会小一点。听起来不太好
			//但是当给定的值太小时，我们不是根据比例，而是
			//看大小差异，映射到一个已知好听的范围。
			// 这个项目的版权归NianBroken所有！
			const maxDiff = 2;
			const sizeDifferenceFromMaxSize = Math.min(maxDiff, shellSizeSelector() - this.shellSize);
			const soundScale = (1 - sizeDifferenceFromMaxSize / maxDiff) * 0.3 + 0.7;
			soundManager.playSound("burst", soundScale);
		}
	}
}

const BurstFlash = {
	active: [],
	_pool: [],

	_new() {
		return {};
	},

	add(x, y, radius) {
		const instance = this._pool.pop() || this._new();

		instance.x = x;
		instance.y = y;
		instance.radius = radius;

		this.active.push(instance);
		return instance;
	},

	returnInstance(instance) {
		this._pool.push(instance);
	},
};

// Helper to generate objects for storing active particles.
// Particles are stored in arrays keyed by color (code, not name) for improved rendering performance.
function createParticleCollection() {
	const collection = {};
	COLOR_CODES_W_INVIS.forEach((color) => {
		collection[color] = [];
	});
	return collection;
}

// Star properties (WIP)
// -----------------------
// transitionTime - how close to end of life that star transition happens

//星花
const Star = {
	// Visual properties
	airDrag: 0.98,
	airDragHeavy: 0.992,

	// Star particles will be keyed by color
	active: createParticleCollection(),
	_pool: [],

	_new() {
		return {};
	},

	add(x, y, color, angle, speed, life, speedOffX, speedOffY, size = 3) {
		const instance = this._pool.pop() || this._new();
		instance.visible = true;
		instance.heavy = false;
		instance.x = x;
		instance.y = y;
		instance.prevX = x;
		instance.prevY = y;
		instance.color = color;
		instance.speedX = Math.sin(angle) * speed + (speedOffX || 0);
		instance.speedY = Math.cos(angle) * speed + (speedOffY || 0);
		instance.life = life;
		instance.fullLife = life;
		instance.size = size;
		instance.spinAngle = Math.random() * PI_2;
		instance.spinSpeed = 0.8;
		instance.spinRadius = 0;
		instance.sparkFreq = 0; // ms between spark emissions
		instance.sparkSpeed = 1;
		instance.sparkTimer = 0;
		instance.sparkColor = color;
		instance.sparkLife = 750;
		instance.sparkLifeVariation = 0.25;
		instance.strobe = false;

		/*
			visible: bool, 是否应该绘制星花.
			heavy: bool, 是否是 "重" 星花, 关系到应用的空气阻力.
			x: float, 星花的当前 x 坐标.
			y: float, 星花的当前 y 坐标.
			prevX: float, 上一帧星花的 x 坐标.
			prevY: float, 上一帧星花的 y 坐标.
			color: string, 星花的颜色.
			speedX: float, 星花当前 x 方向的速度.
			speedY: float, 星花当前 y 方向的速度.
			life: float, 星花的剩余生命值 (ms).
			fullLife: float, 星花的总生命值 (ms).
			spinAngle: float, 星花的旋转角度.
			spinSpeed: float, 星花的旋转速度.
			spinRadius: float, 星花的旋转半径.
			sparkFreq: float, 发射火花的频率 (ms).
			sparkSpeed: float, 火花的速度.
			sparkTimer: float, 火花的计时器 (ms).
			sparkColor: string, 火花的颜色.
			sparkLife: float, 火花的生命值 (ms).
			sparkLifeVariation: float, 火花的生命值的可变范围.
			strobe: bool, 是否应用闪烁效果.
			onDeath: function, 星花死亡时调用的回调函数.
			secondColor: string, 在生命周期中星花颜色渐变时的第二个颜色.
			transitionTime:星花生命周期结束之前发生变化的时间
		*/

		this.active[color].push(instance);
		return instance;
	},

	// Public method for cleaning up and returning an instance back to the pool.
	// This project is copyrighted by NianBroken!
	// 用于清理实例并将实例返回到池中的公共方法。
	// 这个项目的版权归NianBroken所有！
	returnInstance(instance) {
		// Call onDeath handler if available (and pass it current star instance)
		instance.onDeath && instance.onDeath(instance);
		// Clean up
		instance.onDeath = null;
		instance.secondColor = null;
		instance.transitionTime = 0;
		instance.colorChanged = false;
		// Add back to the pool.
		this._pool.push(instance);
	},
};

//火花
const Spark = {
	// Visual properties
	drawWidth: 0, // set in `configDidUpdate()`
	airDrag: 0.9,

	// Star particles will be keyed by color
	active: createParticleCollection(),
	_pool: [],

	_new() {
		return {};
	},

	add(x, y, color, angle, speed, life) {
		const instance = this._pool.pop() || this._new();

		instance.x = x;
		instance.y = y;
		instance.prevX = x;
		instance.prevY = y;
		instance.color = color;
		instance.speedX = Math.sin(angle) * speed;
		instance.speedY = Math.cos(angle) * speed;
		instance.life = life;

		this.active[color].push(instance);
		return instance;
	},

	// Public method for cleaning up and returning an instance back to the pool.
	returnInstance(instance) {
		// Add back to the pool.
		this._pool.push(instance);
	},
};

//音效管理器
const soundManager = {
	baseURL: "./audio/",
	ctx: new (window.AudioContext || window.webkitAudioContext)(),
	sources: {
		lift: {
			volume: 1,
			playbackRateMin: 0.85,
			playbackRateMax: 0.95,
			fileNames: ["lift1.mp3", "lift2.mp3", "lift3.mp3"],
		},
		burst: {
			volume: 1,
			playbackRateMin: 0.8,
			playbackRateMax: 0.9,
			fileNames: ["burst1.mp3", "burst2.mp3"],
		},
		burstSmall: {
			volume: 0.25,
			playbackRateMin: 0.8,
			playbackRateMax: 1,
			fileNames: ["burst-sm-1.mp3", "burst-sm-2.mp3"],
		},
		crackle: {
			volume: 0.2,
			playbackRateMin: 1,
			playbackRateMax: 1,
			fileNames: ["crackle1.mp3"],
		},
		crackleSmall: {
			volume: 0.3,
			playbackRateMin: 1,
			playbackRateMax: 1,
			fileNames: ["crackle-sm-1.mp3"],
		},
	},

	preload() {
		const allFilePromises = [];

		function checkStatus(response) {
			if (response.status >= 200 && response.status < 300) {
				return response;
			}
			const customError = new Error(response.statusText);
			customError.response = response;
			throw customError;
		}

		const types = Object.keys(this.sources);
		types.forEach((type) => {
			const source = this.sources[type];
			const { fileNames } = source;
			const filePromises = [];
			fileNames.forEach((fileName) => {
				const fileURL = this.baseURL + fileName;
				// Promise will resolve with decoded audio buffer.
				const promise = fetch(fileURL)
					.then(checkStatus)
					.then((response) => response.arrayBuffer())
					.then(
						(data) =>
							new Promise((resolve) => {
								this.ctx.decodeAudioData(data, resolve);
							})
					);

				filePromises.push(promise);
				allFilePromises.push(promise);
			});

			Promise.all(filePromises).then((buffers) => {
				source.buffers = buffers;
			});
		});

		return Promise.all(allFilePromises);
	},

	pauseAll() {
		this.ctx.suspend();
	},

	resumeAll() {
		// Play a sound with no volume for iOS. This 'unlocks' the audio context when the user first enables sound.
		this.playSound("lift", 0);
		// Chrome mobile requires interaction before starting audio context.
		// The sound toggle button is triggered on 'touchstart', which doesn't seem to count as a full
		// interaction to Chrome. I guess it needs a click? At any rate if the first thing the user does
		// is enable audio, it doesn't work. Using a setTimeout allows the first interaction to be registered.
		// Perhaps a better solution is to track whether the user has interacted, and if not but they try enabling
		// sound, show a tooltip that they should tap again to enable sound.
		setTimeout(() => {
			this.ctx.resume();
		}, 250);
	},

	// Private property used to throttle small burst sounds.
	_lastSmallBurstTime: 0,

	/**
	 * Play a sound of `type`. Will randomly pick a file associated with type, and play it at the specified volume
	 * and play speed, with a bit of random variance in play speed. This is all based on `sources` config.
	 *
	 * @param  {string} type - The type of sound to play.
	 * @param  {?number} scale=1 - Value between 0 and 1 (values outside range will be clamped). Scales less than one
	 *                             descrease volume and increase playback speed. This is because large explosions are
	 *                             louder, deeper, and reverberate longer than small explosions.
	 *                             Note that a scale of 0 will mute the sound.
	 */
	playSound(type, scale = 1) {
		// Ensure `scale` is within valid range.
		scale = MyMath.clamp(scale, 0, 1);

		// Disallow starting new sounds if sound is disabled, app is running in slow motion, or paused.
		// Slow motion check has some wiggle room in case user doesn't finish dragging the speed bar
		// *all* the way back.
		if (!canPlaySoundSelector() || simSpeed < 0.95) {
			return;
		}

		// Throttle small bursts, since floral/falling leaves shells have a lot of them.
		if (type === "burstSmall") {
			const now = Date.now();
			if (now - this._lastSmallBurstTime < 20) {
				return;
			}
			this._lastSmallBurstTime = now;
		}

		const source = this.sources[type];

		if (!source) {
			throw new Error(`Sound of type "${type}" doesn't exist.`);
		}

		const initialVolume = source.volume;
		const initialPlaybackRate = MyMath.random(source.playbackRateMin, source.playbackRateMax);

		// Volume descreases with scale.
		const scaledVolume = initialVolume * scale;
		// Playback rate increases with scale. For this, we map the scale of 0-1 to a scale of 2-1.
		// So at a scale of 1, sound plays normally, but as scale approaches 0 speed approaches double.
		const scaledPlaybackRate = initialPlaybackRate * (2 - scale);

		const gainNode = this.ctx.createGain();
		gainNode.gain.value = scaledVolume;

		const buffer = MyMath.randomChoice(source.buffers);
		const bufferSource = this.ctx.createBufferSource();
		bufferSource.playbackRate.value = scaledPlaybackRate;
		bufferSource.buffer = buffer;
		bufferSource.connect(gainNode);
		gainNode.connect(this.ctx.destination);
		bufferSource.start(0);
	},
};

// imageTemplateManager.preload().then(() => {
//     if(imageTemplateManager.sources.length>0){
//         var img = imageTemplateManager.sources[0];
//     }
// });

// Kick things off.

function setLoadingStatus(status) {
	document.querySelector(".loading-init__status").textContent = status;
}

// CodePen profile header doesn't need audio, just initialize.
if (IS_HEADER) {
	init();
} else {
	// Allow status to render, then preload assets and start app.
	setLoadingStatus("正在点燃导火线");
	setTimeout(() => {
		// 只加载 soundManager
		var promises = [soundManager.preload()];

		// 在 soundManager 加载完毕后调用 init
		Promise.all(promises).then(init, (reason) => {
			console.log("资源文件加载失败");
			init();
			return Promise.reject(reason);
		});
	}, 0);
}
