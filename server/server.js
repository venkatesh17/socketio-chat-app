const path = require('path');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');

const { generateMessage, generateLocationMessage } = require('./utils/message');
const { isRealString } = require('./utils/validation');
const { Users } = require('./utils/users');

const publicPath = path.join(__dirname, '../public');

const port = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app)

const io = socketIO(server);
let users = new Users();
app.use(express.static(publicPath));

io.on('connection', (socket) => {
    console.log("New user connected");

    socket.on('join', (params, callback) => {
        if (!isRealString(params.name) || !isRealString(params.room)) {
            return callback('Name and room name are required');
        }

        socket.join(params.room);
        users.addUser(socket.id, params.name, params.room);
        io.to(params.room).emit('updateUserList', users.getUserList(params.room));
        socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app'));
        socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `${params.name} joined chat`));
    });

    socket.on("createMessage", (message, callback) => {
        const user = users.getUser(socket.id);
        
        if (user && isRealString(message.text)) {
            io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));   
        }
        
        callback("This message is from the server");
    });

    socket.on('createLocationMessage', (coords) => {
        const user = users.getUser(socket.id);

        if (user) {
            io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude));
        }
        
    })

    socket.on('disconnect', () => {
        var user = users.removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('updateUserList', users.getUserList(user.room));
            io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} left the chat.`));
        };
    });
});

server.listen(port, () => {
    console.log(`server running on ${port}`);
});
