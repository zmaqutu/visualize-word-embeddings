import { useState, useEffect } from 'react';

const useWordEmbeddings = () => {
	const [embeddings, setEmbeddings] = useState(null);  // To store tensors
	const [loading, setLoading] = useState(true);        // Loading state
	const [error, setError] = useState(null);            // Error state

	useEffect(() => {
		// Load the embeddings from the worker
		const loadEmbeddings = async () => {
			try {
				setLoading(true);

				const embeddingWorker = new Worker(new URL('../workers/embeddingWorker.js', import.meta.url), { type: 'module' });

				embeddingWorker.postMessage({
					tensorUrl: '/visualize-word-embeddings/word2vec_10000_200d_tensors.bytes',
					tsvUrl: '/visualize-word-embeddings/word2vec_10000_200d_labels.tsv',
				});

				embeddingWorker.onmessage = (event) => {
					if (event.data.wordEmbeddings) {
						setEmbeddings(event.data.wordEmbeddings);
						setLoading(false);
					} else {
						throw new Error('Embeddings could not be loaded.');
					}
					embeddingWorker.terminate();
				};

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
