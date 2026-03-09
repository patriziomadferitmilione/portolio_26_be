export default async function healthRoutes(app) {
  app.get("/health", async () => ({
    status: "ok",
    service: "portolio_26_be",
    timestamp: new Date().toISOString()
  }));
}
