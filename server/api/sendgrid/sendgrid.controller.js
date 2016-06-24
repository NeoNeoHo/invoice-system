'use strict';

var _ = require('lodash');
var q = require('q');
var db_config = require('../../config/db_config.js');
var mysql_pool = db_config.mysql_pool;
var api_config = require('../../config/api_config');
var Order = require('../../api/order/order.controller.js');
var sendgrid_template = require('../../components/sendgrid_template');

var sendgrid_engine = require('sendgrid').SendGrid(api_config.SENDGRID_API_KEY);
var utf8 = require('utf8');
// Get list of orders
exports.index = function(req, res) {
	var order_id = req.params.order_id ? req.params.order_id : 9999999;
	mysql_pool.getConnection(function(err, connection){
		connection.query('select a.*, b.name as order_status_name from oc_order a, oc_order_status b where a.order_id < ? and a.order_status_id = b.order_status_id and b.language_id = 2 order by a.order_id desc limit 30;', [order_id], function(err, rows) {
			if(err) {
				return handleError(res, err);
			}
			connection.release();
			return res.status(200).json(rows);
		});
	});
};

exports.getOrdersPersonalizations = function(order_list) {
	var defer = q.defer();
	var personalizations_coll = [];
	Order.getOrders(order_list).then(function(order_coll) {
		personalizations_coll = _.reduce(order_coll, function(lpersonalization, order_obj) {
			lpersonalization.push({
				// "subject": String(subject_title),
				"substitutions": {
					"-subject-": 'Hi '+ order_obj.firstname+', '+"您的發票號碼來囉",
					"-name-": order_obj.firstname,
					"-order_id-": String(order_obj.order_id),
					"-invoice_no-": order_obj.invoice_prefix+order_obj.invoice_no
				},
				"to": [
					{
						"email": order_obj.email
					}
				]
			});
			return lpersonalization;
		}, []);
		defer.resolve(personalizations_coll);
	}, function(err) {
		defer.reject(err);
	});
	return defer.promise;
};

exports.getOopsOrderFailsReminderPersonalizations = function(order_list) {
	var defer = q.defer();
	var personalizations_coll = [];
	Order.getOrders(order_list).then(function(order_coll) {
		personalizations_coll = _.reduce(order_coll, function(lpersonalization, order_obj) {
			lpersonalization.push({
				// "subject": String(subject_title),
				"substitutions": {
					"-subject-": 'Hi '+ order_obj.firstname+', '+"購物上遇到問題了嗎？",
					"-preheader-": '嘉丹妮爾客服小組，為您把關購物的每個環節',
					"-name-": order_obj.firstname,
					"-order_id-": String(order_obj.order_id),
				},
				"to": [
					{
						"email": order_obj.email
					}
				]
			});
			return lpersonalization;
		}, []);
		defer.resolve(personalizations_coll);
	}, function(err) {
		defer.reject(err);
	});
	return defer.promise;
};

exports.sendInvoiceMail = function(personalizations_coll) {
	var defer = q.defer();
	var request = sendgrid_engine.emptyRequest();

	request.method = 'POST';
	request.path = '/v3/mail/send';
	request.body = sendgrid_template.invoice_template(personalizations_coll);

	sendgrid_engine.API(request, function (response) {
		console.log(response.statusCode);
		console.log(response.body);
		console.log(response.headers);
		defer.resolve(response);
	});
	return defer.promise;
};

exports.sendOopsOrderFailsReminderMail = function(personalizations_coll) {
	var defer = q.defer();
	var request = sendgrid_engine.emptyRequest();

	request.method = 'POST';
	request.path = '/v3/mail/send';
	request.body = sendgrid_template.oops_order_fails_reminder(personalizations_coll);

	sendgrid_engine.API(request, function (response) {
		console.log(response.statusCode);
		console.log(response.body);
		console.log(response.headers);
		defer.resolve(response);
	});
	return defer.promise;
};

function handleError(res, err) {
	return res.status(500).send(err);
}