const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

/**
 * A standard HTTP Request function to search stores with pagination.
 * This version manually handles authentication by verifying the ID token.
 */
exports.searchStores = functions.https.onRequest((request, response) => {
  // Wrap the entire function in the CORS middleware.
  cors(request, response, async () => {
    try {
      // 1. Manual Authentication Check
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        console.error("No Bearer token in authorization header.");
        response.status(401).send({ error: { message: "Unauthorized: No token provided." } });
        return;
      }
      const idToken = authHeader.split("Bearer ")[1];
      
      // Verify the token
      try {
        await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        console.error("Error verifying ID token:", error);
        response.status(403).send({ error: { message: "Forbidden: Invalid token." } });
        return;
      }

      // 2. Get and validate parameters. For onRequest, data is in request.body.data
      const data = request.body.data || {};
      const query = data.query ? String(data.query).trim() : "";
      const page = data.page && Number.isInteger(data.page) && data.page > 0 ? data.page : 1;
      const perPage = data.perPage && Number.isInteger(data.perPage) && data.perPage > 0 ? data.perPage : 20;
      const offset = (page - 1) * perPage;

      // 3. Build Firestore queries
      let baseQuery = db.collection("stores_taipei");
      let countQuery = db.collection("stores_taipei");

      if (query) {
        const endQuery = query.replace(/.$/, c => String.fromCharCode(c.charCodeAt(0) + 1));
        baseQuery = baseQuery.where("name", ">=", query).where("name", "<", endQuery);
        countQuery = countQuery.where("name", ">=", query).where("name", "<", endQuery);
      }

      // 4. Get total count
      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;

      // 5. Get store documents with pagination
      const storesSnapshot = await baseQuery
        .orderBy("name")
        .offset(offset)
        .limit(perPage)
        .get();

      const stores = storesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 6. Send successful response. Wrap it in a `data` object to match client SDK expectations.
      response.status(200).send({ data: { stores, total, page, perPage } });

    } catch (error) {
      console.error("Internal error searching stores:", error);
      // Send a generic internal server error.
      response.status(500).send({ error: { message: "An internal error occurred." } });
    }
  });
});