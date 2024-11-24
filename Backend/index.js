require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

//Creating Socket Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
  },
});

app.use(cors());
app.use(express.json());

///Connect to mongodb
const mongoConnection = mongoose.connect(process.env.MONGO_URI);

//Schemas
const taskSchema = new mongoose.Schema({
  text: String,
  completed: Boolean,
});

const Task = mongoose.model("Task", taskSchema);

app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks).status(200);
  } catch (error) {
    res.json(400);
    console.log("Error while getting data: ", error);
  }
});

app.post("/tasks", async (req, res) => {
  try {
    const task = new Task(req.body);
    await task.save();
    res.json(task);

    //Emit event to all clients
    io.emit("taskAdded", task);
  } catch (error) {
    res.json(error).status(500);
    console.log("Error while adding task: ", error);
  }
});

app.delete("/tasks/:id", async (req, res) => {
  if (!req.params.id) {
    console.log("No such task found");
  }
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.sendStatus(204);

    //Notify client task deletion
    io.emit("taskDeleted", req.params.id);
  } catch (error) {
    res.json(error).status(500);
    console.log("Error while deleting task: ", error);
  }
});

//WebSocket Connection
io.on("connection", (socket) => {
  console.log("A user Connected: ", socket.id);
});

io.on("disconnect", () => {
  console.log("user disconnected: ", socket.id);
});

server.listen(5000, () => {
  console.log("Backend running on port 5000");
  if (mongoConnection) {
    console.log("Mongodb Connected Successfully");
  }
});
