"use strict";

(function initFireworksBackgroundManager(global) {
	const cssImagePattern = /^(?:url\(|(?:repeating-)?(?:linear|radial|conic)-gradient\(|image-set\(|cross-fade\()/i;
	const urlPattern = /url\((['"]?)(.*?)\1\)/i;

	function extractUrl(cssValue) {
		const match = cssValue.match(urlPattern);
		return match ? match[2].trim() : "";
	}

	function buildCssValue(rawValue) {
		const trimmedValue = rawValue.trim();
		if (!trimmedValue) {
			return null;
		}

		if (cssImagePattern.test(trimmedValue)) {
			return {
				mode: trimmedValue.startsWith("url(") ? "image" : "style",
				rawValue: trimmedValue,
				cssValue: trimmedValue,
				preloadUrl: extractUrl(trimmedValue),
			};
		}

		return {
			mode: "image",
			rawValue: trimmedValue,
			cssValue: `url(${JSON.stringify(new URL(trimmedValue, window.location.href).href)})`,
			preloadUrl: new URL(trimmedValue, window.location.href).href,
		};
	}

	function preloadImage(url) {
		if (!url) {
			return Promise.resolve();
		}

		const resolvedUrl = new URL(url, window.location.href);
		if (resolvedUrl.origin === window.location.origin) {
			return fetch(resolvedUrl.href, { cache: "no-store" }).then((response) => {
				const contentType = response.headers.get("content-type") || "";
				if (!response.ok || !contentType.startsWith("image/")) {
					throw new Error("背景图片加载失败");
				}
			});
		}

		return new Promise((resolve, reject) => {
			const image = new Image();
			image.onload = () => resolve();
			image.onerror = () => reject(new Error("背景图片加载失败"));
			image.src = resolvedUrl.href;
		});
	}

	function createBackgroundManager(options) {
		const container = options.container;
		const onStatusChange = options.onStatusChange;
		let requestId = 0;

		function setStatus(message, state) {
			onStatusChange(message, state);
		}

		function clearBackground() {
			requestId += 1;
			container.style.backgroundImage = "";
			container.style.backgroundPosition = "";
			container.style.backgroundRepeat = "";
			container.style.backgroundSize = "";
			setStatus("未设置自定义背景", "idle");
			return {
				mode: "none",
				value: "",
			};
		}

		async function applyBackground(candidate) {
			const rawValue = typeof candidate === "string" ? candidate : candidate && candidate.value;
			const normalizedValue = typeof rawValue === "string" ? rawValue.trim() : "";

			if (!normalizedValue) {
				return {
					ok: true,
					settings: clearBackground(),
				};
			}

			const backgroundDefinition = buildCssValue(normalizedValue);
			if (!backgroundDefinition) {
				return {
					ok: true,
					settings: clearBackground(),
				};
			}

			const currentRequestId = ++requestId;
			setStatus("正在加载背景", "loading");

			try {
				await preloadImage(backgroundDefinition.preloadUrl);
				if (currentRequestId !== requestId) {
					return { ok: false, cancelled: true };
				}

				const validationNode = document.createElement("div");
				validationNode.style.backgroundImage = backgroundDefinition.cssValue;
				if (!validationNode.style.backgroundImage) {
					throw new Error("背景样式无效");
				}

				container.style.backgroundImage = backgroundDefinition.cssValue;
				container.style.backgroundPosition = "center";
				container.style.backgroundRepeat = "no-repeat";
				container.style.backgroundSize = "cover";
				setStatus("自定义背景已应用", "success");

				return {
					ok: true,
					settings: {
						mode: backgroundDefinition.mode,
						value: backgroundDefinition.rawValue,
					},
				};
			} catch (error) {
				if (currentRequestId !== requestId) {
					return { ok: false, cancelled: true };
				}

				setStatus("背景加载失败，请检查地址或样式", "error");
				return {
					ok: false,
					error,
				};
			}
		}

		return {
			applyBackground,
			clearBackground,
			setStatus,
		};
	}

	global.FireworksBackgroundManager = Object.freeze({
		createBackgroundManager,
	});
})(window);
