var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
const cors = require('cors');

var io = require('socket.io')(http);
var bodyParser = require("body-parser");

var helper = require('./include/helper');
var lsapis = require('./include/lsapis');

var port = process.env.PORT || 3001;


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use(express.static('public', {
		dotfiles: 'ignore',
		etag: false,
		extensions: ['htm', 'html', 'txt'],
		index: 'index.html',
		maxAge: '1d',
		redirect: false,
		// setHeaders: function (res, path, stat) {
		//     res.set('x-timestamp', Date.now())
		// }
	}
));

app.use(cors())


http.listen(port, function () {
    console.log('listening on *:' + port);
});

/*var redis = require("redis"),
 redis_client = redis.createClient({
 host:'127.0.0.1',
 port:6379,
 db:2
 });*/

require('./include/service/chatService')(app, http)

var socket_list = {};

app.get('/', function (req, res,next) {

    return res.end('ls im');
});

app.get('/atest2018', function (req, res,next) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/disconnect', function (req, res,next) {
    var data = {
        "token": req.headers['authorization'],
        "city": req.query.iso2
    };
    if (!data.token || !data.city) {
        return res.status(606).json({'success': false, 'msg': 'Data lost'});
    }
    var adata = helper.parseAuthData(data);
    var im_userid = helper.getImUserId(adata);

    delete socket_list[im_userid];

    return res.status(200).json({'success': true});
});

app.post('/sendMessage', function (req, res,next) {
    //console.log(req.body);
    var source_user_id = req.body.source_user_id,
        target_user_id = req.body.target_user_id,
        city = req.body.iso2.toLowerCase(),
        message = req.body.message;

    if (!target_user_id || !source_user_id || !city || !message) {
        return res.status(200).json({'success': false, 'msg': 'Data lost'});
    }

    var im_target_user_id = helper.getImUserId({"user_id": target_user_id, "city": city});

    if (socket_list[im_target_user_id]) {

        socket_list[im_target_user_id].emit('receiveMessage', {
            "content": message,
            "source_user_id":source_user_id,
            "target_user_id":target_user_id
        });
    } else {

        return res.status(200).json({'success': false, 'msg': 'Can not found socket object'});
    }

    return res.status(200).json({'success': true});
});


io.on('connection', function (socket) {

    socket.on('connectIm', function (data) {
        //console.log(data);
        if (!data.token || !data.iso2) {
            return socket.emit('connectImRes', {'success':false,'msg': 'Data lost'});
        }
        var adata = helper.parseAuthData(data),
            im_userid = helper.getImUserId(adata);

        if(typeof socket_list[im_userid] == 'object'){
            socket_list[im_userid] = socket;
            return socket.emit('connectImRes', {'success':true,'im_userid': im_userid,'exist':1});
        }

        // lsAuth
        lsapis.userIsAuth(adata,function(error, response, body){
            if(error){
                return socket.emit('connectImRes', {'success':false,'msg':error.toString()});
            }
            if(response.statusCode==200){

                socket_list[im_userid] = socket;

                return socket.emit('connectImRes', {'success':true,'im_userid': im_userid,'exist':0});
            }
            return socket.emit('connectImRes', {'success':false,'msg':body.error.body});
        });

    });

    socket.on('disconnectIm', function (data) {

        if (!data.token || !data.city) {
            return socket.emit('disconnectImRes', {'success':false,'msg': 'Data lost'});
        }
        var adata = helper.parseAuthData(data);
        var im_userid = helper.getImUserId(adata);

        delete socket_list[im_userid];

        return socket.emit('disconnectImRes', {'success':true});
    });

    socket.on('sendTestMessage',function(data){
        //console.log(data);
        var im_userid = '';

        if(data && data.authdata){

            var adata = helper.parseAuthData(data.authdata);
            im_userid = helper.getImUserId(adata);
        }

        if(socket_list[im_userid]){

            return socket_list[im_userid].emit('receiveMessage', {"content": 'IMServer : '+data.message,'broadcast':false});
        }
        //console.log(data);
        return socket.emit('receiveMessage', {"content": 'IMServer : '+data.message,'broadcast':true});
    });
});

//404
app.get('*', function(req, res) {
    return res.status(200).json({'success': false,'msg':"not found"});
});