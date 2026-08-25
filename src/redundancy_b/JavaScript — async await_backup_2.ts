// JavaScript — async/await
export const fetchData = async () => {
  const result = await Promise.resolve(1);
  return result;
};
