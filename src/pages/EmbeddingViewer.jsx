import CartesianSpace from '../components/CartesianSpace';
import useWordEmbeddings from '../hooks/useWordEmbeddings';

function EmbeddingViewer() {
	const { embeddings, loading, error } = useWordEmbeddings();

	// if (loading) return <div>Loading...</div>;
	// if (error) return <div>Error loading embeddings: {error.message}</div>;

	console.log('embeddings', embeddings);
	return (
		<>
			<CartesianSpace embeddings={embeddings} />
		</>
	)
}

export default EmbeddingViewer