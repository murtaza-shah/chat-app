let app = require('express')();
let http = require('http').createServer(app);
let io = require('socket.io')(http);

let user_count = 0;
let users = [];
let messages = [];
function pad(val){
    return (val<10) ? '0' + val : val;
  }

app.get('/', function(req,res){
    res.sendFile(__dirname + '/index.html')
})

io.on('connection', function(socket){

    // Increments the number of users connected once a new socket connects
    // and assigns them a default username of User* where * is the number they incremented the counter to
    socket.on('user-count', function(data){
        user_count++;
        users.push({
            id: data.id,
            name: `User${user_count}`,
            color: 'rgb(99, 110, 114)'
        });
        // Sending a socket message to show this new user all previous messages
        io.emit('catch-up', {previousMsgs: messages});
        // Sending a socket message to greet this user to the chat room with a server message
        io.emit('enter-room', {newUser : `User${user_count}`, allUsers: users});
        // Sending a socket message to update the list of online users to include this new user
        io.emit('userlist', {allUsers: users});
    });

    // Socket message handler for a message being sent
    socket.on('message sent', function(data){ 
        let index = users.findIndex(a => a.id == data.id);
        if(data.message.split(" ")[0] == '/nickcolor'){
            // Unformatted color (RRGGBB)
            let unf_color = data.message.split(' ')[1];
            // If unformatted color is too long/short
            if(unf_color.length != 6){
                io.to(data.id).emit('server-msg', {message: 'Invalid colour provided! Must be in format RRGGBB'});
                return;
            }
            // Splitting up unformatted color into R G B
            let r = unf_color.slice(0,2);
            let g = unf_color.slice(2,4);
            let b = unf_color.slice(4,6);
            let f_color = `rgb(${r},${g},${b})`;
            // Updating user's color
            users[index].color = f_color;
            // Updating userlist to show user's new color
            io.emit('userlist', {allUsers: users});
            return;
        }

        else if(data.message.split(" ")[0] == '/nick'){
            // Check if username is taken
            for(i=0;i<users.length;i++){
                if(users[i].name == data.message.split(" ")[1]){
                    io.to(data.id).emit('server-msg', {message: 'Username is taken! Try again.'});
                    return;
                };
            }
            let temp = users[index].name;
            users[index].name = data.message.split(" ")[1];
            // Show what user's name previously was, and what it was changed to
            io.emit('server-msg', {message: `User '${temp}' changed name to '${users[index].name}'!`});
            // Update list of users to reflect new name
            io.emit('userlist', {allUsers: users});
            return;
        }
        // All other commands are invalid
        else if(data.message[0] == '/'){
            io.to(data.id).emit('server-msg', {message: 'Invalid command! Try /nick or /nickcolor.'});
            return;
        }
        // Calculating timestamp
        let hrs = new Date(Date.now()).getHours();
        let mins = new Date(Date.now()).getMinutes();
        let timestamp = `${pad(hrs)}:${pad(mins)}`
        messages.push({
            msg: data.message,
            user: users[index].name,
            time: timestamp,
            color: users[index].color
        });
        io.emit('message sent', {uname: users[index].name, message: data.message, time: timestamp, color: users[index].color, allUsers: users});
    });

    // Sending a 'User x has disconnected' message, and updating user list
    socket.on('disconnect', function(){
        let index = users.findIndex(a => a.id == socket.id);
        let userLeft = users[index].name;
        users.splice(index,1);
        io.emit('server-msg', {message: `${userLeft} has disconnected.`});
        io.emit('userlist', {allUsers: users});
    });


  });

http.listen(3000, function(){
    console.log('listening on server *:3000');
})