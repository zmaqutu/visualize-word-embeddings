import { Canvas } from '@react-three/fiber'
import { OrbitControls, StatsGl } from '@react-three/drei';
import * as THREE from 'three'

import React, { useEffect, useRef, useCallback, useState } from 'react'


function CartesianSpace() {

	let width = window.innerWidth;
	let height = window.innerHeight;

	const cameraPosition = useRef([0, 0, 125]);

	return (
		<>
			<Canvas camera={{ position: cameraPosition.current, fov: 53, aspect: width / height, near: 1, far: 5000 }}>
				<OrbitControls />
				<ambientLight intensity={10} color={0xBBC2D0} />
				<mesh>
					<boxGeometry args={[100, 100, 100]} />
					<meshStandardMaterial color={'orange'} wireframe />
				</mesh>
				<axesHelper args={[50, 50, 50]} />
			</Canvas>
		</>
	)
}

export default CartesianSpace