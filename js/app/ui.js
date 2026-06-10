"use strict";

(function initFireworksAppUI(global) {
	const appConfig = global.FireworksAppConfig;

	function queryNodes() {
		return Object.keys(appConfig.selectors).reduce((nodes, key) => {
			const node = document.querySelector(appConfig.selectors[key]);
			if (!node) {
				throw new Error(`未找到界面节点: ${appConfig.selectors[key]}`);
			}

			nodes[key] = node;
			return nodes;
		}, {});
	}

	function createOptionMarkup(options) {
		return options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
	}

	function populateControls(nodes, shellNames, options) {
		nodes.shellType.innerHTML = createOptionMarkup(shellNames.map((name) => ({ value: name, label: name })));
		nodes.shellSize.innerHTML = createOptionMarkup(options.shellSizeOptions);
		nodes.quality.innerHTML = createOptionMarkup(options.qualityOptions);
		nodes.skyLighting.innerHTML = createOptionMarkup(options.skyLightingOptions);
		nodes.scaleFactor.innerHTML = createOptionMarkup(options.scaleFactorOptions);
	}

	function readConfigFromDom(nodes) {
		return {
			quality: nodes.quality.value,
			shell: nodes.shellType.value,
			size: nodes.shellSize.value,
			wordShell: nodes.wordShell.checked,
			autoLaunch: nodes.autoLaunch.checked,
			finale: nodes.finaleMode.checked,
			skyLighting: nodes.skyLighting.value,
			hideControls: nodes.hideControls.checked,
			longExposure: nodes.longExposure.checked,
			scaleFactor: Number.parseFloat(nodes.scaleFactor.value),
		};
	}

	function renderApp(state, nodes) {
		const pauseBtnIcon = `#icon-${state.paused ? "play" : "pause"}`;
		const soundBtnIcon = `#icon-sound-${state.soundEnabled ? "on" : "off"}`;

		nodes.pauseBtnSVG.setAttribute("href", pauseBtnIcon);
		nodes.pauseBtnSVG.setAttribute("xlink:href", pauseBtnIcon);
		nodes.soundBtnSVG.setAttribute("href", soundBtnIcon);
		nodes.soundBtnSVG.setAttribute("xlink:href", soundBtnIcon);

		nodes.controls.classList.toggle("hide", state.menuOpen || state.config.hideControls);
		nodes.canvasContainer.classList.toggle("blur", state.menuOpen);
		nodes.menu.classList.toggle("hide", !state.menuOpen);
		nodes.finaleModeFormOption.style.opacity = state.config.autoLaunch ? 1 : 0.32;

		nodes.quality.value = state.config.quality;
		nodes.shellType.value = state.config.shell;
		nodes.shellSize.value = state.config.size;
		nodes.wordShell.checked = state.config.wordShell;
		nodes.autoLaunch.checked = state.config.autoLaunch;
		nodes.finaleMode.checked = state.config.finale;
		nodes.skyLighting.value = state.config.skyLighting;
		nodes.hideControls.checked = state.config.hideControls;
		nodes.fullscreen.checked = state.fullscreen;
		nodes.longExposure.checked = state.config.longExposure;
		nodes.scaleFactor.value = state.config.scaleFactor.toFixed(2);
		nodes.backgroundInput.value = state.background.configured ? state.background.value : "";

		nodes.menuInnerWrap.style.opacity = state.openHelpTopic ? 0.12 : 1;
		nodes.helpModal.classList.toggle("active", Boolean(state.openHelpTopic));
		if (state.openHelpTopic) {
			const helpContent = appConfig.helpContent[state.openHelpTopic];
			if (!helpContent) {
				throw new Error(`未知帮助主题: ${state.openHelpTopic}`);
			}
			nodes.helpModalHeader.textContent = helpContent.header;
			nodes.helpModalBody.textContent = helpContent.body;
		}
	}

	function setBackgroundStatus(nodes, text, state) {
		nodes.backgroundStatus.textContent = text;
		nodes.backgroundStatus.dataset.state = state;
	}

	function bindAppControls(options) {
		const nodes = options.nodes;

		const syncConfig = () => options.onConfigChange(readConfigFromDom(nodes));

		["quality", "shellType", "shellSize", "skyLighting"].forEach((key) => {
			nodes[key].addEventListener("change", syncConfig);
		});

		["wordShell", "autoLaunch", "finaleMode", "hideControls", "longExposure"].forEach((key) => {
			nodes[key].addEventListener("change", syncConfig);
		});

		nodes.scaleFactor.addEventListener("change", () => {
			syncConfig();
			options.onScaleFactorChange();
		});

		nodes.fullscreen.addEventListener("change", options.onToggleFullscreen);

		nodes.backgroundApplyBtn.addEventListener("click", () => {
			options.onBackgroundApply(nodes.backgroundInput.value);
		});

		nodes.backgroundClearBtn.addEventListener("click", options.onBackgroundClear);

		nodes.backgroundInput.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				options.onBackgroundApply(nodes.backgroundInput.value);
			}
		});

		Object.keys(appConfig.helpNodeMap).forEach((nodeKey) => {
			nodes[nodeKey].addEventListener("click", () => {
				options.onHelpOpen(appConfig.helpNodeMap[nodeKey]);
			});
		});

		nodes.helpModalCloseBtn.addEventListener("click", options.onHelpClose);
		nodes.helpModalOverlay.addEventListener("click", options.onHelpClose);
	}

	global.FireworksAppUI = Object.freeze({
		queryNodes,
		populateControls,
		readConfigFromDom,
		renderApp,
		setBackgroundStatus,
		bindAppControls,
	});
})(window);
