const config = require('./config.default')
module.exports = {
  ...config,
  ...{
    someCustomKey: 'some value'
  }
}