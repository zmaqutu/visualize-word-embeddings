self.onmessage = function (e) {
	const { reducedEmbeddings } = e.data;

	// Calculate positions from the reduced embeddings
	const positions = reducedEmbeddings.map(embedding => {
		const [x, y, z] = embedding;  // Assuming embedding is a 3D array [x, y, z]
		return { x, y, z };
	});

	// Send the positions back to the main thread
	self.postMessage({ positions });
};
