export const getUrls = () => {
	if (process.env.NODE_ENV === 'production')
		return {
			BACKEND: 'https://ksi.ii.uni.wroc.pl/api',
			FRONTEND: 'https://ksi.ii.uni.wroc.pl',
			AUTH: 'https://ksi.ii.uni.wroc.pl/'
		};

	return {
		BACKEND: 'http://localhost:3000/api',
		FRONTEND: 'http://localhost:5173',
		AUTH: 'http://localhost:3000/'
	};
};
