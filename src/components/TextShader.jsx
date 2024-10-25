import { useRef, useMemo } from 'react'
import * as THREE from 'three';


// Vertex Shader
const vertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition ;
    gl_PointSize = 10.0; // Adjust point size as needed
}`;

// Fragment Shader
const fragmentShader = `
uniform sampler2D textTexture;
uniform bool isHovered;
varying vec2 vUv;

void main() {
    vec4 color = texture2D(textTexture, vUv);
    if (!isHovered) {
        discard; // Don't draw if not hovered
    }
    gl_FragColor = color;
}`;

function TextShader({ isHovered, textTexture, position }) {

    const materialRef = useRef();

    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                textTexture: { value: textTexture },
                isHovered: { value: isHovered },
            },
        });
    }, [isHovered, textTexture]);

    return (
        <mesh position={position[0], position[1] + 10, position[2]} scale={10}> {/* Position the text above the spheres */}
            <planeGeometry args={[5, 2]} />
            <primitive object={material} attach="material" ref={materialRef} />
        </mesh>
    );
}

export default TextShader