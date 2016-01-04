'use strict';

var _ = require('lodash');
var Order = require('./reward.model');
var mysql = require('mysql');
var q = require('q');
var db_config = require('../../config/db_config.js');
var mysql_connection = db_config.mysql_connection;
var mysql_pool = db_config.mysql_pool;


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


exports.addRewardsWithStatusAndDate = function(order_status, date) {
	var defer = q.defer();
	getOrdersWithStatusAndDate(order_status, date)
	.then(function(datas) {
		var results = [];
		var promises = [];
		_.forEach(datas, function(ldata){
			promises.push(addRewardIfNotAdd(ldata));
		});
		q.all(promises)
		.then(function(datas){
			_.forEach(datas, function(data) {
				results.push(data);
			});
			defer.resolve(results);
		});	
	});
	return defer.promise;
}

exports.removeRewardsWithStatusAndDate = function(order_status, date) {
	var defer = q.defer();
	getOrdersWithStatusAndDate(order_status, date)
	.then(function(datas) {
		var results = [];
		var promises = [];
		_.forEach(datas, function(ldata){
			promises.push(removeRewardIfAdd(ldata));
		});
		q.all(promises)
		.then(function(datas){
			_.forEach(datas, function(data) {
				results.push(data);
			});
			defer.resolve(results);
		});	
	});
	return defer.promise;
}

function getOrdersWithStatusAndDate(order_status, date) {
	var defer = q.defer();
	var sql_string = 'select order_id, customer_id from oc_order where order_status_id =' +mysql_connection.escape(order_status) +' and date_format(date_modified, "%Y-%m-%d") = ' + mysql_connection.escape(date) + ' order by order_id asc;';
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

function addRewardIfNotAdd(order_info) {
	var defer = q.defer();
	var order_id = order_info.order_id;
	var customer_id = order_info.customer_id;
	getRewardByOrderId(order_id)
	.then(function(allRewards) {
		// console.log(allRewards);
		var positive_reward = _.filter(allRewards, function(reward) { 
			return reward.points > 0;
		});
		// console.log(positive_reward);
		if (_.size(positive_reward) > 0) {   // 如果已經加過紅利點數，則返回
			defer.resolve(order_id + ' already added!');
		}
		else {
			getOrderReward(order_id)
			.then(function(reward_point) {
				if (reward_point[0].points <= 0) {
					defer.resolve(order_id + ' no need to add ' + reward_point[0].points + ' points!');
				}
				else {
					var insert_dict = {};
					insert_dict['customer_id'] = customer_id;
					insert_dict['order_id'] = order_id;
					insert_dict['description'] = '訂單號： #' + order_id + ' 紅利點數';
					insert_dict['points'] = reward_point[0].points;
					insert_dict['date_added'] = new Date();
					insertReward(insert_dict)
					.then(function(result) {
						defer.resolve(order_id + ' add ' + reward_point[0].points + ' points!');
					});
				}
			});
		}
	});
	return defer.promise;
}

function removeRewardIfAdd(order_info) {
	var defer = q.defer();
	var order_id = order_info.order_id;
	var customer_id = order_info.customer_id;
	getRewardByOrderId(order_id)
	.then(function(allRewards) {
		var promises = [];
		var positive_reward = _.filter(allRewards, function(reward) { 
			return reward.points > 0;
		});
		if (_.size(positive_reward) == 0) { // 如果沒有加過紅利點數，則返回
			defer.resolve(order_id + ' already delete reward!');
		}
		else if (_.size(positive_reward) > 0) {   // 如果已經加過紅利點數，則扣除紅利
			_.forEach(positive_reward, function(lreward) {
				var insert_dict = {};
				insert_dict['customer_id'] = customer_id;
				insert_dict['order_id'] = order_id;
				insert_dict['description'] = '訂單號： #' + order_id + ' 商品未取，取消紅利點數 ' + lreward.points + '點';
				insert_dict['points'] = 0;
				insert_dict['date_added'] = new Date();
				promises.push(insertReward(insert_dict));
				promises.push(deleteReward(lreward.customer_reward_id));
			});
			q.all(promises)
			.then(function(results) {
				defer.resolve(order_id + ' remove reward points due to failed order !');
			});
		}
		else {
			defer.resolve('No need to delete any reward');
		}

	});
	return defer.promise;
}

function getRewardByOrderId(order_id) {
	var defer = q.defer();
	var sql_string = 'select * from oc_customer_reward where order_id =' +mysql_connection.escape(order_id) +';';
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

function getOrderReward(order_id) {
	var defer = q.defer();
	var sql_string = 'select sum(reward) as points from oc_order_product where order_id =' +mysql_connection.escape(order_id) +';';
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

function insertReward(insert_dict) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection){
		connection.query('insert into oc_customer_reward set ?', insert_dict, function(err, result){
			if (err) {
				defer.reject(err);
			}
			connection.release();
			defer.resolve(result);
		});
	});
	return defer.promise;
}

function deleteReward(reward_id) {
	var defer = q.defer();
	mysql_pool.getConnection(function(err, connection){
		connection.query('delete from oc_customer_reward where customer_reward_id = ?', reward_id, function(err, result){
			if (err) {
				defer.reject(err);
			}
			connection.release();
			defer.resolve(result);
		});
	});
	return defer.promise;
}

function handleError(res, err) {
	return res.status(500).send(err);
}