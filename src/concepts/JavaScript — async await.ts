// JavaScript — async/await
export const fetchData = async () => {
  try {
    // Handling errors with try/catch
    const result = await Promise.resolve(1);
    
    // Performance Issue: Sequential awaits (Blocking)
    // await fetch('/api/users'); // Waits 1s
    // await fetch('/api/posts'); // Waits another 1s (Total 2s)

    // Solution: Concurrent execution using Promise.all
    const [users, posts] = await Promise.all([
      Promise.resolve('users data'),
      Promise.resolve('posts data')
    ]);

    return { result, users, posts };
  } catch (error) {
    console.error('Async operation failed:', error);
    throw new Error('Failed to fetch data');
  }
};
