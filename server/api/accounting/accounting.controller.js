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

var EZSHIP_COMPLETE_ORDER_STATUS_ID = 34;
var EZSHIP_SHIPPING_ORDER_STATUS_ID = 28;

exports.checkEzship = function(req, res) {
	var file_name = req.params.file_name;
	var balanced_document = req.params.balanced_document;
	var file_contents = fs.readFileSync(EZSHIP_DIR + file_name);
	var summary = {
		issued_records: [],
		double_counted_anomaly_records: [],
		double_counted_normal_records: [],
		initial_status_anomaly_records: [],
		credit_card_records: []
	};

	// ############  Read Ezship File and Parse the Content ###################
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

		// ############  Kick out Credit Card Orders ###################
		records = _.reject(records, function(lrecord) {
			if(lrecord['服務類別'].includes('取貨不付款')) {
				summary.credit_card_records.push({ezship_id: lrecord['配送編號'], order_id: lrecord.order_id});
			}
			return lrecord['服務類別'].includes('取貨不付款');
		})

		// ############  Pluck the Order_Id from Records ###################
		var order_list = _.pluck(records, 'order_id');

		Order.getOrders(order_list).then(function(orders) {

			// ############  Kick out Whose Status Is Already Being 'COMPLETED' ###################
			orders = _.reject(orders, function(lorder) {
				if(lorder.order_status_id == EZSHIP_COMPLETE_ORDER_STATUS_ID && lorder.balanced_document !== balanced_document) {
					summary.double_counted_anomaly_records.push({order_id: lorder.order_id, action: '檢查此單第一次關帳日期，追查！', balanced_document: lorder.balanced_document, total: lorder.total, balanced: -lorder.total});
				} else if(lorder.order_status_id == EZSHIP_COMPLETE_ORDER_STATUS_ID && lorder.balanced_document === balanced_document) {
					summary.double_counted_normal_records.push({order_id: lorder.order_id, balanced_document: lorder.balanced_document});
				}
				return lorder.order_status_id == EZSHIP_COMPLETE_ORDER_STATUS_ID;
			});

			// ############  Kick out Whose Initial Status Is Not EZSHIP_SHIP ###################
			orders = _.reject(orders, function(lorder) {
				if(lorder.order_status_id !== EZSHIP_SHIPPING_ORDER_STATUS_ID) {
					summary.initial_status_anomaly_records.push({order_id: lorder.order_id, action: '確認是否有出貨記錄！', balanced_document: lorder.balanced_document, total: lorder.total, balanced: -lorder.total});
				}
				return lorder.order_status_id !== EZSHIP_SHIPPING_ORDER_STATUS_ID;
			});

			// ############  Compare Our Order's Total Price With the Coresponding Record's Total Price ###################
			var compared_result = _.reduce(records, function(compared_result, lrecord) {
				var lorder = _.find(orders, {'order_id': lrecord.order_id});
				if(lorder) {
					var balanced = lrecord.total - Math.round(parseFloat(lorder.total));
					compared_result.push({ezship_id: lrecord['配送編號'], order_id: lrecord.order_id, balanced: balanced, total: lrecord.total, action: (balanced == 0) ? 'Check OK' : '檢查代收金額'});
				}
				return compared_result;
			}, []);

			// ############  If Order vs Record are not Matching, Write the Result to Issued_records ###################
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
			summary['accounts_receivable_double_counted_anomaly'] = _.reduce(summary['double_counted_anomaly_records'], function(lsum, lrecord) {
				lsum += lrecord.balanced;
				return lsum;
			}, 0);

			// ############  Update Balanced Orders' Status to 34  ################
			summary.balanced_records = _.map(summary.balanced_records, function(lrecord) {
				lrecord.order_status_id = 34;
				lrecord.balanced_document = balanced_document;
				lrecord.date_modified = new Date();
				return lrecord;
			});
			var sqls = Order.updateBulkSql('oc_order', _.map(summary.balanced_records, _.partialRight(_.pick, ['order_status_id', 'balanced_document', 'date_modified'])), _.map(summary.balanced_records, _.partialRight(_.pick, ['order_id'])));

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
	});
};

var checkEzcat = function(date) {
	date;
};

var checkCreditCard = function(data) {

};

function handleError(res, err) {
	return res.status(500).send(err);
}

exports.checkEzcat = checkEzcat;
exports.checkCreditCard = checkCreditCard;
