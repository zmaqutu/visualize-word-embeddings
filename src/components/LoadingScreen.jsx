import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useRef } from 'react';
import Spinner from './Spinner';

function LoadingScreen({ status }) {
	const cameraPosition = useRef([100, 0, 0]);

	return (
		<div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-center text-white bg-[hsl(210,43%,10%)] font-mono">
			<div className="relative flex flex-col items-center">
				<div className="w-[38vw] h-[38vw] max-w-[420px] max-h-[420px] min-w-[220px] min-h-[220px] mb-6 flex justify-center items-center translate-y-[-16%]">
					<Canvas
						camera={{ position: cameraPosition.current, fov: 53, near: 1, far: 5000 }}
						dpr={[1, 2]}
					>
						<Spinner />
						<OrbitControls enableZoom={false} enablePan={false} />
					</Canvas>
				</div>
				<div className="absolute top-1/2 transform -translate-y-1/2 text-center">
					<p className="loading-title">Loading embeddings</p>
					<p className="loading-status">{status}</p>
				</div>
			</div>
		</div>
	)
}

export default LoadingScreen
