const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");

require("dotenv").config();
const port = process.env.PORT || 5010;

app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_USER_PASS}@cluster0.h6deoil.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  console.log(authorization);
  if (!authorization) {
    return res.status(401).send({ error: true, message: "Forbidden access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];
  console.log(token);

  jwt.verify(token, process.env.JWT_SECURE_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const classesCollection = client.db("CourseBD").collection("classes");
    const userCollection = client.db("CourseBD").collection("user");

    // instructors Route
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    app.get("/all-classes", async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });
    app.get("/my-classes", verifyJWT, verifyInstructor, async (req, res) => {
      const instructorEmail = req.query.email;
      //   console.log(instructorEmail);
      const filter = {
        email: instructorEmail,
      };
      const result = await classesCollection.find(filter).toArray();
      res.send(result);
    });
    app.post("/add-classes", async (req, res) => {
      const singleClass = req.body;
      console.log(singleClass);
      const result = await classesCollection.insertOne(singleClass);
      res.send(result);
    });

    // User Route
    app.get("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      //   if (req.decoded.email !== email) {
      //     res.send({ admin: false });
      //   }

      const query = { email: email };
      const result = await userCollection.findOne(query);
      //   const result = { admin: user?.role == "admin" };
      res.send(result);
    });
    // app.get(
    //   "/user/instructor/:email",
    //   verifyJWT,
    //   verifyInstructor,
    //   async (req, res) => {
    //     const email = req.params.email;
    //     if (req.decoded.email !== email) {
    //       res.send({ instructor: false });
    //     }

    //     const query = { email: email };
    //     const user = await userCollection.findOne(query);
    //     const result = { instructor: user?.role == "instructor" };
    //     res.send(result);
    //   }
    // );
    app.post("/user", async (req, res) => {
      const userInfo = req.body;
      console.log(userInfo);
      const result = await userCollection.insertOne(userInfo);
      res.send(result);
    });

    // JWT Route
    app.post("/JWT", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECURE_TOKEN, {
        expiresIn: "10h",
      });

      res.send({ token });
    });

    // Send a ping to confirm a successful connection
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
  res.send("Course Is running");
});
app.listen(port, () => {
  console.log("port is running on");
});
