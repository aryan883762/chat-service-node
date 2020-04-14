**Readme**

## Chat service
### Demo

- start server
```
# Install yarn if you don't
npm i -g yarn

# Download libraries
yarn install


## Inbox

> javascript socket.io


`<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.2.0/socket.io.js"></script>`

```javascript

var socket = io.connect(''),
authdata = {"token":"","":""};

//connect
//params: token=>user_id:api_token
//       iso2 (eg.HK as hongkong)

socket.emit('connectIm',authdata);

socket.on('connectImRes',function(res){
    //console.log(res);
    //todo something
});
//receiveMessage
socket.on('receiveMessage', function(res){
    //console.log(res);
    //todo something
});

//send message:for test
socket.emit('sendTestMessage', {'message':encodeURIComponent(message),'authdata':authdata});

//disconnect
socket.emit('disconnectIm',authdata)
socket.on('disconnectImRes',function(res){
    //console.log(res);
    //todo something
});

```






> Message sending still calls API to complete message sending in the background：
```markdown
[post] /{city}/message/{source_user_id}/{target_user_id}

```




> API will call im api in the background

```markdown
[post] http://im.lovestruck.com/sendMessage
params:source_user_id,target_user_id,message,iso2
```



> Process Manage

```
pm2 stop|start|restart LSIM
```