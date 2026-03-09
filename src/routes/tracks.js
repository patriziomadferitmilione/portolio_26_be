import { listTracks } from "../services/catalog.js";

export default async function trackRoutes(app) {
  app.get("/tracks", async (request) => ({
    items: await listTracks(app.dbContext, {
      includePrivate: request.currentUser?.role === "admin"
    })
  }));
}
