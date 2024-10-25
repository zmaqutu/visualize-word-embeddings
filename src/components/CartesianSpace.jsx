import { useThree } from '@react-three/fiber'
import { Billboard, Text, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import _ from 'lodash';
import TextShader from './TextShader';

import { useCallback, useMemo, useRef, useState } from 'react'


function CartesianSpace({ embeddings }) {

	const memoizedEmbeddings = useMemo(() => embeddings, [embeddings]);

	const wordEmbeddingsMeshRef = useRef();
	const raycasterRef = useRef(new THREE.Raycaster());
	const pointer = useRef(new THREE.Vector2());

	const [hoveredWord, setHoveredWord] = useState(null);
	// const [hoveredPosition, setHoveredPosition] = useState(null);

	const [hoveredInstance, setHoveredInstance] = useState(null);

	// Get the camera from the Canvas context
	const { camera } = useThree();

	// Debounce hover state updates to optimize performance
	const debouncedSetHoveredWord = useCallback(_.debounce((word, position) => {
		setHoveredWord(word);
		setHoveredPosition(position);
	}, 10), []);

	const wordEmbeddingsMesh = useMemo(() => {
		if (!memoizedEmbeddings) return null;
		const geometry = new THREE.SphereGeometry(0.5); // Sphere geometry for visualization
		const material = new THREE.MeshStandardMaterial({ color: 'yellow' });
		// const material = new THREE.MeshStandardMaterial({
		// 	color: 'yellow',  // Set color to yellow
		// 	opacity: 0.75,     // Set opacity to 50%
		// 	transparent: true, // Enable transparency
		// });
		const mesh = new THREE.InstancedMesh(geometry, material, memoizedEmbeddings.length);
		wordEmbeddingsMeshRef.current = mesh; // Store the mesh in a ref

		for (let i = 0; i < memoizedEmbeddings.length; i++) {
			const matrix = new THREE.Matrix4();
			const { reducedVector } = memoizedEmbeddings[i];
			matrix.setPosition(new THREE.Vector3(reducedVector[0], reducedVector[1], reducedVector[2]));
			mesh.setMatrixAt(i, matrix);
		}

		mesh.instanceMatrix.needsUpdate = true; // Mark the instance matrix as needing update
		return mesh;
	}, [memoizedEmbeddings]);

	const textTexture = useMemo(() => {
		const canvas = document.createElement('canvas');
		const context = canvas.getContext('2d');
		context.font = '24px Arial';
		context.fillStyle = 'white';
		context.fillText(hoveredInstance !== null ? memoizedEmbeddings[hoveredInstance].word : '', 0, 24);
		const texture = new THREE.Texture(canvas);
		texture.needsUpdate = true;
		return texture;
	}, [hoveredInstance, memoizedEmbeddings]);

	console.log('wordEmbeddingsMesh', wordEmbeddingsMesh);

	const handlePointerDown = (event) => {
		pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
		pointer.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

		raycasterRef.current.setFromCamera(pointer.current, camera);
		const intersects = raycasterRef.current.intersectObject(wordEmbeddingsMeshRef.current);

		if (intersects.length > 0) {
			const instanceId = intersects[0].instanceId;
			const clickedWord = memoizedEmbeddings[instanceId].word;
			console.log('Clicked word:', clickedWord);

			// const position = intersects[0].point;
			// debouncedSetHoveredWord(clickedWord, position);
			setHoveredInstance(instanceId);

		} else {
			// debouncedSetHoveredWord(null, null); // Clear on hover out
			setHoveredInstance(null);
		}
	};
	// Get the position of the hovered instance
	const hoveredPosition = useMemo(() => {
		if (hoveredInstance === null) return [0, 0, 0];
		const { reducedVector } = memoizedEmbeddings[hoveredInstance];
		return reducedVector; // Return the vector as the position
	}, [hoveredInstance, memoizedEmbeddings]);
	return (
		<>
			<ambientLight intensity={10} color={0xBBC2D0} />
			{wordEmbeddingsMesh && <primitive object={wordEmbeddingsMesh} onPointerOver={handlePointerDown} />}
			<axesHelper args={[150, 150, 150]} />
			<mesh rotation={[Math.PI, Math.PI, 0]}>
				<axesHelper args={[150, 150, 150]} />
			</mesh>
			<mesh rotation={[0, Math.PI, 0]}>
				<axesHelper args={[150, 150, 150]} />
			</mesh>
			<gridHelper args={[300, 300]} />
			<OrbitControls />
			<TextShader isHovered={hoveredInstance !== null} textTexture={textTexture} position={hoveredPosition} />

			{/* {hoveredWord && hoveredPosition && (
				<Billboard position={[hoveredPosition.x, hoveredPosition.y + 5, hoveredPosition.z]} follow>
					<Text fontSize={10} depthTest={false} color="red">{hoveredWord}</Text>
				</Billboard>
			)} */}
		</>
	)
}

export default CartesianSpace