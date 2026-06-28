import CartesianSpace from '../components/CartesianSpace';
import LoadingScreen from '../components/LoadingScreen';
import useWordEmbeddings from '../hooks/useWordEmbeddings';
import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpring, a, to } from '@react-spring/web';
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
const ANALOGY_PRESETS = [
	{
		id: 'royalty',
		label: 'royalty',
		left: 'king',
		subtract: 'man',
		right: 'woman',
	},
	{
		id: 'pronouns',
		label: 'pronouns',
		left: 'he',
		subtract: 'man',
		right: 'woman',
	},
	{
		id: 'roles',
		label: 'roles',
		left: 'actor',
		subtract: 'man',
		right: 'woman',
	},
	{
		id: 'comparative',
		label: 'comparative',
		left: 'bigger',
		subtract: 'big',
		right: 'small',
	},
	{
		id: 'geography',
		label: 'geography',
		left: 'japan',
		subtract: 'tokyo',
		right: 'paris',
	},
	{
		id: 'tempo',
		label: 'tempo',
		left: 'quick',
		subtract: 'quickly',
		right: 'slowly',
	},
];
const PRESENTATION_PHASES = [
	{ delay: 950, step: 1 },
	{ delay: 2600, step: 2 },
	{ delay: 4250, step: 3 },
	{ delay: 5900, step: 4 },
	{ delay: 7200, step: 5 },
];
const TUTORIAL_SLIDES = [
	{
		title: 'Change visible words',
		copy: 'Use the range control to bring more of the semantic cloud into view when you need a broader neighborhood.',
		preview: 'visible',
	},
	{
		title: 'Hover and select',
		copy: 'Move over a point to preview its label, then click to keep a word pinned while you inspect nearby terms.',
		preview: 'hover',
	},
	{
		title: 'Run vector arithmetic',
		copy: 'Enter exact words, press Calculate, and watch the trail build the analogy before revealing the nearest result.',
		preview: 'arithmetic',
	},
	{
		title: 'Find a word',
		copy: 'Search jumps straight to a word and expands the visible set when the match sits deeper in the vocabulary.',
		preview: 'search',
	},
];

function TutorialPreview({ type }) {
	if (type === 'visible') {
		return (
			<div className="tutorial-preview tutorial-preview-visible" aria-label="Visible words control screenshot">
				<div className="preview-panel-line">
					<span>Visible words</span>
					<strong>4,500</strong>
				</div>
				<div className="preview-slider">
					<span />
				</div>
				<div className="preview-cloud">
					<i />
					<i />
					<i />
					<i />
					<i />
					<i />
				</div>
			</div>
		);
	}

	if (type === 'hover') {
		return (
			<div className="tutorial-preview tutorial-preview-hover" aria-label="Hover and select word screenshot">
				<div className="preview-cloud">
					<i />
					<i className="is-selected" />
					<i />
					<i className="is-hovered" />
					<i />
				</div>
				<div className="preview-floating-label">science</div>
				<div className="preview-focus-chip">Focus: science</div>
			</div>
		);
	}

	if (type === 'arithmetic') {
		return (
			<div className="tutorial-preview tutorial-preview-arithmetic" aria-label="Vector arithmetic screenshot">
				<div className="preview-equation">
					<span>king</span>
					<b>-</b>
					<span>man</span>
					<b>+</b>
					<span>woman</span>
				</div>
				<div className="preview-trail">
					<i />
					<i />
					<i />
				</div>
				<div className="preview-result">queen</div>
			</div>
		);
	}

	return (
		<div className="tutorial-preview tutorial-preview-search" aria-label="Find a word screenshot">
			<div className="preview-search-box">music</div>
			<div className="preview-search-map">
				<i />
				<i />
				<i className="is-found" />
				<i />
			</div>
			<div className="preview-floating-label">music</div>
		</div>
	);
}

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
	const [visibleCandidateIds, setVisibleCandidateIds] = useState([]);
	const [isTutorialOpen, setIsTutorialOpen] = useState(true);
	const [tutorialSlide, setTutorialSlide] = useState(0);

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

	const analogyPresets = useMemo(() => {
		return ANALOGY_PRESETS.map((preset) => ({
			...preset,
			isAvailable: Boolean(
				findExactWordMatch(embeddings, preset.left)
				&& findExactWordMatch(embeddings, preset.subtract)
				&& findExactWordMatch(embeddings, preset.right)
			),
		}));
	}, [embeddings]);

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
	const similarCandidates = useMemo(() => {
		return analogyResults.slice(1, 5);
	}, [analogyResults]);
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
	const activePresetId = useMemo(() => {
		const normalizedExpression = [
			draftAnalogyLeftMatch?.word || analogyLeft,
			draftAnalogySubtractMatch?.word || analogySubtract,
			draftAnalogyRightMatch?.word || analogyRight,
		].map((word) => word.trim().toLowerCase());

		return ANALOGY_PRESETS.find((preset) => (
			preset.left === normalizedExpression[0]
			&& preset.subtract === normalizedExpression[1]
			&& preset.right === normalizedExpression[2]
		))?.id || null;
	}, [
		analogyLeft,
		analogyRight,
		analogySubtract,
		draftAnalogyLeftMatch,
		draftAnalogyRightMatch,
		draftAnalogySubtractMatch,
	]);
	const analogyExplanation = useMemo(() => {
		if (!analogyResult || !analogyLeftMatch || !analogySubtractMatch || !analogyRightMatch) return '';

		return `The direction from ${analogySubtractMatch.word} to ${analogyRightMatch.word} is applied to ${analogyLeftMatch.word}. ${analogyResult.word} is the nearest word to that new vector.`;
	}, [analogyLeftMatch, analogyResult, analogyRightMatch, analogySubtractMatch]);
	const handleTutorialClose = useCallback(() => {
		setIsTutorialOpen(false);
	}, []);
	const handleTutorialOpen = useCallback(() => {
		setIsTutorialOpen(true);
	}, []);
	const handleTutorialLauncherKeyDown = useCallback((event) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleTutorialOpen();
		}
	}, [handleTutorialOpen]);
	const handlePreviousTutorialSlide = () => {
		setTutorialSlide((currentSlide) => (
			currentSlide === 0 ? TUTORIAL_SLIDES.length - 1 : currentSlide - 1
		));
	};
	const handleNextTutorialSlide = () => {
		setTutorialSlide((currentSlide) => (
			currentSlide === TUTORIAL_SLIDES.length - 1 ? 0 : currentSlide + 1
		));
	};
	const activeTutorialSlide = TUTORIAL_SLIDES[tutorialSlide];

	const loaderProps = useSpring({
		opacity: loading ? 1 : 0,
		transform: loading ? 'translateY(0%)' : 'translateY(-100%)',
		config: { tension: 170, friction: 26 },
	});
	const tutorialCardProps = useSpring({
		x: isTutorialOpen ? 0 : 43,
		y: isTutorialOpen ? 0 : -42,
		scale: 1,
		rotate: isTutorialOpen ? 0 : 8,
		config: isTutorialOpen
			? { tension: 190, friction: 22 }
			: { tension: 210, friction: 26, clamp: true },
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
		const maxCandidateId = Math.max(...visibleCandidateIds, -1);
		const maxNeededId = Math.max(maxActiveId, maxCandidateId);
		if (maxNeededId < pointCount) return;

		const nextCount = Math.min(
			embeddings.length,
			Math.ceil((maxNeededId + 1) / 500) * 500,
		);
		setPointCount(nextCount);
	}, [analogyIds, embeddings.length, pointCount, visibleCandidateIds]);

	useEffect(() => {
		if (!analogyResult) return undefined;

		const timeoutIds = PRESENTATION_PHASES.map(({ delay, step }) => (
			window.setTimeout(() => setPresentationStep(step), delay)
		));

		return () => {
			timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
		};
	}, [analogyResult, presentationRunId]);

	useEffect(() => {
		if (!isTutorialOpen) return undefined;

		const handleKeyDown = (event) => {
			if (event.key === 'Escape') {
				handleTutorialClose();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleTutorialClose, isTutorialOpen]);

	const handlePointCountChange = (event) => {
		setPointCount(Number(event.target.value));
	};

	const presentAnalogy = (leftMatch, subtractMatch, rightMatch) => {
		setCalculatedAnalogy({
			left: leftMatch.word,
			subtract: subtractMatch.word,
			right: rightMatch.word,
		});
		setVisibleCandidateIds([]);
		setPresentationStep(0);
		setPresentationRunId((currentRunId) => currentRunId + 1);
		setHoveredEmbedding(null);
		setSelectedEmbedding(null);
	};

	const handleCalculateAnalogy = () => {
		if (!canCalculateAnalogy) return;

		presentAnalogy(draftAnalogyLeftMatch, draftAnalogySubtractMatch, draftAnalogyRightMatch);
	};

	const handlePresetSelect = (preset) => {
		setAnalogyLeft(preset.left);
		setAnalogySubtract(preset.subtract);
		setAnalogyRight(preset.right);

		const presetLeftMatch = findExactWordMatch(embeddings, preset.left);
		const presetSubtractMatch = findExactWordMatch(embeddings, preset.subtract);
		const presetRightMatch = findExactWordMatch(embeddings, preset.right);

		if (presetLeftMatch && presetSubtractMatch && presetRightMatch) {
			presentAnalogy(presetLeftMatch, presetSubtractMatch, presetRightMatch);
			return;
		}

		setCalculatedAnalogy(null);
		setVisibleCandidateIds([]);
		setPresentationStep(0);
		setPresentationRunId((currentRunId) => currentRunId + 1);
	};

	const handleCandidateToggle = (candidateId) => {
		setVisibleCandidateIds((currentIds) => (
			currentIds.includes(candidateId)
				? currentIds.filter((id) => id !== candidateId)
				: [...currentIds, candidateId]
		));
	};

	const handleClear = () => {
		setAnalogyLeft('');
		setAnalogySubtract('');
		setAnalogyRight('');
		setCalculatedAnalogy(null);
		setVisibleCandidateIds([]);
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
					visibleCandidateIds={visibleCandidateIds}
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

			{!showLoader && (
				<a.div
					className={`tutorial-backdrop ${isTutorialOpen ? 'is-open' : 'is-docked'}`}
					aria-hidden={!isTutorialOpen}
				>
					<a.div
						className={`tutorial-modal ${isTutorialOpen ? 'is-open' : 'is-collapsed'}`}
						style={{
							transform: to(
								[
									tutorialCardProps.x,
									tutorialCardProps.y,
									tutorialCardProps.scale,
									tutorialCardProps.rotate,
								],
								(x, y, scale, rotate) => `translate3d(${x}vw, ${y}vh, 0) scale(${scale}) rotate(${rotate}deg)`,
							),
						}}
						role={isTutorialOpen ? 'dialog' : 'button'}
						aria-modal={isTutorialOpen ? 'true' : undefined}
						aria-labelledby={isTutorialOpen ? 'tutorial-title' : undefined}
						aria-label={isTutorialOpen ? undefined : 'Open tutorial'}
						tabIndex={isTutorialOpen ? undefined : 0}
						onClick={isTutorialOpen ? undefined : handleTutorialOpen}
						onKeyDown={isTutorialOpen ? undefined : handleTutorialLauncherKeyDown}
					>
						{isTutorialOpen ? (
							<>
								<div className="tutorial-modal-header">
									<span>Quick tour</span>
									<button
										className="tutorial-close-button"
										type="button"
										onClick={handleTutorialClose}
										aria-label="Close tutorial"
									>
										X
									</button>
								</div>
								<div className="tutorial-carousel">
									<TutorialPreview type={activeTutorialSlide.preview} />
									<div className="tutorial-copy">
										<small>
											{tutorialSlide + 1}
											/
											{TUTORIAL_SLIDES.length}
										</small>
										<h2 id="tutorial-title">{activeTutorialSlide.title}</h2>
										<p>{activeTutorialSlide.copy}</p>
									</div>
								</div>
								<div className="tutorial-carousel-controls" aria-label="Tutorial slides">
									<button
										className="tutorial-secondary-button"
										type="button"
										onClick={handlePreviousTutorialSlide}
									>
										Previous
									</button>
									<div className="tutorial-dots">
										{TUTORIAL_SLIDES.map((slide, index) => (
											<button
												key={slide.title}
												type="button"
												className={index === tutorialSlide ? 'is-active' : ''}
												onClick={() => setTutorialSlide(index)}
												aria-label={`Show ${slide.title}`}
											/>
										))}
									</div>
									<button
										className="tutorial-primary-button"
										type="button"
										onClick={handleNextTutorialSlide}
									>
										Next
									</button>
								</div>
							</>
						) : (
							<div className="tutorial-launch-glyph" aria-hidden="true">
								?
							</div>
						)}
					</a.div>
				</a.div>
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
					<div className="preset-drawer">
						<span>Relationship presets</span>
						<div className="preset-grid">
							{analogyPresets.map((preset) => (
								<button
									key={preset.id}
									className={activePresetId === preset.id ? 'is-active' : ''}
									type="button"
									onClick={() => handlePresetSelect(preset)}
									disabled={!preset.isAvailable || isPresentingAnalogy}
									title={`${preset.left} - ${preset.subtract} + ${preset.right}`}
								>
									<strong>{preset.label}</strong>
									<small>
										{preset.left}
										{' - '}
										{preset.subtract}
										{' + '}
										{preset.right}
									</small>
								</button>
							))}
						</div>
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
					{shouldRevealAnalogyResult && analogyExplanation && (
						<div className="analogy-explanation">
							<span>Explain mode</span>
							<p>{analogyExplanation}</p>
						</div>
					)}
					{isAnalogyPresentationDone && analogyResults.length > 0 && (
						<ol className="analogy-candidates">
							<li className="is-answer" key={analogyResult.id}>
								<span>{analogyResult.word}</span>
								<small>{analogyResult.score.toFixed(3)}</small>
							</li>
							{similarCandidates.map((candidate) => (
								<li key={candidate.id}>
									<button
										className="candidate-switch"
										type="button"
										role="switch"
										aria-checked={visibleCandidateIds.includes(candidate.id)}
										onClick={() => handleCandidateToggle(candidate.id)}
									>
										<span className="candidate-switch-track" aria-hidden="true" />
										<strong>{candidate.word}</strong>
									</button>
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
