/**
 * Created by aryan on 2018/12/4.
 */

module.exports = {

    parseAuthData:function(data){
        var token = data.token.split(':'),
            city = data.iso2.toLowerCase();

        return {
            "user_id":token[0],
            "api_token":token[1],
            "city":city
            //"im_user_id":city+'_'+token[0],
            //"user_key":city+':'+token[0]
        };
    },
    getImUserId:function(data){
        return data.city+'_'+data.user_id;
    },
    getUserKey:function(data){
        return data.city+':'+data.user_id;
    }


};