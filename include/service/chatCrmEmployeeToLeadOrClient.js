var _ = require('lodash');
let auth = require('../auth')
let Response = require('../response')
let mmApi = require('../mmApi')
let lsApi = require('../lsApi')
let lsV2Api = require('../lsV2Api')

module.exports = function (app, http) {

	var chatServiceServer = require('socket.io')(http, {
		path: '/chat.io'
	});

	let leadConnections = {}
	let employeeConnections = {}
	let clientConnections = {}

	app.get('/chat/heartBeat', function (req, res, next) {
		// TODO minor check client side is still alive
		// else remove from leadConnections / employeeConnections
		// else remove lock message
	});

	app.get('/chat/list', function (req, res, next) {
		let rs = {
			leads: [],
			clients: [],
		};
		_.map(leadConnections, (users, userId) => {
			rs.leads.push(userId)
		})
		_.map(clientConnections, (users, userId) => {
			rs.clients.push(userId)
		})
		res.send(rs)
	});

	var waitForFinalEvent = (function () {
		var timers = {};
		return function (callback, ms, uniqueId) {
			if (!uniqueId) {
				uniqueId = "Don't call this twice without a uniqueId";
			}
			if (timers[uniqueId]) {
				clearTimeout(timers[uniqueId]);
			}
			timers[uniqueId] = setTimeout(callback, ms);
		};
	})();

	chatServiceServer.use(function (socket, next) {
		let token = _.get(socket, 'request._query.token')
		auth.verify(token, (err, payload) => {
			err ? next() : next(err)
		})
	});

	chatServiceServer
	.on('connection', function (socket) {

		let connectionId = _.get(socket, 'request._query.t')
		let token = _.get(socket, 'request._query.token')
		let tokenPayload = auth.getPayload(token)
		let userId = auth.getUserId(token)
		let userType = auth.getUserType(token)

		// no employee id anymore!
		if (userType === 'employee'){
			userId = 0
		}

// console.log({
//   connectionId,
// 	token,
// 	tokenPayload,
// 	userId,
//   userType,
// })
		// add connection to pool
		// console.log(userType)
		// console.log(userId)
		switch (userType) {
			case 'employee':
				_.set(employeeConnections, `${userId}.${connectionId}`, {
					payload: tokenPayload,
					socket: socket
				})
				break;
			case 'lead':
				_.set(leadConnections, `${userId}.${connectionId}`, {
					payload: tokenPayload,
					socket: socket
				})
				break;
			case 'client':
				_.set(clientConnections, `${userId}.${connectionId}`, {
					payload: tokenPayload,
					socket: socket
				})
				// console.log(_.keys(clientConnections))
				break;
		}

		// for testing
		socket.on('test', function (data) {
			let res = new Response()
			socket.emit('info', res.ok('ok'))
		})

		socket.on('echo', data => {
			socket.emit('echo', data)
		})

		// broadcast message to target(s)
		socket.on('message', function (data) {

			// validate data
			if (!data.hasOwnProperty('message') || !data.message) {
				return socket.emit('warn', {
					success: false,
					message: 'missing message'
				})
			}

			if (userType === 'employee') {
				// TODO check if the conversation is locked by another employee
				let isLockedByAnother = false;
				if (isLockedByAnother) {
					return socket.emit('warn', {
						message: 'another matchmaking is chatting with this client'
					})
				}
				let leadUserConnections = _.get(leadConnections, _.get(data, 'leadId'))
				let clientUserConnections = _.get(clientConnections, _.get(data, 'clientId'))
// console.log("emploee sent", _.size(clientUserConnections))
				let toClientId = _.get(data, 'clientId')

				if (toClientId){
          lsV2Api.client.post('/employee/sendMessage', {}, {
            headers: {
              Authorization: token,
            },
            params: {
              message: data.message,
              clientId: toClientId,
            }
          }).then(rs => {
            console.log('sent')
          }).catch(err => {
            console.log(err.response.data, err.config)
          })
				}

				if (leadUserConnections) {
					_.map(leadUserConnections, (user, userConnectionId) => {
						console.log(`sent to ${userConnectionId}`)
						user.socket.emit('message', {
							message: data.message,
							employee_id: userId
						})
					})

				}
				else if (clientUserConnections) {
					_.map(clientUserConnections, (user, userConnectionId) => {
						console.log(`sent to ${userConnectionId}`)
						user.socket.emit('message', {
							message: data.message,
							employee_id: userId
            })
          })
        }
        else {
					socket.emit('warn', {
						message: 'client is offline'
					})
				}
			}
			else if (userType === 'lead') {
				// to all online matchmakers
				_.map(employeeConnections, (connections) => {
					_.map(connections, (employee, employeeConnectionId) => {
						console.log(`sent to ${employeeConnectionId}`)
						employee.socket.emit('message', {
							message: data.message,
							leadId: userId,
						})
					})
				})

			}
			else if (userType === 'client') {
        // to all online matchmakers
        _.map(employeeConnections, (connections) => {
          _.map(connections, (employee, employeeConnectionId) => {
            console.log(`sent to ${employeeConnectionId}`)
            employee.socket.emit('message', {
              message: data.message,
              clientId: userId,
            })
          })
        })

        lsV2Api.client.post('/client/sendMessage', {}, {
          headers: {
            Authorization: token,
          },
          params: {
            message: data.message,
          }
        }).then(rs => {
          console.log('sent')
        }).catch(err => {
          console.log(err.response.data, err.config)
        })
      }
      else {
				socket.emit('warn', {
					message: 'your payload is invalid to distinguish the userType'
				})
			}
		});

		socket.on('typing', function (data) {
			           // console.log(data);
						let isTyping = !!_.get(data, 'typing')
						let cacheKey = _.join([
							userType, userId
						], '-')
						if (userType === 'employee') {
							let broadcastToLeadsOrClients = (isTyping) => {
								let employeeUserConnections = _.get(employeeConnections, _.get(data, 'employeeId'))
								let clientUserConnections = _.get(clientConnections, _.get(data, 'clientId'))
			
								if (employeeUserConnections){
						_.map(employeeUserConnections, (user, userConnectionId) => {
						   // console.log(`typing to ${userConnectionId}`)
						  user.socket.emit('typing', {
							typing: isTyping,
						  })
						})
								}
								else if (clientUserConnections){
						_.map(clientUserConnections, (user, userConnectionId) => {
						 // console.log(`typing to ${userConnectionId}`)
						  user.socket.emit('typing', {
							typing: isTyping,
						  })
						})
					  }
							}
			
							if (isTyping) {
								waitForFinalEvent(function () {
									broadcastToLeadsOrClients(false)
								}, 1500, cacheKey)
							}
			
							broadcastToLeadsOrClients(isTyping)
						}
						else if (userType === 'lead') {
			
							let broadcastToLead = (isTyping) => {
								// typing state to all online matchmakers
								_.map(employeeConnections, (connections) => {
									_.map(connections, (employee, employeeConnectionId) => {
										// console.log(`typing to ${employeeConnectionId}`)
										employee.socket.emit('typing', {
											typing: isTyping,
											leadId: userId,
										})
									})
								})
							}
			
							if (isTyping) {
								waitForFinalEvent(function () {
									broadcastToLead(false)
								}, 1500, cacheKey)
							}
							broadcastToLead(isTyping)
						}
						else if (userType === 'client') {
			
							let broadcastToEmployees = (isTyping) => {
								// typing state to all online matchmakers
								_.map(employeeConnections, (connections) => {
									_.map(connections, (employee, employeeConnectionId) => {
										// console.log(`typing to ${employeeConnectionId}`)
										employee.socket.emit('typing', {
											typing: isTyping,
											clientId: userId,
										})
									})
								})
							}
			
							if (isTyping) {
								waitForFinalEvent(function () {
									broadcastToEmployees(false)
								}, 1500, cacheKey)
							}
							broadcastToEmployees(isTyping)
						}
						else {
							socket.emit('warn', {
								message: 'your payload is invalid to distinguish the userType'
							})
						}
					});
		socket.on('disconnect', function () {

			// remove connectionID from connection pools
			let userId = auth.getUserId(token)

			console.log(`disconnect ${userType} # ${userId}`)

			// check user type
			if (userType === 'lead') {
				if (_.has(leadConnections, [userId, connectionId])) {
					delete leadConnections[userId][connectionId]

					// minor delete userId if empty object
					if (!_.size(leadConnections, userId)) {
						delete leadConnections[userId]
					}
				}
			}
			else if (userType === 'employee') {
				if (_.has(employeeConnections, [userId, connectionId])) {
					delete employeeConnections[userId][connectionId]

					// minor delete userId if empty object
					if (!_.size(employeeConnections, userId)) {
						delete employeeConnections[userId]
					}
				}
			}
			else if (userType === 'client') {
				if (_.has(clientConnections, [userId, connectionId])) {
					delete clientConnections[userId][connectionId]

					// minor delete userId if empty object
					if (!_.size(clientConnections, userId)) {
						delete clientConnections[userId]
					}
				}
			}
		});

	});

}
