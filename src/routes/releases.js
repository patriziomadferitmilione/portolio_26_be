import { findReleaseById, listReleases } from "../services/releases.js";

export default async function releaseRoutes(app) {
  app.get("/releases", async (request) => ({
    items: await listReleases(app.dbContext, {
      includePrivate: true
    })
  }));

  app.get("/releases/:releaseId", async (request, reply) => {
    const release = await findReleaseById(app.dbContext, request.params.releaseId, {
      includePrivate: true
    });

    if (!release) {
      return reply.code(404).send({ error: "Release not found" });
    }

    return { item: release };
  });
}
