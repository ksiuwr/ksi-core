export const getUrls = () => {
  if (process.env.NODE_ENV === 'production') {
    const frontendEndpoints = {
      landing: 'https://ksi.edu.pl',
      auth: 'https://auth.ksi.edu.pl'
    };

    return {
      backend: 'https://api.ksi.edu.pl',
      frontend: {
        ...frontendEndpoints,
        all: Object.values(frontendEndpoints)
      }
    };
  }

  const frontendEndpoints = {
    landing: 'http://localhost:5173',
    auth: 'http://localhost:5174'
  };

  return {
    backend: 'http://localhost:3000',
    frontend: {
      ...frontendEndpoints,
      all: Object.values(frontendEndpoints)
    }
  };
};
