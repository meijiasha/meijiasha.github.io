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
      const sortBy = data.sortBy ? String(data.sortBy) : "name"; // Default sort by name
      const sortOrder = data.sortOrder === "desc" ? "desc" : "asc"; // Default asc
      const offset = (page - 1) * perPage;

      // 3. Build Firestore queries
      let queryPromises = [];
      let allMatchingDocs = new Map(); // Use a Map to store unique documents by ID

      // Define taipeiDistricts within the function for use in search logic
      const taipeiDistricts = [
          "中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
          "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"
      ];

      if (query) {
        const endQuery = query.replace(/.$/, c => String.fromCharCode(c.charCodeAt(0) + 1));

        // Search by name (starts with)
        queryPromises.push(
          db.collection("stores_taipei")
            .where("name", ">=", query)
            .where("name", "<", endQuery)
            .get()
        );

        // Search by category (starts with)
        queryPromises.push(
          db.collection("stores_taipei")
            .where("category", ">=", query)
            .where("category", "<", endQuery)
            .get()
        );

        // Search by district (exact match)
        if (taipeiDistricts.includes(query)) {
            queryPromises.push(
                db.collection("stores_taipei")
                    .where("district", "==", query)
                    .get()
            );
        }

        // Search by address (starts with)
        queryPromises.push(
          db.collection("stores_taipei")
            .where("address", ">=", query)
            .where("address", "<", endQuery)
            .get()
        );

        const snapshots = await Promise.all(queryPromises);
        snapshots.forEach(snapshot => {
          snapshot.docs.forEach(doc => {
            allMatchingDocs.set(doc.id, { id: doc.id, ...doc.data() });
          });
        });

        // Convert Map values to an array for sorting and pagination
        let filteredStores = Array.from(allMatchingDocs.values());

        // Apply sorting on the merged results (client-side in Cloud Function)
        filteredStores.sort((a, b) => {
          const aValue = a[sortBy] || "";
          const bValue = b[sortBy] || "";

          if (sortOrder === "asc") {
            return String(aValue).localeCompare(String(bValue));
          } else {
            return String(bValue).localeCompare(String(aValue));
          }
        });

        let total = filteredStores.length;
        const paginatedStores = filteredStores.slice(offset, offset + perPage);

        response.status(200).send({ data: { stores: paginatedStores, total, page, perPage, sortBy, sortOrder } });
        return; // Exit early as we've handled the query
      }

      // Original logic for when no query is present
      let baseQuery = db.collection("stores_taipei");
      const countQuery = db.collection("stores_taipei");

      // Apply sorting
      if (sortBy) {
        baseQuery = baseQuery.orderBy(sortBy, sortOrder);
      }

      // 4. Get total count
      const countSnapshot = await countQuery.count().get();
      const total = countSnapshot.data().count;

      // 5. Get store documents with pagination
      const storesSnapshot = await baseQuery
        .offset(offset)
        .limit(perPage)
        .get();

      const stores = storesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 6. Send successful response. Wrap it in a `data` object to match client SDK expectations.
      response.status(200).send({ data: { stores, total, page, perPage, sortBy, sortOrder } });

    } catch (error) {
      console.error("Internal error searching stores:", error);
      // Send a generic internal server error.
      response.status(500).send({ error: { message: "An internal error occurred." } });
    }
  });
});