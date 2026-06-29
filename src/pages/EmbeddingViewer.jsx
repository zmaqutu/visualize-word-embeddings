import CartesianSpace from '../components/CartesianSpace';
import LoadingScreen from '../components/LoadingScreen';
import useWordEmbeddings from '../hooks/useWordEmbeddings';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpring, a, to } from '@react-spring/web';
import {
	buildProjectionModel,
	buildVectorNorms,
	cosineSimilarity,
	findExactWordMatch,
	findNearestNeighbors,
	findSemanticPath,
	findWordMatch,
	getVector,
	projectVector,
	solveAnalogy,
} from '../utils/vectorMath';

const DEFAULT_POINT_COUNT = 2500;
const DEFAULT_ANALOGY_LEFT = 'king';
const DEFAULT_ANALOGY_SUBTRACT = 'man';
const DEFAULT_ANALOGY_RIGHT = 'woman';
const DEFAULT_COMPARE_LEFT = 'king';
const DEFAULT_COMPARE_RIGHT = 'queen';
const DEFAULT_PATH_START = 'music';
const DEFAULT_PATH_END = 'art';
const PATH_PRESETS = [
	{ id: 'creative', label: 'creative', start: 'music', end: 'art' },
	{ id: 'royalty-path', label: 'royalty', start: 'king', end: 'queen' },
	{ id: 'places', label: 'places', start: 'city', end: 'village' },
	{ id: 'conflict', label: 'conflict', start: 'war', end: 'peace' },
	{ id: 'technology', label: 'technology', start: 'computer', end: 'internet' },
	{ id: 'campus', label: 'campus', start: 'school', end: 'university' },
];
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
const PATH_REVEAL_PHASES = [
	{ delay: 450, step: 2 },
	{ delay: 1850, step: 3 },
	{ delay: 3250, step: 4 },
	{ delay: 4650, step: 5 },
];
const TUTORIAL_SLIDES = [
	{
		title: 'Change visible words',
		copy: 'Use the range control to bring more of the semantic cloud into view when you need a broader neighborhood.',
		preview: 'visible',
	},
	{
		title: 'Find any word',
		copy: 'Search jumps straight to a word and expands the visible set when the match sits deeper in the vocabulary.',
		preview: 'search',
	},
	{
		title: 'Hover and select',
		copy: 'Move over a point to preview its label, then click to open the Word Inspector with neighbors and shortcuts into each tool.',
		preview: 'hover',
	},
	{
		title: 'Start with presets',
		copy: 'Use the preset chips when you want a reliable example before typing your own words into the same controls.',
		preview: 'presets',
	},
	{
		title: 'Compare two words',
		copy: 'Switch to Compare, calculate a relationship, and inspect shared neighbors alongside the words that pull each side apart.',
		preview: 'compare',
	},
	{
		title: 'Run vector arithmetic',
		copy: 'Enter exact words, press Calculate, and watch the trail build the analogy before revealing the nearest result.',
		preview: 'arithmetic',
	},
	{
		title: 'Trace semantic paths',
		copy: 'Path mode draws a bridge between two words, revealing intermediate concepts one step at a time.',
		preview: 'path',
	},
	{
		title: 'Scrub the story',
		copy: 'After a calculation, use the timeline controls and Semantic Story panel to replay the animation and understand the result.',
		preview: 'timeline',
	},
];

const formatWordList = (words) => {
	if (words.length <= 1) return words.join('');
	if (words.length === 2) return `${words[0]} and ${words[1]}`;
	return `${words.slice(0, -1).join(', ')}, and ${words[words.length - 1]}`;
};

function InsightPanel({ insight }) {
	if (!insight) return null;

	return (
		<aside className={`insight-panel ${insight.variant ? `insight-${insight.variant}` : ''}`} aria-label="Semantic insight">
			<div className="insight-header">
				<span>Semantic story</span>
				<strong>{insight.title}</strong>
			</div>
			<p className="insight-summary">{insight.summary}</p>
			<div className="insight-grid">
				{insight.metrics.map((metric) => (
					<div key={metric.label} className="insight-metric">
						<span>{metric.label}</span>
						<strong>{metric.value}</strong>
					</div>
				))}
			</div>
			{insight.sections.map((section) => (
				<div className="insight-section" key={section.title}>
					<span>{section.title}</span>
					<p>{section.body}</p>
				</div>
			))}
			<div className="insight-note">
				<span>Model note</span>
				<p>{insight.note}</p>
			</div>
		</aside>
	);
}

function WordInspector({ embedding, neighbors, onClose, onUseWord, onSelectNeighbor }) {
	if (!embedding) return null;

	return (
		<aside className="word-inspector" aria-label="Word inspector">
			<div className="word-inspector-header">
				<div>
					<span>Word inspector</span>
					<strong>{embedding.word}</strong>
				</div>
				<button type="button" onClick={onClose} aria-label="Close word inspector">X</button>
			</div>
			<div className="word-inspector-metrics">
				<div>
					<span>Index</span>
					<strong>{embedding.id.toLocaleString()}</strong>
				</div>
				<div>
					<span>Visible</span>
					<strong>{embedding.reducedVector ? 'Yes' : 'No'}</strong>
				</div>
			</div>
			<div className="word-action-grid">
				<button type="button" onClick={() => onUseWord('compare-left', embedding.word)}>Compare A</button>
				<button type="button" onClick={() => onUseWord('compare-right', embedding.word)}>Compare B</button>
				<button type="button" onClick={() => onUseWord('path-start', embedding.word)}>Path start</button>
				<button type="button" onClick={() => onUseWord('path-end', embedding.word)}>Path end</button>
				<button type="button" onClick={() => onUseWord('analogy-left', embedding.word)}>+ first</button>
				<button type="button" onClick={() => onUseWord('analogy-subtract', embedding.word)}>- subtract</button>
				<button type="button" onClick={() => onUseWord('analogy-right', embedding.word)}>+ second</button>
			</div>
			<div className="word-neighbors">
				<span>Nearest words</span>
				{neighbors.length > 0 ? (
					<ol>
						{neighbors.map((neighbor) => (
							<li key={neighbor.id}>
								<button type="button" onClick={() => onSelectNeighbor(neighbor)}>
									<strong>{neighbor.word}</strong>
									<small>{neighbor.score.toFixed(3)}</small>
								</button>
							</li>
						))}
					</ol>
				) : (
					<p>No neighbors available yet.</p>
				)}
			</div>
		</aside>
	);
}

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

	if (type === 'presets') {
		return (
			<div className="tutorial-preview tutorial-preview-presets" aria-label="Preset examples screenshot">
				<div className="preview-mode-tabs">
					<span className="is-active">Arithmetic</span>
					<span>Compare</span>
					<span>Path</span>
				</div>
				<div className="preview-preset-grid">
					<span>royalty</span>
					<span>pronouns</span>
					<span>geography</span>
					<span>tempo</span>
				</div>
			</div>
		);
	}

	if (type === 'compare') {
		return (
			<div className="tutorial-preview tutorial-preview-compare" aria-label="Compare words screenshot">
				<div className="preview-compare-words">
					<span>king</span>
					<b>69%</b>
					<span>queen</span>
				</div>
				<div className="preview-venn">
					<i />
					<i />
					<strong>royal</strong>
				</div>
			</div>
		);
	}

	if (type === 'path') {
		return (
			<div className="tutorial-preview tutorial-preview-path" aria-label="Semantic path screenshot">
				<div className="preview-path-line">
					<span>music</span>
					<i />
					<i />
					<strong>art</strong>
				</div>
				<div className="preview-path-labels">
					<span>song</span>
					<span>design</span>
				</div>
			</div>
		);
	}

	if (type === 'timeline') {
		return (
			<div className="tutorial-preview tutorial-preview-timeline" aria-label="Timeline and semantic story screenshot">
				<div className="preview-timeline-card">
					<span>Semantic story</span>
					<strong>king - man + woman</strong>
					<p>Nearest landing point: queen</p>
				</div>
				<div className="preview-scrubber">
					<i />
					<i />
					<i className="is-active" />
					<i />
				</div>
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
	const [activeMode, setActiveMode] = useState('arithmetic');
	const [analogyLeft, setAnalogyLeft] = useState(DEFAULT_ANALOGY_LEFT);
	const [analogySubtract, setAnalogySubtract] = useState(DEFAULT_ANALOGY_SUBTRACT);
	const [analogyRight, setAnalogyRight] = useState(DEFAULT_ANALOGY_RIGHT);
	const [calculatedAnalogy, setCalculatedAnalogy] = useState(null);
	const [compareLeft, setCompareLeft] = useState(DEFAULT_COMPARE_LEFT);
	const [compareRight, setCompareRight] = useState(DEFAULT_COMPARE_RIGHT);
	const [calculatedCompare, setCalculatedCompare] = useState(null);
	const [pathStart, setPathStart] = useState(DEFAULT_PATH_START);
	const [pathEnd, setPathEnd] = useState(DEFAULT_PATH_END);
	const [calculatedPath, setCalculatedPath] = useState(null);
	const [presentationRunId, setPresentationRunId] = useState(0);
	const [presentationStep, setPresentationStep] = useState(0);
	const [pathRevealStep, setPathRevealStep] = useState(0);
	const [timelinePlayback, setTimelinePlayback] = useState('auto');
	const [visibleCandidateIds, setVisibleCandidateIds] = useState([]);
	const [visibleCompareNeighborIds, setVisibleCompareNeighborIds] = useState([]);
	const [isTutorialOpen, setIsTutorialOpen] = useState(true);
	const [hasStartedExperience, setHasStartedExperience] = useState(false);
	const [tutorialSlide, setTutorialSlide] = useState(0);
	const [shareStatus, setShareStatus] = useState('');
	const [isIntroOrbiting, setIsIntroOrbiting] = useState(true);
	const hasAppliedSharedView = useRef(false);

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

	const draftCompareLeftMatch = useMemo(() => {
		return findExactWordMatch(embeddings, compareLeft);
	}, [compareLeft, embeddings]);

	const draftCompareRightMatch = useMemo(() => {
		return findExactWordMatch(embeddings, compareRight);
	}, [compareRight, embeddings]);

	const draftPathStartMatch = useMemo(() => {
		return findExactWordMatch(embeddings, pathStart);
	}, [embeddings, pathStart]);

	const draftPathEndMatch = useMemo(() => {
		return findExactWordMatch(embeddings, pathEnd);
	}, [embeddings, pathEnd]);

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

	const pathPresets = useMemo(() => {
		return PATH_PRESETS.map((preset) => ({
			...preset,
			isAvailable: Boolean(
				findExactWordMatch(embeddings, preset.start)
				&& findExactWordMatch(embeddings, preset.end)
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

	const compareLeftMatch = useMemo(() => {
		return calculatedCompare ? findExactWordMatch(embeddings, calculatedCompare.left) : null;
	}, [calculatedCompare, embeddings]);

	const compareRightMatch = useMemo(() => {
		return calculatedCompare ? findExactWordMatch(embeddings, calculatedCompare.right) : null;
	}, [calculatedCompare, embeddings]);

	const pathStartMatch = useMemo(() => {
		return calculatedPath ? findExactWordMatch(embeddings, calculatedPath.start) : null;
	}, [calculatedPath, embeddings]);

	const pathEndMatch = useMemo(() => {
		return calculatedPath ? findExactWordMatch(embeddings, calculatedPath.end) : null;
	}, [calculatedPath, embeddings]);

	const canCalculateAnalogy = Boolean(
		draftAnalogyLeftMatch
		&& draftAnalogySubtractMatch
		&& draftAnalogyRightMatch
		&& vectorValues
		&& vectorNorms.length > 0,
	);

	const canCompareWords = Boolean(
		draftCompareLeftMatch
		&& draftCompareRightMatch
		&& draftCompareLeftMatch.id !== draftCompareRightMatch.id
		&& vectorValues
		&& vectorNorms.length > 0,
	);

	const canFindPath = Boolean(
		draftPathStartMatch
		&& draftPathEndMatch
		&& draftPathStartMatch.id !== draftPathEndMatch.id
		&& vectorValues
		&& vectorNorms.length > 0,
	);

	const hasPendingAnalogyChanges = calculatedAnalogy
		&& (
			calculatedAnalogy.left !== draftAnalogyLeftMatch?.word
			|| calculatedAnalogy.subtract !== draftAnalogySubtractMatch?.word
			|| calculatedAnalogy.right !== draftAnalogyRightMatch?.word
		);

	const hasPendingCompareChanges = calculatedCompare
		&& (
			calculatedCompare.left !== draftCompareLeftMatch?.word
			|| calculatedCompare.right !== draftCompareRightMatch?.word
		);

	const hasPendingPathChanges = calculatedPath
		&& (
			calculatedPath.start !== draftPathStartMatch?.word
			|| calculatedPath.end !== draftPathEndMatch?.word
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

	const compareLeftNeighbors = useMemo(() => {
		return findNearestNeighbors({
			embedding: compareLeftMatch,
			embeddings,
			vectorValues,
			vectorDimensions,
			vectorNorms,
			limit: 14,
			excludeIds: [compareRightMatch?.id].filter(Number.isInteger),
		});
	}, [compareLeftMatch, compareRightMatch, embeddings, vectorDimensions, vectorNorms, vectorValues]);

	const compareRightNeighbors = useMemo(() => {
		return findNearestNeighbors({
			embedding: compareRightMatch,
			embeddings,
			vectorValues,
			vectorDimensions,
			vectorNorms,
			limit: 14,
			excludeIds: [compareLeftMatch?.id].filter(Number.isInteger),
		});
	}, [compareLeftMatch, compareRightMatch, embeddings, vectorDimensions, vectorNorms, vectorValues]);

	const compareSharedNeighbors = useMemo(() => {
		const rightNeighborIds = new Set(compareRightNeighbors.map((neighbor) => neighbor.id));
		return compareLeftNeighbors
			.filter((neighbor) => rightNeighborIds.has(neighbor.id))
			.slice(0, 4);
	}, [compareLeftNeighbors, compareRightNeighbors]);

	const compareUniqueLeftNeighbors = useMemo(() => {
		const rightNeighborIds = new Set(compareRightNeighbors.map((neighbor) => neighbor.id));
		return compareLeftNeighbors
			.filter((neighbor) => !rightNeighborIds.has(neighbor.id))
			.slice(0, 4);
	}, [compareLeftNeighbors, compareRightNeighbors]);

	const compareUniqueRightNeighbors = useMemo(() => {
		const leftNeighborIds = new Set(compareLeftNeighbors.map((neighbor) => neighbor.id));
		return compareRightNeighbors
			.filter((neighbor) => !leftNeighborIds.has(neighbor.id))
			.slice(0, 4);
	}, [compareLeftNeighbors, compareRightNeighbors]);

	const compareScore = useMemo(() => {
		return cosineSimilarity(compareLeftMatch, compareRightMatch, vectorValues, vectorDimensions, vectorNorms);
	}, [compareLeftMatch, compareRightMatch, vectorDimensions, vectorNorms, vectorValues]);

	const compareWordIds = useMemo(() => {
		return [compareLeftMatch?.id, compareRightMatch?.id].filter(Number.isInteger);
	}, [compareLeftMatch, compareRightMatch]);

	const compareLinks = useMemo(() => {
		if (!compareLeftMatch || !compareRightMatch) return [];

		return [{
			from: compareLeftMatch,
			to: compareRightMatch,
			label: `${compareLeftMatch.word} -> ${compareRightMatch.word}`,
			variant: 'compare',
		}];
	}, [compareLeftMatch, compareRightMatch]);

	const semanticPath = useMemo(() => {
		return findSemanticPath({
			start: pathStartMatch,
			end: pathEndMatch,
			embeddings,
			vectorValues,
			vectorDimensions,
			vectorNorms,
			bridgeCount: 3,
		});
	}, [embeddings, pathEndMatch, pathStartMatch, vectorDimensions, vectorNorms, vectorValues]);

	const pathWordIds = useMemo(() => {
		return semanticPath.map((embedding) => embedding.id);
	}, [semanticPath]);

	const pathLinks = useMemo(() => {
		return semanticPath.slice(0, -1).map((from, index) => ({
			from,
			to: semanticPath[index + 1],
			label: `${index + 1}`,
			variant: 'path',
		}));
	}, [semanticPath]);

	const revealedPathWordIds = useMemo(() => {
		return pathWordIds.slice(0, Math.min(pathRevealStep, pathWordIds.length));
	}, [pathRevealStep, pathWordIds]);

	const revealedPathLinks = useMemo(() => {
		return pathLinks.slice(0, Math.max(0, Math.min(pathRevealStep - 1, pathLinks.length)));
	}, [pathLinks, pathRevealStep]);

	const revealedSemanticPath = useMemo(() => {
		return semanticPath.slice(0, Math.min(pathRevealStep, semanticPath.length));
	}, [pathRevealStep, semanticPath]);

	const focusedEmbedding = selectedEmbedding || searchMatch || hoveredEmbedding;
	const arithmeticExpression = `${analogyLeftMatch?.word || analogyLeft || '?'} - ${analogySubtractMatch?.word || analogySubtract || '?'} + ${analogyRightMatch?.word || analogyRight || '?'}`;
	const draftArithmeticExpression = `${draftAnalogyLeftMatch?.word || analogyLeft || '?'} - ${draftAnalogySubtractMatch?.word || analogySubtract || '?'} + ${draftAnalogyRightMatch?.word || analogyRight || '?'}`;
	const compareExpression = `${compareLeftMatch?.word || compareLeft || '?'} -> ${compareRightMatch?.word || compareRight || '?'}`;
	const pathExpression = semanticPath.length > 0
		? semanticPath.map((embedding) => embedding.word).join(' -> ')
		: `${pathStartMatch?.word || pathStart || '?'} -> ${pathEndMatch?.word || pathEnd || '?'}`;
	const revealedPathExpression = revealedSemanticPath.length > 0
		? revealedSemanticPath.map((embedding) => embedding.word).join(' -> ')
		: `${pathStartMatch?.word || pathStart || '?'} -> ${pathEndMatch?.word || pathEnd || '?'}`;
	const inspectorEmbedding = selectedEmbedding || searchMatch;
	const inspectorNeighbors = useMemo(() => {
		return findNearestNeighbors({
			embedding: inspectorEmbedding,
			embeddings,
			vectorValues,
			vectorDimensions,
			vectorNorms,
			limit: 6,
		});
	}, [embeddings, inspectorEmbedding, vectorDimensions, vectorNorms, vectorValues]);
	const shareUrl = useMemo(() => {
		if (typeof window === 'undefined') return '';

		const params = new URLSearchParams();
		params.set('mode', activeMode);
		params.set('count', String(visibleCount || DEFAULT_POINT_COUNT));

		if (searchTerm.trim()) {
			params.set('q', searchTerm.trim());
		} else if (selectedEmbedding?.word) {
			params.set('q', selectedEmbedding.word);
		}

		if (activeMode === 'arithmetic') {
			params.set('a', calculatedAnalogy?.left || draftAnalogyLeftMatch?.word || analogyLeft);
			params.set('sub', calculatedAnalogy?.subtract || draftAnalogySubtractMatch?.word || analogySubtract);
			params.set('b', calculatedAnalogy?.right || draftAnalogyRightMatch?.word || analogyRight);
			if (calculatedAnalogy) params.set('calc', '1');
		} else if (activeMode === 'compare') {
			params.set('left', calculatedCompare?.left || draftCompareLeftMatch?.word || compareLeft);
			params.set('right', calculatedCompare?.right || draftCompareRightMatch?.word || compareRight);
			if (calculatedCompare) params.set('calc', '1');
		} else if (activeMode === 'path') {
			params.set('start', calculatedPath?.start || draftPathStartMatch?.word || pathStart);
			params.set('end', calculatedPath?.end || draftPathEndMatch?.word || pathEnd);
			if (calculatedPath) params.set('calc', '1');
		}

		const url = new URL(window.location.href);
		url.search = params.toString();
		return url.toString();
	}, [
		activeMode,
		analogyLeft,
		analogyRight,
		analogySubtract,
		calculatedAnalogy,
		calculatedCompare,
		calculatedPath,
		compareLeft,
		compareRight,
		draftAnalogyLeftMatch,
		draftAnalogyRightMatch,
		draftAnalogySubtractMatch,
		draftCompareLeftMatch,
		draftCompareRightMatch,
		draftPathEndMatch,
		draftPathStartMatch,
		pathEnd,
		pathStart,
		searchTerm,
		selectedEmbedding,
		visibleCount,
	]);
	const isPathRevealDone = Boolean(calculatedPath && semanticPath.length > 1 && pathRevealStep >= semanticPath.length);
	const arithmeticTimelineSteps = useMemo(() => {
		if (!analogyResult || !analogyLeftMatch || !analogySubtractMatch || !analogyRightMatch) return [];

		return [
			'Ready',
			`+ ${analogyLeftMatch.word}`,
			`- ${analogySubtractMatch.word}`,
			`+ ${analogyRightMatch.word}`,
			`nearest ${analogyResult.word}`,
			'candidates',
		];
	}, [analogyLeftMatch, analogyResult, analogyRightMatch, analogySubtractMatch]);
	const pathTimelineSteps = useMemo(() => {
		if (!calculatedPath || semanticPath.length === 0) return [];

		return semanticPath.map((embedding, index) => (
			index === 0 ? `start ${embedding.word}` : embedding.word
		));
	}, [calculatedPath, semanticPath]);
	const activeTimeline = activeMode === 'arithmetic' && analogyResult
		? {
			mode: 'arithmetic',
			value: presentationStep,
			min: 0,
			max: Math.max(0, arithmeticTimelineSteps.length - 1),
			steps: arithmeticTimelineSteps,
			currentLabel: arithmeticTimelineSteps[presentationStep] || 'Ready',
		}
		: activeMode === 'path' && calculatedPath && semanticPath.length > 0
			? {
				mode: 'path',
				value: pathRevealStep,
				min: 1,
				max: semanticPath.length,
				steps: pathTimelineSteps,
				currentLabel: pathTimelineSteps[Math.max(0, pathRevealStep - 1)] || 'Start',
			}
			: null;
	const activePathPresetId = useMemo(() => {
		const normalizedStart = (draftPathStartMatch?.word || pathStart).trim().toLowerCase();
		const normalizedEnd = (draftPathEndMatch?.word || pathEnd).trim().toLowerCase();

		return PATH_PRESETS.find((preset) => (
			preset.start === normalizedStart && preset.end === normalizedEnd
		))?.id || null;
	}, [draftPathEndMatch, draftPathStartMatch, pathEnd, pathStart]);
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
	const compareExplanation = useMemo(() => {
		if (!compareLeftMatch || !compareRightMatch) return '';

		const sharedWords = compareSharedNeighbors.map((neighbor) => neighbor.word).join(', ');
		const similarityPercent = Math.max(0, compareScore * 100).toFixed(1);

		if (sharedWords) {
			return `${compareLeftMatch.word} and ${compareRightMatch.word} share ${sharedWords} in their nearby neighborhoods, with a ${similarityPercent}% cosine similarity.`;
		}

		return `${compareLeftMatch.word} and ${compareRightMatch.word} have a ${similarityPercent}% cosine similarity, but their closest visible neighborhoods separate quickly.`;
	}, [compareLeftMatch, compareRightMatch, compareScore, compareSharedNeighbors]);
	const pathExplanation = useMemo(() => {
		if (semanticPath.length < 2) return '';

		const bridges = semanticPath.slice(1, -1).map((embedding) => embedding.word);
		if (bridges.length === 0) {
			return `${semanticPath[0].word} connects directly to ${semanticPath[semanticPath.length - 1].word}.`;
		}

		return `${semanticPath[0].word} reaches ${semanticPath[semanticPath.length - 1].word} through ${bridges.join(', ')}, chosen from words nearest to points along the vector between them.`;
	}, [semanticPath]);
	const activeInsight = useMemo(() => {
		if (
			activeMode === 'arithmetic'
			&& analogyResult
			&& analogyLeftMatch
			&& analogySubtractMatch
			&& analogyRightMatch
		) {
			const alternatives = similarCandidates.map((candidate) => candidate.word);
			const evidenceWords = [analogyResult.word, ...alternatives.slice(0, 3)];
			const score = `${(analogyResult.score * 100).toFixed(1)}%`;

			return {
				variant: 'arithmetic',
				title: `${analogyLeftMatch.word} - ${analogySubtractMatch.word} + ${analogyRightMatch.word}`,
				summary: `This applies the direction from ${analogySubtractMatch.word} to ${analogyRightMatch.word} onto ${analogyLeftMatch.word}. The nearest landing point is ${analogyResult.word}.`,
				metrics: [
					{ label: 'Result', value: analogyResult.word },
					{ label: 'Match', value: score },
				],
				sections: [
					{
						title: 'What changed',
						body: `${analogySubtractMatch.word} is subtracted away from ${analogyLeftMatch.word}, then ${analogyRightMatch.word} is added back in. The resulting vector moves toward ${analogyResult.word}.`,
					},
					{
						title: 'Evidence nearby',
						body: evidenceWords.length > 1
							? `${formatWordList(evidenceWords)} sit close to the target, which gives the result its semantic support.`
							: `${analogyResult.word} is the closest available word to the target vector.`,
					},
				],
				note: 'Embeddings reflect patterns in the training text, so strong-looking relationships can also encode cultural bias, frequency effects, or dataset quirks.',
			};
		}

		if (activeMode === 'compare' && calculatedCompare && compareLeftMatch && compareRightMatch) {
			const sharedWords = compareSharedNeighbors.map((neighbor) => neighbor.word);
			const leftWords = compareUniqueLeftNeighbors.map((neighbor) => neighbor.word);
			const rightWords = compareUniqueRightNeighbors.map((neighbor) => neighbor.word);
			const score = `${(Math.max(0, compareScore) * 100).toFixed(1)}%`;

			return {
				variant: 'compare',
				title: `${compareLeftMatch.word} -> ${compareRightMatch.word}`,
				summary: `${compareLeftMatch.word} and ${compareRightMatch.word} are ${score} similar by cosine distance, but their local neighborhoods reveal where the meanings separate.`,
				metrics: [
					{ label: 'Similarity', value: score },
					{ label: 'Shared', value: `${sharedWords.length}` },
				],
				sections: [
					{
						title: 'Shared neighborhood',
						body: sharedWords.length > 0
							? `Both words sit near ${formatWordList(sharedWords)}, which anchors their common semantic territory.`
							: 'Their strongest nearest-neighbor lists do not overlap in the visible top results.',
					},
					{
						title: `${compareLeftMatch.word} leans toward`,
						body: leftWords.length > 0
							? formatWordList(leftWords)
							: 'No unique left-side neighbors are available in the current result set.',
					},
					{
						title: `${compareRightMatch.word} leans toward`,
						body: rightWords.length > 0
							? formatWordList(rightWords)
							: 'No unique right-side neighbors are available in the current result set.',
					},
				],
				note: 'Similarity is geometric, not explanatory by itself. The neighbor lists are evidence, but not a definitive definition of either word.',
			};
		}

		if (activeMode === 'path' && calculatedPath && semanticPath.length > 1) {
			const start = semanticPath[0];
			const end = semanticPath[semanticPath.length - 1];
			const bridges = semanticPath.slice(1, -1).map((embedding) => embedding.word);
			const revealedWords = revealedSemanticPath.map((embedding) => embedding.word);

			return {
				variant: 'path',
				title: `${start.word} -> ${end.word}`,
				summary: `${start.word} reaches ${end.word} through ${bridges.length > 0 ? formatWordList(bridges) : 'a direct semantic jump'}.`,
				metrics: [
					{ label: 'Steps', value: `${semanticPath.length - 1}` },
					{ label: 'Visible', value: `${revealedSemanticPath.length}/${semanticPath.length}` },
				],
				sections: [
					{
						title: 'Current route',
						body: revealedWords.length > 0
							? revealedWords.join(' -> ')
							: `${start.word}`,
					},
					{
						title: 'How bridges are chosen',
						body: 'Each bridge is the nearest word to a point sampled between the start and end vectors, creating a readable semantic route through the space.',
					},
				],
				note: 'A path is one plausible route through the geometry, not the only route. Different bridge counts or vocabularies can produce different stories.',
			};
		}

		return null;
	}, [
		activeMode,
		analogyLeftMatch,
		analogyResult,
		analogyRightMatch,
		analogySubtractMatch,
		calculatedCompare,
		calculatedPath,
		compareLeftMatch,
		compareRightMatch,
		compareScore,
		compareSharedNeighbors,
		compareUniqueLeftNeighbors,
		compareUniqueRightNeighbors,
		revealedSemanticPath,
		semanticPath,
		similarCandidates,
	]);
	const handleTutorialClose = useCallback(() => {
		setHasStartedExperience(true);
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
		if (hasAppliedSharedView.current || embeddings.length === 0) return;
		hasAppliedSharedView.current = true;

		const params = new URLSearchParams(window.location.search);
		if (params.size === 0) return;
		setHasStartedExperience(true);
		setIsTutorialOpen(false);
		setIsIntroOrbiting(false);

		const sharedMode = params.get('mode');
		const sharedCount = Number(params.get('count'));
		const shouldCalculate = params.get('calc') === '1';

		if (Number.isFinite(sharedCount) && sharedCount > 0) {
			setPointCount(Math.min(embeddings.length, Math.max(500, sharedCount)));
		}

		const sharedSearch = params.get('q') || '';
		if (sharedSearch) {
			setSearchTerm(sharedSearch);
		}

		if (sharedMode === 'compare') {
			const left = params.get('left') || DEFAULT_COMPARE_LEFT;
			const right = params.get('right') || DEFAULT_COMPARE_RIGHT;
			setActiveMode('compare');
			setCompareLeft(left);
			setCompareRight(right);

			const leftMatch = findExactWordMatch(embeddings, left);
			const rightMatch = findExactWordMatch(embeddings, right);
			if (shouldCalculate && leftMatch && rightMatch && leftMatch.id !== rightMatch.id) {
				setCalculatedCompare({ left: leftMatch.word, right: rightMatch.word });
			}
			return;
		}

		if (sharedMode === 'path') {
			const start = params.get('start') || DEFAULT_PATH_START;
			const end = params.get('end') || DEFAULT_PATH_END;
			setActiveMode('path');
			setPathStart(start);
			setPathEnd(end);

			const startMatch = findExactWordMatch(embeddings, start);
			const endMatch = findExactWordMatch(embeddings, end);
			if (shouldCalculate && startMatch && endMatch && startMatch.id !== endMatch.id) {
				setCalculatedPath({ start: startMatch.word, end: endMatch.word });
				setPathRevealStep(1);
				setPresentationRunId((currentRunId) => currentRunId + 1);
			}
			return;
		}

		if (sharedMode === 'arithmetic' || params.has('a') || params.has('sub') || params.has('b')) {
			const left = params.get('a') || DEFAULT_ANALOGY_LEFT;
			const subtract = params.get('sub') || DEFAULT_ANALOGY_SUBTRACT;
			const right = params.get('b') || DEFAULT_ANALOGY_RIGHT;
			setActiveMode('arithmetic');
			setAnalogyLeft(left);
			setAnalogySubtract(subtract);
			setAnalogyRight(right);

			const leftMatch = findExactWordMatch(embeddings, left);
			const subtractMatch = findExactWordMatch(embeddings, subtract);
			const rightMatch = findExactWordMatch(embeddings, right);
			if (shouldCalculate && leftMatch && subtractMatch && rightMatch) {
				setCalculatedAnalogy({
					left: leftMatch.word,
					subtract: subtractMatch.word,
					right: rightMatch.word,
				});
				setPresentationStep(0);
				setPresentationRunId((currentRunId) => currentRunId + 1);
			}
		}
	}, [embeddings]);

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
		const maxCompareWordId = Math.max(...compareWordIds, -1);
		const maxCompareNeighborId = Math.max(...visibleCompareNeighborIds, -1);
		const maxPathWordId = Math.max(...pathWordIds, -1);
		const maxNeededId = Math.max(maxActiveId, maxCandidateId, maxCompareWordId, maxCompareNeighborId, maxPathWordId);
		if (maxNeededId < pointCount) return;

		const nextCount = Math.min(
			embeddings.length,
			Math.ceil((maxNeededId + 1) / 500) * 500,
		);
		setPointCount(nextCount);
	}, [
		analogyIds,
		compareWordIds,
		embeddings.length,
		pathWordIds,
		pointCount,
		visibleCandidateIds,
		visibleCompareNeighborIds,
	]);

	useEffect(() => {
		if (!analogyResult || timelinePlayback !== 'auto') return undefined;

		const timeoutIds = PRESENTATION_PHASES.map(({ delay, step }) => (
			window.setTimeout(() => setPresentationStep(step), delay)
		));

		return () => {
			timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
		};
	}, [analogyResult, presentationRunId, timelinePlayback]);

	useEffect(() => {
		if (!calculatedPath || semanticPath.length < 2 || timelinePlayback !== 'auto') return undefined;

		const timeoutIds = PATH_REVEAL_PHASES.map(({ delay, step }) => (
			window.setTimeout(() => setPathRevealStep(Math.min(step, semanticPath.length)), delay)
		));

		return () => {
			timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
		};
	}, [calculatedPath, presentationRunId, semanticPath.length, timelinePlayback]);

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
		setIsIntroOrbiting(false);
		setPointCount(Number(event.target.value));
	};

	const setTimelineValue = (nextValue) => {
		if (!activeTimeline) return;

		setIsIntroOrbiting(false);
		const clampedValue = Math.min(activeTimeline.max, Math.max(activeTimeline.min, nextValue));
		setTimelinePlayback('manual');

		if (activeTimeline.mode === 'arithmetic') {
			setPresentationStep(clampedValue);
			return;
		}

		setPathRevealStep(clampedValue);
	};

	const handleTimelineScrub = (event) => {
		setTimelineValue(Number(event.target.value));
	};

	const handleTimelinePrevious = () => {
		if (!activeTimeline) return;
		setTimelineValue(activeTimeline.value - 1);
	};

	const handleTimelineNext = () => {
		if (!activeTimeline) return;
		setTimelineValue(activeTimeline.value + 1);
	};

	const handleTimelineReplay = () => {
		if (!activeTimeline) return;

		setIsIntroOrbiting(false);
		setTimelinePlayback('auto');
		if (activeTimeline.mode === 'arithmetic') {
			setPresentationStep(0);
		} else {
			setPathRevealStep(1);
		}
		setPresentationRunId((currentRunId) => currentRunId + 1);
	};

	const handleUseInspectedWord = (target, word) => {
		setIsIntroOrbiting(false);

		if (target.startsWith('compare')) {
			setActiveMode('compare');
			if (target === 'compare-left') {
				setCompareLeft(word);
			} else {
				setCompareRight(word);
			}
			return;
		}

		if (target.startsWith('path')) {
			setActiveMode('path');
			if (target === 'path-start') {
				setPathStart(word);
			} else {
				setPathEnd(word);
			}
			return;
		}

		setActiveMode('arithmetic');
		if (target === 'analogy-left') {
			setAnalogyLeft(word);
		} else if (target === 'analogy-subtract') {
			setAnalogySubtract(word);
		} else {
			setAnalogyRight(word);
		}
	};

	const handleSelectInspectorNeighbor = (neighbor) => {
		setIsIntroOrbiting(false);
		setSelectedEmbedding(neighbor);
		setSearchTerm(neighbor.word);
		if (neighbor.id >= pointCount) {
			setPointCount(Math.min(
				embeddings.length,
				Math.ceil((neighbor.id + 1) / 500) * 500,
			));
		}
	};

	const presentAnalogy = (leftMatch, subtractMatch, rightMatch) => {
		setIsIntroOrbiting(false);
		setActiveMode('arithmetic');
		setCalculatedCompare(null);
		setCalculatedPath(null);
		setVisibleCompareNeighborIds([]);
		setCalculatedAnalogy({
			left: leftMatch.word,
			subtract: subtractMatch.word,
			right: rightMatch.word,
		});
		setVisibleCandidateIds([]);
		setPresentationStep(0);
		setPathRevealStep(0);
		setTimelinePlayback('auto');
		setPresentationRunId((currentRunId) => currentRunId + 1);
		setHoveredEmbedding(null);
		setSelectedEmbedding(null);
	};

	const handleCalculateAnalogy = () => {
		if (!canCalculateAnalogy) return;

		presentAnalogy(draftAnalogyLeftMatch, draftAnalogySubtractMatch, draftAnalogyRightMatch);
	};

	const handlePresetSelect = (preset) => {
		setIsIntroOrbiting(false);
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
		setCalculatedPath(null);
		setVisibleCandidateIds([]);
		setPresentationStep(0);
		setPathRevealStep(0);
		setTimelinePlayback('auto');
		setPresentationRunId((currentRunId) => currentRunId + 1);
	};

	const handleCandidateToggle = (candidateId) => {
		setIsIntroOrbiting(false);
		setVisibleCandidateIds((currentIds) => (
			currentIds.includes(candidateId)
				? currentIds.filter((id) => id !== candidateId)
				: [...currentIds, candidateId]
		));
	};

	const handleCompareWords = () => {
		if (!canCompareWords) return;

		setIsIntroOrbiting(false);
		setActiveMode('compare');
		setCalculatedCompare({
			left: draftCompareLeftMatch.word,
			right: draftCompareRightMatch.word,
		});
		setCalculatedAnalogy(null);
		setVisibleCandidateIds([]);
		setVisibleCompareNeighborIds([]);
		setPresentationStep(0);
		setPathRevealStep(0);
		setTimelinePlayback('auto');
		setPresentationRunId((currentRunId) => currentRunId + 1);
		setHoveredEmbedding(null);
		setSelectedEmbedding(null);
	};

	const handleCompareNeighborToggle = (neighborId) => {
		setIsIntroOrbiting(false);
		setVisibleCompareNeighborIds((currentIds) => (
			currentIds.includes(neighborId)
				? currentIds.filter((id) => id !== neighborId)
				: [...currentIds, neighborId]
		));
	};

	const handleFindPath = () => {
		if (!canFindPath) return;

		setIsIntroOrbiting(false);
		setActiveMode('path');
		setCalculatedPath({
			start: draftPathStartMatch.word,
			end: draftPathEndMatch.word,
		});
		setCalculatedAnalogy(null);
		setCalculatedCompare(null);
		setVisibleCandidateIds([]);
		setVisibleCompareNeighborIds([]);
		setPresentationStep(0);
		setPathRevealStep(1);
		setTimelinePlayback('auto');
		setPresentationRunId((currentRunId) => currentRunId + 1);
		setHoveredEmbedding(null);
		setSelectedEmbedding(null);
	};

	const handlePathPresetSelect = (preset) => {
		setIsIntroOrbiting(false);
		setPathStart(preset.start);
		setPathEnd(preset.end);
		setActiveMode('path');

		const presetStartMatch = findExactWordMatch(embeddings, preset.start);
		const presetEndMatch = findExactWordMatch(embeddings, preset.end);

		if (presetStartMatch && presetEndMatch) {
			setCalculatedPath({
				start: presetStartMatch.word,
				end: presetEndMatch.word,
			});
			setCalculatedAnalogy(null);
			setCalculatedCompare(null);
			setVisibleCandidateIds([]);
			setVisibleCompareNeighborIds([]);
			setPresentationStep(0);
			setPathRevealStep(1);
			setTimelinePlayback('auto');
			setPresentationRunId((currentRunId) => currentRunId + 1);
			setHoveredEmbedding(null);
			setSelectedEmbedding(null);
			return;
		}

		setCalculatedPath(null);
		setPathRevealStep(0);
		setTimelinePlayback('auto');
	};

	const handleClear = () => {
		setIsIntroOrbiting(false);
		setAnalogyLeft('');
		setAnalogySubtract('');
		setAnalogyRight('');
		setCalculatedAnalogy(null);
		setCompareLeft('');
		setCompareRight('');
		setCalculatedCompare(null);
		setPathStart('');
		setPathEnd('');
		setCalculatedPath(null);
		setVisibleCandidateIds([]);
		setVisibleCompareNeighborIds([]);
		setPresentationStep(0);
		setPathRevealStep(0);
		setTimelinePlayback('auto');
		setPresentationRunId((currentRunId) => currentRunId + 1);
		setSearchTerm('');
		setHoveredEmbedding(null);
		setSelectedEmbedding(null);
		setPointCount(Math.min(DEFAULT_POINT_COUNT, embeddings.length || DEFAULT_POINT_COUNT));
		setShareStatus('');
		if (typeof window !== 'undefined') {
			window.history.replaceState(null, '', window.location.pathname);
		}
	};

	const handleCopyShareLink = () => {
		if (!shareUrl) return;

		setIsIntroOrbiting(false);
		setShareStatus('Copied');
		try {
			if (navigator.clipboard?.writeText) {
				window.setTimeout(() => {
					navigator.clipboard.writeText(shareUrl).catch(() => setShareStatus('Copy failed'));
				}, 0);
			} else {
				const textarea = document.createElement('textarea');
				textarea.value = shareUrl;
				textarea.setAttribute('readonly', '');
				textarea.style.position = 'fixed';
				textarea.style.opacity = '0';
				document.body.appendChild(textarea);
				textarea.select();
				document.execCommand('copy');
				document.body.removeChild(textarea);
			}
		} catch {
			setShareStatus('Copy failed');
		}

		window.setTimeout(() => setShareStatus(''), 1800);
	};

	const shouldRenderExperience = hasStartedExperience || !isTutorialOpen;

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
			{shouldRenderExperience && (
				<>
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
							analogyIds={activeMode === 'arithmetic' ? analogyIds : []}
							analogyInputIds={activeMode === 'arithmetic' ? analogyInputIds : []}
							analogyResultId={activeMode === 'arithmetic' ? analogyResult?.id : undefined}
							analogyLinks={activeMode === 'arithmetic' ? analogyLinks : []}
							visibleCandidateIds={activeMode === 'arithmetic' ? visibleCandidateIds : []}
							compareWordIds={activeMode === 'compare' ? compareWordIds : []}
							compareNeighborIds={activeMode === 'compare' ? visibleCompareNeighborIds : []}
							compareLinks={activeMode === 'compare' ? compareLinks : []}
							pathWordIds={activeMode === 'path' ? revealedPathWordIds : []}
							pathLinks={activeMode === 'path' ? revealedPathLinks : []}
							analogyRevealStep={presentationStep}
							analogyPresentationDone={activeMode === 'arithmetic' && isAnalogyPresentationDone}
							presentationRunId={presentationRunId}
							isIntroOrbiting={isIntroOrbiting}
							onHover={setHoveredEmbedding}
							onSelect={(embedding) => {
								setIsIntroOrbiting(false);
								setSelectedEmbedding(embedding);
							}}
							onCameraInteraction={() => setIsIntroOrbiting(false)}
						/>
						<Stats className="embedding-stats" />
					</Canvas>

					{activeMode === 'arithmetic' && shouldRevealAnalogyResult && (
						<div className="analogy-stage-readout" aria-live="polite">
							<span>{arithmeticExpression}</span>
							<strong>{analogyResult.word}</strong>
						</div>
					)}

					{activeMode === 'compare' && calculatedCompare && compareLeftMatch && compareRightMatch && (
						<div className="analogy-stage-readout compare-stage-readout" aria-live="polite">
							<span>{compareExpression}</span>
							<strong>{(Math.max(0, compareScore) * 100).toFixed(1)}%</strong>
						</div>
					)}

					{activeMode === 'path' && calculatedPath && semanticPath.length > 1 && (
						<div className="analogy-stage-readout path-stage-readout" aria-live="polite">
							<span>{`${semanticPath[0].word} -> ${semanticPath[semanticPath.length - 1].word}`}</span>
							<strong>{semanticPath.length - 1} steps</strong>
						</div>
					)}

					{(activeInsight || inspectorEmbedding) && (
						<div className="semantic-rail">
							<InsightPanel insight={activeInsight} />
							<WordInspector
								embedding={inspectorEmbedding}
								neighbors={inspectorNeighbors}
								onClose={() => {
									setSelectedEmbedding(null);
									setSearchTerm('');
								}}
								onUseWord={handleUseInspectedWord}
								onSelectNeighbor={handleSelectInspectorNeighbor}
							/>
						</div>
					)}
				</>
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

			{shouldRenderExperience && (
			<section className="viewer-panel" aria-label="Embedding controls">
				<div>
					<p className="panel-kicker">Word2Vec space</p>
					<h1>Explore semantic neighborhoods</h1>
					<p className="panel-copy">
						{embeddings.length.toLocaleString()} words projected from 200D vectors into a navigable semantic map.
					</p>
				</div>

				<div className="analogy-card">
					<div className="mode-tabs" role="tablist" aria-label="Relationship tools">
						<button
							className={activeMode === 'arithmetic' ? 'is-active' : ''}
							type="button"
							role="tab"
							aria-selected={activeMode === 'arithmetic'}
							onClick={() => {
								setIsIntroOrbiting(false);
								setActiveMode('arithmetic');
							}}
						>
							Arithmetic
						</button>
						<button
							className={activeMode === 'compare' ? 'is-active' : ''}
							type="button"
							role="tab"
							aria-selected={activeMode === 'compare'}
							onClick={() => {
								setIsIntroOrbiting(false);
								setActiveMode('compare');
							}}
						>
							Compare
						</button>
						<button
							className={activeMode === 'path' ? 'is-active' : ''}
							type="button"
							role="tab"
							aria-selected={activeMode === 'path'}
							onClick={() => {
								setIsIntroOrbiting(false);
								setActiveMode('path');
							}}
						>
							Path
						</button>
					</div>

					{activeMode === 'arithmetic' ? (
						<>
							<span>Vector arithmetic</span>
							<div className="analogy-controls">
								<input
									type="search"
									value={analogyLeft}
									onChange={(event) => {
										setIsIntroOrbiting(false);
										setAnalogyLeft(event.target.value);
									}}
									placeholder="king"
									autoComplete="off"
									aria-label="First added word"
								/>
								<b>-</b>
								<input
									type="search"
									value={analogySubtract}
									onChange={(event) => {
										setIsIntroOrbiting(false);
										setAnalogySubtract(event.target.value);
									}}
									placeholder="man"
									autoComplete="off"
									aria-label="Subtracted word"
								/>
								<b>+</b>
								<input
									type="search"
									value={analogyRight}
									onChange={(event) => {
										setIsIntroOrbiting(false);
										setAnalogyRight(event.target.value);
									}}
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
							{activeTimeline?.mode === 'arithmetic' && (
								<div className="timeline-scrubber">
									<div className="timeline-header">
										<span>Timeline</span>
										<strong>{activeTimeline.currentLabel}</strong>
									</div>
									<div className="timeline-controls">
										<button
											type="button"
											onClick={handleTimelinePrevious}
											disabled={activeTimeline.value <= activeTimeline.min}
											aria-label="Previous arithmetic step"
										>
											Prev
										</button>
										<input
											type="range"
											min={activeTimeline.min}
											max={activeTimeline.max}
											step="1"
											value={activeTimeline.value}
											onChange={handleTimelineScrub}
											aria-label="Arithmetic timeline step"
										/>
										<button
											type="button"
											onClick={handleTimelineNext}
											disabled={activeTimeline.value >= activeTimeline.max}
											aria-label="Next arithmetic step"
										>
											Next
										</button>
										<button
											type="button"
											onClick={handleTimelineReplay}
											aria-label="Replay arithmetic animation"
										>
											Replay
										</button>
									</div>
									<ol className="timeline-steps">
										{activeTimeline.steps.map((step, index) => (
											<li
												key={step}
												className={index <= activeTimeline.value ? 'is-active' : ''}
											>
												<span>{index}</span>
												<strong>{step}</strong>
											</li>
										))}
									</ol>
								</div>
							)}
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
						</>
					) : activeMode === 'compare' ? (
						<>
							<span>Compare two words</span>
							<div className="compare-controls">
								<input
									type="search"
									value={compareLeft}
									onChange={(event) => {
										setIsIntroOrbiting(false);
										setCompareLeft(event.target.value);
									}}
									placeholder="king"
									autoComplete="off"
									aria-label="First compared word"
								/>
								<b>{'->'}</b>
								<input
									type="search"
									value={compareRight}
									onChange={(event) => {
										setIsIntroOrbiting(false);
										setCompareRight(event.target.value);
									}}
									placeholder="queen"
									autoComplete="off"
									aria-label="Second compared word"
								/>
							</div>
							<div className="analogy-validation compare-validation" aria-live="polite">
								<small className={draftCompareLeftMatch ? 'is-valid' : 'is-missing'}>{draftCompareLeftMatch ? draftCompareLeftMatch.word : 'First word not found'}</small>
								<small className={draftCompareRightMatch ? 'is-valid' : 'is-missing'}>{draftCompareRightMatch ? draftCompareRightMatch.word : 'Second word not found'}</small>
							</div>
							<button
								className="calculate-button compare-button"
								type="button"
								onClick={handleCompareWords}
								disabled={!canCompareWords}
							>
								{hasPendingCompareChanges ? 'Recompare' : 'Compare'}
							</button>
							<button
								className="clear-button"
								type="button"
								onClick={handleClear}
							>
								Clear
							</button>
							<div className="analogy-result compare-result">
								<small>{calculatedCompare ? compareExpression : `${draftCompareLeftMatch?.word || compareLeft || '?'} -> ${draftCompareRightMatch?.word || compareRight || '?'}`}</small>
								<strong>{calculatedCompare ? `${(Math.max(0, compareScore) * 100).toFixed(1)}% similar` : 'Ready when you compare'}</strong>
								{hasPendingCompareChanges && (
									<em>Inputs changed. Compare to update the scene.</em>
								)}
							</div>
							{calculatedCompare && compareExplanation && (
								<div className="analogy-explanation compare-explanation">
									<span>Relationship readout</span>
									<p>{compareExplanation}</p>
								</div>
							)}
							{calculatedCompare && (
								<div className="compare-neighborhoods">
									<div className="compare-neighbor-group">
										<span>Shared neighbors</span>
										{compareSharedNeighbors.length > 0 ? (
											<ol className="analogy-candidates">
												{compareSharedNeighbors.map((neighbor) => (
													<li key={neighbor.id}>
														<button
															className="candidate-switch"
															type="button"
															role="switch"
															aria-checked={visibleCompareNeighborIds.includes(neighbor.id)}
															onClick={() => handleCompareNeighborToggle(neighbor.id)}
														>
															<span className="candidate-switch-track" aria-hidden="true" />
															<strong>{neighbor.word}</strong>
														</button>
														<small>{neighbor.score.toFixed(3)}</small>
													</li>
												))}
											</ol>
										) : (
											<p>No shared top neighbors.</p>
										)}
									</div>
									<div className="compare-neighbor-columns">
										<div className="compare-neighbor-group">
											<span>{compareLeftMatch?.word || 'Left'} leans toward</span>
											<ol className="analogy-candidates">
												{compareUniqueLeftNeighbors.map((neighbor) => (
													<li key={neighbor.id}>
														<button
															className="candidate-switch"
															type="button"
															role="switch"
															aria-checked={visibleCompareNeighborIds.includes(neighbor.id)}
															onClick={() => handleCompareNeighborToggle(neighbor.id)}
														>
															<span className="candidate-switch-track" aria-hidden="true" />
															<strong>{neighbor.word}</strong>
														</button>
														<small>{neighbor.score.toFixed(3)}</small>
													</li>
												))}
											</ol>
										</div>
										<div className="compare-neighbor-group">
											<span>{compareRightMatch?.word || 'Right'} leans toward</span>
											<ol className="analogy-candidates">
												{compareUniqueRightNeighbors.map((neighbor) => (
													<li key={neighbor.id}>
														<button
															className="candidate-switch"
															type="button"
															role="switch"
															aria-checked={visibleCompareNeighborIds.includes(neighbor.id)}
															onClick={() => handleCompareNeighborToggle(neighbor.id)}
														>
															<span className="candidate-switch-track" aria-hidden="true" />
															<strong>{neighbor.word}</strong>
														</button>
														<small>{neighbor.score.toFixed(3)}</small>
													</li>
												))}
											</ol>
										</div>
									</div>
								</div>
							)}
						</>
					) : (
						<>
							<span>Path explorer</span>
							<div className="compare-controls path-controls">
								<input
									type="search"
									value={pathStart}
									onChange={(event) => {
										setIsIntroOrbiting(false);
										setPathStart(event.target.value);
									}}
									placeholder="music"
									autoComplete="off"
									aria-label="Path start word"
								/>
								<b>{'->'}</b>
								<input
									type="search"
									value={pathEnd}
									onChange={(event) => {
										setIsIntroOrbiting(false);
										setPathEnd(event.target.value);
									}}
									placeholder="art"
									autoComplete="off"
									aria-label="Path end word"
								/>
							</div>
							<div className="analogy-validation compare-validation" aria-live="polite">
								<small className={draftPathStartMatch ? 'is-valid' : 'is-missing'}>{draftPathStartMatch ? draftPathStartMatch.word : 'Start word not found'}</small>
								<small className={draftPathEndMatch ? 'is-valid' : 'is-missing'}>{draftPathEndMatch ? draftPathEndMatch.word : 'End word not found'}</small>
							</div>
							<div className="preset-drawer path-preset-drawer">
								<span>Path presets</span>
								<div className="preset-grid">
									{pathPresets.map((preset) => (
										<button
											key={preset.id}
											className={activePathPresetId === preset.id ? 'is-active' : ''}
											type="button"
											onClick={() => handlePathPresetSelect(preset)}
											disabled={!preset.isAvailable}
											title={`${preset.start} -> ${preset.end}`}
										>
											<strong>{preset.label}</strong>
											<small>
												{preset.start}
												{' -> '}
												{preset.end}
											</small>
										</button>
									))}
								</div>
							</div>
							<button
								className="calculate-button path-button"
								type="button"
								onClick={handleFindPath}
								disabled={!canFindPath}
							>
								{hasPendingPathChanges ? 'Refind path' : 'Find path'}
							</button>
							<button
								className="clear-button"
								type="button"
								onClick={handleClear}
							>
								Clear
							</button>
							<div className="analogy-result path-result">
								<small>{calculatedPath ? revealedPathExpression : pathExpression}</small>
								<strong>{calculatedPath && semanticPath.length > 1 ? isPathRevealDone ? `${semanticPath.length - 1} semantic steps` : 'Drawing path...' : 'Ready when you find a path'}</strong>
								{hasPendingPathChanges && (
									<em>Inputs changed. Find path to update the scene.</em>
								)}
							</div>
							{activeTimeline?.mode === 'path' && (
								<div className="timeline-scrubber path-timeline">
									<div className="timeline-header">
										<span>Timeline</span>
										<strong>{activeTimeline.currentLabel}</strong>
									</div>
									<div className="timeline-controls">
										<button
											type="button"
											onClick={handleTimelinePrevious}
											disabled={activeTimeline.value <= activeTimeline.min}
											aria-label="Previous path step"
										>
											Prev
										</button>
										<input
											type="range"
											min={activeTimeline.min}
											max={activeTimeline.max}
											step="1"
											value={activeTimeline.value}
											onChange={handleTimelineScrub}
											aria-label="Path timeline step"
										/>
										<button
											type="button"
											onClick={handleTimelineNext}
											disabled={activeTimeline.value >= activeTimeline.max}
											aria-label="Next path step"
										>
											Next
										</button>
										<button
											type="button"
											onClick={handleTimelineReplay}
											aria-label="Replay path animation"
										>
											Replay
										</button>
									</div>
									<ol className="timeline-steps">
										{activeTimeline.steps.map((step, index) => {
											const displayIndex = activeTimeline.min + index;
											return (
												<li
													key={`${step}-${displayIndex}`}
													className={displayIndex <= activeTimeline.value ? 'is-active' : ''}
												>
													<span>{displayIndex}</span>
													<strong>{step}</strong>
												</li>
											);
										})}
									</ol>
								</div>
							)}
							{calculatedPath && pathExplanation && (
								<div className="analogy-explanation path-explanation">
									<span>Path readout</span>
									<p>{pathExplanation}</p>
								</div>
							)}
							{calculatedPath && revealedSemanticPath.length > 0 && (
								<ol className="path-steps">
									{revealedSemanticPath.map((embedding, index) => (
										<li key={embedding.id}>
											<span>{index + 1}</span>
											<strong>{embedding.word}</strong>
											{Number.isFinite(embedding.score) && (
												<small>{embedding.score.toFixed(3)}</small>
											)}
										</li>
									))}
								</ol>
							)}
						</>
					)}
				</div>

				<label className="search-control compact-search">
					<span>Find any word</span>
					<input
						type="search"
						value={searchTerm}
						onChange={(event) => {
							setIsIntroOrbiting(false);
							setSearchTerm(event.target.value);
						}}
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

				<div className="share-view-card">
					<div>
						<span>Share view</span>
						<strong>{shareStatus || 'Copy a link to this setup'}</strong>
					</div>
					<button type="button" onClick={handleCopyShareLink}>
						Copy link
					</button>
				</div>
			</section>
			)}

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
