/**
 * Projects high-dimensional vectors into 3D using deterministic random projection.
 *
 * Full PCA on 10,000 x 200 vectors is expensive in a browser worker. A fixed
 * random projection keeps nearby vectors reasonably close while making startup
 * fast enough for interactive exploration.
 *
 * @param {{ values: Float32Array, shape: [number, number] }} tensor - The original high-dimensional tensor.
 * @returns {number[][]} The reduced tensor (e.g., [10000, 3]) scaled for visualization.
 */
export const pcaReducer = (tensor) => {
	try {
		const [wordCount, dimensions] = tensor.shape;
		const values = tensor.values;
		const means = new Float64Array(dimensions);

		for (let row = 0; row < wordCount; row += 1) {
			const rowOffset = row * dimensions;
			for (let dimension = 0; dimension < dimensions; dimension += 1) {
				means[dimension] += values[rowOffset + dimension];
			}
		}

		for (let dimension = 0; dimension < dimensions; dimension += 1) {
			means[dimension] /= wordCount;
		}

		const projection = Array.from({ length: 3 }, (_, axis) => {
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
		});

		const reducedData = Array.from({ length: wordCount }, () => [0, 0, 0]);
		let maxAbsValue = 1;

		for (let row = 0; row < wordCount; row += 1) {
			const rowOffset = row * dimensions;

			for (let axis = 0; axis < 3; axis += 1) {
				let projectedValue = 0;
				for (let dimension = 0; dimension < dimensions; dimension += 1) {
					projectedValue += (values[rowOffset + dimension] - means[dimension]) * projection[axis][dimension];
				}

				reducedData[row][axis] = projectedValue;
				maxAbsValue = Math.max(maxAbsValue, Math.abs(projectedValue));
			}
		}

		const scaleFactor = 145 / maxAbsValue;
		return reducedData.map(point => point.map(value => value * scaleFactor));

	} catch (error) {
		console.error('Error in dimensionality reduction:', error);
		throw error;
	}
};
