/*
Copyright © 2022 NianBroken. All rights reserved.
Github：https://github.com/NianBroken/Firework_Simulator
Gitee：https://gitee.com/nianbroken/Firework_Simulator
本项目采用 Apache-2.0 许可证
简而言之，你可以自由使用、修改和分享本项目的代码，但前提是在其衍生作品中必须保留原始许可证和版权信息，并且必须以相同的许可证发布所有修改过的代码。
*/

"use strict";

function setLoadingStatus(status) {
	document.querySelector(".loading-init__status").textContent = status;
}

function applyStaticText() {
	if (appNodes.copyrightYear) {
		appNodes.copyrightYear.textContent = String(new Date().getFullYear());
	}
}

function populateAppControls() {
	populateControls(appNodes, shellNames, {
		shellSizeOptions: ['3"', '4"', '6"', '8"', '12"', '16"'].map((label, index) => ({
			value: String(index),
			label,
		})),
		qualityOptions: [
			{ label: "低", value: QUALITY_LOW },
			{ label: "正常", value: QUALITY_NORMAL },
			{ label: "高", value: QUALITY_HIGH },
		],
		skyLightingOptions: [
			{ label: "不", value: SKY_LIGHT_NONE },
			{ label: "暗", value: SKY_LIGHT_DIM },
			{ label: "正常", value: SKY_LIGHT_NORMAL },
		],
		scaleFactorOptions: appConfig.scaleFactorOptions.map((value) => ({
			value: value.toFixed(2),
			label: `${value * 100}%`,
		})),
	});
}

function init() {
	const loadingNode = document.querySelector(".loading-init");
	if (loadingNode) {
		loadingNode.remove();
	}

	appNodes.stageContainer.classList.remove("remove");
	populateAppControls();

	if (!shellTypes[store.state.config.shell]) {
		store.setState({
			config: {
				...store.state.config,
				shell: "Random",
			},
		});
	}

	togglePause(false);
	renderApp(store.state, appNodes);
	configDidUpdate();
	applyResolvedBackground();
}

function attachRuntimeBindings() {
	store.subscribe((state) => renderApp(state, appNodes));
	store.subscribe(handleStateChange);

	bindAppControls({
		nodes: appNodes,
		onConfigChange: updateConfig,
		onScaleFactorChange: handleResize,
		onToggleFullscreen: toggleFullscreen,
		onBackgroundApply: handleBackgroundApply,
		onBackgroundClear: handleBackgroundClear,
		onHelpOpen(helpTopic) {
			store.setState({ openHelpTopic: helpTopic });
		},
		onHelpClose() {
			store.setState({ openHelpTopic: null });
		},
	});

	mainStage.addEventListener("pointerstart", handlePointerStart);
	mainStage.addEventListener("pointerend", handlePointerEnd);
	mainStage.addEventListener("pointermove", handlePointerMove);
	mainStage.addEventListener("ticker", update);

	window.addEventListener("keydown", handleKeydown);
	window.addEventListener("resize", handleResize);

	if (!fullscreenEnabled()) {
		appNodes.fullscreenFormOption.classList.add("remove");
	}

	backgroundManager.setStatus("未设置自定义背景", "idle");
	handleResize();
}

applyStaticText();
attachRuntimeBindings();

if (IS_HEADER) {
	init();
} else {
	setLoadingStatus("正在点燃导火线");
	setTimeout(() => {
		Promise.all([soundManager.preload()])
			.then(() => {
				init();
			})
			.catch(() => {
				init();
			});
	}, 0);
}
