export const getUrls = () => {
  if (process.env.NODE_ENV === 'production')
    return {
      BACKEND: 'https://api.ksi.edu.pl',
      FRONTEND: 'https://ksi.edu.pl',
      AUTH: 'https://api.ksi.edu.pl/auth'
    };

  return {
    BACKEND: 'http://localhost:3000/api',
    FRONTEND: 'http://localhost:5173',
    AUTH: 'http://localhost:3000/api/auth'
  };
};
