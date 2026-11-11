const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 3000;

// Safe Firebase Admin init (will not crash if file is not on Vercel)
try {
  const serviceAccount = require("./service-firebase-admin-Key.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("Firebase Admin initialized successfully.");
} catch (error) {
  console.warn("service-firebase-admin-Key.json not found. Token verification disabled.");
}

app.use(cors());
app.use(express.json());

const verifyFireBaseToken = async (req, res, next) => {
  if (!admin.apps.length) {
    return next();
  }
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  try {
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    next();
  } catch {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

const uri = process.env.MONGO_URI || `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.6si5fpl.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db, modelsCollection, bidsCollection, usersCollection;

async function getCollections() {
  if (!db) {
    await client.connect();
    db = client.db("model-db");
    modelsCollection = db.collection("models");
    bidsCollection = db.collection("bids");
    usersCollection = db.collection("users");
    console.log("Connected to MongoDB successfully!");
  }
  return { modelsCollection, bidsCollection, usersCollection };
}

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/latest-models", async (req, res) => {
  try {
    const { modelsCollection } = await getCollections();
    const result = await modelsCollection.find().sort({ date: -1 }).limit(6).toArray();
    res.json(result);
  } catch (error) {
    console.error("Error in /latest-models:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/models", async (req, res) => {
  try {
    const { modelsCollection } = await getCollections();
    const email = req.query.email;
    const query = email ? { email } : {};
    const result = await modelsCollection.find(query).toArray();
    res.json(result);
  } catch (error) {
    console.error("Error in /models:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/models/:id", verifyFireBaseToken, async (req, res) => {
  try {
    const { modelsCollection } = await getCollections();
    const result = await modelsCollection.findOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/models", async (req, res) => {
  try {
    const { modelsCollection } = await getCollections();
    const result = await modelsCollection.insertOne(req.body);
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/models/:id", async (req, res) => {
  try {
    const { modelsCollection } = await getCollections();
    const result = await modelsCollection.deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/models/:id", async (req, res) => {
  try {
    const { modelsCollection } = await getCollections();
    const result = await modelsCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name: req.body.name, price: req.body.price } }
    );
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/search", async (req, res) => {
  try {
    const { modelsCollection } = await getCollections();
    const search_text = req.query.search || "";
    const result = await modelsCollection.find({ name: { $regex: search_text, $options: "i" } }).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/filter", async (req, res) => {
  try {
    const { modelsCollection } = await getCollections();
    const category = req.query.category;
    const query = category ? { category } : {};
    const result = await modelsCollection.find(query).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/bids", verifyFireBaseToken, async (req, res) => {
  try {
    const { bidsCollection } = await getCollections();
    const email = req.query.email;
    const query = email ? { email } : {};
    const result = await bidsCollection.find(query).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/bids", async (req, res) => {
  try {
    const { bidsCollection } = await getCollections();
    const result = await bidsCollection.insertOne(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/users", async (req, res) => {
  try {
    const { usersCollection } = await getCollections();
    const existingUser = await usersCollection.findOne({ email: req.body.email });
    if (existingUser) {
      res.json({ message: "user already exits. doyou need to insert again" });
    } else {
      const result = await usersCollection.insertOne(req.body);
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

module.exports = app;
