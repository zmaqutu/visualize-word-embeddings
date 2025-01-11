import * as THREE from 'three';

/**
 * Converts a 3D vector to 2D screen coordinates.
 *
 * @param {THREE.Camera} camera - The camera used to view the 3D scene.
 * @param {number} width - The width of the screen or canvas.
 * @param {number} height - The height of the screen or canvas.
 * @param {THREE.Vector3} positionVector - The 3D vector to convert.
 * @returns {{x: number, y: number}} The 2D screen coordinates.
 */
export function vector3DToScreenCoords(camera, width, height, positionVector) {
	// Get the device pixel ratio for scaling
	const devicePixelRatio = window.devicePixelRatio || 1;

	// Create a new vector based on the input and project it with the camera
	const projectedVector = new THREE.Vector3().copy(positionVector).project(camera);

	// Calculate 2D screen coordinates
	const x = ((projectedVector.x + 1) / 2) * width * devicePixelRatio;
	const y = -((projectedVector.y - 1) / 2) * height * devicePixelRatio;

	return { x, y };
}
