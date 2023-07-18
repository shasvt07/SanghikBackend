import express from "express";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.js"
import postsRoutes from "./routes/posts.js"
import commentsRoutes from "./routes/comments.js"
import userRoutes from "./routes/User.js"
import dotenv from "dotenv";
import cors from'cors';
import cookieParser from "cookie-parser";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

mongoose.set("strictQuery", false);
dotenv.config();

const app = require("express")();

const server =require("http").createServer(app);
const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: [ "GET", "POST" ]
	}
});

app.use(cors({origin : '*'}));


app.use(cookieParser());
app.use(express.json());
app.use("/api/auth",authRoutes);
app.use("/api/posts",postsRoutes);
app.use("/api/comments",commentsRoutes);
app.use("/api/user",userRoutes);


const connect = () =>{
  mongoose.connect(process.env.MONGO).then(() =>{
      console.log("connected to DB");
  }).catch((error) => {throw error;});
}

const PORT = process.env.PORT || 8082;


server.listen(PORT, () => {
  cors:true
  METHODS:['POST' ,'PATCH','GET','DELETE']
  connect();
  console.log("connnected");
  })


app.use((err , req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    const status = err.status || 500;
    const message = err.message || "Something went wrong";
    return res.status(status).json({
        success:false,
        status,
        message,
    })
})

app.get('/', (req, res) => {
	res.send('Running');
});

let users = [];
let busyUsers = [];

const addUser = (userId, socketId) => {
  !users.some((user) => user.userId === userId) && 
      users.push({userId, socketId})
}

const addBusyUser = (userId) => {
  !users.some((user) => user.userId === userId) && 
      users.push(userId)
}

const removeUser = (socketId) => {
  users = users.filter(user => user.socketId !== socketId);
}

const removeBusyUser = (userId) => {
  users = users.filter(user => user.userId !== userId);
}

io.on("connection", (socket) => {
  socket.on('addUser' , (userId) => {
    addUser(userId, socket.id);
    io.emit("getUsers" , users);   
  })

  socket.on("disconnect" , ()=>{
    removeUser(socket.id)
    io.emit("getUsers" , users);
})

	socket.emit("me", socket.id);

	socket.on("disconnect", () => {
		socket.broadcast.emit("callEnded");
	});

	socket.on("callUser", ({ userToCall, signalData, from, callerName }) => {
		io.to(userToCall).emit("callUser", { signal: signalData, from, callerName});
	});

	socket.on("answerCall", (data) => {
		io.to(data.to).emit("callAccepted", data.signal)
	});

  socket.on("callEnded", () => {
    io.emit("callEnded");
  });


});


