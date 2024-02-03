const MyMath = (function (n) {
	const t = {};
	return (
		(t.toDeg = 180 / n.PI),
		(t.toRad = n.PI / 180),
		(t.halfPI = n.PI / 2),
		(t.twoPI = 2 * n.PI),
		(t.dist = (t, a) => n.sqrt(t * t + a * a)),
		(t.pointDist = (t, a, r, o) => {
			const e = r - t,
				i = o - a;
			return n.sqrt(e * e + i * i);
		}),
		(t.angle = (a, r) => t.halfPI + n.atan2(r, a)),
		(t.pointAngle = (a, r, o, e) => t.halfPI + n.atan2(e - r, o - a)),
		(t.splitVector = (t, a) => ({ x: n.sin(a) * t, y: -n.cos(a) * t })),
		(t.random = (t, a) => n.random() * (a - t) + t),
		(t.randomInt = (t, a) => ((n.random() * (a - t + 1)) | 0) + t),
		(t.randomChoice = function (t) {
			return 1 === arguments.length && Array.isArray(t) ? t[(n.random() * t.length) | 0] : arguments[(n.random() * arguments.length) | 0];
		}),
		(t.clamp = function (t, a, r) {
			return n.min(n.max(t, a), r);
		}),
		t
	);
})(Math);
