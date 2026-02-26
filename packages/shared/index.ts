export const getBackendUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return "https://ksi.ii.uni.wroc.pl/api";
  }
  return `http://localhost:3000`;
};

export const getFrontendUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return "https://ksi.ii.uni.wroc.pl";
  }
  return "http://localhost:5173";
};
