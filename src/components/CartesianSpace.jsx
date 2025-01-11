import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Html, OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

import { useEffect, useMemo, useRef, useState } from 'react'
import { vector3DToScreenCoords } from '../utils/helpers';


function CartesianSpace({ embeddings, canvasRef }) {

	// Get the camera from the Canvas context
	const { camera } = useThree();
	const wordEmbeddingsMeshRef = useRef();
	const raycasterRef = useRef(new THREE.Raycaster());
	const pointer = useRef(new THREE.Vector2());
	const [selectedIndices, setSelectedIndices] = useState([]);

	const wordEmbeddingsMesh = useMemo(() => {
		if (!embeddings) return null;
		const geometry = new THREE.SphereGeometry(0.75); // Sphere geometry for visualization
		const material = new THREE.MeshStandardMaterial({ color: 'yellow' });
		// const material = new THREE.MeshStandardMaterial({
		// 	color: 'yellow',  // Set color to yellow
		// 	opacity: 0.75,     // Set opacity to 50%
		// 	transparent: true, // Enable transparency
		// });
		const mesh = new THREE.InstancedMesh(geometry, material, embeddings.length);
		wordEmbeddingsMeshRef.current = mesh; // Store the mesh in a ref

		for (let i = 0; i < 1000; i++) {
			const matrix = new THREE.Matrix4();
			const { reducedVector } = embeddings[i];
			matrix.setPosition(new THREE.Vector3(reducedVector[0], reducedVector[1], reducedVector[2]));
			mesh.setMatrixAt(i, matrix);
			// console.log(i)
		}
		// embeddings.forEach((embedding, i) => {
		// 	const { reducedVector } = embedding;
		// 	const matrix = new THREE.Matrix4();
		// 	matrix.setPosition(new THREE.Vector3(...reducedVector));
		// 	mesh.setMatrixAt(i, matrix);
		// });

		mesh.instanceMatrix.needsUpdate = true; // Mark the instance matrix as needing update
		return mesh;
	}, [embeddings]);

	// console.log('wordEmbeddingsMesh', wordEmbeddingsMesh);

	const handlePointerHover = (event) => {
		pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
		pointer.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

		raycasterRef.current.setFromCamera(pointer.current, camera);
		const intersects = raycasterRef.current.intersectObject(wordEmbeddingsMeshRef.current);

		if (intersects.length > 0) {
			const instanceId = intersects[0].instanceId;
			const clickedWord = embeddings[instanceId].word;
			console.log('Clicked word:', clickedWord);
			// setSelectedIndex(instanceId);
			// setSelectedIndices((prev) => {
			// 	if (prev.includes(instanceId)) {
			// 		return prev.filter((index) => index !== instanceId);
			// 	}
			// 	return [...prev, instanceId];
			// });
			selectedIndices.push(instanceId);
			wordEmbeddingsMesh.setColorAt(instanceId, new THREE.Color('red'));
			wordEmbeddingsMesh.instanceColor.needsUpdate = true;

		}
	};
	const handlePointerLeave = () => {
		setSelectedIndices([]);
		const ctx = canvasRef.current.getContext('2d');
		ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
		// selectedIndices.pop();
	}

	// console.log('selectedIndices', selectedIndices);

	useFrame(() => {
		if (!embeddings || !canvasRef.current || selectedIndices.length === 0) return;

		const devicePixelRatio = window.devicePixelRatio || 1;
		const xShift = 4;
		const ctx = canvasRef.current.getContext('2d');
		ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
		ctx.font = '12px roboto';
		// for (let i = 0; i < selectedIndices.length; i++) {
		// 	const embedding = embeddings[i];
		// 	const { reducedVector, word } = embedding;
		// 	const screenPosition = vector3DToScreenCoords(camera, window.innerWidth, window.innerHeight, new THREE.Vector3(...reducedVector));
		// 	// ctx.fillStyle = 'black';
		// 	// ctx.strokeStyle = 'white';
		// 	ctx.lineWidth = 6;
		// 	ctx.fillText(word, screenPosition.x, screenPosition.y);
		// }
		selectedIndices.forEach((index, i) => {
			const embedding = embeddings[index];
			const { reducedVector, word } = embedding;
			const screenPosition = vector3DToScreenCoords(camera, window.innerWidth, window.innerHeight, new THREE.Vector3(...reducedVector));
			// ctx.fillStyle = 'black';
			// ctx.strokeStyle = 'white';
			ctx.lineWidth = 6;
			ctx.fillText(word, screenPosition.x + xShift, screenPosition.y);
			// ctx.strokeText(word, screenPosition.x + xShift, screenPosition.y);
		});
	});
	return (
		<>
			<ambientLight intensity={10} color={0xBBC2D0} />
			{wordEmbeddingsMesh && <primitive object={wordEmbeddingsMesh} onPointerOver={handlePointerHover} onPointerLeave={handlePointerLeave} />}
			<axesHelper args={[150, 150, 150]} />
			<mesh rotation={[Math.PI, Math.PI, 0]}>
				<axesHelper args={[150, 150, 150]} />
			</mesh>
			<mesh rotation={[0, Math.PI, 0]}>
				<axesHelper args={[150, 150, 150]} />
			</mesh>
			<gridHelper args={[300, 300]} />
			<OrbitControls />
		</>
	)
}

export default CartesianSpace
