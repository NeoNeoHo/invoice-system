'use strict';

var _ = require('lodash');
var Accounting = require('./accounting.model');
var db_config = require('../../config/db_config.js');
var mysql_pool = db_config.mysql_pool;
var fs = require('fs');
var parse = require('csv-parse');
var upload_config = require('../../config/upload_config.js');
var Order = require('../../api/order/order.controller.js');
var EZSHIP_DIR = upload_config.accounting.ezship_dir;
var EZCAT_DIR = upload_config.accounting.ezcat_dir;

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

exports.checkEzship = function(req, res) {
	var file_name = req.params.file_name;
	var balanced_document = req.params.balanced_document;
	var file_contents = fs.readFileSync(EZSHIP_DIR + file_name);
	var summary = {
		issued_records: []
	};
	parse(file_contents, {columns: true}, function(err, records) {
		if(err) {
			return res.status(500).send(err);
		}
		records = _.map(records, function(lrecord) {
			lrecord['order_id'] = parseInt( (lrecord['商品備註'].split('--')[0]) ? (lrecord['商品備註'].split('--')[0]) : (lrecord['拍賣編號'] ? lrecord['拍賣編號'] : 0));
			lrecord['total'] = Math.round(parseFloat(lrecord['代收金額']));
			if(isNaN(lrecord['order_id'])) {
				lrecord['order_id'] = 0;
				summary.issued_records.push({ezship_id: lrecord['配送編號'], action: '檢查訂單編號', total: lrecord.total, balanced: -lrecord.total});
			}
			return lrecord;
		})

		// Kick out credit card orders
		records = _.reject(records, function(lrecord) {
			return lrecord['服務類別'].includes('取貨不付款');
		})
		var order_list = _.pluck(records, 'order_id');

		Order.getOrders(order_list).then(function(orders) {
			var compared_result = _.reduce(records, function(compared_result, lrecord) {
				var lorder = _.find(orders, {'order_id': lrecord.order_id});
				if(lorder) {
					var balanced = lrecord.total - Math.round(parseFloat(lorder.total));
					compared_result.push({ezship_id: lrecord['配送編號'], order_id: lrecord.order_id, balanced: balanced, total: lrecord.total, action: (balanced == 0) ? 'Check OK' : '檢查代收金額'});
				}
				return compared_result;
			}, []);
			summary.issued_records = summary.issued_records.concat(_.filter(compared_result, function(lresult) {return lresult.balanced != 0;}));
			summary['balanced_records'] = _.filter(compared_result, function(lresult) {return lresult.balanced == 0;});
			summary['accounts_receivable'] = _.reduce(summary['balanced_records'], function(lsum, lrecord) {
				lsum += lrecord.total;
				return lsum;
			}, 0);
			summary['accounts_receivable_shortage'] = _.reduce(summary['issued_records'], function(lsum, lrecord) {
				lsum += lrecord.balanced;
				return lsum;
			}, 0);
			// console.log(summary);

			// Update balanced orders' status to 34
			summary.balanced_records = _.map(summary.balanced_records, function(lrecord) {
				lrecord.order_status_id = 34;
				lrecord.balanced_document = balanced_document;
				lrecord.date_modified = new Date();
				return lrecord;
			});
			var sqls = Order.updateBulkSql('oc_order', _.map(summary.balanced_records, _.partialRight(_.pick, ['order_status_id', 'balanced_document', 'date_modified'])), _.map(summary.balanced_records, _.partialRight(_.pick, ['order_id'])));
			// sqls = sqls + '; ' + Order.insertBulkSql('oc_order_history', _.map(summary.balanced_records, _.partialRight(_.pick, ['order_id', 'order_status_id', 'date_added', 'comment'])));
			// console.log(sqls);
			if(sqls.length > 0) {
				mysql_pool.getConnection(function(err, connection){
					connection.query(sqls,  function(err, rows) {	
						if (err) {
							connection.release();
							console.log(err);
							return res.status(500).send(err);
						}
						connection.release();
						return res.status(200).json(summary);
					});
				});
			} else {
				return res.status(200).json(summary);
			}
			
		}, function(err) {
			console.log(err);
			return res.status(500).send(err);
		});
		// return res.status(200).send(records);
	});
};

exports.checkEzcat = function(req, res) {
	var file = req.files;
	var file_path = file.file.path;
	return res.status(200).send(file_path);
};



function handleError(res, err) {
	return res.status(500).send(err);
}