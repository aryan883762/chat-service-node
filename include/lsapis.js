/**
 * Created by aryan on 2018/12/4.
 */
//
var request = require('request');

module.exports = {
    /*getAllSites:function(callback){
        request({
            url: '',
            method: "GET",
            json: true,
            headers: {
                "content-type": "application/json"
            }
        }, function(error, response, body) {
            callback && callback(error, response, body);

        });
    },*/
    userIsAuth:function(data,callback){
        var authorization = data.user_id+':'+data.api_token,
            url = ''+data.city+'/user/isAuth';

        request({
            url: url,
            method: "GET",
            json: true,
            headers: {
                "content-type": "application/json",
                "authorization":authorization
            }
        }, function(error, response, body) {
            callback && callback(error, response, body);

        });

    }

};