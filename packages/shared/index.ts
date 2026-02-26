export const getBackendUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return `https://ksi.uni.wroc.pl/api`;
  }
  return `http://localhost/api`;
};

export const getFrontendUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return "https://ksi.uni.wroc.pl";
  }
  return "http://localhost";
};
