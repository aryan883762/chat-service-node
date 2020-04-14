const axios = require('axios')
let config = require('./config')

let crmApi = {
  send: (path, params, cb) => {
    axios.post(`${config.crmApiUrl}${path}`, {
      params: params
    })
      .then(rs => {
        // rs.data
        cb(null, rs)
      })
      .catch(err => {
        // console.log(err)
        // TODO error log / slack notification
        // cb(err)
      })
  }
}

module.exports = crmApi