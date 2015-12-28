'use strict';

var _ = require('lodash');
var q = require('q');
var Invoice = require('./invoice.model');
var mysql = require('mysql');
var db_config = require('../../config/db_config.js');
var mysql_connection = db_config.mysql_connection;
var mysql_pool = db_config.mysql_pool;

// Get list of invoices
exports.index = function(req, res) {
	Invoice.find(function (err, invoices) {
		if(err) { return handleError(res, err); }
		return res.status(200).json(invoices);
	});
};

// Get a single invoice
exports.show = function(req, res) {
	Invoice.findById(req.params.id, function (err, invoice) {
		if(err) { return handleError(res, err); }
		if(!invoice) { return res.status(404).send('Not Found'); }
		return res.json(invoice);
	});
};

// Creates a new invoice in the DB.
exports.createInvoiceNo = function(req, res) {
	var date = getFormatDate(req.body.date);
	getNoInvoiceOrders(date)
	.then(function(orders){
		if(orders.length == 0) {
			return res.status(201).json('');
		}
		var grped_orders = _.groupBy(orders, function(order) {
			return order.date_added.getMonth() + 1;  // getMonth() -> Jan = 0, Feb = 1
		});
		var sorted_months = _.sortBy(_.keys(grped_orders), function(item) {
			return parseInt(item);
		});

		_.forEach(sorted_months, function(lmonth) {
			var lorders = grped_orders[lmonth];
			var lyear = lorders[0].date_added.getYear() + 1900;   // getYear() -> start from 1900
			var lday = lorders[0].date_added.getDate();
			var lorder_id = lorders[0].order_id;

			var p1 = getInvoiceSetting();
			var p2 = getLastInvoiceNo(lyear, lmonth);

			var promises = [];
			promises.push(p1);
			promises.push(p2);
			q.all(promises)
			.then(function(datas) {
				var invoice_settings = datas[0];
				var last_invoice_no = datas[1][0].invoice_no;
				var last_invoice_day = datas[1][0].date_added.getDate();
				var last_order_id =  datas[1][0].order_id;
				var invoice_setting = _.find(invoice_settings, function(lset) {
					return (lset.year == lyear) && (lset.month == lmonth);
				});
				var invoice_prefix = invoice_setting.invoice_prefix;
				if(last_invoice_no == 0) {   // 如果是本月第一筆單
					if(invoice_setting.start_no == 0) {   // 如果是雙數月的第二個月，發票號碼則為第一個月的延續
						getLastInvoiceNo(lyear, lmonth-1)
						.then(function(data) {
							var start_invoice_no = (Math.floor(data[0].invoice_no / 50) + 1) * 50;
							setInvoices(last_invoice_day, start_invoice_no, invoice_prefix, lorders)
							.then(function(result) {
								return res.status(200).json(result);
							});
						});
					}
					else {  //  如果是開始月，則號碼從5500開始
						var start_invoice_no = invoice_setting.start_no;	
						setInvoices(last_invoice_day, start_invoice_no, invoice_prefix, lorders)
						.then(function(result) {
							return res.status(200).json(result);
						});					}
				}
				if(last_invoice_no > 0) {    //  如果不是本月的第一筆單，則發票號碼延續下去
					var start_invoice_no = last_invoice_no + 1;
					setInvoices(last_invoice_day, start_invoice_no, invoice_prefix, lorders)
					.then(function(result) {
						return res.status(200).json(result);
					});
				}
				
			}, function(err) {
				return handleError(res, err);
			});
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
	var start_date = year + '-' + month + '-' + '01';
	var end_date = year + '-' + month + '-' + '31';
	mysql_pool.getConnection(function(err, connection){
		connection.query('select invoice_no, date_added, order_id from oc_order where date_added >= ? and date_added <= ? order by invoice_no desc, date_added asc limit 1;', [start_date, end_date], function(err, row){
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

function getNoInvoiceOrders(date) {
	var defer = q.defer();
	var sql_string = 'select order_id, invoice_prefix, invoice_no, date_added from oc_order where invoice_no = 0 and order_status_id in (17, 31, 35, 36, 37, 38, 39, 41, 43) and date_added >= '+mysql_connection.escape(date)+' order by date_added asc;';
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

function setInvoices(last_invoice_day, start_invoice_no, invoice_prefix, lorders) {
	var defer = q.defer();
	var ret = [];
	var error_order = [];
	var result = {};
	_.forEach(_.sortBy(lorders, 'date_added'), function(order) {
		if (last_invoice_day > order.date_added.getDate()) {
			error_order.push('日期比最新的發票早，需要手動開單: order_id = ' + order.order_id + ', date = ' + order.date_added);
		}
		else {
			ret.push({order_id: order.order_id, invoice_no: start_invoice_no, invoice_prefix: invoice_prefix, date_added: order.date_added});
			start_invoice_no += 1;
		}
	});
	// console.log(ret);
	var sql_string = '';
	_.forEach(ret, function(update_order) {
		var sub_string = updateDictSql('oc_order', _.pick(update_order, ['invoice_no', 'invoice_prefix']), _.pick(update_order, 'order_id'));
		if(sql_string.length == 0) {
			sql_string = sub_string;
		}
		else {
			sql_string = sql_string + '; ' + sub_string;
		}
	});
	if(sql_string.length > 0) {
		mysql_pool.getConnection(function(err, connection){
			connection.query(sql_string, function(err, rows) {
				if (err) {
					console.log(err);
					defer.reject(err);
				}
				result['fails'] = error_order;
				result['success'] = ret;
				connection.release();
				defer.resolve(result);
			});
		});
	}
	else {
		defer.resolve('');
	}
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