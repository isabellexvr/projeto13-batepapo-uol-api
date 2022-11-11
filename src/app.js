import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

dayjs.locale("br");
dotenv.config();

const app = express();
app.use(cors());
app.use(json());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(() => {
  db = mongoClient.db("uolDatabase");
});

const messageSchema = joi.object({
  from: joi.string().required(),
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().required(),
  time: joi.number().required,
});

app.post("/participants", async (req, res) => {
  const promptSchema = joi.object({
    name: joi.string().required(),
  });
  const validation = promptSchema.validate(req.body);
  if (validation.error) {
    res.sendStatus(422);
    return;
  }

  const participantsCollection = db.collection("participants");
  const messageCollection = db.collection("messages");

  try {
    const participants = await participantsCollection.find().toArray();
    const isAlreadyRegistered = participants.find( e => req.body.name === e.name);
    if (isAlreadyRegistered) {
      res.sendStatus(409);
      return;
    }
    await participantsCollection.insertOne({
      name: req.body.name,
      lastStatus: Date.now(),
    });
    await messageCollection.insertOne({
      from: req.body.name,
      to: "Todos",
      text: "entra na sala..",
      type: "status",
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
  }
});

app.listen(5000, () => {
  console.log("Server is running in port 5000");
});
