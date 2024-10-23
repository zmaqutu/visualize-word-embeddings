import * as tf from '@tensorflow/tfjs';

/**
 * Loads the word embeddings tensor from the .bytes file.
 * @param {string} filePath - The path to the .bytes file.
 * @returns {Promise<tf.Tensor>} - A promise that resolves with the tensor.
 */
export const loadTensor = async (filePath) => {
	try {
		// Fetch the binary data from the .bytes file
		const response = await fetch(filePath);
		const arrayBuffer = await response.arrayBuffer();

		// Convert to Float32Array and create a tensor with shape [10000, 200]
		const tensor = tf.tensor(new Float32Array(arrayBuffer), [10000, 200]);

		return tensor;
	} catch (error) {
		console.error('Error loading tensor:', error);
		throw error;
	}
};