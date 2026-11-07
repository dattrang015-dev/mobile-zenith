export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  return res.status(200).json({
    status: "ok",
    target: "https://zenith-anti-hack.vercel.app",
    databaseId: "ai-studio-af2631ee-baa5-4a6d-bd59-42e4eb834c38",
    projectId: "gen-lang-client-0697052905",
    syncMode: "continuous_realtime",
    timestamp: Date.now()
  });
}
