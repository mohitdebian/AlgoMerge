// Server-side error handling
export const handler = async (req: any, res: any) => {
  try { throw new Error('fail'); }
  catch (e) { res.status(500).send('Internal Server Error'); }
};
