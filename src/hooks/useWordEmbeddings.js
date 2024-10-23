import { useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

const useWordEmbeddings = () => {
	const [embeddings, setEmbeddings] = useState(null);  // To store tensors
	const [words, setWords] = useState([]);              // To store word labels
	const [loading, setLoading] = useState(true);        // Loading state
	const [error, setError] = useState(null);            // Error state

	useEffect(() => {
		// Function to load the word2vec .bytes tensor file
		const loadEmbeddings = async () => {
			try {
				setLoading(true);

				// Load the tensor from the binary file using TensorFlow.js
				const response = await fetch('/word2vec_10000_200d_tensors.bytes');
				const arrayBuffer = await response.arrayBuffer();
				const tensor = tf.tensor(new Float32Array(arrayBuffer), [10000, 200]); // Shape: [10000, 200]

				setEmbeddings(tensor);

				// Load the metadata (word list) from the .tsv file
				const metadataResponse = await fetch('/word2vec_10000_200d_labels.tsv');
				const metadataText = await metadataResponse.text();
				const wordList = metadataText.trim().split('\n').slice(1).map(line => line.split('\t')[0]);

				setWords(wordList);

				setLoading(false);
			} catch (err) {
				console.error('Error loading embeddings:', err);
				setError(err);
				setLoading(false);
			}
		};

		loadEmbeddings();
	}, []);

	return { embeddings, words, loading, error };
};

export default useWordEmbeddings;
