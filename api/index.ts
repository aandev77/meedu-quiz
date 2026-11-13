export default async function handler(req: any, res: any) {
  try {
    const { default: app } = await import('../server.js');
    return app(req, res);
  } catch (e: any) {
    return res.status(500).json({
      message: e?.message,
      stack: e?.stack?.split('\n').slice(0, 8),
    });
  }
}