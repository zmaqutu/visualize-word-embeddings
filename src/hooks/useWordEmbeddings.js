import { useState, useEffect } from 'react';
import { loadTensor } from './utils/tensorLoader';


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

				// Load the word embeddings tensor
				const tensor = await loadTensor('/word2vec_10000_200d_tensors.bytes');

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
