const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors(
    {
        origin: ['http://localhost:5173'],
        optionsSuccessStatus: 200,
        credentials: true
    }
));
app.use(express.json());


//  token verification
const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log(authHeader);
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
    });
}


// verify seller
const verifySeller = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    if (user?.role !== 'seller') {
        return res.status(403).send({ message: 'forbidden access' });
    }
    next();
}


// verify admin
const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email; 
    const query = { email: email };
    
    // Find user by email
    const user = await usersCollection.findOne(query);
    
    if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'Forbidden: You are not an admin' });
    }

    next();  
}



// mongoDB

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oldlbnp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
});

// Collection
const usersCollection = client.db('gadgetShop').collection('users');
const productCollection = client.db('gadgetShop').collection('products');



const dbConnect = async () => {
    try {
        await client.connect();
        console.log("Database Connected");

        // get users
        app.get('/user/:email', async (req, res) => {
            const query = {email: req.params.email};
            const user = await usersCollection.findOne(query);
            // if (user) {
            //     return res.send({ message: 'No User Found' });
            // }
            res.send(user);
        });

        // users post
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists' });
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // GET route to fetch all users
        app.get('/users', async (req, res) => {
            try {
        const users = await usersCollection.find({}).toArray();
        res.status(200).send(users);
            } catch (error) {
              res.status(500).send({ message: 'Error fetching users', error: error.message });
              }
             });

             // PATCH route to update user role
app.patch('/users/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body; // role should be 'admin' in this case
  
    if (!role) {
      return res.status(400).send({ message: 'Role is required' });
    }
  
    try {
      const result = await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { role: role } }
      );
      if (result.matchedCount === 0) {
        return res.status(404).send({ message: 'User not found' });
      }
      res.status(200).send({ message: 'User role updated successfully' });
    } catch (error) {
      res.status(500).send({ message: 'Error updating user role', error: error.message });
    }
  });
  
  // DELETE route to remove user
  app.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).send({ message: 'User not found' });
      }
      res.status(200).send({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).send({ message: 'Error deleting user', error: error.message });
    }
  });



     // PATCH route to approve a user (change status to "approved")
     app.patch('/users/:id/status', async (req, res) => {
        const userId = req.params.id;
        try {
            const result = await usersCollection.updateOne(
                { _id: new require('mongodb').ObjectId(userId) },
                { $set: { status: 'approved' } }
            );
            if (result.modifiedCount === 1) {
                res.status(200).send({ message: 'User approved successfully' });
            } else {
                res.status(400).send({ message: 'User not found or already approved' });
            }
        } catch (error) {
            res.status(500).send({ message: 'Error approving user', error: error.message });
        }
    });

    // DELETE route to remove a user
    app.delete('/users/:id', async (req, res) => {
        const userId = req.params.id;
        try {
            const result = await usersCollection.deleteOne({ _id: new require('mongodb').ObjectId(userId) });
            if (result.deletedCount === 1) {
                res.status(200).send({ message: 'User deleted successfully' });
            } else {
                res.status(400).send({ message: 'User not found' });
            }
        } catch (error) {
            res.status(500).send({ message: 'Error deleting user', error: error.message });
        }
    });



    // Fetch all products
    app.get('/products', async (req, res) => {
        try {
          // Use productCollection to query MongoDB
          const products = await productCollection.find().toArray(); // Fetch all products and convert to an array
          res.status(200).json(products);
        } catch (error) {
          res.status(500).json({ message: 'Failed to fetch products', error });
        }
      });
      ;
  
  // Delete a product by ID
  app.delete('/products/:id', async (req, res) => {
    const { id } = req.params;
  
    try {
      // Ensure the `id` is a valid MongoDB ObjectId
      const objectId = new ObjectId(id);
  
      // Delete the product from the `products` collection
      const result = await productCollection.deleteOne({ _id: objectId });
  
      if (result.deletedCount === 1) {
        res.status(200).json({ message: 'Product deleted successfully' });
      } else {
        res.status(404).json({ message: 'Product not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete product', error });
    }
  });




  // Approve user (change status to 'approved')
app.put('/users/approve/:id', async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
      res.json(user);
    } catch (error) {
      res.status(500).send('Error approving user');
    }
  });
  
  // Delete user
  app.delete('/users/:id', async (req, res) => {
    try {
      await User.findByIdAndDelete(req.params.id);
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).send('Error deleting user');
    }
  })
  


        // add product 
        app.post('/add-products', verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });

        // get products
        app.get('/all-products', async (req, res) => {

            const {title, sort, category, brand, page = 1, limit = 12 } = req.query;
            const query = {};
            if (title) {
                query.title = { $regex: title, $options: 'i' };
            };
            if (category) {
                query.category = { $regex: category, $options: 'i' };
            };
            if (brand) {
                query.brand = brand;
            };

            const pageNumber = Number(page);
            const limitNumber = Number(limit);
            
            const sortOption = sort === 'asc' ? 1: -1;

            const products = await productCollection
            .find(query)
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .sort({ price: sortOption })
            .toArray();
            
            const totalProduct = await productCollection.countDocuments(query);

             const brands = [...new Set(products.map((product) => product.brand))];
             const categories = [...new Set(products.map((product) => product.category))];

            res.json({products, totalProduct, categories, brands});
        });

        // add to wishlist
        app.patch("/wishlist/add", async(req,res)=> {
            const {userEmail, productId} = req.body;

            const result = await usersCollection.updateOne(
                {email: userEmail},
                 {$addToSet: {wishlist: new ObjectId(String(productId))}
            });
            res.send(result);
        });

        // remove wishlist

        app.patch("/wishlist/remove", async(req,res)=> {
            const {userEmail, productId} = req.body;

            const result = await usersCollection.updateOne(
                {email: userEmail},
                 {$pull: {wishlist: new ObjectId(String(productId))}
            });
            res.send(result);
        });




        // get wishlist
        app.get("/wishlist/:userId", verifyJWT, async(req,res)=> {
            const userId = req.params.userId;
            
            const user = await usersCollection.findOne({_id:new ObjectId(String(userId))});
            if(!user) {
                return res.status(403).send({message: 'User not found'});
            }

            const wishlist = await productCollection.find({_id: {$in: user.wishlist || []}}).toArray();
            res.send(wishlist);

        });


        // remove wishlist
        


      

    } catch (error) {
        console.log(error.name, error.message);
    }
}
dbConnect();

// api

app.get('/', (req, res) => {
    res.send('Server Is Running!')
  });
  // JWT 
  app.post('/jwt', (req, res) => {
    const userEmail = req.body;
    const token = jwt.sign(userEmail, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '7d'
    });
    res.send({token});
  });

  app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
  });