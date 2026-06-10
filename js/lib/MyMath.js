/*
Copyright © 2022 NianBroken. All rights reserved.
Github：https://github.com/NianBroken/Firework_Simulator
Gitee：https://gitee.com/nianbroken/Firework_Simulator
本项目采用 Apache-2.0 许可证
简而言之，你可以自由使用、修改和分享本项目的代码，但前提是在其衍生作品中必须保留原始许可证和版权信息，并且必须以相同的许可证发布所有修改过的代码。
*/

const MyMath = (function MyMathFactory(Math) {
	"use strict";

	function extractFontPixelSize(fontSize) {
		const match = String(fontSize).match(/(\d+)px/);
		return match ? Number.parseInt(match[1], 10) : 60;
	}

	return {
		toDeg: 180 / Math.PI,
		toRad: Math.PI / 180,
		halfPI: Math.PI / 2,
		twoPI: Math.PI * 2,
		dist(width, height) {
			return Math.sqrt(width * width + height * height);
		},
		pointDist(x1, y1, x2, y2) {
			const distX = x2 - x1;
			const distY = y2 - y1;
			return Math.sqrt(distX * distX + distY * distY);
		},
		angle(width, height) {
			return this.halfPI + Math.atan2(height, width);
		},
		pointAngle(x1, y1, x2, y2) {
			return this.halfPI + Math.atan2(y2 - y1, x2 - x1);
		},
		splitVector(speed, angle) {
			return {
				x: Math.sin(angle) * speed,
				y: -Math.cos(angle) * speed,
			};
		},
		random(min, max) {
			return Math.random() * (max - min) + min;
		},
		randomInt(min, max) {
			return ((Math.random() * (max - min + 1)) | 0) + min;
		},
		randomChoice(choices) {
			if (arguments.length === 1 && Array.isArray(choices)) {
				return choices[(Math.random() * choices.length) | 0];
			}

			return arguments[(Math.random() * arguments.length) | 0];
		},
		clamp(num, min, max) {
			return Math.min(Math.max(num, min), max);
		},
		literalLattice(text, density = 3, fontFamily = "Georgia", fontSize = "60px") {
			const dots = [];
			const canvas = document.createElement("canvas");
			const context = canvas.getContext("2d");
			const font = `${fontSize} ${fontFamily}`;
			const fontPixelSize = extractFontPixelSize(fontSize);

			context.font = font;
			const width = context.measureText(text).width;
			canvas.width = width + 20;
			canvas.height = fontPixelSize + 20;

			context.font = font;
			context.fillText(text, 10, fontPixelSize + 10);

			const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
			for (let y = 0; y < imageData.height; y += density) {
				for (let x = 0; x < imageData.width; x += density) {
					const index = (y * imageData.width + x) * 4;
					if (imageData.data[index + 3] > 0) {
						dots.push({ x, y });
					}
				}
			}

			return {
				width: canvas.width,
				height: canvas.height,
				points: dots,
			};
		},
	};
})(Math);
