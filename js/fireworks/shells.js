/*
Copyright © 2022 NianBroken. All rights reserved.
Github：https://github.com/NianBroken/Firework_Simulator
Gitee：https://gitee.com/nianbroken/Firework_Simulator
本项目采用 Apache-2.0 许可证
简而言之，你可以自由使用、修改和分享本项目的代码，但前提是在其衍生作品中必须保留原始许可证和版权信息，并且必须以相同的许可证发布所有修改过的代码。
*/

"use strict";

function randomColorSimple() {
	return COLOR_CODES[(Math.random() * COLOR_CODES.length) | 0];
}

let lastColor;

function randomColor(options) {
	const notSame = options && options.notSame;
	const notColor = options && options.notColor;
	const limitWhite = options && options.limitWhite;
	let color = randomColorSimple();

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

function randomWord() {
	if (randomWords.length === 0) {
		return "";
	}

	if (randomWords.length === 1) {
		return randomWords[0];
	}

	return randomWords[(Math.random() * randomWords.length) | 0];
}

function whiteOrGold() {
	return Math.random() < 0.5 ? COLOR.Gold : COLOR.White;
}

function makePistilColor(shellColor) {
	if (shellColor === COLOR.White || shellColor === COLOR.Gold) {
		return randomColor({ notColor: shellColor });
	}

	return whiteOrGold();
}

const crysanthemumShell = (size = 1) => {
	const glitter = Math.random() < 0.25;
	const singleColor = Math.random() < 0.72;
	const color = singleColor ? randomColor({ limitWhite: true }) : [randomColor(), randomColor({ notSame: true })];
	const pistil = singleColor && Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(color);
	const secondColor =
		singleColor && (Math.random() < 0.2 || color === COLOR.White)
			? pistilColor || randomColor({ notColor: color, limitWhite: true })
			: null;
	const streamers = !pistil && color !== COLOR.White && Math.random() < 0.42;
	let starDensity = glitter ? 1.1 : 1.25;

	if (isLowQuality) {
		starDensity *= 0.8;
	}
	if (isHighQuality) {
		starDensity = 1.2;
	}

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
	const shell = crysanthemumShell(size);
	const ghostColor = randomColor({ notColor: COLOR.White });
	const pistil = Math.random() < 0.42;
	const pistilColor = pistil && makePistilColor(ghostColor);

	shell.starLife *= 1.5;
	shell.streamers = true;
	shell.color = INVISIBLE;
	shell.secondColor = ghostColor;
	shell.glitter = "";
	shell.pistil = pistil;
	shell.pistilColor = pistilColor;

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
		glitter: pistil ? "" : "light",
		glitterColor: color === COLOR.Gold ? COLOR.Gold : COLOR.White,
		streamers: Math.random() < 0.3,
	};
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
		strobe: color === COLOR.White,
	};
};

function randomShellName() {
	return Math.random() < 0.5 ? "Crysanthemum" : shellNames[(Math.random() * (shellNames.length - 1) + 1) | 0];
}

function randomShell(size) {
	if (IS_HEADER) {
		return randomFastShell()(size);
	}

	return shellTypes[randomShellName()](size);
}

function configuredShellName() {
	return shellTypes[shellNameSelector()] ? shellNameSelector() : "Random";
}

function shellFromConfig(size) {
	return shellTypes[configuredShellName()](size);
}

const fastShellBlacklist = ["Falling Leaves", "Floral", "Willow"];

function randomFastShell() {
	const isRandomShell = shellNameSelector() === "Random";
	let shellName = isRandomShell ? randomShellName() : configuredShellName();

	if (isRandomShell) {
		while (fastShellBlacklist.includes(shellName)) {
			shellName = randomShellName();
		}
	}

	return shellTypes[shellName];
}

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

function launchShellFromConfig(event) {
	registerUserInteraction();
	const shell = new Shell(shellFromConfig(shellSizeSelector()));
	const stageWidth = mainStage.width;
	const stageHeight = mainStage.height;

	if (event && store.state.config.wordShell) {
		shell.forceWordBurst = true;
		wordBurstTracker.reset();
	}

	shell.launch(
		event ? event.x / stageWidth : getRandomShellPositionH(),
		event ? 1 - event.y / stageHeight : getRandomShellPositionV()
	);
}

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

	return 900 + Math.random() * 600 + shell.starLife;
}

function seqTwoRandom() {
	const firstSize = getRandomShellSize();
	const secondSize = getRandomShellSize();
	const firstShell = new Shell(shellFromConfig(firstSize.size));
	const secondShell = new Shell(shellFromConfig(secondSize.size));
	const leftOffset = Math.random() * 0.2 - 0.1;
	const rightOffset = Math.random() * 0.2 - 0.1;

	firstShell.launch(0.3 + leftOffset, firstSize.height);
	setTimeout(() => {
		secondShell.launch(0.7 + rightOffset, secondSize.height);
	}, 100);

	let extraDelay = Math.max(firstShell.starLife, secondShell.starLife);
	if (firstShell.fallingLeaves || secondShell.fallingLeaves) {
		extraDelay = 4600;
	}

	return 900 + Math.random() * 600 + extraDelay;
}

function seqTriple() {
	const shellType = randomFastShell();
	const baseSize = shellSizeSelector();
	const smallSize = Math.max(0, baseSize - 1.25);
	const baseOffset = Math.random() * 0.08 - 0.04;

	new Shell(shellType(baseSize)).launch(0.5 + baseOffset, 0.7);

	const leftDelay = 1000 + Math.random() * 400;
	const rightDelay = 1000 + Math.random() * 400;

	setTimeout(() => {
		const offset = Math.random() * 0.08 - 0.04;
		new Shell(shellType(smallSize)).launch(0.2 + offset, 0.1);
	}, leftDelay);

	setTimeout(() => {
		const offset = Math.random() * 0.08 - 0.04;
		new Shell(shellType(smallSize)).launch(0.8 + offset, 0.1);
	}, rightDelay);

	return 4000;
}

function seqPyramid() {
	const barrageCountHalf = IS_DESKTOP ? 7 : 4;
	const largeSize = shellSizeSelector();
	const smallSize = Math.max(0, largeSize - 3);
	const mainShellFactory = Math.random() < 0.78 ? crysanthemumShell : ringShell;
	const specialShellFactory = randomShell;

	function launchSequenceShell(x, useSpecial) {
		const isRandomShell = shellNameSelector() === "Random";
		const shellFactory = isRandomShell
			? useSpecial
				? specialShellFactory
				: mainShellFactory
			: shellTypes[configuredShellName()];
		const shell = new Shell(shellFactory(useSpecial ? largeSize : smallSize));
		const height = x <= 0.5 ? x / 0.5 : (1 - x) / 0.5;
		shell.launch(x, useSpecial ? 0.75 : height * 0.42);
	}

	let count = 0;
	let delay = 0;
	while (count <= barrageCountHalf) {
		if (count === barrageCountHalf) {
			setTimeout(() => {
				launchSequenceShell(0.5, true);
			}, delay);
		} else {
			const offset = (count / barrageCountHalf) * 0.5;
			const delayOffset = Math.random() * 30 + 30;
			setTimeout(() => {
				launchSequenceShell(offset, false);
			}, delay);
			setTimeout(() => {
				launchSequenceShell(1 - offset, false);
			}, delay + delayOffset);
		}

		count += 1;
		delay += 200;
	}

	return 3400 + barrageCountHalf * 250;
}

function seqSmallBarrage() {
	seqSmallBarrage.lastCalled = Date.now();
	const barrageCount = IS_DESKTOP ? 11 : 5;
	const specialIndex = IS_DESKTOP ? 3 : 1;
	const shellSize = Math.max(0, shellSizeSelector() - 2);
	const mainShellFactory = Math.random() < 0.78 ? crysanthemumShell : ringShell;
	const specialShellFactory = randomFastShell();

	function launchSequenceShell(x, useSpecial) {
		const isRandomShell = shellNameSelector() === "Random";
		const shellFactory = isRandomShell
			? useSpecial
				? specialShellFactory
				: mainShellFactory
			: shellTypes[configuredShellName()];
		const shell = new Shell(shellFactory(shellSize));
		const height = (Math.cos(x * 5 * Math.PI + PI_HALF) + 1) / 2;
		shell.launch(x, height * 0.75);
	}

	let count = 0;
	let delay = 0;
	while (count < barrageCount) {
		if (count === 0) {
			launchSequenceShell(0.5, false);
			count += 1;
		} else {
			const offset = (count + 1) / barrageCount / 2;
			const delayOffset = Math.random() * 30 + 30;
			const useSpecial = count === specialIndex;
			setTimeout(() => {
				launchSequenceShell(0.5 + offset, useSpecial);
			}, delay);
			setTimeout(() => {
				launchSequenceShell(0.5 - offset, useSpecial);
			}, delay + delayOffset);
			count += 2;
		}

		delay += 200;
	}

	return 3400 + barrageCount * 120;
}

seqSmallBarrage.cooldown = 15000;
seqSmallBarrage.lastCalled = Date.now();

let isFirstSeq = true;
const finaleCount = 32;
let currentFinaleCount = 0;

function startSequence() {
	if (isFirstSeq) {
		isFirstSeq = false;
		if (IS_HEADER) {
			return seqTwoRandom();
		}

		new Shell(crysanthemumShell(shellSizeSelector())).launch(0.5, 0.5);
		return 2400;
	}

	if (finaleSelector()) {
		seqRandomFastShell();
		if (currentFinaleCount < finaleCount) {
			currentFinaleCount += 1;
			return 170;
		}

		currentFinaleCount = 0;
		return 6000;
	}

	const randomValue = Math.random();
	if (randomValue < 0.08 && Date.now() - seqSmallBarrage.lastCalled > seqSmallBarrage.cooldown) {
		return seqSmallBarrage();
	}
	if (randomValue < 0.1) {
		return seqPyramid();
	}
	if (randomValue < 0.6 && !IS_HEADER) {
		return seqRandomShell();
	}
	if (randomValue < 0.8) {
		return seqTwoRandom();
	}

	return seqTriple();
}
