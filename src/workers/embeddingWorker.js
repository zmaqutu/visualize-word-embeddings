import { loadTensor } from '../utils/tensorLoader';
import { loadWords } from '../utils/wordLoader';
import { pcaReducer } from '../utils/pcaReducer';

self.onmessage = async function (e) {
	const { tensorUrl, tsvUrl, vectorDimensions = 200 } = e.data;

	try {
		self.postMessage({ status: 'Loading vector tensor' });
		const tensor = await loadTensor(tensorUrl, vectorDimensions);

		self.postMessage({ status: 'Loading word labels' });
		const wordList = await loadWords(tsvUrl);

		self.postMessage({ status: 'Projecting 200 dimensions into 3D' });
		const reducedVectors = pcaReducer(tensor);
		const count = Math.min(wordList.length, reducedVectors.length);

		const wordEmbeddings = Array.from({ length: count }, (_, index) => ({
			id: index,
			word: wordList[index],
			reducedVector: reducedVectors[index],
		}));

		self.postMessage({
			wordEmbeddings,
			vectorDimensions,
			vectorValues: tensor.values,
		}, [tensor.values.buffer]);

		tensor.dispose();
	} catch (error) {
		self.postMessage({ error: error.message || 'Embeddings could not be loaded.' });
	}
};
