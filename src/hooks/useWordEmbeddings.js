import { useEffect, useMemo, useState } from 'react';

const useWordEmbeddings = () => {
	const [embeddings, setEmbeddings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [status, setStatus] = useState('Preparing embedding space');
	const [vectorValues, setVectorValues] = useState(null);
	const [vectorDimensions, setVectorDimensions] = useState(0);

	const baseUrl = useMemo(() => import.meta.env.BASE_URL.replace(/\/$/, ''), []);

	useEffect(() => {
		const embeddingWorker = new Worker(new URL('../workers/embeddingWorker.js', import.meta.url), { type: 'module' });

		embeddingWorker.postMessage({
			tensorUrl: `${baseUrl}/word2vec_10000_200d_tensors.bytes`,
			tsvUrl: `${baseUrl}/word2vec_10000_200d_labels.tsv`,
			vectorDimensions: 200,
		});

		embeddingWorker.onmessage = (event) => {
			if (event.data.status) {
				setStatus(event.data.status);
				return;
			}

			if (event.data.error) {
				setError(new Error(event.data.error));
				setLoading(false);
				embeddingWorker.terminate();
				return;
			}

			if (event.data.wordEmbeddings) {
				setEmbeddings(event.data.wordEmbeddings);
				setVectorValues(event.data.vectorValues);
				setVectorDimensions(event.data.vectorDimensions);
				setStatus(`Loaded ${event.data.wordEmbeddings.length.toLocaleString()} words`);
				setLoading(false);
				embeddingWorker.terminate();
			}
		};

		embeddingWorker.onerror = (event) => {
			setError(new Error(event.message || 'Embeddings could not be loaded.'));
			setLoading(false);
			embeddingWorker.terminate();
		};

		return () => embeddingWorker.terminate();
	}, [baseUrl]);

	return { embeddings, loading, error, status, vectorValues, vectorDimensions };
};

export default useWordEmbeddings;
