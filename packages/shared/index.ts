export const getBackendUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.BACKEND_BASE_URL;
    // return `https://ksi.uni.wroc.pl/api`;
  }
  return `http://localhost/api`;
};

export const getFrontendUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.FRONTEND_BASE_URL;
  }
  return "http://localhost";
};
