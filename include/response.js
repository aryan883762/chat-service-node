
class Response {

  constructor() {
    this.success = true
    this.message = 'ok'
    this.data = {}
  }

  fail(message, data) {
    this.message = message
    this.success = false
    if (data) {
      this.data = data
    }

    return this
  }

  ok(message, data) {
    this.message = message
    this.success = true
    if (data) {
      this.data = data
    }

    return this
  }
}

module.exports = Response