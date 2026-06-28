export const normalizeWord = (word) => word.trim().toLowerCase();

export const findWordMatch = (embeddings, term) => {
	const normalizedSearch = normalizeWord(term);
	if (!normalizedSearch || embeddings.length === 0) return null;

	return embeddings.find(({ word }) => normalizeWord(word) === normalizedSearch)
		|| embeddings.find(({ word }) => normalizeWord(word).startsWith(normalizedSearch))
		|| embeddings.find(({ word }) => normalizeWord(word).includes(normalizedSearch))
		|| null;
};

export const findExactWordMatch = (embeddings, term) => {
	const normalizedSearch = normalizeWord(term);
	if (!normalizedSearch || embeddings.length === 0) return null;

	return embeddings.find(({ word }) => normalizeWord(word) === normalizedSearch) || null;
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

const createProjectionAxis = (axis, dimensions) => {
	const vector = new Float64Array(dimensions);
	let magnitude = 0;

	for (let dimension = 0; dimension < dimensions; dimension += 1) {
		const seed = (axis + 1) * (dimension + 1);
		const value = Math.sin(seed * 12.9898) + Math.cos(seed * 78.233);
		vector[dimension] = value;
		magnitude += value * value;
	}

	const normalizer = Math.sqrt(magnitude) || 1;
	for (let dimension = 0; dimension < dimensions; dimension += 1) {
		vector[dimension] /= normalizer;
	}

	return vector;
};

export const buildProjectionModel = (vectorValues, vectorDimensions, count) => {
	if (!vectorValues || vectorDimensions === 0 || count === 0) return null;

	const means = new Float64Array(vectorDimensions);

	for (let row = 0; row < count; row += 1) {
		const rowOffset = row * vectorDimensions;
		for (let dimension = 0; dimension < vectorDimensions; dimension += 1) {
			means[dimension] += vectorValues[rowOffset + dimension];
		}
	}

	for (let dimension = 0; dimension < vectorDimensions; dimension += 1) {
		means[dimension] /= count;
	}

	const projection = Array.from({ length: 3 }, (_, axis) => createProjectionAxis(axis, vectorDimensions));
	let maxAbsValue = 1;

	for (let row = 0; row < count; row += 1) {
		const rowOffset = row * vectorDimensions;
		for (let axis = 0; axis < 3; axis += 1) {
			let projectedValue = 0;
			for (let dimension = 0; dimension < vectorDimensions; dimension += 1) {
				projectedValue += (vectorValues[rowOffset + dimension] - means[dimension]) * projection[axis][dimension];
			}
			maxAbsValue = Math.max(maxAbsValue, Math.abs(projectedValue));
		}
	}

	return {
		means,
		projection,
		scaleFactor: 145 / maxAbsValue,
		vectorDimensions,
	};
};

export const projectVector = (vector, projectionModel) => {
	if (!vector || !projectionModel) return [0, 0, 0];

	return projectionModel.projection.map((axisVector) => {
		let projectedValue = 0;
		for (let dimension = 0; dimension < projectionModel.vectorDimensions; dimension += 1) {
			projectedValue += (vector[dimension] - projectionModel.means[dimension]) * axisVector[dimension];
		}
		return projectedValue * projectionModel.scaleFactor;
	});
};

export const getVector = (embedding, vectorValues, vectorDimensions) => {
	if (!embedding || !vectorValues || vectorDimensions === 0) return null;

	const offset = embedding.id * vectorDimensions;
	return vectorValues.slice(offset, offset + vectorDimensions);
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
