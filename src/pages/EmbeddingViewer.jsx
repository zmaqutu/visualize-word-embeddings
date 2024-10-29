import CartesianSpace from '../components/CartesianSpace';
import useWordEmbeddings from '../hooks/useWordEmbeddings';
import { Canvas } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

function EmbeddingViewer() {
	const { embeddings, loading, error } = useWordEmbeddings();

	const canvasRef = useRef();
	let width = window.innerWidth;
	let height = window.innerHeight;

	const cameraPosition = useRef([100, 200, 300]);

	useEffect(() => {
		const handleResize = () => {
			if (canvasRef.current) {
				canvasRef.current.width = window.innerWidth;
				canvasRef.current.height = window.innerHeight;
			}
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);



	// if (loading) return <div>Loading...</div>;
	// if (error) return <div>Error loading embeddings: {error.message}</div>;

	console.log('embeddings', embeddings);
	return (
		<>
			<Canvas
				camera={{ position: cameraPosition.current, fov: 53, aspect: width / height, near: 1, far: 5000 }}>
				<CartesianSpace embeddings={embeddings} canvasRef={canvasRef} />
			</Canvas>
			<canvas id="labelCanvas" ref={canvasRef} width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
		</>

	)
}

export default EmbeddingViewer