var jsonwebtoken = require('jsonwebtoken')

let auth = {
  verify: jwt => {
    let secrets = {
      user: 'user secret',
      employee: 'employee secret',
    }
    let token = jwt;
    // let token = socket.request._query.token;
    try {
      let payload = jsonwebtoken.decode(token)
      if (!payload) {
        throw new Error('invalid token / payload not parsed')
      }

      let secret = null
      if (payload.hasOwnProperty('lead_id')) {
        secret = secrets.user
      }
      else if (payload.hasOwnProperty('employee_id')) {
        secret = secrets.employee
      }

      if (!token) {
        throw new Error('invalid payload')
      }

      jsonwebtoken.verify(token, secret)

      console.log('auth ok', payload)

      return true
    }
    catch (e) {
      console.log('auth failed', e)
      return e
    }
  },
  isEmployee: jwt => {
    let token = jwt;
    let payload = jsonwebtoken.decode(token)
    try {
      return payload.hasOwnProperty('employee_id')
    }
    catch (e) {
      return false;
    }
  },
  getPayload: jwt => {
    let token = jwt;
    let payload = jsonwebtoken.decode(token)
    try {
      return payload
    }
    catch (e) {
      return false;
    }
  }
}

module.exports = auth