const env = require("dotenv");
const path = require("path");
const http = require("http");
const express = require("express");
const socketIo = require("socket.io");

const { generateMessage, generateLocationMessage } = require('./utils/message');
const { isRealString } = require('./utils/isRealString');
const { Users } = require('./utils/user')

const publicPath = path.join(__dirname, "/../public");
const port = process.env.PORT || 80;
const app = express();
const dotenv = env.config();
let server = http.createServer(app);
let io = socketIo(server);
let users = new Users();


app.use(express.static(publicPath));


io.on('connection', (socket) => {
    socket.on('join', (params, callback) => {
        if (!isRealString(params.name) || !isRealString(params.room)) {
            return callback('Name and room are required')
        }

        socket.join(params.room);
        users.removeUser(socket.id);
        users.addUser(socket.id, params.name, params.room)


        io.to(params.room).emit('updateUsersList', users.getUserList(params.room))
        socket.emit('newMessage', generateMessage("Admin", `Welcome to my ${params.room}! chat room`));
        let user = users.getUser(socket.id);
        socket.broadcast.to(params.room).emit('newMessage', generateMessage("Admin", `${user.name} Joined the chat room`));
        callback();
    })
    socket.on("createMessage", (message, callback) => {
        let user = users.getUser(socket.id);
        if (user && isRealString(message.text)) {
            io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));
        }
        callback('This is server')
    })

    socket.on('createLocationMessage', function (coords) {
        let user = users.getUser(socket.id);
        if (user) {
            io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.lat, coords.lng))
        }
    })

    socket.on('disconnect', () => {
        let user = users.removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('updateUsersList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} Has left ${user.room} chat room`))
        }
    });
});

server.listen(port, () => {
    console.log(`http://localhost/`);
})