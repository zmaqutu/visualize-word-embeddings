import { Canvas } from '@react-three/fiber'
import { OrbitControls, StatsGl } from '@react-three/drei';
import * as THREE from 'three'

import { useMemo, useRef } from 'react'


function CartesianSpace({ embeddings }) {

	const memoizedEmbeddings = useMemo(() => embeddings, [embeddings]);


	let width = window.innerWidth;
	let height = window.innerHeight;

	const cameraPosition = useRef([100, 200, 300]);
	// const axesHelper = new THREE.AxesHelper(200)

	const wordEmbeddingsMesh = useMemo(() => {
		if (!memoizedEmbeddings) return null;
		const geometry = new THREE.SphereGeometry(0.5); // Sphere geometry for visualization
		const material = new THREE.MeshStandardMaterial({ color: 'yellow' });
		const mesh = new THREE.InstancedMesh(geometry, material, memoizedEmbeddings.length);

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
	return (
		<>
			<Canvas camera={{ position: cameraPosition.current, fov: 53, aspect: width / height, near: 1, far: 5000 }}>
				<OrbitControls />
				<ambientLight intensity={10} color={0xBBC2D0} />
				{/* <mesh>
					<boxGeometry args={[100, 100, 100]} />
					<meshStandardMaterial color={'orange'} wireframe />
				</mesh> */}
				{wordEmbeddingsMesh && <primitive object={wordEmbeddingsMesh} />}
				<axesHelper args={[150, 150, 150]} />
				{/* <primitive object={axesHelper} /> */}
			</Canvas>
		</>
	)
}

export default CartesianSpace