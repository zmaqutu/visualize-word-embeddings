export const normalizeWord = (word) => word.trim().toLowerCase();

export const findWordMatch = (embeddings, term) => {
	const normalizedSearch = normalizeWord(term);
	if (!normalizedSearch || embeddings.length === 0) return null;

	return embeddings.find(({ word }) => normalizeWord(word) === normalizedSearch)
		|| embeddings.find(({ word }) => normalizeWord(word).startsWith(normalizedSearch))
		|| embeddings.find(({ word }) => normalizeWord(word).includes(normalizedSearch))
		|| null;
};

export const buildVectorNorms = (vectorValues, vectorDimensions, count) => {
	if (!vectorValues || vectorDimensions === 0 || count === 0) return [];

	return Array.from({ length: count }, (_, index) => {
		let sum = 0;
		const offset = index * vectorDimensions;

		for (let dimension = 0; dimension < vectorDimensions; dimension += 1) {
			const value = vectorValues[offset + dimension];
			sum += value * value;
		}

		return Math.sqrt(sum) || 1;
	});
};

export const solveAnalogy = ({
	addLeft,
	subtract,
	addRight,
	embeddings,
	vectorValues,
	vectorDimensions,
	vectorNorms,
	limit = 6,
}) => {
	if (!addLeft || !subtract || !addRight || !vectorValues || vectorDimensions === 0) {
		return [];
	}

	const target = new Float32Array(vectorDimensions);
	const addLeftOffset = addLeft.id * vectorDimensions;
	const subtractOffset = subtract.id * vectorDimensions;
	const addRightOffset = addRight.id * vectorDimensions;

	for (let dimension = 0; dimension < vectorDimensions; dimension += 1) {
		target[dimension] = vectorValues[addLeftOffset + dimension]
			- vectorValues[subtractOffset + dimension]
			+ vectorValues[addRightOffset + dimension];
	}

	let targetNormSquared = 0;
	for (let dimension = 0; dimension < vectorDimensions; dimension += 1) {
		targetNormSquared += target[dimension] * target[dimension];
	}

	const targetNorm = Math.sqrt(targetNormSquared) || 1;
	const excludedIds = new Set([addLeft.id, subtract.id, addRight.id]);
	const nearest = [];

	for (let index = 0; index < embeddings.length; index += 1) {
		if (excludedIds.has(index)) continue;

		let dotProduct = 0;
		const offset = index * vectorDimensions;

		for (let dimension = 0; dimension < vectorDimensions; dimension += 1) {
			dotProduct += target[dimension] * vectorValues[offset + dimension];
		}

		const score = dotProduct / (targetNorm * vectorNorms[index]);
		const candidate = { ...embeddings[index], score };

		if (nearest.length < limit) {
			nearest.push(candidate);
			nearest.sort((left, right) => right.score - left.score);
		} else if (score > nearest[nearest.length - 1].score) {
			nearest[nearest.length - 1] = candidate;
			nearest.sort((left, right) => right.score - left.score);
		}
	}

	return nearest;
};
