const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
//middleware

app.use(cors());
app.use(express.json());


// URL
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ro517.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    console.log('abc')
    const authHeaders = req.headers.authorization;
    if (!authHeaders) {
        return res.status(401).send({ message: 'UnAuthorize access' });

    }
    const token = authHeaders.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {

        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}




async function run() {


    try {
        await client.connect();
        const headphoneCollection = client.db('Headphone').collection('headphones');
        const reviewsCollection = client.db('Headphone').collection('reviews');
        const orderCollection = client.db('Headphone').collection('order');
        const userCollection = client.db('Headphone').collection('user');
        const paymentCollection = client.db('Headphone').collection('payment');



        //products
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = headphoneCollection.find(query);
            const product = await cursor.toArray();
            res.send(product);

        })
        app.post('/products', async (req, res) => {
            const newProduct = req.body;
            const service = await headphoneCollection.insertOne(newProduct)
            res.send(service)
        })
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const product = await headphoneCollection.findOne(query);
            res.send(product)
        })
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await headphoneCollection.deleteOne(query);
            res.send(result);



        })

        //reviews
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewsCollection.find(query);
            const review = await cursor.toArray();
            res.send(review);

        })
        app.post('/reviews', async (req, res) => {
            const newReview = req.body;
            const review = await reviewsCollection.insertOne(newReview)
            res.send(review)
        })
        //reviews
        app.get('/order', async (req, res) => {
            const query = {};
            const cursor = orderCollection.find(query);
            const order = await cursor.toArray();
            res.send(order);

        })
        app.post('/order', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order)
            res.send(result)
        })


        app.get('/myorder', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const order = await orderCollection.find(query).toArray();
            res.send(order)

        })
        app.get('/myorder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await orderCollection.findOne(query);
            res.send(result);


        })
        app.delete('/myorder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })
        // 
        app.post("/create-payment-intent", async (req, res) => {

            const service = req.body;
            const price = service.productPrice;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create(
                {
                    amount: amount,
                    currency: 'usd',
                    payment_method_types: ['card']

                });
            res.send({ clientSecret: paymentIntent.client_secret })

        })

        app.patch('/order/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {

                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }

            }

            const UpdateOrderPayment = await orderCollection.updateOne(filter, updateDoc);
            const result = await paymentCollection.insertOne(payment)
            res.send(updateDoc);



        })




        //post user
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body
            const filter = { email: email };
            const option = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, option);
            //token.............................................
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })

            res.send({ result, token });

        })

        //.................................................................................
        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                }
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result);

            }
            else {
                res.status(403).send({ message: 'forbidden' })
            }
        })

        app.get('/admin/:email', verifyJWT ,async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })

        })

        app.get('/user', verifyJWT, async (req, res) => {
            const user = await userCollection.find().toArray();
            res.send(user)
        })



    }

    finally {

    }
} run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('running server ')
});
app.listen(port, () => {
    console.log("I AM FIRST OPERATION MOZAHID", port)

})