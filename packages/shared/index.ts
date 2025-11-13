export const getBackendUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return `https://api.ksi.uni.wroc.pl`;
  }
  return `http://localhost:3000`;
};

export const getFrontendUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return "https://ksi.uni.wroc.pl";
  }
  return "http://localhost:5173";
};