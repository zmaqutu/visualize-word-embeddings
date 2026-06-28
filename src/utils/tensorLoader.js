/**
 * Loads the word embeddings tensor from the .bytes file.
 * @param {string} filePath - The path to the .bytes file.
 * @param {number} vectorDimensions - The number of dimensions per word vector.
 * @returns {Promise<{ values: Float32Array, shape: [number, number], dispose: () => void }>}
 */
export const loadTensor = async (filePath, vectorDimensions = 200) => {
	try {
		const response = await fetch(filePath);
		if (!response.ok) {
			throw new Error(`Unable to fetch tensor file (${response.status})`);
		}

		const arrayBuffer = await response.arrayBuffer();
		const values = new Float32Array(arrayBuffer);
		const wordCount = values.length / vectorDimensions;

		if (!Number.isInteger(wordCount)) {
			throw new Error('Tensor byte length does not match the expected vector shape.');
		}

		return {
			values,
			shape: [wordCount, vectorDimensions],
			dispose: () => undefined,
		};
	} catch (error) {
		console.error('Error loading tensor:', error);
		throw error;
	}
};
