'use strict';

var _ = require('lodash');
var q = require('q');
var Invoice = require('./customer.model');
var mysql = require('mysql');
var db_config = require('../../config/db_config.js');
var mysql_pool = db_config.mysql_pool;



function getCustomerByDate(date) {
	var defer = q.defer();
	var sql = 'select * from oc_customer where date_added >= "' + date + '"';
	console.log(sql);
	mysql_pool.getConnection(function(err, connection){
		connection.query(sql, function(err, rows) {
			connection.release();
			if (err) { defer.reject(err); }
			if(!rows) { defer.reject('Not Found') }
			defer.resolve(rows);
		});
	});
	return defer.promise;
}

var getLoyalCustomers = function(purchase_time) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection){
		var sql = 'select count(customer_id) as num, customer_id, telephone, email, firstname from oc_order where order_status_id in (20,21,28,29,32,34) group by customer_id';
		connection.query(sql, function(err, rows){
			connection.release();
			if (err) {
				defer.reject(err);
			}
			var loyal_customers = _.filter(rows, function(row) {return row.num >= purchase_time;});
			defer.resolve(loyal_customers);
		});
	});
	return defer.promise;
};

var getLoyalCustomersByGroup = function(purchase_time, num_grps, grp) {
	var defer = q.defer();
	getLoyalCustomers(purchase_time).then(function(loyal_customers) {
		var chosen = _.filter(loyal_customers, function(customer) {
			return (customer.customer_id % num_grps) == grp;
		});
		defer.resolve(chosen);
	}, function(err) {
		defer.reject(err);
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

function handleError(res, err) {
	console.log(err);
	return res.status(500).send(err);
}

exports.getCustomerByDate = getCustomerByDate;
exports.getLoyalCustomers = getLoyalCustomers;
exports.getLoyalCustomersByGroup = getLoyalCustomersByGroup;

