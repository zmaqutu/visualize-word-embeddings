import CartesianSpace from '../components/CartesianSpace';
import LoadingScreen from '../components/LoadingScreen';
import useWordEmbeddings from '../hooks/useWordEmbeddings';
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSpring, a } from '@react-spring/web';
import { buildVectorNorms, findWordMatch, solveAnalogy } from '../utils/vectorMath';

const DEFAULT_POINT_COUNT = 2500;
const DEFAULT_ANALOGY_LEFT = 'king';
const DEFAULT_ANALOGY_SUBTRACT = 'man';
const DEFAULT_ANALOGY_RIGHT = 'woman';

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

	const visibleCount = Math.min(pointCount, embeddings.length);
	const maxPointCount = Math.max(embeddings.length, DEFAULT_POINT_COUNT);
	const vectorNorms = useMemo(() => {
		return buildVectorNorms(vectorValues, vectorDimensions, embeddings.length);
	}, [embeddings.length, vectorDimensions, vectorValues]);

	const searchMatch = useMemo(() => {
		return findWordMatch(embeddings, searchTerm);
	}, [embeddings, searchTerm]);

	const analogyLeftMatch = useMemo(() => {
		return findWordMatch(embeddings, analogyLeft);
	}, [analogyLeft, embeddings]);

	const analogySubtractMatch = useMemo(() => {
		return findWordMatch(embeddings, analogySubtract);
	}, [analogySubtract, embeddings]);

	const analogyRightMatch = useMemo(() => {
		return findWordMatch(embeddings, analogyRight);
	}, [analogyRight, embeddings]);

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
	const analogyInputIds = useMemo(() => {
		return [analogyLeftMatch?.id, analogySubtractMatch?.id, analogyRightMatch?.id].filter(Number.isInteger);
	}, [analogyLeftMatch, analogyRightMatch, analogySubtractMatch]);

	const analogyIds = useMemo(() => {
		return [...analogyInputIds, analogyResult?.id].filter(Number.isInteger);
	}, [analogyInputIds, analogyResult]);

	const analogyLinks = useMemo(() => {
		if (!analogyResult) return [];

		return analogyRightMatch && analogyRightMatch.id !== analogyResult.id
			? [{ from: analogyRightMatch, to: analogyResult, variant: 'analogy' }]
			: [];
	}, [analogyResult, analogyRightMatch]);

	const focusedEmbedding = selectedEmbedding || searchMatch || hoveredEmbedding;
	const arithmeticExpression = `${analogyLeftMatch?.word || analogyLeft || '?'} - ${analogySubtractMatch?.word || analogySubtract || '?'} + ${analogyRightMatch?.word || analogyRight || '?'}`;

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

	const handlePointCountChange = (event) => {
		setPointCount(Number(event.target.value));
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
					onHover={setHoveredEmbedding}
					onSelect={setSelectedEmbedding}
				/>
			</Canvas>

			{analogyResult && (
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
					<div className="analogy-result">
						<small>{arithmeticExpression}</small>
						<strong>{analogyResult ? analogyResult.word : 'No result yet'}</strong>
						{analogyResult && (
							<em>{(analogyResult.score * 100).toFixed(1)}% cosine match</em>
						)}
					</div>
					{analogyResults.length > 0 && (
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
