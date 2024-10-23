import * as tf from '@tensorflow/tfjs';
/**
 * Performs PCA to reduce the tensor's dimensions to 3 components for 3D visualization.
 * @param {tf.Tensor} tensor - The original high-dimensional tensor (e.g., [10000, 200]).
 * @returns {Promise<tf.Tensor>} - A promise that resolves with the reduced tensor (e.g., [10000, 3]).
 */
export const pcaReducer = async (tensor) => {
	try {
		const numComponents = 3;  // We want to reduce to 3 components for 3D visualization

		// Use tf.svd (Singular Value Decomposition) to reduce dimensions
		const [u, s, v] = tf.svd(tensor);
		const reducedTensor = u.slice([0, 0], [-1, numComponents]);  // Take the top 3 components

		return reducedTensor;
	} catch (error) {
		console.error('Error performing PCA:', error);
		throw error;
	}
};
