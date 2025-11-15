const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const  admin = require("firebase-admin");
const port = process.env.PORT || 3000;

const serviceAccount = require("./service-firebase-admin-Key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());


const logger =(req,res,next) =>{
  console.log("loger info ");
  next();
}


const verifyFireBaseToken = async(req, res, next) =>{
  console.log('in the verify middleware', req.headers.authorization)

  if(!req.headers.authorization){
    return res.status(401).send({message: 'unauthorization access'})
  }

  const token = req.headers.authorization.split(' ')[1];
  if(!token){
    return res.status(401).send({message: 'unauthorization access'})
  }
  try{
    const userInfo = await admin.auth().verifyIdToken(token);
    req.token_email = userInfo.email;
    console.log('after token validation ',userInfo)
    next();
  }
  catch{
    return res.status(401).send({message: 'unauthorization access'})
  }

  //verify token

  
}




const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.6si5fpl.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


async function run() {
  try {
    await client.connect();

    const db = client.db("model-db");
    const modelsCollection = db.collection("models");
    const bidsCollection = db.collection("bids");
    const usersCollection = db.collection("users");


    // users

    app.post("/users", async (req, res) => {
      const newUser = req.body;
      const email = req.body.email;
      const query = { email: email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        res.send({ message: "user already exits. doyou need to insert again" });
      } else {
        const result = await usersCollection.insertOne(newUser);
        res.send(result);
      }
    });

    //fine
    // find one
    

    app.get("/models", async (req, res) => {
      console.log(req.query);

      const email = req.query.email;
      const query = {};
      if (email) {
        query.email = email;
      }

      const result = await modelsCollection.find(query).toArray();
      res.send(result);
    });

    // models post method

    app.post("/models", async (req, res) => {
      const data = req.body;
      // console.log(data)
      const result = await modelsCollection.insertOne(data);

      res.send({
        success: true,
        result,
      });
    });

    //  models id

    app.get("/models/:id",verifyFireBaseToken, async (req, res) => {
      const { id } = req.params;
      console.log(id);

      const objectId = new ObjectId(id);

      const result = await modelsCollection.findOne({ _id: objectId });

      res.send({
        success: true,
        result,
      });
    });

    // search

    app.get("/search", async (req, res) => {
      const search_text = req.query.search;
      const result = await modelsCollection
        .find({ name: { $regex: search_text, $options: "i" } })
        .toArray();
      res.send(result);
    });

     // Filter by category
    app.get("/filter", async (req, res) => {
      const category = req.query.category;
      const query = category ? { category } : {};
      const result = await modelsCollection.find(query).toArray();
      res.send(result);
    });


    // models delete

    app.delete("/models/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const result = await modelsCollection.deleteOne(query);

      res.send({
        success: true,
        result,
      });
    });

    //  models update

    app.patch("/models/:id", async (req, res) => {
      const id = req.params.id;

      const updatedProduct = req.body;

      const query = { _id: new ObjectId(id) };

      const update = {
        $set: {
          name: updatedProduct.name,
          price: updatedProduct.price,
        },
      };

      const result = await modelsCollection.updateOne(query, update);

      res.send({
        success: true,
        result,
      });
    });



    //models Recent Listings

    app.get("/latest-models", async (req, res) => {
      const cursor = modelsCollection.find().sort({ date: -1 }).limit(6);
      const result = await cursor.toArray();

      res.send(result);
    });

    // bids related api

    app.get("/bids",verifyFireBaseToken, async (req, res) => {
      console.log("header",req)
      
      const email = req.query.email;
      const query = {};
      if (email) {
        if(email !== req.token_email){
          return res.status(405).send({message: 'forbidded access'})
        }

        query.email = email;
      }

      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // app.get('/models/bids/:productId', async (req, res) =>{
    //   const productId = req.params.productId;
    //   const query = {product: productId}
    //   const cursor = bidsCollection.find(query).sort({price: -1})
    //   const result = await cursor.toArray();
    //   res.send(result)
    // })

    //bids post

    app.post("/bids", async (req, res) => {
      const newBid = req.body;

      const result = await bidsCollection.insertOne(newBid);

      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
