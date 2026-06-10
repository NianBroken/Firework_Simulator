/*
Copyright © 2022 NianBroken. All rights reserved.
Github：https://github.com/NianBroken/Firework_Simulator
Gitee：https://gitee.com/nianbroken/Firework_Simulator
本项目采用 Apache-2.0 许可证
简而言之，你可以自由使用、修改和分享本项目的代码，但前提是在其衍生作品中必须保留原始许可证和版权信息，并且必须以相同的许可证发布所有修改过的代码。
*/

"use strict";

function update(frameTime, lag) {
	if (!isRunning()) {
		return;
	}

	const width = stageW;
	const height = stageH;
	const timeStep = frameTime * simSpeed;
	const speed = simSpeed * lag;

	updateGlobals(timeStep, lag);

	const starDrag = 1 - (1 - Star.airDrag) * speed;
	const starDragHeavy = 1 - (1 - Star.airDragHeavy) * speed;
	const sparkDrag = 1 - (1 - Spark.airDrag) * speed;
	const gravityAcceleration = (timeStep / 1000) * GRAVITY;

	COLOR_CODES_W_INVIS.forEach((colorCode) => {
		const stars = Star.active[colorCode];
		for (let index = stars.length - 1; index >= 0; index -= 1) {
			const star = stars[index];
			if (star.updateFrame === currentFrame) {
				continue;
			}

			star.updateFrame = currentFrame;
			star.life -= timeStep;

			if (star.life <= 0) {
				stars.splice(index, 1);
				Star.returnInstance(star);
				continue;
			}

			const burnRate = Math.pow(star.life / star.fullLife, 0.5);
			const inverseBurnRate = 1 - burnRate;

			star.prevX = star.x;
			star.prevY = star.y;
			star.x += star.speedX * speed;
			star.y += star.speedY * speed;

			if (star.heavy) {
				star.speedX *= starDragHeavy;
				star.speedY *= starDragHeavy;
			} else {
				star.speedX *= starDrag;
				star.speedY *= starDrag;
			}

			star.speedY += gravityAcceleration;

			if (star.spinRadius) {
				star.spinAngle += star.spinSpeed * speed;
				star.x += Math.sin(star.spinAngle) * star.spinRadius * speed;
				star.y += Math.cos(star.spinAngle) * star.spinRadius * speed;
			}

			if (star.sparkFreq) {
				star.sparkTimer -= timeStep;
				while (star.sparkTimer < 0) {
					star.sparkTimer += star.sparkFreq * 0.75 + star.sparkFreq * inverseBurnRate * 4;
					Spark.add(
						star.x,
						star.y,
						star.sparkColor,
						Math.random() * PI_2,
						Math.random() * star.sparkSpeed * burnRate,
						star.sparkLife * 0.8 + Math.random() * star.sparkLifeVariation * star.sparkLife
					);
				}
			}

			if (star.life < star.transitionTime) {
				if (star.secondColor && !star.colorChanged) {
					star.colorChanged = true;
					star.color = star.secondColor;
					stars.splice(index, 1);
					Star.active[star.secondColor].push(star);
					if (star.secondColor === INVISIBLE) {
						star.sparkFreq = 0;
					}
				}

				if (star.strobe) {
					star.visible = Math.floor(star.life / star.strobeFreq) % 3 === 0;
				}
			}
		}

		const sparks = Spark.active[colorCode];
		for (let index = sparks.length - 1; index >= 0; index -= 1) {
			const spark = sparks[index];
			spark.life -= timeStep;

			if (spark.life <= 0) {
				sparks.splice(index, 1);
				Spark.returnInstance(spark);
				continue;
			}

			spark.prevX = spark.x;
			spark.prevY = spark.y;
			spark.x += spark.speedX * speed;
			spark.y += spark.speedY * speed;
			spark.speedX *= sparkDrag;
			spark.speedY *= sparkDrag;
			spark.speedY += gravityAcceleration;
		}
	});

	render(speed, width, height);
}

function render(speed, width, height) {
	const { dpr } = mainStage;
	const trailsContext = trailsStage.ctx;
	const mainContext = mainStage.ctx;

	if (skyLightingSelector() !== SKY_LIGHT_NONE) {
		colorSky(speed);
	}

	const scaleFactor = scaleFactorSelector();
	trailsContext.scale(dpr * scaleFactor, dpr * scaleFactor);
	mainContext.scale(dpr * scaleFactor, dpr * scaleFactor);

	trailsContext.globalCompositeOperation = "source-over";
	trailsContext.fillStyle = `rgba(0, 0, 0, ${store.state.config.longExposure ? 0.0025 : 0.175 * speed})`;
	trailsContext.fillRect(0, 0, width, height);
	mainContext.clearRect(0, 0, width, height);

	while (BurstFlash.active.length) {
		const flash = BurstFlash.active.pop();
		const burstGradient = trailsContext.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, flash.radius);
		burstGradient.addColorStop(0.024, "rgba(255, 255, 255, 1)");
		burstGradient.addColorStop(0.125, "rgba(255, 160, 20, 0.2)");
		burstGradient.addColorStop(0.32, "rgba(255, 140, 20, 0.11)");
		burstGradient.addColorStop(1, "rgba(255, 120, 20, 0)");
		trailsContext.fillStyle = burstGradient;
		trailsContext.fillRect(flash.x - flash.radius, flash.y - flash.radius, flash.radius * 2, flash.radius * 2);
		BurstFlash.returnInstance(flash);
	}

	trailsContext.globalCompositeOperation = "lighten";

	trailsContext.lineWidth = 3;
	trailsContext.lineCap = isLowQuality ? "square" : "round";
	mainContext.strokeStyle = "#fff";
	mainContext.lineWidth = 1;
	mainContext.beginPath();

	COLOR_CODES.forEach((colorCode) => {
		const stars = Star.active[colorCode];
		trailsContext.strokeStyle = colorCode;
		trailsContext.beginPath();

		stars.forEach((star) => {
			if (!star.visible) {
				return;
			}

			trailsContext.lineWidth = star.size;
			trailsContext.moveTo(star.x, star.y);
			trailsContext.lineTo(star.prevX, star.prevY);
			mainContext.moveTo(star.x, star.y);
			mainContext.lineTo(star.x - star.speedX * 1.6, star.y - star.speedY * 1.6);
		});

		trailsContext.stroke();
	});

	mainContext.stroke();

	trailsContext.lineWidth = Spark.drawWidth;
	trailsContext.lineCap = "butt";
	COLOR_CODES.forEach((colorCode) => {
		const sparks = Spark.active[colorCode];
		trailsContext.strokeStyle = colorCode;
		trailsContext.beginPath();
		sparks.forEach((spark) => {
			trailsContext.moveTo(spark.x, spark.y);
			trailsContext.lineTo(spark.prevX, spark.prevY);
		});
		trailsContext.stroke();
	});

	if (speedBarOpacity) {
		const speedBarHeight = 6;
		mainContext.globalAlpha = speedBarOpacity;
		mainContext.fillStyle = COLOR.Blue;
		mainContext.fillRect(0, height - speedBarHeight, width * simSpeed, speedBarHeight);
		mainContext.globalAlpha = 1;
	}

	trailsContext.setTransform(1, 0, 0, 1, 0, 0);
	mainContext.setTransform(1, 0, 0, 1, 0, 0);
}

const currentSkyColor = { r: 0, g: 0, b: 0 };
const targetSkyColor = { r: 0, g: 0, b: 0 };

function colorSky(speed) {
	const maxSkySaturation = skyLightingSelector() * 15;
	const maxStarCount = 500;
	let totalStarCount = 0;

	targetSkyColor.r = 0;
	targetSkyColor.g = 0;
	targetSkyColor.b = 0;

	COLOR_CODES.forEach((colorCode) => {
		const tuple = COLOR_TUPLES[colorCode];
		const count = Star.active[colorCode].length;
		totalStarCount += count;
		targetSkyColor.r += tuple.r * count;
		targetSkyColor.g += tuple.g * count;
		targetSkyColor.b += tuple.b * count;
	});

	const intensity = Math.pow(Math.min(1, totalStarCount / maxStarCount), 0.3);
	const maxColorComponent = Math.max(1, targetSkyColor.r, targetSkyColor.g, targetSkyColor.b);

	targetSkyColor.r = (targetSkyColor.r / maxColorComponent) * maxSkySaturation * intensity;
	targetSkyColor.g = (targetSkyColor.g / maxColorComponent) * maxSkySaturation * intensity;
	targetSkyColor.b = (targetSkyColor.b / maxColorComponent) * maxSkySaturation * intensity;

	const colorChange = 10;
	currentSkyColor.r += ((targetSkyColor.r - currentSkyColor.r) / colorChange) * speed;
	currentSkyColor.g += ((targetSkyColor.g - currentSkyColor.g) / colorChange) * speed;
	currentSkyColor.b += ((targetSkyColor.b - currentSkyColor.b) / colorChange) * speed;

	appNodes.canvasContainer.style.backgroundColor = `rgb(${currentSkyColor.r | 0}, ${currentSkyColor.g | 0}, ${currentSkyColor.b | 0})`;
}

function createParticleArc(start, arcLength, count, randomness, particleFactory) {
	const angleDelta = arcLength / count;
	const end = start + arcLength - angleDelta * 0.5;

	if (end > start) {
		for (let angle = start; angle < end; angle = angle + angleDelta) {
			particleFactory(angle + Math.random() * angleDelta * randomness);
		}
		return;
	}

	for (let angle = start; angle > end; angle = angle + angleDelta) {
		particleFactory(angle + Math.random() * angleDelta * randomness);
	}
}

function getWordDots(word) {
	if (!word) {
		return null;
	}

	const fontSize = MyMath.randomInt(appConfig.wordFontSizeMin, appConfig.wordFontSizeMax);
	const cacheKey = `${word}:${fontSize}`;
	if (!wordDotCache.has(cacheKey)) {
		wordDotCache.set(
			cacheKey,
			MyMath.literalLattice(word, appConfig.wordPointDensity, appConfig.wordFontFamily, `${fontSize}px`)
		);
	}

	return wordDotCache.get(cacheKey);
}

function createBurst(count, particleFactory, startAngle = 0, arcLength = PI_2) {
	const radius = 0.5 * Math.sqrt(count / Math.PI);
	const circumference = 2 * radius * Math.PI;
	const halfCircumference = circumference / 2;

	for (let ringIndex = 0; ringIndex <= halfCircumference; ringIndex += 1) {
		const ringAngle = (ringIndex / halfCircumference) * PI_HALF;
		const ringSize = Math.cos(ringAngle);
		const partsPerFullRing = circumference * ringSize;
		const partsPerArc = partsPerFullRing * (arcLength / PI_2);
		const angleIncrement = PI_2 / partsPerFullRing;
		const angleOffset = Math.random() * angleIncrement + startAngle;
		const maxRandomAngleOffset = angleIncrement * 0.33;

		for (let particleIndex = 0; particleIndex < partsPerArc; particleIndex += 1) {
			const randomAngleOffset = Math.random() * maxRandomAngleOffset;
			const angle = angleIncrement * particleIndex + angleOffset + randomAngleOffset;
			particleFactory(angle, ringSize);
		}
	}
}

function createWordBurst(wordText, particleFactory, centerX, centerY) {
	const map = getWordDots(wordText);
	if (!map) {
		return;
	}

	const centerOffsetX = map.width / 2;
	const centerOffsetY = map.height / 2;
	const color = randomColor();
	const strobed = Math.random() < 0.5;
	const strobeColor = strobed ? randomColor() : color;

	for (let index = 0; index < map.points.length; index += 1) {
		const point = map.points[index];
		particleFactory(
			{
				x: centerX + (point.x - centerOffsetX),
				y: centerY + (point.y - centerOffsetY),
			},
			color,
			strobed,
			strobeColor
		);
	}
}

function crossetteEffect(star) {
	const startAngle = Math.random() * PI_HALF;
	createParticleArc(startAngle, PI_2, 4, 0.5, (angle) => {
		Star.add(star.x, star.y, star.color, angle, Math.random() * 0.6 + 0.75, 600);
	});
}

function floralEffect(star) {
	const count = 12 + 6 * quality;
	createBurst(count, (angle, speedMultiplier) => {
		Star.add(star.x, star.y, star.color, angle, speedMultiplier * 2.4, 1000 + Math.random() * 300, star.speedX, star.speedY);
	});
	BurstFlash.add(star.x, star.y, 46);
	soundManager.playSound("burstSmall");
}

function fallingLeavesEffect(star) {
	createBurst(7, (angle, speedMultiplier) => {
		const newStar = Star.add(
			star.x,
			star.y,
			INVISIBLE,
			angle,
			speedMultiplier * 2.4,
			2400 + Math.random() * 600,
			star.speedX,
			star.speedY
		);

		newStar.sparkColor = COLOR.Gold;
		newStar.sparkFreq = 144 / quality;
		newStar.sparkSpeed = 0.28;
		newStar.sparkLife = 750;
		newStar.sparkLifeVariation = 3.2;
	});
	BurstFlash.add(star.x, star.y, 46);
	soundManager.playSound("burstSmall");
}

function crackleEffect(star) {
	const count = isHighQuality ? 32 : 16;
	createParticleArc(0, PI_2, count, 1.8, (angle) => {
		Spark.add(
			star.x,
			star.y,
			COLOR.Gold,
			angle,
			Math.pow(Math.random(), 0.45) * 2.4,
			300 + Math.random() * 200
		);
	});
}

class Shell {
	constructor(options) {
		Object.assign(this, options);
		this.starLifeVariation = options.starLifeVariation || 0.125;
		this.color = options.color || randomColor();
		this.glitterColor = options.glitterColor || this.color;
		this.disableWord = options.disableWord || false;

		if (!this.starCount) {
			const density = options.starDensity || 1;
			const scaledSize = this.spreadSize / 54;
			this.starCount = Math.max(6, scaledSize * scaledSize * density);
		}
	}

	launch(position, launchHeight) {
		const width = stageW;
		const height = stageH;
		const horizontalPadding = 60;
		const verticalPadding = 50;
		const minimumHeightPercent = 0.45;
		const minimumHeight = height - height * minimumHeightPercent;
		const launchX = position * (width - horizontalPadding * 2) + horizontalPadding;
		const launchY = height;
		const burstY = minimumHeight - launchHeight * (minimumHeight - verticalPadding);
		const launchDistance = launchY - burstY;
		const launchVelocity = Math.pow(launchDistance * 0.04, 0.64);

		const comet = (this.comet = Star.add(
			launchX,
			launchY,
			typeof this.color === "string" && this.color !== "random" ? this.color : COLOR.White,
			Math.PI,
			launchVelocity * (this.horsetail ? 1.2 : 1),
			launchVelocity * (this.horsetail ? 100 : 400)
		));

		comet.heavy = true;
		comet.spinRadius = MyMath.random(0.32, 0.85);
		comet.sparkFreq = isHighQuality ? 8 : 32 / quality;
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

		if (Math.random() > 0.4 && !this.horsetail) {
			comet.secondColor = INVISIBLE;
			comet.transitionTime = Math.pow(Math.random(), 1.5) * 700 + 500;
		}

		comet.onDeath = (activeComet) => this.burst(activeComet.x, activeComet.y);
		soundManager.playSound("lift");
	}

	burst(x, y) {
		const speed = this.spreadSize / 96;
		let color;
		let onDeath;
		let sparkFreq;
		let sparkSpeed;
		let sparkLife;
		let sparkLifeVariation = 0.25;
		let playedDeathSound = false;

		if (this.crossette) {
			onDeath = (star) => {
				if (!playedDeathSound) {
					soundManager.playSound("crackleSmall");
					playedDeathSound = true;
				}
				crossetteEffect(star);
			};
		}

		if (this.crackle) {
			onDeath = (star) => {
				if (!playedDeathSound) {
					soundManager.playSound("crackle");
					playedDeathSound = true;
				}
				crackleEffect(star);
			};
		}

		if (this.floral) {
			onDeath = floralEffect;
		}
		if (this.fallingLeaves) {
			onDeath = fallingLeavesEffect;
		}

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

		sparkFreq = sparkFreq / quality;

		const starFactory = (angle, speedMultiplier) => {
			const standardInitialSpeed = this.spreadSize / 1800;
			const star = Star.add(
				x,
				y,
				color || randomColor(),
				angle,
				speedMultiplier * speed,
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

		const dotStarFactory = (point, pointColor, strobe, strobeColor) => {
			const standardInitialSpeed = this.spreadSize / 1800;

			if (strobe) {
				const dotSpeed = Math.random() * 0.1 + 0.05;
				const star = Star.add(
					point.x,
					point.y,
					pointColor,
					Math.random() * PI_2,
					dotSpeed,
					this.starLife + Math.random() * this.starLife * this.starLifeVariation + dotSpeed * 1000,
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
					pointColor,
					Math.random() * PI_2,
					Math.pow(Math.random(), 0.15) * 1.4,
					this.starLife + Math.random() * this.starLife * this.starLifeVariation + 1000
				);
			}

			Spark.add(
				point.x + 5,
				point.y + 10,
				pointColor,
				Math.random() * PI_2,
				Math.pow(Math.random(), 0.05) * 0.4,
				this.starLife + Math.random() * this.starLife * this.starLifeVariation + 2000
			);
		};

		if (typeof this.color === "string") {
			color = this.color === "random" ? null : this.color;
			if (this.ring) {
				const ringStartAngle = Math.random() * Math.PI;
				const ringSquash = Math.pow(Math.random(), 2) * 0.85 + 0.15;
				createParticleArc(0, PI_2, this.starCount, 0, (angle) => {
					const initialSpeedX = Math.sin(angle) * speed * ringSquash;
					const initialSpeedY = Math.cos(angle) * speed;
					const nextSpeed = MyMath.pointDist(0, 0, initialSpeedX, initialSpeedY);
					const nextAngle = MyMath.pointAngle(0, 0, initialSpeedX, initialSpeedY) + ringStartAngle;
					const star = Star.add(
						x,
						y,
						color,
						nextAngle,
						nextSpeed,
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
			} else {
				createBurst(this.starCount, starFactory);
			}
		} else if (Array.isArray(this.color)) {
			if (Math.random() < 0.5) {
				const start = Math.random() * Math.PI;
				const oppositeStart = start + Math.PI;
				const arc = Math.PI;
				color = this.color[0];
				createBurst(this.starCount, starFactory, start, arc);
				color = this.color[1];
				createBurst(this.starCount, starFactory, oppositeStart, arc);
			} else {
				color = this.color[0];
				createBurst(this.starCount / 2, starFactory);
				color = this.color[1];
				createBurst(this.starCount / 2, starFactory);
			}
		} else {
			throw new Error(`无效的烟花颜色配置: ${this.color}`);
		}

		if (wordBurstTracker.shouldCreateBurst(this)) {
			createWordBurst(randomWord(), dotStarFactory, x, y);
		}

		if (this.pistil) {
			new Shell({
				spreadSize: this.spreadSize * 0.5,
				starLife: this.starLife * 0.6,
				starLifeVariation: this.starLifeVariation,
				starDensity: 1.4,
				color: this.pistilColor,
				glitter: "light",
				disableWord: true,
				glitterColor: this.pistilColor === COLOR.Gold ? COLOR.Gold : COLOR.White,
			}).burst(x, y);
		}

		if (this.streamers) {
			new Shell({
				spreadSize: this.spreadSize * 0.9,
				starLife: this.starLife * 0.8,
				starLifeVariation: this.starLifeVariation,
				starCount: Math.floor(Math.max(6, this.spreadSize / 45)),
				color: COLOR.White,
				disableWord: true,
				glitter: "streamer",
			}).burst(x, y);
		}

		BurstFlash.add(x, y, this.spreadSize / 4);

		if (this.comet) {
			const maxDiff = 2;
			const sizeDifferenceFromMax = Math.min(maxDiff, shellSizeSelector() - this.shellSize);
			const soundScale = (1 - sizeDifferenceFromMax / maxDiff) * 0.3 + 0.7;
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

function createParticleCollection() {
	const collection = {};
	COLOR_CODES_W_INVIS.forEach((colorCode) => {
		collection[colorCode] = [];
	});
	return collection;
}

const Star = {
	airDrag: 0.98,
	airDragHeavy: 0.992,
	active: createParticleCollection(),
	_pool: [],
	_new() {
		return {};
	},
	add(x, y, color, angle, speed, life, speedOffsetX, speedOffsetY, size = 3) {
		const instance = this._pool.pop() || this._new();
		instance.visible = true;
		instance.heavy = false;
		instance.x = x;
		instance.y = y;
		instance.prevX = x;
		instance.prevY = y;
		instance.color = color;
		instance.speedX = Math.sin(angle) * speed + (speedOffsetX || 0);
		instance.speedY = Math.cos(angle) * speed + (speedOffsetY || 0);
		instance.life = life;
		instance.fullLife = life;
		instance.size = size;
		instance.spinAngle = Math.random() * PI_2;
		instance.spinSpeed = 0.8;
		instance.spinRadius = 0;
		instance.sparkFreq = 0;
		instance.sparkSpeed = 1;
		instance.sparkTimer = 0;
		instance.sparkColor = color;
		instance.sparkLife = 750;
		instance.sparkLifeVariation = 0.25;
		instance.strobe = false;
		this.active[color].push(instance);
		return instance;
	},
	returnInstance(instance) {
		instance.onDeath && instance.onDeath(instance);
		instance.onDeath = null;
		instance.secondColor = null;
		instance.transitionTime = 0;
		instance.colorChanged = false;
		this._pool.push(instance);
	},
};

const Spark = {
	drawWidth: 0,
	airDrag: 0.9,
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
	returnInstance(instance) {
		this._pool.push(instance);
	},
};
