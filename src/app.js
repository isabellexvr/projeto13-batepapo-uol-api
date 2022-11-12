import express, { json } from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import joi from "joi";
import dayjs from "dayjs";

//mandar objeto sem {}

dayjs.locale("br");
dotenv.config();

const app = express();
app.use(cors());
app.use(json());

const mongoClient = new MongoClient(process.env.MONGO_URI);

try {
  await mongoClient.connect();
} catch (err) {
  console.log(err);
}

const db = mongoClient.db("uolDatabase");
const participantsCollection = db.collection("participants");
const messageCollection = db.collection("messages");

app.post("/participants", async (req, res) => {
  const promptSchema = joi.object({
    name: joi.string().required(),
  });
  const { error } = promptSchema.validate(req.body);
  if (error) {
    res.sendStatus(422);
    return;
  }

  const username = req.body.name;

  try {
    const participantExists = await participantsCollection.findOne({
      name: username,
    });

    if (participantExists) {
      res.sendStatus(409);
      return;
    }
    await participantsCollection.insertOne({
      name: username,
      lastStatus: Date.now(),
    });
    await messageCollection.insertOne({
      from: username,
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

app.get("/participants", async (req, res) => {
  try {
    const participantsCollection = db.collection("participants");
    res.send(await participantsCollection.find().toArray());
  } catch (err) {
    console.log(err);
    res.status(422).send("Não foi possível retornar a lista de participantes.");
  }
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;

  const { from } = req.headers;

  const participantExists = await participantsCollection.findOne({name: from})

  if (!participantExists){
    return res.status(422).send("Participante não existe!");
  }

  const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required()
  });

  const { error } = messageSchema.validate(req.body);

  if (error) {
    return res.status(422).send("Erro na composição da mensagem!");
  }

  await messageCollection.insertOne({
    to,
    text,
    type,
    from,
    time: dayjs().format("HH:mm:ss"),
  });
  res.sendStatus(201);
});

app.listen(5000, () => {
  console.log("Server is running in port 5000");
});
