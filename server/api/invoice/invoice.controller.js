'use strict';

var _ = require('lodash');
var q = require('q');
var Invoice = require('./invoice.model');
var mysql = require('mysql');
var db_config = require('../../config/db_config.js');
var Order = require('../../api/order/order.controller.js');
var Sendgrid = require('../../api/sendgrid/sendgrid.controller.js');
var mysql_connection = db_config.mysql_connection;
var mysql_pool = db_config.mysql_pool;
var js2xmlparser = require('js2xmlparser');

// Get list of invoices
exports.index = function(req, res) {
	console.log('fdjaofqqq');
	var data = {
    	"firstName": "John",
    	"lastName": "Smith"
	};
	console.log(js2xmlparser("person", data));
	return res.status(200).send(js2xmlparser("person", data));
	// Invoice.find(function (err, invoices) {
	// 	if(err) { return handleError(res, err); }
	// 	return res.status(200).json(invoices);
	// });
};

// Get a single invoice
exports.show = function(req, res) {
	Invoice.findById(req.params.id, function (err, invoice) {
		if(err) { return handleError(res, err); }
		if(!invoice) { return res.status(404).send('Not Found'); }
		return res.json(invoice);
	});
};

function getNoInvoiceOrders(initial_date) {
	var defer = q.defer();
	var sql_string = 'select order_id, order_status_id from oc_order where invoice_no = 0 and order_status_id in (21, 29, 34) and date_added >= '+mysql_connection.escape(initial_date)+' order by order_id asc;';
	mysql_pool.getConnection(function(err, connection){
		connection.query(sql_string, function(err, rows){
			if (err) {
				defer.reject(err);
			}
			connection.release();
			defer.resolve(rows);
		});
	});
	return defer.promise;
}

function setInvoices(start_invoice_no, invoice_prefix, orders) {
	var defer = q.defer();
	var update_coll = [];
	var error_order = [];
	var result = {};
	_.forEach(orders, function(lorder) {
		var ltoday = new Date();
		update_coll.push({order_id: lorder.order_id, invoice_no: start_invoice_no, invoice_prefix: invoice_prefix, date_modified: ltoday, date_added: ltoday, order_status_id: lorder.order_status_id, comment: '已開統一發票: '+invoice_prefix+start_invoice_no});
		start_invoice_no += 1;
	});

	var sql_string = Order.updateBulkSql('oc_order', _.map(update_coll, _.partialRight(_.pick, ['invoice_no', 'invoice_prefix', 'date_modified'])), _.map(update_coll, _.partialRight(_.pick, ['order_id'])));
	sql_string = sql_string + '; ' + Order.insertBulkSql('oc_order_history', _.map(update_coll, _.partialRight(_.pick, ['order_id', 'order_status_id', 'date_added', 'comment'])));
	if(sql_string.length > 0) {
		mysql_pool.getConnection(function(err, connection){
			connection.query(sql_string, function(err, rows) {
				if (err) {
					console.log(err);
					defer.reject(err);
				}
				result['fails'] = error_order;
				result['success'] = update_coll;
				connection.release();
				defer.resolve(result);
			});
		});
	}
	else {
		defer.resolve('');
	}
	return defer.promise;
};

var sendInvoiceMail = function(order_list) {
	var defer = q.defer();
	Sendgrid.getOrdersPersonalizations(order_list).then(function(personalizations_coll) {
		console.log(personalizations_coll);
		Sendgrid.sendInvoiceMail(personalizations_coll).then(function(resp) {
			defer.resolve(resp);
		}, function(err) {
			defer.reject(err);
		});
	}, function(err) {
		defer.reject(err);
	});
	return defer.promise;
};

// Creates a new invoice in the DB.
exports.createInvoiceNo = function(req, res) {
	var date = getFormatDate(req.body.date);
	var initial_date = '2016-05-31';
	getNoInvoiceOrders(initial_date)
	.then(function(orders){
		if(orders.length == 0) {
			return res.status(201).json('');
		}

		var lorders = orders;
		var today = new Date();
		var lyear = today.getFullYear();   // getYear() -> start from 1900
		var lmonth = today.getMonth() + 1; // getMonth() -> start from 0
		var lday = today.getDate();

		var p1 = getInvoiceSetting();
		var p2 = getLastInvoiceNo(lyear, lmonth);

		var promises = [];
		promises.push(p1);
		promises.push(p2);
		q.all(promises)
		.then(function(datas) {
			var invoice_settings = datas[0];
			var last_invoice_no = datas[1][0].invoice_no;
			var invoice_setting = _.find(invoice_settings, function(lset) {
				return (lset.year == lyear) && (lset.month == lmonth);
			});
			var invoice_prefix = invoice_setting.invoice_prefix;
			if(last_invoice_no == 0) {   // 如果是本月第一筆單
				if(invoice_setting.start_no == 0) {   // 如果是雙數月的第二個月，發票號碼則為第一個月的延續
					getLastInvoiceNo(lyear, lmonth-1)
					.then(function(data) {
						var start_invoice_no = (Math.floor(data[0].invoice_no / 50) + 1) * 50;
						setInvoices(start_invoice_no, invoice_prefix, lorders)
						.then(function(result) {
							sendInvoiceMail(_.pluck(lorders, 'order_id')).then(function(resp) {
								return res.status(200).json(resp);
							}, function(err) {
								return handleError(res, err);
							});
						}, function(err) {
							return handleError(res, err);
						});
					});
				}
				else {  //  如果是開始月，則號碼從5500開始
					var start_invoice_no = invoice_setting.start_no;	
					setInvoices(start_invoice_no, invoice_prefix, lorders)
					.then(function(result) {
						sendInvoiceMail(_.pluck(lorders, 'order_id')).then(function(resp) {
							return res.status(200).json(resp);
						}, function(err) {
							return handleError(res, err);
						});
					}, function(err) {
						return handleError(res, err);
					});
				}
			}
			if(last_invoice_no > 0) {    //  如果不是本月的第一筆單，則發票號碼延續下去
				var start_invoice_no = last_invoice_no + 1;
				setInvoices(start_invoice_no, invoice_prefix, lorders)
				.then(function(result) {
					sendInvoiceMail(_.pluck(lorders, 'order_id')).then(function(resp) {
						return res.status(200).json(resp);
					}, function(err) {
						return handleError(res, err);
					});
				}, function(err) {
					return handleError(res, err);
				});
			}
			
		}, function(err) {
			return handleError(res, err);
		});
	}, function(err){
		return res.status(404).json('yes');
	});
};

exports.printInvoiceAll = function(req, res) {
	var promises = [];
	var order_ids = _.pluck(req.body.orders, 'order_id');
	promises.push(getOrderById(order_ids));
	promises.push(getOrderTotalById(order_ids));

	q.all(promises)
	.then(function(datas) {
		var order_info = datas[0];
		var order_accounting = datas[1];
		console.log(order_accounting);
	}, function(err) { 
		return handleError(res, err); 
	});
}

// Updates an existing invoice in the DB.
exports.update = function(req, res) {
	if(req.body._id) { delete req.body._id; }
	Invoice.findById(req.params.id, function (err, invoice) {
		if (err) { return handleError(res, err); }
		if(!invoice) { return res.status(404).send('Not Found'); }
		var updated = _.merge(invoice, req.body);
		updated.save(function (err) {
			if (err) { return handleError(res, err); }
			return res.status(200).json(invoice);
		});
	});
};

// Deletes a invoice from the DB.
exports.destroy = function(req, res) {
	Invoice.findById(req.params.id, function (err, invoice) {
		if(err) { return handleError(res, err); }
		if(!invoice) { return res.status(404).send('Not Found'); }
		invoice.remove(function(err) {
			if(err) { return handleError(res, err); }
			return res.status(204).send('No Content');
		});
	});
};

exports.AutoCreateInvoiceNo = function(initial_date) {
	getNoInvoiceOrders(initial_date)
	.then(function(orders){
		if(orders.length == 0) {
			return false;
		}
		var lorders = orders;
		var today = new Date();
		var lyear = today.getFullYear();   // getYear() -> start from 1900
		var lmonth = today.getMonth() + 1; // getMonth() -> start from 0
		var lday = today.getDate();

		var p1 = getInvoiceSetting();
		var p2 = getLastInvoiceNo(lyear, lmonth);

		var promises = [];
		promises.push(p1);
		promises.push(p2);
		q.all(promises)
		.then(function(datas) {
			var invoice_settings = datas[0];
			var last_invoice_no = datas[1][0].invoice_no;
			var invoice_setting = _.find(invoice_settings, function(lset) {
				return (lset.year == lyear) && (lset.month == lmonth);
			});
			var invoice_prefix = invoice_setting.invoice_prefix;
			if(last_invoice_no == 0) {   // 如果是本月第一筆單
				if(invoice_setting.start_no == 0) {   // 如果是雙數月的第二個月，發票號碼則為第一個月的延續
					getLastInvoiceNo(lyear, lmonth-1)
					.then(function(data) {
						var start_invoice_no = (Math.floor(data[0].invoice_no / 50) + 1) * 50;
						setInvoices(start_invoice_no, invoice_prefix, lorders)
						.then(function(result) {
							sendInvoiceMail(_.pluck(lorders, 'order_id')).then(function(resp) {
								return resp;
							}, function(err) {
								return err;
							});
						});
					});
				}
				else {  //  如果是開始月，則號碼從5500開始
					var start_invoice_no = invoice_setting.start_no;	
					setInvoices(start_invoice_no, invoice_prefix, lorders)
					.then(function(result) {
						sendInvoiceMail(_.pluck(lorders, 'order_id')).then(function(resp) {
							return resp;
						}, function(err) {
							return err;
						});
					});					
				}
			}
			if(last_invoice_no > 0) {    //  如果不是本月的第一筆單，則發票號碼延續下去
				var start_invoice_no = last_invoice_no + 1;
				setInvoices(start_invoice_no, invoice_prefix, lorders)
				.then(function(result) {
					sendInvoiceMail(_.pluck(lorders, 'order_id')).then(function(resp) {
						return resp;
					}, function(err) {
						return err;
					});
				});
			}
			
		}, function(err) {
			return err;
		});
	}, function(err){
		return err;
	});
};


function getOrderById(order_id) {
	var defer = q.defer();
	var sql = 'select * from oc_order where order_id in ' + mysql_connection.escape([order_id]);
	mysql_pool.getConnection(function(err, connection){
		connection.query(sql, function(err, rows) {
			if (err) { defer.reject(err); }
			if(!rows) { defer.reject('Not Found') }
			connection.release();
			defer.resolve(rows);
		});
	});
	return defer.promise;
}

function getOrderTotalById(order_id) {
	var defer = q.defer();
	var sql = 'select * from oc_order_total where order_id in ' + mysql_connection.escape([order_id]);
	mysql_pool.getConnection(function(err, connection){
		connection.query(sql, function(err, rows) {
			if (err) { defer.reject(err); }
			if(!rows) { defer.reject('Not Found') }
			connection.release();
			defer.resolve(rows);
		});
	});
	return defer.promise;
}

function getLastInvoiceNo(year, month) {
	var defer = q.defer();
	month = month >= 10 ? month : '0'+month;
	var start_date = year + '-' + month + '-' + '01';
	var end_date = year + '-' + month + '-' + '31';
	console.log(start_date);
	console.log(end_date);
	mysql_pool.getConnection(function(err, connection){
		connection.query('select invoice_no, date_added, order_id from oc_order where date_format(date_added,"%Y-%m-%d") >= ? and date_format(date_added, "%Y-%m-%d") <= ? order by invoice_no desc, date_added asc limit 1;', [start_date, end_date], function(err, row){
			if (err) {
				defer.reject(err);
			}
			connection.release();
			defer.resolve(row);
		});
	});
	return defer.promise;
}

function getInvoiceSetting() {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection){
		connection.query('select * from oc_invoice_setting', function(err, rows){
			if (err) {
				defer.reject(err);
			}
			connection.release();
			defer.resolve(rows);
		});
	});
	return defer.promise;
}

function getFormatDate(date_string) {
	return date_string.split('T')[0];
}


function updateDictSql(table, update_dict, condition_dict) {
	var set_string = '';
	var where_string = '';
	_.forEach(_.pairs(update_dict), function(pair) {
		if(set_string.length == 0) {
			set_string = pair[0] + ' = ' + mysql_connection.escape(pair[1]);
		}
		else {
			set_string = set_string + ', ' + pair[0] + ' = ' + mysql_connection.escape(pair[1]);
		}
	});
	_.forEach(_.pairs(condition_dict), function(pair) {
		if(where_string.length == 0) {
			where_string = pair[0] + ' = ' + pair[1];
		}
		else {
			where_string = where_string + ', ' + pair[0] + ' = ' + pair[1];
		}

	});
	var sql_string = 'update ' + table + ' set ' + set_string + ' where ' + where_string;
	return sql_string;
}

function handleError(res, err) {
	console.log(err);
	return res.status(500).send(err);
}