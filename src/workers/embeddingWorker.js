import { loadTensor } from '../utils/tensorLoader';
import { loadWords } from '../utils/wordLoader';
import { pcaReducer } from '../utils/pcaReducer';

self.onmessage = async function (e) {
	const { tensorUrl, tsvUrl } = e.data;
	console.log('Inside Worker')

	// Load the tensor
	const tensor = await loadTensor(tensorUrl);

	// Load the words list
	const wordList = await loadWords(tsvUrl);

	// Perform PCA
	const reducedVector = await pcaReducer(tensor);

	// Create the word embeddings map
	const wordEmbeddings = wordList.map((word, index) => ({
		word,
		originalVector: tensor.slice([index, 0], [1, 200]).dataSync(),
		reducedVector: reducedVector[index],
	}));

	tensor.dispose()

	// Send the embeddings back to the main thread
	self.postMessage({ wordEmbeddings });
};
