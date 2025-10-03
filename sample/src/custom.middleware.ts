export const customMiddleware = async (
  payload: any,
  _helpers: any,
  next: any,
) => {
  console.log('Custom middleware inoked');
  try {
    await next({ payload, enriched: true });
    console.log('Job completed successfully');
  } catch (error) {
    console.error('Job failed:', error);
    throw error;
  }
};
