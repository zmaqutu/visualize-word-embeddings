import CartesianSpace from '../components/CartesianSpace';
import LoadingScreen from '../components/LoadingScreen';
import useWordEmbeddings from '../hooks/useWordEmbeddings';
import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { useSpring, a } from '@react-spring/web';

function EmbeddingViewer() {
	const { embeddings, loading, error } = useWordEmbeddings();

	const canvasRef = useRef();
	let width = window.innerWidth;
	let height = window.innerHeight;

	const cameraPosition = useRef([100, 200, 300]);
	const [showLoader, setShowLoader] = useState(true);


	const loaderProps = useSpring({
		opacity: loading ? 1 : 0,
		transform: loading ? 'translateY(0%)' : 'translateY(-100%)',
		config: { tension: 170, friction: 26 },
		onRest: () => {
			// Hide the loader when the animation completes
			if (!loading) {
				setShowLoader(false);
			}
			console.log('animation complete');
		},
	});


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

	console.log('loading', loading);



	// if (error) return <div>Error loading embeddings: {error.message}</div>;

	return (
		<>
			{showLoader && (<a.div
				className={`absolute top-0 left-0 w-full h-full flex justify-center items-center text-white bg-[hsla(206,95%,15%,1)] font-mono z-50`}
				style={{
					...loaderProps,
				}}
			>
				<LoadingScreen />
			</a.div>
			)}
			<Canvas
				camera={{ position: cameraPosition.current, fov: 53, aspect: width / height, near: 1, far: 5000 }}>
				<CartesianSpace embeddings={embeddings} canvasRef={canvasRef} />
			</Canvas>
			<canvas id="labelCanvas" ref={canvasRef} width={width} height={height} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
		</>

	)
}

export default EmbeddingViewer