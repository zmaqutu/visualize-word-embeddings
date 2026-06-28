import { useRef, useMemo } from 'react'
import * as THREE from 'three';


// Vertex Shader
const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position; // Pass the position to the fragment shader
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 10.0; // Adjust point size as needed
}`;

// Fragment Shader
const fragmentShader = `
uniform sampler2D textTexture;
uniform bool isHovered;
varying vec2 vUv;
varying vec3 vPosition; // Get position from the vertex shader

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
        <mesh position={position} scale={10}>
            <planeGeometry args={[5, 2]} />
            <primitive object={material} attach="material" ref={materialRef} />
        </mesh>
    );
}

export default TextShader
