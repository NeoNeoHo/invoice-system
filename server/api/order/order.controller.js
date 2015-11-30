'use strict';

var _ = require('lodash');
var Order = require('./order.model');
var mysql = require('mysql');
var db_config = require('../../config/db_config.js');
var mysql_config = db_config.mysql_config;
var mysql_connection = mysql.createConnection({
	host: mysql_config.host,
	port: mysql_config.port,
	user: mysql_config.user,
	password: mysql_config.password,
	database: mysql_config.database,
	multipleStatements: true
});


// Get list of orders
exports.index = function(req, res) {
	var order_id = req.params.order_id ? req.params.order_id : 9999999;
	mysql_connection.query('select a.*, b.name as order_status_name from oc_order a, oc_order_status b where a.order_id < ? and a.order_status_id = b.order_status_id and b.language_id = 2 order by a.order_id desc limit 30;', [order_id], function(err, rows) {
		if(err) {
			return handleError(res, err);
		}
		// console.log(_.keys(rows[0]));
		return res.status(200).json(rows);
	});
};




function handleError(res, err) {
	return res.status(500).send(err);
}