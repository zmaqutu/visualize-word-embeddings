# Visualize Word Embeddings

Interactive 3D explorer for a 10,000-word Word2Vec dataset. The app loads the tensor and labels in a Web Worker, projects the 200-dimensional vectors into 3D, and renders the result with React Three Fiber.

## Features

- Web Worker data loading so binary tensor parsing stays off the main UI thread
- Deterministic 3D projection tuned for fast browser startup
- Instanced rendering for thousands of word points
- Hover, click, and search-driven focus labels
- Two searchable relationship fields that draw a focused arrow between any matching word pair
- Vector arithmetic search for analogies such as `king - man + woman = queen`
- Animated shader beams that connect relationship and analogy points
- Slider control for balancing density and performance
- GitHub Pages-friendly asset paths through Vite `BASE_URL`

## Development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For this project it is usually:

```text
http://127.0.0.1:5173/visualize-word-embeddings
```

## Checks

```bash
npm run lint
npm run build
```

The production build can warn about large chunks because TensorFlow.js and Three.js are substantial browser dependencies.
