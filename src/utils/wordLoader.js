export const loadWords = async (filePath) => {
	try {
		const metadataResponse = await fetch(filePath);
		if (!metadataResponse.ok) {
			throw new Error(`Unable to fetch label file (${metadataResponse.status})`);
		}

		const metadataText = await metadataResponse.text();

		return metadataText.trim().split('\n').slice(1).map(line => line.split('\t')[0]);
	} catch (error) {
		console.error('Error loading words:', error);
		throw error;
	}
};
