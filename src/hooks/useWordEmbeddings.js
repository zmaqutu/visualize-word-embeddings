import { useState, useEffect } from 'react';
import { loadTensor } from '../utils/tensorLoader';
import { loadWords } from '../utils/wordLoader';
import { pcaReducer } from '../utils/pcaReducer';


const useWordEmbeddings = () => {
	const [embeddings, setEmbeddings] = useState(null);  // To store tensors
	const [loading, setLoading] = useState(true);        // Loading state
	const [error, setError] = useState(null);            // Error state

	useEffect(() => {
		// Function to load the word2vec .bytes tensor file
		const loadEmbeddings = async () => {
			try {
				setLoading(true);

				// Load the word embeddings tensor
				const tensor = await loadTensor('/word2vec_10000_200d_tensors.bytes');

				// perform PCA to reduce dimensions to 3 components for 3D visualization
				const reducedVector = await pcaReducer(tensor);
				console.log('reducedVector[1]', reducedVector[1])

				// Load (word list) from the .tsv file
				const wordList = await loadWords('/word2vec_10000_200d_labels.tsv');

				const wordEmbeddings = wordList.map((word, index) => ({
					word,
					originalVector: tensor.slice([index, 0], [1, 200]).dataSync(),
					reducedVector: reducedVector[index],
				}));

				setEmbeddings(wordEmbeddings);

				setLoading(false);
			} catch (err) {
				console.error('Error loading embeddings:', err);
				setError(err);
				setLoading(false);
			}
		};

		loadEmbeddings();
	}, []);

	return { embeddings, loading, error };
};

export default useWordEmbeddings;
// embedding: tensor.slice([index, 0], [1, -1]),
