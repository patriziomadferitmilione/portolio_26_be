import { listTracks } from "../services/catalog.js";

export default async function trackRoutes(app) {
  app.get("/tracks", async () => ({
    items: listTracks()
  }));
}
