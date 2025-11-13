const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express()
const port = 3000


app.use(cors());
app.use(express.json())

// model-db
// XRmb4HC8MWBB8yb9


// const uri = "mongodb+srv://model-db:XRmb4HC8MWBB8yb9@cluster0.6si5fpl.mongodb.net/?appName=Cluster0";
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.6si5fpl.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    await client.connect();

    const db = client.db('model-db')
    const modelsCollection = db.collection('models')
    const bidsCollection = db.collection('bids')


    //fine
    // find one

    app.get('/models', async(req ,res)=>{


        const result = await modelsCollection.find().toArray()
        res.send(result)
    })


    app.get('/models/:id', async(req, res) =>{
      const {id} = req.params
      console.log(id)

      const objectId = new ObjectId(id)

      const result = await modelsCollection.findOne({_id: objectId})

      res.send({
        success: true,
        result
      })
    })

    // search

    app.get("/search", async(req, res)=>{
      const search_text = req.query.search
      const result = await modelsCollection.find({name: {$regex: search_text, $options: "i"}}).toArray()
      res.send(result)

    })

    

    


    // models delete

    app.delete('/models/:id', async(req, res) =>{
      const id = req.params.id
      

      const query = {_id: new ObjectId(id)}

      const result = await modelsCollection.deleteOne(query)

      res.send({
        success: true,
        result
      })
    })


    //  models update

    app.patch('/models/:id', async(req, res) =>{
      const id = req.params.id

      const updatedProduct = req.body
      

      const query = {_id: new ObjectId(id)}

      const update = {
        $set:{
          name: updatedProduct.name,
          price: updatedProduct.price
        }
      }

      const result = await modelsCollection.updateOne(query,update)

      res.send({
        success: true,
        result
      })
    })




    

    // models post method

    app.post('/models', async(req, res) =>{
      const data = req.body
      // console.log(data)
      const result = await modelsCollection.insertOne(data)

      res.send({
        success: true,
        result
      })
    })

    //models Recent Listings

    app.get('/latest-models', async(req, res)=>{
      const cursor = modelsCollection.find().sort({date: -1}).limit(6);
      const result = await cursor.toArray();

      res.send(result)
    })




    // bids related api

    app.get('/bids', async(req, res) =>{


      const email = req.query.email;
      const query = {};
      if(email){
        query.email = email
      }



      const cursor = bidsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })


    // app.get('/models/bids/:productId', async (req, res) =>{
    //   const productId = req.params.productId;
    //   const query = {product: productId}
    //   const cursor = bidsCollection.find(query).sort({price: -1})
    //   const result = await cursor.toArray();
    //   res.send(result)
    // })


    //bids post 

    app.post('/bids', async(req, res) =>{
      const newBid = req.body
      // console.log(data)
      const result = await bidsCollection.insertOne(newBid)

      res.send({
        success: true,
        result
      })
    })









    
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);








app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
