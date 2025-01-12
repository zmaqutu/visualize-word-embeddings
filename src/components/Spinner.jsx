import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Trail, Sphere } from '@react-three/drei';


function Spinner() {

	const spinnerRef = useRef();
	const group = useRef();

	useFrame(({ clock }) => {
		const time = clock.elapsedTime
		spinnerRef.current.position.x = Math.sin(time * 2) * 20
		spinnerRef.current.position.y = Math.tan(time * 2) * 2
		group.current.rotation.z = time

		spinnerRef.current.position.z = Math.cos(time * 2) * 20
		// if(animateLines){
		//         lineRef.current.forEach((r, i) => {
		//         r.color.setRGB(1,1,0)
		//         })
		// }
	})
	return (
		// <mesh>
		// 	<boxGeometry args={[10, 10, 10]} />
		// 	<meshStandardMaterial color="yellow" />
		// </mesh>
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