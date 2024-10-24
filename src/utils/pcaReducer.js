import { PCA } from 'ml-pca';

/**
 * Performs PCA to reduce the tensor's dimensions to 3 components for 3D visualization.
 * @param {tf.Tensor} tensor - The original high-dimensional tensor (e.g., [10000, 200]).
 * @returns {Promise<tf.Tensor>} - A promise that resolves with the reduced tensor (e.g., [10000, 3]).
 */
export const pcaReducer = (tensor) => {
	try {
		// Convert the tensor to a 2D array
		const data = tensor.arraySync(); // Converts tensor to a 2D array

		// Create a PCA instance
		const pca = new PCA(data);

		// Perform PCA and reduce to 3 dimensions
		const reducedData = pca.predict(data, { nComponents: 3 }).data; // Reduce to 3 components

		// Scale the reduced data for 3D visualization
		const scaleFactor = 80; // Adjust this factor as needed
		const scaledData = reducedData.map(point => point.map(value => value * scaleFactor));

		return scaledData;

	} catch (error) {
		console.error('Error in PCA reduction:', error);
		throw error;
	}
};