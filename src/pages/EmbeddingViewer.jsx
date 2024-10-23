import useWordEmbeddings from '../hooks/useWordEmbeddings';

function EmbeddingViewer() {
	const { embeddings, words, loading, error } = useWordEmbeddings();

	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error loading embeddings: {error.message}</div>;

	console.log('embeddings', embeddings);
	console.log('words', words);
	return (
		<div>EmbeddingViewer</div>
	)
}

export default EmbeddingViewer