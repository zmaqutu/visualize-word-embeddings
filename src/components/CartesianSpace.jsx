import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, StatsGl } from '@react-three/drei';
import * as THREE from 'three'

import { useMemo, useRef } from 'react'


function CartesianSpace({ embeddings }) {

	const memoizedEmbeddings = useMemo(() => embeddings, [embeddings]);

	const wordEmbeddingsMeshRef = useRef();
	const raycasterRef = useRef(new THREE.Raycaster());
	const pointer = useRef(new THREE.Vector2());
	// const axesHelper = new THREE.AxesHelper(200)

	// Get the camera from the Canvas context
	const { camera } = useThree();

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
		}
	};
	return (
		<>
			<ambientLight intensity={10} color={0xBBC2D0} />
			{wordEmbeddingsMesh && <primitive object={wordEmbeddingsMesh} onPointerDown={handlePointerDown} />}
			<axesHelper args={[150, 150, 150]} />
			<OrbitControls />
			{/* <primitive object={axesHelper} /> */}
		</>
	)
}

export default CartesianSpace