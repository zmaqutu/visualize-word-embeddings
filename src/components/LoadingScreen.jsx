// import { useSpring, a } from '@react-spring/web';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useRef } from 'react';
import Spinner from './Spinner';



// eslint-disable-next-line react/prop-types
function LoadingScreen() {

	let width = window.innerWidth;
	let height = window.innerHeight;
	const cameraPosition = useRef([100, 0, 0]);


	return (
		<>

			<div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center items-center text-white bg-[hsla(206,95%,15%,1)] font-mono">
				{/* Wrapper for centering */}
				<div className="relative flex flex-col items-center">
					{/* Red square shifted up */}
					<div className="w-[30vw] h-[30vw] max-w-[400px] max-h-[400px] mb-6 flex justify-center items-center translate-y-[-25%]">
						<Canvas
							camera={{ position: cameraPosition.current, fov: 53, aspect: width / height, near: 1, far: 5000 }}>
							<Spinner />
							<OrbitControls />

						</Canvas>
					</div>
					{/* Loading text perfectly centered */}
					<p className="absolute top-1/2 transform -translate-y-1/2">Loading</p>
				</div>
			</div>
		</>
	)
}

export default LoadingScreen