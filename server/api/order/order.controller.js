'use strict';

var _ = require('lodash');
var Order = require('./order.model');
var q = require('q');
var mysql = require('mysql');
var db_config = require('../../config/db_config.js');
var mysql_pool = db_config.mysql_pool;
var moment = require('moment');

// Get list of orders
exports.index = function(req, res) {
	var order_id = req.params.order_id ? req.params.order_id : 9999999;
	mysql_pool.getConnection(function(err, connection){
		connection.query('select a.*, b.name as order_status_name from oc_order a, oc_order_status b where a.order_id < ? and a.order_status_id = b.order_status_id and b.language_id = 2 order by a.order_id desc limit 30;', [order_id], function(err, rows) {
			connection.release();
			if(err) {
				return handleError(res, err);
			}
			return res.status(200).json(rows);
		});
	});
};

exports.getIssuedOrders = function(req, res) {
	var now = moment();
	var start_day = now.subtract(30, 'days').format('YYYY-MM-DD');
	var end_day = now.subtract(150, 'days').format('YYYY-MM-DD');
	mysql_pool.getConnection(function(err, connection){
		var sql = 'select a.*, b.name as order_status_name from oc_order a, oc_order_status b where date_format(a.date_added, "%Y-%m-%d") <= ' + connection.escape(start_day) + ' and date_format(a.date_added, "%Y-%m-%d") >= ' + connection.escape(end_day) + ' and a.order_status_id in (20, 28, 32) and a.order_status_id = b.order_status_id and b.language_id = 2 order by a.order_id asc;';
		connection.query(sql, function(err, rows) {
			connection.release();
			if(err) {
				return handleError(res, err);
			}
			return res.status(200).json(rows);
		});
	});
};

var getOrders = function(order_list) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection){
		var sql = 'select a.*, b.name as order_status_name from oc_order a, oc_order_status b where a.order_id in (' + connection.escape(order_list) + ') and a.order_status_id = b.order_status_id and b.language_id = 2';
		connection.query(sql, function(err, rows) {
			connection.release();
			if(err) {
				defer.reject(err);
			}
			defer.resolve(rows);
		});
	});	
	return defer.promise;
};

var getOrdersByDate = function(date) {
	var defer = q.defer();
	var day = moment(date);
	var expire_date = day.subtract(14, 'days').format('YYYY-MM-DD');
	mysql_pool.getConnection(function(err, connection){
		var sql = 'select a.*, b.name as order_status_name from oc_order a, oc_order_status b where date_format(a.date_added, "%Y-%m-%d") <= ' + connection.escape(date) + ' and date_format(a.date_added, "%Y-%m-%d") >= ' + connection.escape(expire_date) + ' and a.order_status_id = b.order_status_id and b.language_id = 2 order by a.order_id asc;';
		connection.query(sql, function(err, rows){
			connection.release();
			if (err) {
				defer.reject(err);
			}
			defer.resolve(rows);
		});
	});
	return defer.promise;
};

var updateDictSql = function(table, update_dict, condition_dict) {
	var set_string = '';
	var where_string = '';
	_.forEach(_.pairs(update_dict), function(pair) {
		if(set_string.length == 0) {
			set_string = pair[0] + ' = ' + mysql_pool.escape(pair[1]);
		}
		else {
			set_string = set_string + ', ' + pair[0] + ' = ' + mysql_pool.escape(pair[1]);
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

var insertDictSql = function(table, insert_dict) {
	var set_string = '';
	_.forEach(_.pairs(insert_dict), function(pair) {
		if(set_string.length == 0) {
			set_string = pair[0] + ' = ' + mysql_pool.escape(pair[1]);
		}
		else {
			set_string = set_string + ', ' + pair[0] + ' = ' + mysql_pool.escape(pair[1]);
		}
	});
	var sql_string = 'insert into ' + table + ' set ' + set_string;
	return sql_string;
}

var updateBulkSql = function(table, update_coll, condition_coll) {
	var sqls = '';
	for(var i = 0; i < _.size(update_coll); i++) {
		var sub_sql = updateDictSql(table, update_coll[i], condition_coll[i]);
		if(sqls.length == 0) {
			sqls = sub_sql;
		} else {
			sqls = sqls + '; ' + sub_sql;
		}
	}
	return sqls;
};

function insertBulkSql(table, insert_coll) {
	var sqls = '';
	_.forEach(insert_coll, function(insert_dict) {
		var sub_sql = insertDictSql(table, insert_dict);
		if(sqls.length == 0) {
			sqls = sub_sql;
		} else {
			sqls = sqls + '; ' + sub_sql;
		}
	});
	return sqls;
}

function handleError(res, err) {
	return res.status(500).send(err);
}

exports.getOrders = getOrders;
exports.getOrdersByDate = getOrdersByDate;
exports.updateDictSql = updateDictSql;
exports.updateBulkSql = updateBulkSql;
exports.insertBulkSql = insertBulkSql;