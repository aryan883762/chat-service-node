/**
 * Created by aryan on 2018/12/5.
 */
module.exports = {
    clientErrorHandler:function(err, req, res, next){
        res.status(500).send('Something blew up.....');
        /*if (req.xhr) {
            res.status(500).send({ error: 'Something blew up!' });
        } else {
            next(err);
        }*/
    },
    errorHandler:function(err, req, res, next){
        //res.status(500).send({ error: err });
        res.status(500).send('Something blew up');
    }
};