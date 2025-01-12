import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Trail, Sphere } from '@react-three/drei';


function Spinner() {

	const spinnerRef = useRef();
	const group = useRef();

	useFrame(({ clock }) => {
		// const time = clock.elapsedTime
		// spinnerRef.current.position.x = Math.sin(time * 2) * 20
		// spinnerRef.current.position.y = Math.tan(time * 2) * 2
		// group.current.rotation.z = time

		// spinnerRef.current.position.z = Math.cos(time * 2) * 20

		// Helix Movement (Spiral Path)
		// const time = clock.elapsedTime;
		// spinnerRef.current.position.x = Math.sin(time * 3) * 20;
		// spinnerRef.current.position.y = Math.cos(time * 3) * 20;
		// spinnerRef.current.position.z = Math.sin(time) * 10;
		// group.current.rotation.y = time * 2; // Rotate the group

		// Pulse and Orbit.
		// const time = clock.elapsedTime;
		// spinnerRef.current.position.x = Math.sin(time * 2) * 30;
		// spinnerRef.current.position.z = Math.cos(time * 2) * 30;
		// spinnerRef.current.scale.setScalar(1 + Math.sin(time * 5) * 0.3); // Pulsing effect

		// Figure-8 Path
		// const time = clock.elapsedTime;
		// spinnerRef.current.position.x = Math.sin(time) * 20;
		// spinnerRef.current.position.z = Math.sin(time * 2) * Math.cos(time) * 20;

		// Bouncing Along Y-Axis
		// const time = clock.elapsedTime;
		// spinnerRef.current.position.y = Math.abs(Math.sin(time * 3)) * 20;
		// group.current.rotation.x = time * 2;
		// group.current.rotation.y = time * 2;

		// Wave Motion
		// const time = clock.elapsedTime;
		// spinnerRef.current.position.x = Math.sin(time * 3) * 30;
		// spinnerRef.current.position.y = Math.sin(time * 2) * 10;
		// spinnerRef.current.position.z = Math.cos(time * 3) * 30;

		// Flower Petal Orbit
		// const time = clock.elapsedTime;
		// const r = 20 + Math.sin(time * 3) * 5; // Varying radius
		// spinnerRef.current.position.x = Math.sin(time * 2) * r;
		// spinnerRef.current.position.z = Math.cos(time * 3) * r;
		// group.current.rotation.y = time;

		// Scaling Explosion
		// const time = clock.elapsedTime;
		// const scale = 1 + Math.sin(time * 5) * 0.5;
		// spinnerRef.current.scale.set(scale, scale, scale);

		// Pendulum Swing
		// const time = clock.elapsedTime;
		// spinnerRef.current.position.x = Math.sin(time * 2) * 30; // Swinging
		// spinnerRef.current.position.y = Math.cos(time * 3) * 10; // Add some height variation

		// Randomized Jitter
		// const time = clock.elapsedTime;
		// spinnerRef.current.position.x = Math.sin(time * 3) * 20 + Math.random() * 5;
		// spinnerRef.current.position.y = Math.cos(time * 3) * 20 + Math.random() * 5;
		// spinnerRef.current.position.z = Math.sin(time * 5) * 10 + Math.random() * 5;

		// Galaxy Swirl
		const time = clock.elapsedTime;
		const radius = Math.max(5, 50 - time * 5); // Spiral inward
		spinnerRef.current.position.x = Math.sin(time * 3) * radius;
		spinnerRef.current.position.z = Math.cos(time * 3) * radius;
		spinnerRef.current.position.y = Math.sin(time * 2) * 10;
		group.current.rotation.y = time * 3; // Rotate the group
	})
	useEffect(() => {
		return () => console.log('unmounting Spinner');
	}, []);
	return (
		<group ref={group}>
			<Trail
				width={15}
				length={15}
				color={'#F8D628'}
				attenuation={(t) => {
					return t * t
				}}
			>
				<Sphere ref={spinnerRef} args={[3, 32, 32]} position-y={3}>
					<meshNormalMaterial />
				</Sphere>
			</Trail>
		</group>
	)
}

export default Spinner