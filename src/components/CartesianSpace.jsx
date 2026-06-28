import { useFrame, useThree } from '@react-three/fiber'
import { Html, OrbitControls, Sphere, Trail } from '@react-three/drei';
import * as THREE from 'three';

import { useEffect, useMemo, useRef } from 'react'

const BASE_COLOR = new THREE.Color('#f6d65f');
const HOVER_COLOR = new THREE.Color('#76e4f7');
const SELECTED_COLOR = new THREE.Color('#fb7185');
const SEARCH_COLOR = new THREE.Color('#a7f3d0');
const ANALOGY_INPUT_COLOR = new THREE.Color('#38bdf8');
const ANALOGY_RESULT_COLOR = new THREE.Color('#34d399');
const ANALOGY_CANDIDATE_COLOR = new THREE.Color('#c084fc');
const COMPARE_WORD_COLOR = new THREE.Color('#fbbf24');
const COMPARE_NEIGHBOR_COLOR = new THREE.Color('#76e4f7');
const PATH_WORD_COLOR = new THREE.Color('#f472b6');
const DIM_COLOR = new THREE.Color('#536170');

const getLabelLift = ({
	isAnalogyResult,
	isPrimaryWord,
	isAnalogyInput,
	isSecondaryWord,
}) => {
	if (isAnalogyResult) return 8.5;
	if (isPrimaryWord || isAnalogyInput) return 6;
	if (isSecondaryWord) return 4.5;
	return 3.5;
};

const beamVertexShader = `
varying vec2 vUv;

void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const beamFragmentShader = `
uniform vec3 uColor;
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;

void main() {
	float trail = smoothstep(0.0, 0.45, fract(vUv.y * 2.0 - uTime));
	float fade = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.76, vUv.y);
	float core = 0.35 + trail * 0.65;
	gl_FragColor = vec4(uColor, uOpacity * fade * core);
}
`;

function AnimatedBeam({ from, to, color, label, variant = 'analogy', delay = 0 }) {
	const shaftGroupRef = useRef();
	const headGroupRef = useRef();
	const beamMaterialRef = useRef();
	const glowMaterialRef = useRef();
	const tracerRef = useRef();
	const trailStartTimeRef = useRef(null);
	const arrowParts = useMemo(() => {
		const start = new THREE.Vector3(...from.reducedVector);
		const end = new THREE.Vector3(...to.reducedVector);
		const direction = end.clone().sub(start);
		const length = direction.length();

		if (length === 0) return null;

		const midpoint = start.clone().lerp(end, 0.5);
		const quaternion = new THREE.Quaternion().setFromUnitVectors(
			new THREE.Vector3(0, 1, 0),
			direction.clone().normalize(),
		);

		return {
			length,
			midpoint,
			quaternion,
			start,
			end,
			beamEnd: start.clone().lerp(end, 0.82),
			headPosition: start.clone().lerp(end, 0.9),
			headLength: Math.max(4.2, Math.min(8.5, length * 0.08)),
			beamLength: Math.max(1, length * 0.82),
		};
	}, [from, to]);

	const beamUniforms = useMemo(() => ({
		uColor: { value: new THREE.Color(color) },
		uTime: { value: 0 },
		uOpacity: { value: variant === 'analogy' ? 0.98 : 0.82 },
	}), [color, variant]);

	const labelPosition = useMemo(() => {
		return [
			(from.reducedVector[0] + to.reducedVector[0]) / 2,
			(from.reducedVector[1] + to.reducedVector[1]) / 2 + 4.5,
			(from.reducedVector[2] + to.reducedVector[2]) / 2,
		];
	}, [from, to]);

	useFrame(({ clock }) => {
		if (trailStartTimeRef.current === null) {
			trailStartTimeRef.current = clock.elapsedTime;
		}

		const segmentDuration = variant === 'path' ? 1.55 : 1.18;
		const segmentProgress = arrowParts
			? THREE.MathUtils.clamp((clock.elapsedTime - trailStartTimeRef.current - delay) / segmentDuration, 0, 1)
			: 0;
		const easedProgress = 1 - ((1 - segmentProgress) ** 3);

		if (shaftGroupRef.current && arrowParts) {
			const currentBeamEnd = arrowParts.start.clone().lerp(arrowParts.beamEnd, easedProgress);
			shaftGroupRef.current.position.copy(arrowParts.start.clone().lerp(currentBeamEnd, 0.5));
			shaftGroupRef.current.scale.y = Math.max(easedProgress, 0.001);
			shaftGroupRef.current.visible = easedProgress > 0.01;
		}

		if (headGroupRef.current && arrowParts) {
			headGroupRef.current.position.copy(arrowParts.start.clone().lerp(arrowParts.headPosition, easedProgress));
			headGroupRef.current.visible = easedProgress > 0.82;
		}

		if (beamMaterialRef.current) {
			beamMaterialRef.current.uniforms.uTime.value = clock.elapsedTime * 0.55;
			beamMaterialRef.current.uniforms.uOpacity.value = (variant === 'analogy' ? 0.98 : 0.82) * easedProgress;
		}

		if (glowMaterialRef.current) {
			glowMaterialRef.current.opacity = ((variant === 'analogy' ? 0.24 : 0.16)
				+ Math.sin(clock.elapsedTime * 2.2) * 0.06) * easedProgress;
		}

		if (tracerRef.current && arrowParts) {
			tracerRef.current.position.lerpVectors(arrowParts.start, arrowParts.end, easedProgress);
		}
	});

	if (!arrowParts) return null;

	return (
		<>
			<group ref={shaftGroupRef} position={arrowParts.midpoint} quaternion={arrowParts.quaternion}>
				<mesh>
					<cylinderGeometry args={[variant === 'analogy' ? 1.15 : 0.8, variant === 'analogy' ? 1.15 : 0.8, arrowParts.beamLength, 32, 1, true]} />
					<meshBasicMaterial
						ref={glowMaterialRef}
						color={color}
						transparent
						opacity={variant === 'analogy' ? 0.26 : 0.18}
						depthWrite={false}
					/>
				</mesh>
				<mesh>
					<cylinderGeometry args={[variant === 'analogy' ? 0.34 : 0.24, variant === 'analogy' ? 0.34 : 0.24, arrowParts.beamLength, 32, 1, true]} />
					<shaderMaterial
						ref={beamMaterialRef}
						vertexShader={beamVertexShader}
						fragmentShader={beamFragmentShader}
						uniforms={beamUniforms}
						transparent
						depthWrite={false}
						blending={THREE.AdditiveBlending}
					/>
				</mesh>
			</group>
			<group ref={headGroupRef} position={arrowParts.headPosition} quaternion={arrowParts.quaternion}>
				<mesh position={[0, arrowParts.headLength / 2, 0]}>
					<coneGeometry args={[variant === 'analogy' ? 2.6 : 2.1, arrowParts.headLength, 3]} />
					<meshBasicMaterial color={color} transparent opacity={0.96} />
				</mesh>
			</group>
			<Trail
				width={variant === 'analogy' ? 7 : 5}
				length={18}
				color={color}
				attenuation={(t) => t * t}
			>
				<Sphere ref={tracerRef} args={[variant === 'analogy' ? 1.9 : 1.45, 20, 20]} position={arrowParts.start}>
					<meshBasicMaterial color={color} transparent opacity={0.76} />
				</Sphere>
			</Trail>
			<Html position={labelPosition} center zIndexRange={[80, 0]} className={`arrow-label ${variant === 'analogy' ? 'analogy-arrow-label' : ''}`}>
				{label}
			</Html>
		</>
	);
}

function CartesianSpace({
	embeddings,
	visibleCount,
	hoveredId,
	selectedId,
	searchId,
	analogyIds,
	analogyInputIds,
	analogyResultId,
	analogyLinks,
	visibleCandidateIds = [],
	compareWordIds = [],
	compareNeighborIds = [],
	compareLinks = [],
	pathWordIds = [],
	pathLinks = [],
	analogyRevealStep = 0,
	analogyPresentationDone = false,
	presentationRunId = 0,
	onHover,
	onSelect,
}) {
	const { camera } = useThree();
	const wordEmbeddingsMeshRef = useRef();
	const raycasterRef = useRef(new THREE.Raycaster());
	const pointer = useRef(new THREE.Vector2());

	const visibleEmbeddings = useMemo(
		() => embeddings.slice(0, visibleCount),
		[embeddings, visibleCount],
	);

	const visibleEmbeddingsById = useMemo(() => {
		return new Map(visibleEmbeddings.map((embedding) => [embedding.id, embedding]));
	}, [visibleEmbeddings]);

	const analogyIdSet = useMemo(() => {
		return new Set(analogyIds);
	}, [analogyIds]);

	const analogyInputIdSet = useMemo(() => {
		return new Set(analogyInputIds);
	}, [analogyInputIds]);

	const visibleCandidateIdSet = useMemo(() => {
		return new Set(visibleCandidateIds);
	}, [visibleCandidateIds]);

	const compareWordIdSet = useMemo(() => {
		return new Set(compareWordIds);
	}, [compareWordIds]);

	const compareNeighborIdSet = useMemo(() => {
		return new Set(compareNeighborIds);
	}, [compareNeighborIds]);

	const pathWordIdSet = useMemo(() => {
		return new Set(pathWordIds);
	}, [pathWordIds]);

	const isPathFocusMode = pathWordIds.length > 0;
	const isCompareFocusMode = compareWordIds.length > 0;
	const isAnalogyFocusMode = Number.isInteger(analogyResultId);
	const isFocusMode = isAnalogyFocusMode || isCompareFocusMode || isPathFocusMode;
	const focusProgressRef = useRef(0);

	const renderedEmbeddings = useMemo(() => {
		if (isCompareFocusMode) {
			return visibleEmbeddings.filter((embedding) => (
				compareWordIdSet.has(embedding.id) || compareNeighborIdSet.has(embedding.id)
			));
		}

		if (isPathFocusMode) {
			return visibleEmbeddings.filter((embedding) => pathWordIdSet.has(embedding.id));
		}

		if (!isAnalogyFocusMode || !analogyPresentationDone) return visibleEmbeddings;

		return visibleEmbeddings.filter((embedding) => (
			analogyIdSet.has(embedding.id) || visibleCandidateIdSet.has(embedding.id)
		));
	}, [
		analogyIdSet,
		analogyPresentationDone,
		compareNeighborIdSet,
		compareWordIdSet,
		isCompareFocusMode,
		isAnalogyFocusMode,
		isPathFocusMode,
		pathWordIdSet,
		visibleCandidateIdSet,
		visibleEmbeddings,
	]);

	const geometry = useMemo(() => new THREE.SphereGeometry(0.72, 12, 12), []);
	const material = useMemo(() => new THREE.MeshStandardMaterial({
		color: BASE_COLOR,
		roughness: 0.48,
		metalness: 0.08,
	}), []);

	const wordEmbeddingsMesh = useMemo(() => {
		if (renderedEmbeddings.length === 0) return null;

		const mesh = new THREE.InstancedMesh(geometry, material, renderedEmbeddings.length);
		const matrix = new THREE.Matrix4();
		const position = new THREE.Vector3();

		renderedEmbeddings.forEach(({ reducedVector }, index) => {
			position.set(reducedVector[0], reducedVector[1], reducedVector[2]);
			matrix.setPosition(position);
			mesh.setColorAt(index, BASE_COLOR);
			mesh.setMatrixAt(index, matrix);
		});

		mesh.instanceMatrix.needsUpdate = true;
		mesh.instanceColor.needsUpdate = true;
		wordEmbeddingsMeshRef.current = mesh;

		return mesh;
	}, [geometry, material, renderedEmbeddings]);

	useFrame((_, delta) => {
		if (!wordEmbeddingsMesh) return;

		const targetFocusProgress = isFocusMode ? 1 : 0;
		focusProgressRef.current = THREE.MathUtils.damp(
			focusProgressRef.current,
			targetFocusProgress,
			2.25,
			delta,
		);

		const matrix = new THREE.Matrix4();
		const position = new THREE.Vector3();
		const rotation = new THREE.Quaternion();
		const focusProgress = focusProgressRef.current;
		const activeScaleBoost = THREE.MathUtils.lerp(1, 1.12, focusProgress);
		const dimColor = new THREE.Color('#15232d');
		const colorScratch = new THREE.Color();

		for (let index = 0; index < renderedEmbeddings.length; index += 1) {
			const embeddingId = renderedEmbeddings[index].id;
			const isAnalogyInput = analogyInputIdSet.has(embeddingId);
			const isAnalogyResult = embeddingId === analogyResultId;
			const isVisibleCandidate = visibleCandidateIdSet.has(embeddingId);
			const isCompareWord = compareWordIdSet.has(embeddingId);
			const isCompareNeighbor = compareNeighborIdSet.has(embeddingId);
			const isPathWord = pathWordIdSet.has(embeddingId);
			const isActive = embeddingId === selectedId
				|| embeddingId === hoveredId
				|| embeddingId === searchId
				|| isAnalogyInput
				|| isAnalogyResult
				|| isVisibleCandidate
				|| isCompareWord
				|| isCompareNeighbor
				|| isPathWord;
			const color = embeddingId === selectedId
				? SELECTED_COLOR
				: embeddingId === hoveredId
					? HOVER_COLOR
					: embeddingId === searchId
						? SEARCH_COLOR
						: isAnalogyResult
							? ANALOGY_RESULT_COLOR
							: isAnalogyInput
								? ANALOGY_INPUT_COLOR
								: isVisibleCandidate
									? ANALOGY_CANDIDATE_COLOR
									: isCompareWord
										? COMPARE_WORD_COLOR
										: isCompareNeighbor
											? COMPARE_NEIGHBOR_COLOR
											: isPathWord
												? PATH_WORD_COLOR
												: (selectedId !== null && selectedId !== undefined)
													|| (searchId !== null && searchId !== undefined)
													|| analogyIdSet.size > 0
													|| compareWordIdSet.size > 0
													|| pathWordIdSet.size > 0
													? DIM_COLOR
													: BASE_COLOR;

			position.set(...renderedEmbeddings[index].reducedVector);
			const inactiveFocusScale = isFocusMode && !isActive
				? THREE.MathUtils.lerp(1, 0.1, focusProgress)
				: 1;
			const baseScale = isAnalogyResult ? 3.15 : isCompareWord || isPathWord ? 2.65 : isAnalogyInput ? 2.35 : isVisibleCandidate || isCompareNeighbor ? 1.85 : isActive ? 1.9 : 1;
			const scale = baseScale * inactiveFocusScale * (isActive ? activeScaleBoost : 1);
			colorScratch.copy(color).lerp(dimColor, isFocusMode && !isActive ? focusProgress : 0);
			matrix.compose(position, rotation, new THREE.Vector3(scale, scale, scale));
			wordEmbeddingsMesh.setColorAt(index, colorScratch);
			wordEmbeddingsMesh.setMatrixAt(index, matrix);
		}

		wordEmbeddingsMesh.instanceMatrix.needsUpdate = true;
		wordEmbeddingsMesh.instanceColor.needsUpdate = true;
	});

	useEffect(() => () => {
		geometry.dispose();
		material.dispose();
	}, [geometry, material]);

	const pickEmbedding = (event) => {
		if (!wordEmbeddingsMeshRef.current) return null;

		pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
		pointer.current.y = -(event.clientY / window.innerHeight) * 2 + 1;

		raycasterRef.current.setFromCamera(pointer.current, camera);
		const intersects = raycasterRef.current.intersectObject(wordEmbeddingsMeshRef.current);
		const instanceId = intersects[0]?.instanceId;

		return Number.isInteger(instanceId) ? renderedEmbeddings[instanceId] : null;
	};

	const handlePointerMove = (event) => {
		event.stopPropagation();
		const embedding = pickEmbedding(event);
		onHover(embedding);
		document.body.style.cursor = embedding ? 'pointer' : 'grab';
	};

	const handlePointerLeave = () => {
		onHover(null);
		document.body.style.cursor = 'auto';
	};

	const handleClick = (event) => {
		event.stopPropagation();
		const embedding = pickEmbedding(event);
		if (embedding) {
			onSelect(embedding);
		}
	};

	const activeLabels = useMemo(() => {
		const labelMap = new Map();

		const revealedAnalogyIds = analogyIds.slice(0, Math.min(analogyRevealStep, analogyIds.length));

		[
			...revealedAnalogyIds,
			...visibleCandidateIds,
			...compareWordIds,
			...compareNeighborIds,
			...pathWordIds,
			searchId,
			selectedId,
			hoveredId,
		].forEach((id) => {
			const embedding = visibleEmbeddingsById.get(id);
			if (embedding) {
				labelMap.set(embedding.id, embedding);
			}
		});

		return Array.from(labelMap.values());
	}, [
		analogyIds,
		analogyRevealStep,
		compareNeighborIds,
		compareWordIds,
		pathWordIds,
		hoveredId,
		searchId,
		selectedId,
		visibleCandidateIds,
		visibleEmbeddingsById,
	]);

	const visibleAnalogyLinks = useMemo(() => {
		const linkMap = new Map();

		analogyLinks
			.slice(0, Math.min(analogyRevealStep, analogyLinks.length))
			.filter(({ from, to }) => (
				Array.isArray(from.reducedVector) && Array.isArray(to.reducedVector)
			))
			.forEach((link) => {
				const key = `${link.from.id}-${link.to.id}`;
				linkMap.set(key, link);
			});

		return Array.from(linkMap.values());
	}, [analogyLinks, analogyRevealStep]);

	const visibleCompareLinks = useMemo(() => {
		return compareLinks.filter(({ from, to }) => (
			Array.isArray(from.reducedVector) && Array.isArray(to.reducedVector)
		));
	}, [compareLinks]);

	const visiblePathLinks = useMemo(() => {
		return pathLinks.filter(({ from, to }) => (
			Array.isArray(from.reducedVector) && Array.isArray(to.reducedVector)
		));
	}, [pathLinks]);

	return (
		<>
			<color attach="background" args={['#101820']} />
			<fog attach="fog" args={['#101820', 420, 850]} />
			<ambientLight intensity={1.75} color="#b9c5d6" />
			<directionalLight position={[120, 180, 90]} intensity={2.4} color="#ffffff" />
			<pointLight position={[-120, -80, -60]} intensity={55} color="#80e0ff" />
			{wordEmbeddingsMesh && (
				<primitive
					object={wordEmbeddingsMesh}
					onPointerMove={handlePointerMove}
					onPointerLeave={handlePointerLeave}
					onClick={handleClick}
				/>
			)}
			{visibleAnalogyLinks.map(({ from, to, label, variant = 'analogy' }) => (
				<AnimatedBeam
					key={`${presentationRunId}-${from.id}-${to.id}`}
					from={from}
					to={to}
					color={variant === 'trail-subtract' ? '#fb7185' : variant === 'analogy' ? '#34d399' : '#38bdf8'}
					label={label || (variant === 'analogy' ? `${from.word} -> ${to.word}` : `${from.word} ${variant === 'trail-subtract' ? '−' : '→'} ${to.word}`)}
					variant={variant}
					delay={0}
				/>
			))}
			{visibleCompareLinks.map(({ from, to, label, variant = 'compare' }) => (
				<AnimatedBeam
					key={`${presentationRunId}-${from.id}-${to.id}`}
					from={from}
					to={to}
					color="#fbbf24"
					label={label || `${from.word} -> ${to.word}`}
					variant={variant}
					delay={0}
				/>
			))}
			{visiblePathLinks.map(({ from, to, label, variant = 'path' }, index) => (
				<AnimatedBeam
					key={`${presentationRunId}-path-${from.id}-${to.id}`}
					from={from}
					to={to}
					color="#f472b6"
					label={label || `${index + 1}`}
					variant={variant}
					delay={index * 0.24}
				/>
			))}
			{activeLabels.map((embedding) => (
				<Html
					key={embedding.id}
					position={[
						embedding.reducedVector[0],
						embedding.reducedVector[1] + getLabelLift({
							isAnalogyResult: embedding.id === analogyResultId,
							isPrimaryWord: compareWordIdSet.has(embedding.id) || pathWordIdSet.has(embedding.id),
							isAnalogyInput: analogyInputIdSet.has(embedding.id),
							isSecondaryWord: visibleCandidateIdSet.has(embedding.id) || compareNeighborIdSet.has(embedding.id),
						}),
						embedding.reducedVector[2],
					]}
					center
					zIndexRange={[100, 0]}
					className={`word-label ${analogyInputIdSet.has(embedding.id) ? 'analogy-input-label' : ''} ${embedding.id === analogyResultId ? 'analogy-result-label' : ''} ${visibleCandidateIdSet.has(embedding.id) ? 'analogy-candidate-label' : ''} ${compareWordIdSet.has(embedding.id) ? 'compare-word-label' : ''} ${compareNeighborIdSet.has(embedding.id) ? 'compare-neighbor-label' : ''} ${pathWordIdSet.has(embedding.id) ? 'path-word-label' : ''}`}
				>
					{embedding.word}
				</Html>
			))}
			<axesHelper args={[155]} />
			<gridHelper args={[320, 32, '#43515f', '#24313d']} />
			<OrbitControls
				enableDamping
				dampingFactor={0.08}
				makeDefault
				maxDistance={700}
				minDistance={70}
			/>
		</>
	)
}

export default CartesianSpace
