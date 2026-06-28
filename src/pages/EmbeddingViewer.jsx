import CartesianSpace from '../components/CartesianSpace';
import LoadingScreen from '../components/LoadingScreen';
import useWordEmbeddings from '../hooks/useWordEmbeddings';
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSpring, a } from '@react-spring/web';
import {
	buildProjectionModel,
	buildVectorNorms,
	findExactWordMatch,
	findWordMatch,
	getVector,
	projectVector,
	solveAnalogy,
} from '../utils/vectorMath';

const DEFAULT_POINT_COUNT = 2500;
const DEFAULT_ANALOGY_LEFT = 'king';
const DEFAULT_ANALOGY_SUBTRACT = 'man';
const DEFAULT_ANALOGY_RIGHT = 'woman';
const PRESENTATION_PHASES = [
	{ delay: 950, step: 1 },
	{ delay: 2600, step: 2 },
	{ delay: 4250, step: 3 },
	{ delay: 5900, step: 4 },
	{ delay: 7200, step: 5 },
];

function EmbeddingViewer() {
	const { embeddings, loading, error, status, vectorValues, vectorDimensions } = useWordEmbeddings();

	const cameraPosition = useRef([100, 200, 300]);
	const [showLoader, setShowLoader] = useState(true);
	const [pointCount, setPointCount] = useState(DEFAULT_POINT_COUNT);
	const [hoveredEmbedding, setHoveredEmbedding] = useState(null);
	const [selectedEmbedding, setSelectedEmbedding] = useState(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [analogyLeft, setAnalogyLeft] = useState(DEFAULT_ANALOGY_LEFT);
	const [analogySubtract, setAnalogySubtract] = useState(DEFAULT_ANALOGY_SUBTRACT);
	const [analogyRight, setAnalogyRight] = useState(DEFAULT_ANALOGY_RIGHT);
	const [calculatedAnalogy, setCalculatedAnalogy] = useState(null);
	const [presentationRunId, setPresentationRunId] = useState(0);
	const [presentationStep, setPresentationStep] = useState(0);

	const visibleCount = Math.min(pointCount, embeddings.length);
	const maxPointCount = Math.max(embeddings.length, DEFAULT_POINT_COUNT);
	const vectorNorms = useMemo(() => {
		return buildVectorNorms(vectorValues, vectorDimensions, embeddings.length);
	}, [embeddings.length, vectorDimensions, vectorValues]);
	const projectionModel = useMemo(() => {
		return buildProjectionModel(vectorValues, vectorDimensions, embeddings.length);
	}, [embeddings.length, vectorDimensions, vectorValues]);

	const searchMatch = useMemo(() => {
		return findWordMatch(embeddings, searchTerm);
	}, [embeddings, searchTerm]);

	const draftAnalogyLeftMatch = useMemo(() => {
		return findExactWordMatch(embeddings, analogyLeft);
	}, [analogyLeft, embeddings]);

	const draftAnalogySubtractMatch = useMemo(() => {
		return findExactWordMatch(embeddings, analogySubtract);
	}, [analogySubtract, embeddings]);

	const draftAnalogyRightMatch = useMemo(() => {
		return findExactWordMatch(embeddings, analogyRight);
	}, [analogyRight, embeddings]);

	const analogyLeftMatch = useMemo(() => {
		return calculatedAnalogy ? findExactWordMatch(embeddings, calculatedAnalogy.left) : null;
	}, [calculatedAnalogy, embeddings]);

	const analogySubtractMatch = useMemo(() => {
		return calculatedAnalogy ? findExactWordMatch(embeddings, calculatedAnalogy.subtract) : null;
	}, [calculatedAnalogy, embeddings]);

	const analogyRightMatch = useMemo(() => {
		return calculatedAnalogy ? findExactWordMatch(embeddings, calculatedAnalogy.right) : null;
	}, [calculatedAnalogy, embeddings]);

	const canCalculateAnalogy = Boolean(
		draftAnalogyLeftMatch
		&& draftAnalogySubtractMatch
		&& draftAnalogyRightMatch
		&& vectorValues
		&& vectorNorms.length > 0,
	);

	const hasPendingAnalogyChanges = calculatedAnalogy
		&& (
			calculatedAnalogy.left !== draftAnalogyLeftMatch?.word
			|| calculatedAnalogy.subtract !== draftAnalogySubtractMatch?.word
			|| calculatedAnalogy.right !== draftAnalogyRightMatch?.word
		);

	const analogyResults = useMemo(() => {
		return solveAnalogy({
			addLeft: analogyLeftMatch,
			subtract: analogySubtractMatch,
			addRight: analogyRightMatch,
			embeddings,
			vectorValues,
			vectorDimensions,
			vectorNorms,
			limit: 6,
		});
	}, [
		analogyLeftMatch,
		analogyRightMatch,
		analogySubtractMatch,
		embeddings,
		vectorDimensions,
		vectorNorms,
		vectorValues,
	]);

	const analogyResult = analogyResults[0] || null;
	const isPresentingAnalogy = Boolean(analogyResult && presentationStep < 5);
	const isAnalogyPresentationDone = Boolean(analogyResult && presentationStep >= 5);
	const shouldRevealAnalogyResult = Boolean(analogyResult && presentationStep >= 4);
	const analogyInputIds = useMemo(() => {
		return [analogyLeftMatch?.id, analogySubtractMatch?.id, analogyRightMatch?.id].filter(Number.isInteger);
	}, [analogyLeftMatch, analogyRightMatch, analogySubtractMatch]);

	const analogyIds = useMemo(() => {
		return [...analogyInputIds, analogyResult?.id].filter(Number.isInteger);
	}, [analogyInputIds, analogyResult]);

	const analogyLinks = useMemo(() => {
		if (!analogyResult || !projectionModel) return [];

		const leftVector = getVector(analogyLeftMatch, vectorValues, vectorDimensions);
		const subtractVector = getVector(analogySubtractMatch, vectorValues, vectorDimensions);
		const rightVector = getVector(analogyRightMatch, vectorValues, vectorDimensions);

		if (!leftVector || !subtractVector || !rightVector) return [];

		const minusVector = new Float32Array(vectorDimensions);
		const targetVector = new Float32Array(vectorDimensions);

		for (let dimension = 0; dimension < vectorDimensions; dimension += 1) {
			minusVector[dimension] = leftVector[dimension] - subtractVector[dimension];
			targetVector[dimension] = minusVector[dimension] + rightVector[dimension];
		}

		const origin = { id: 'origin', word: 'origin', reducedVector: [0, 0, 0] };
		const leftPoint = {
			id: 'left-vector',
			word: analogyLeftMatch.word,
			reducedVector: projectVector(leftVector, projectionModel),
		};
		const minusPoint = {
			id: 'minus-vector',
			word: `${analogyLeftMatch.word} - ${analogySubtractMatch.word}`,
			reducedVector: projectVector(minusVector, projectionModel),
		};
		const targetPoint = {
			id: 'target-vector',
			word: `${analogyLeftMatch.word} - ${analogySubtractMatch.word} + ${analogyRightMatch.word}`,
			reducedVector: projectVector(targetVector, projectionModel),
		};

		return [
			{ from: origin, to: leftPoint, label: `+ ${analogyLeftMatch.word}`, variant: 'trail-add' },
			{ from: leftPoint, to: minusPoint, label: `- ${analogySubtractMatch.word}`, variant: 'trail-subtract' },
			{ from: minusPoint, to: targetPoint, label: `+ ${analogyRightMatch.word}`, variant: 'trail-add' },
			{ from: targetPoint, to: analogyResult, label: `nearest: ${analogyResult.word}`, variant: 'analogy' },
		];
	}, [
		analogyLeftMatch,
		analogyResult,
		analogyRightMatch,
		analogySubtractMatch,
		projectionModel,
		vectorDimensions,
		vectorValues,
	]);

	const focusedEmbedding = selectedEmbedding || searchMatch || hoveredEmbedding;
	const arithmeticExpression = `${analogyLeftMatch?.word || analogyLeft || '?'} - ${analogySubtractMatch?.word || analogySubtract || '?'} + ${analogyRightMatch?.word || analogyRight || '?'}`;
	const draftArithmeticExpression = `${draftAnalogyLeftMatch?.word || analogyLeft || '?'} - ${draftAnalogySubtractMatch?.word || analogySubtract || '?'} + ${draftAnalogyRightMatch?.word || analogyRight || '?'}`;

	const loaderProps = useSpring({
		opacity: loading ? 1 : 0,
		transform: loading ? 'translateY(0%)' : 'translateY(-100%)',
		config: { tension: 170, friction: 26 },
	});

	useEffect(() => {
		if (loading) {
			setShowLoader(true);
			return undefined;
		}

		const timeoutId = window.setTimeout(() => setShowLoader(false), 650);
		return () => window.clearTimeout(timeoutId);
	}, [loading]);

	useEffect(() => {
		if (embeddings.length > 0) {
			setPointCount(Math.min(DEFAULT_POINT_COUNT, embeddings.length));
		}
	}, [embeddings.length]);

	useEffect(() => {
		if (!searchMatch || searchMatch.id < pointCount) return;

		const nextCount = Math.min(
			embeddings.length,
			Math.ceil((searchMatch.id + 1) / 500) * 500,
		);
		setPointCount(nextCount);
	}, [embeddings.length, pointCount, searchMatch]);

	useEffect(() => {
		const maxActiveId = Math.max(...analogyIds, -1);
		if (maxActiveId < pointCount) return;

		const nextCount = Math.min(
			embeddings.length,
			Math.ceil((maxActiveId + 1) / 500) * 500,
		);
		setPointCount(nextCount);
	}, [analogyIds, embeddings.length, pointCount]);

	useEffect(() => {
		if (!analogyResult) return undefined;

		const timeoutIds = PRESENTATION_PHASES.map(({ delay, step }) => (
			window.setTimeout(() => setPresentationStep(step), delay)
		));

		return () => {
			timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
		};
	}, [analogyResult, presentationRunId]);

	const handlePointCountChange = (event) => {
		setPointCount(Number(event.target.value));
	};

	const handleCalculateAnalogy = () => {
		if (!canCalculateAnalogy) return;

		setCalculatedAnalogy({
			left: draftAnalogyLeftMatch.word,
			subtract: draftAnalogySubtractMatch.word,
			right: draftAnalogyRightMatch.word,
		});
		setPresentationStep(0);
		setPresentationRunId((currentRunId) => currentRunId + 1);
		setHoveredEmbedding(null);
		setSelectedEmbedding(null);
	};

	const handleClear = () => {
		setAnalogyLeft('');
		setAnalogySubtract('');
		setAnalogyRight('');
		setCalculatedAnalogy(null);
		setPresentationStep(0);
		setPresentationRunId((currentRunId) => currentRunId + 1);
		setSearchTerm('');
		setHoveredEmbedding(null);
		setSelectedEmbedding(null);
		setPointCount(Math.min(DEFAULT_POINT_COUNT, embeddings.length || DEFAULT_POINT_COUNT));
	};

	return (
		<main className="viewer-shell">
			{showLoader && (<a.div
				className="absolute top-0 left-0 w-full h-full flex justify-center items-center text-white bg-[hsl(210,43%,10%)] font-mono z-50"
				style={{
					...loaderProps,
				}}
			>
				<LoadingScreen status={status} />
			</a.div>
			)}
			<Canvas
				className="embedding-canvas"
				camera={{ position: cameraPosition.current, fov: 53, near: 1, far: 5000 }}
				dpr={[1, 2]}
				gl={{ antialias: true, alpha: false }}
				onPointerMissed={() => setSelectedEmbedding(null)}
			>
				<CartesianSpace
					embeddings={embeddings}
					visibleCount={visibleCount}
					hoveredId={hoveredEmbedding?.id}
					selectedId={selectedEmbedding?.id}
					searchId={searchMatch?.id}
					analogyIds={analogyIds}
					analogyInputIds={analogyInputIds}
					analogyResultId={analogyResult?.id}
					analogyLinks={analogyLinks}
					analogyRevealStep={presentationStep}
					analogyPresentationDone={isAnalogyPresentationDone}
					presentationRunId={presentationRunId}
					onHover={setHoveredEmbedding}
					onSelect={setSelectedEmbedding}
				/>
			</Canvas>

			{shouldRevealAnalogyResult && (
				<div className="analogy-stage-readout" aria-live="polite">
					<span>{arithmeticExpression}</span>
					<strong>{analogyResult.word}</strong>
				</div>
			)}

			<section className="viewer-panel" aria-label="Embedding controls">
				<div>
					<p className="panel-kicker">Word2Vec space</p>
					<h1>Explore semantic neighborhoods</h1>
					<p className="panel-copy">
						{embeddings.length.toLocaleString()} words projected from 200D vectors into a navigable semantic map.
					</p>
				</div>

				<div className="analogy-card">
					<span>Vector arithmetic</span>
					<div className="analogy-controls">
						<input
							type="search"
							value={analogyLeft}
							onChange={(event) => setAnalogyLeft(event.target.value)}
							placeholder="king"
							autoComplete="off"
							aria-label="First added word"
						/>
						<b>-</b>
						<input
							type="search"
							value={analogySubtract}
							onChange={(event) => setAnalogySubtract(event.target.value)}
							placeholder="man"
							autoComplete="off"
							aria-label="Subtracted word"
						/>
						<b>+</b>
						<input
							type="search"
							value={analogyRight}
							onChange={(event) => setAnalogyRight(event.target.value)}
							placeholder="woman"
							autoComplete="off"
							aria-label="Second added word"
						/>
					</div>
					<div className="analogy-validation" aria-live="polite">
						<small className={draftAnalogyLeftMatch ? 'is-valid' : 'is-missing'}>{draftAnalogyLeftMatch ? draftAnalogyLeftMatch.word : 'First word not found'}</small>
						<small className={draftAnalogySubtractMatch ? 'is-valid' : 'is-missing'}>{draftAnalogySubtractMatch ? draftAnalogySubtractMatch.word : 'Subtract word not found'}</small>
						<small className={draftAnalogyRightMatch ? 'is-valid' : 'is-missing'}>{draftAnalogyRightMatch ? draftAnalogyRightMatch.word : 'Second word not found'}</small>
					</div>
					<button
						className="calculate-button"
						type="button"
						onClick={handleCalculateAnalogy}
						disabled={!canCalculateAnalogy || isPresentingAnalogy}
					>
						{isPresentingAnalogy ? 'Drawing...' : hasPendingAnalogyChanges ? 'Recalculate' : 'Calculate'}
					</button>
					<button
						className="clear-button"
						type="button"
						onClick={handleClear}
					>
						Clear
					</button>
					<div className="analogy-result">
						<small>{analogyResult ? arithmeticExpression : draftArithmeticExpression}</small>
						<strong>{shouldRevealAnalogyResult ? analogyResult.word : analogyResult ? 'Drawing calculation...' : 'Ready when you calculate'}</strong>
						{shouldRevealAnalogyResult && (
							<em>{(analogyResult.score * 100).toFixed(1)}% cosine match</em>
						)}
						{hasPendingAnalogyChanges && (
							<em>Inputs changed. Calculate to update the scene.</em>
						)}
					</div>
					{isAnalogyPresentationDone && analogyResults.length > 0 && (
						<ol className="analogy-candidates">
							{analogyResults.slice(0, 5).map((candidate) => (
								<li key={candidate.id}>
									<span>{candidate.word}</span>
									<small>{candidate.score.toFixed(3)}</small>
								</li>
							))}
						</ol>
					)}
				</div>

				<label className="search-control compact-search">
					<span>Find any word</span>
					<input
						type="search"
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						placeholder="Try music, city, science..."
						autoComplete="off"
					/>
				</label>

				<label className="range-control">
					<span>
						Visible words
						<strong>{visibleCount.toLocaleString()}</strong>
					</span>
					<input
						type="range"
						min="500"
						max={maxPointCount}
						step="500"
						value={visibleCount || DEFAULT_POINT_COUNT}
						onChange={handlePointCountChange}
						disabled={embeddings.length === 0}
					/>
				</label>

				<div className="focus-readout" aria-live="polite">
					<span>Focus</span>
					<strong>{focusedEmbedding?.word || 'Hover or search'}</strong>
					{searchTerm && !searchMatch && (
						<small>No visible match yet</small>
					)}
				</div>
			</section>

			{error && (
				<div className="error-banner" role="alert">
					<strong>Could not load embeddings.</strong>
					<span>{error.message}</span>
				</div>
			)}
		</main>

	)
}

export default EmbeddingViewer
