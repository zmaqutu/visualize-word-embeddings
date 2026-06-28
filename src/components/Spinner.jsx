import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Trail, Sphere } from '@react-three/drei';


function Spinner() {

	const spinnerRef = useRef();
	const group = useRef();

	useFrame(({ clock }) => {
		const time = clock.elapsedTime;
		const radius = 28 + Math.sin(time * 0.7) * 10;
		spinnerRef.current.position.x = Math.sin(time * 3) * radius;
		spinnerRef.current.position.z = Math.cos(time * 3) * radius;
		spinnerRef.current.position.y = Math.sin(time * 2) * 10;
		group.current.rotation.y = time * 2.2;
	})

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
