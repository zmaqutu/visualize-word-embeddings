import CartesianSpace from '../components/CartesianSpace';
import useWordEmbeddings from '../hooks/useWordEmbeddings';
import { Canvas } from '@react-three/fiber';
import { useRef } from 'react';

function EmbeddingViewer() {
	const { embeddings, loading, error } = useWordEmbeddings();

	let width = window.innerWidth;
	let height = window.innerHeight;

	const cameraPosition = useRef([100, 200, 300]);



	// if (loading) return <div>Loading...</div>;
	// if (error) return <div>Error loading embeddings: {error.message}</div>;

	console.log('embeddings', embeddings);
	return (
		<Canvas
			camera={{ position: cameraPosition.current, fov: 53, aspect: width / height, near: 1, far: 5000 }}>
			<CartesianSpace embeddings={embeddings} />
		</Canvas>
	)
}

export default EmbeddingViewer