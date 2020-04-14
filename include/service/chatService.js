var _ = require('lodash');
const auth = require('../auth')
const Response = require('../response')
const crmApi = require('../crmApi')

module.exports = function(app, http){

	var chatServiceServer = require('socket.io')(http, {
		path: '/chat.io'
	});

	let leadConnections = {}
	let employeeConnections = {}

	app.get('/chat/heartBeat', function (req, res, next) {
		// TODO minor check client side is still alive
		// else remove from leadConnections / employeeConnections
		// else remove lock message
	});

	app.get('/chat/list', function (req, res, next) {
		let rs =[];
		_.map(leadConnections, (users, userId) => {
			rs.push(userId)
		})
		res.send({leads: rs})
	});

	app.get('/chat/conversation', function (req, res, next) {
		// CRM API provide
	});

	var waitForFinalEvent = (function () {
		var timers = {};
		return function (callback, ms, uniqueId) {
			if (!uniqueId) { uniqueId = "Don't call this twice without a uniqueId"; }
			if (timers[uniqueId]) { clearTimeout (timers[uniqueId]); }
			timers[uniqueId] = setTimeout(callback, ms);
		};
	})();

	chatServiceServer.use(function (socket, next) {

		let token = socket.request._query.token
		// console.log(socket.request._query)
		let result = auth.verify(token)

		result === true ? next() : next(result)
	});

	chatServiceServer
		.on('connection', function (socket) {

			let connectionId = socket.request._query.t;
			let token = socket.request._query.token
			let tokenPayload = auth.getPayload(token)
			let userId = auth.isEmployee(token) ? tokenPayload.employee_id : tokenPayload.lead_id
			let userType = auth.isEmployee(token) ? 'employee' : 'lead'

			// add connection to pool
			if (auth.isEmployee(token)) {

				// broadcast message to target(s)
				if (!leadConnections.hasOwnProperty(userId)) {
					employeeConnections[userId] = {};
				}
				employeeConnections[userId][socket.request._query.t] = {
					payload: tokenPayload,
					socket: socket
				}
			}
			else {
				if (!leadConnections.hasOwnProperty(userId)) {
					leadConnections[userId] = {};
				}
				leadConnections[userId][socket.request._query.t] = {
					payload: tokenPayload,
					socket: socket
				}
			}

			// for testing
			socket.on('test', function (data) {
				let res = new Response()
				socket.emit('info', res.ok('ok'))
			})

			// broadcast message to target(s)
			socket.on('message', function (data) {

				// validate data
				if (!data.hasOwnProperty('message') || !data.message){
					return socket.emit('warn', {
						success: false,
						message: 'missing message'
					})
				}

				if (userType === 'employee'){
					// TODO check if the conversation is locked by another employee
					let isLockedByAnother = false;
					if (isLockedByAnother){
						return socket.emit('warn', {
							message: 'another matchmaking is chatting with this client'
						})
					}

					let clientConnections = _.get(leadConnections, data.lead_id)
					if (clientConnections){
						_.map(clientConnections, (user, userConnectionId) => {
							console.log(`sent to ${userConnectionId}`)
							user.socket.emit('message', {
								message: data.message,
								employee_id: userId
							})
						})

						// TODO mysql save lead_msg
						crmApi.send('/lead/msg', {
							employee_id: userId,
							message: data.message,
							// TODO ...
						})
					}
					else{
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
								lead_id: userId,
							})
						})
					})

					// TODO mysql save lead_msg
					crmApi.send('/lead/msg', {
						employee_id: userId,
						message: data.message,
						// TODO ...
					})
				}
				else{
					socket.emit('warn', {
						message: 'your payload is invalid to distinguish the userType'
					})
				}
			});

			socket.on('typing', function (data) {

				let isTyping = !!_.get(data, 'typing')

				let cacheKey = _.join([
					userType, userId
				], '-')

				if (userType === 'employee'){

					let broadcastToEmployee = (isTyping) => {
						let clientConnections = _.get(leadConnections, data.lead_id)
						_.map(clientConnections, (user, userConnectionId) => {
							console.log(`typing to ${userConnectionId}`)
							user.socket.emit('typing', {
								typing: isTyping,
							})
						})
					}

					if (isTyping){
						waitForFinalEvent(function(){
							broadcastToEmployee(false)
						}, 1500, cacheKey)
					}

					broadcastToEmployee(isTyping)
				}
				else if (userType === 'lead') {

					let broadcastToLead = (isTyping) => {
						// typing state to all online matchmakers
						_.map(employeeConnections, (connections) => {
							_.map(connections, (employee, employeeConnectionId) => {
								console.log(`typing to ${employeeConnectionId}`)
								employee.socket.emit('typing', {
									typing: isTyping,
								})
							})
						})
					}

					if (isTyping){
						waitForFinalEvent(function(){
							broadcastToLead(false)
						}, 1500, cacheKey)
					}
					broadcastToLead(isTyping)
				}
				else{
					socket.emit('warn', {
						message: 'your payload is invalid to distinguish the userType'
					})
				}
			});

			socket.on('disconnect', function(){

				// remove connectionID from connection pools
				let userId = auth.isEmployee(token) ? tokenPayload.employee_id : tokenPayload.lead_id

				// check user type
				if (userType === 'lead'){
					if (_.has(leadConnections, [userId, connectionId])) {
						delete leadConnections[userId][connectionId]

						// minor delete userId if empty object
						if (!_.size(leadConnections, userId)){
							delete leadConnections[userId]
						}
					}
				}
				else if (userType === 'employee'){
					if (_.has(employeeConnections, [userId, connectionId])) {
						delete employeeConnections[userId][connectionId]

						// minor delete userId if empty object
						if (!_.size(employeeConnections, userId)){
							delete employeeConnections[userId]
						}
					}
				}
			});

		});

}
