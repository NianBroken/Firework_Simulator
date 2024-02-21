/*
Copyright © 2022 NianBroken. All rights reserved.
Github：https://github.com/NianBroken/Firework_Simulator
Gitee：https://gitee.com/nianbroken/Firework_Simulator
本项目采用 Apache-2.0 许可证
简而言之，你可以自由使用、修改和分享本项目的代码，但前提是在其衍生作品中必须保留原始许可证和版权信息，并且必须以相同的许可证发布所有修改过的代码。
*/

const MyMath = (function MyMathFactory(Math) {
	const MyMath = {};

	// degree/radian conversion constants
	MyMath.toDeg = 180 / Math.PI;
	MyMath.toRad = Math.PI / 180;
	MyMath.halfPI = Math.PI / 2;
	MyMath.twoPI = Math.PI * 2;

	// Pythagorean Theorem distance calculation
	MyMath.dist = (width, height) => {
		return Math.sqrt(width * width + height * height);
	};

	// Pythagorean Theorem point distance calculation
	// Same as above, but takes coordinates instead of dimensions.
	// This project is copyrighted by NianBroken!
	MyMath.pointDist = (x1, y1, x2, y2) => {
		const distX = x2 - x1;
		const distY = y2 - y1;
		return Math.sqrt(distX * distX + distY * distY);
	};

	// Returns the angle (in radians) of a 2D vector
	MyMath.angle = (width, height) => MyMath.halfPI + Math.atan2(height, width);

	// Returns the angle (in radians) between two points
	// Same as above, but takes coordinates instead of dimensions.
	MyMath.pointAngle = (x1, y1, x2, y2) => MyMath.halfPI + Math.atan2(y2 - y1, x2 - x1);

	// Splits a speed vector into x1 and y components (angle needs to be in radians)
	MyMath.splitVector = (speed, angle) => ({
		x: Math.sin(angle) * speed,
		y: -Math.cos(angle) * speed,
	});

	// Generates a random number between min (inclusive) and max (exclusive)
	MyMath.random = (min, max) => Math.random() * (max - min) + min;

	// Generates a random integer between and possibly including min and max values
	MyMath.randomInt = (min, max) => ((Math.random() * (max - min + 1)) | 0) + min;

	// Returns a random element from an array, or simply the set of provided arguments when called
	MyMath.randomChoice = function randomChoice(choices) {
		if (arguments.length === 1 && Array.isArray(choices)) {
			return choices[(Math.random() * choices.length) | 0];
		}
		return arguments[(Math.random() * arguments.length) | 0];
	};

	// Clamps a number between min and max values
	MyMath.clamp = function clamp(num, min, max) {
		return Math.min(Math.max(num, min), max);
	};

	/**
	 * 文字转点阵
	 * @param {string} text 文本内容
	 * @param {number} density 点阵密度默认3
	 * @param {string} fontFamily 字体 默认Georgia
	 * @param {string} fontSize 字体大小 默认60px
	 * @returns {Array} 点阵数组
	 */
	MyMath.literalLattice = function literalLattice(text, density = 3, fontFamily = "Georgia", fontSize = "60px") {
		// 创建一个空的点阵数组
		var dots = [];
		// 创建一个画布
		var canvas = document.createElement("canvas");
		var ctx = canvas.getContext("2d");

		var font = `${fontSize} ${fontFamily}`;

		ctx.font = font;
		var width = ctx.measureText(text).width;
		var fontSize = parseInt(fontSize.match(/(\d+)px/)[1]);
		canvas.width = width + 20;
		canvas.height = fontSize + 20;

		ctx.font = font;
		ctx.fillText(text, 10, fontSize + 10);

		// 获取画布上的像素数据
		var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

		for (var y = 0; y < imageData.height; y += density) {
			for (var x = 0; x < imageData.width; x += density) {
				var i = (y * imageData.width + x) * 4;
				// 如果像素的alpha值大于0，则表示该像素是文本的一部分
				if (imageData.data[i + 3] > 0) {
					// 在轮廓数组中创建一个点，并记录坐标
					dots.push({ x: x, y: y });
				}
			}
		}

		// //清除画布,将dots 中的每个点绘制到画布上
		// ctx.clearRect(0, 0, canvas.width, canvas.height);
		// ctx.fillStyle = 'red';
		// dots.forEach(function (dot) {
		//     ctx.fillRect(dot.x, dot.y, 1, 1);
		// });

		// // 创建img元素,填充canvas图像内容 并添加到新窗口body
		// var img = document.createElement('img');
		// img.src = canvas.toDataURL();
		// img.style.width = canvas.width + 'px';
		// img.style.height = canvas.height + 'px';
		// document.body.appendChild(img);
		// window.open().document.body.appendChild(img);

		//canvas 导出为图片

		return {
			width: canvas.width,
			height: canvas.height,
			points: dots,
		};
	};

	return MyMath;
})(Math);
