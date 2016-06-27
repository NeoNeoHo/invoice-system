'use strict';

exports.invoice_template = function(personalizations_coll) {
	return {
		"content": [
		{
			"type": "text/html",
			"value": " "
		}
		],
		"from": {
			"email": "benson@vecsgardenia.com",
			"name": "嘉丹妮爾的訂單小提醒"
		},
		"personalizations": personalizations_coll,
		"reply_to": {
			"email": "benson@vecsgardenia.com",
			"name": "嘉丹妮爾客服小組"
		},
		"subject": "Hello, World!",
		"template_id": "71abec21-e89e-4bf1-aca0-79fa509fae4c",
		// "send_at": Math.round(new Date().getTime()/1000),
		"tracking_settings": {
			"click_tracking": {
				"enable": true,
				"enable_text": true
			},
			"ganalytics": {
				"enable": true,
				"utm_campaign": "sendgrid",
				"utm_content": "sendgrid",
				"utm_medium": "email",
				"utm_name": "invoice",
				"utm_term": ""
			},
			"open_tracking": {
				"enable": true,
				"substitution_tag": "%opentrack"
			}
			// "subscription_tracking": {
			// 	"enable": true,
			// 	"html": "If you would like to unsubscribe and stop receiving these emails <% clickhere %>.",
			// 	"substitution_tag": "<%click here%>",
			// 	"text": "If you would like to unsubscribe and stop receiveing these emails <% click here %>."
			// }
		}
	};
};

exports.oops_order_fails_reminder_template = function(personalizations_coll) {
	return {
		"content": [
		{
			"type": "text/html",
			"value": " "
		}
		],
		"from": {
			"email": "benson@vecsgardenia.com",
			"name": "嘉丹妮爾的訂單小提醒"
		},
		"personalizations": personalizations_coll,
		"reply_to": {
			"email": "benson@vecsgardenia.com",
			"name": "嘉丹妮爾客服小組"
		},
		"subject": "Hello, World!",
		"template_id": "c4c609dc-2744-4689-9bed-03061457e117",
		// "send_at": Math.round(new Date().getTime()/1000),
		"tracking_settings": {
			"click_tracking": {
				"enable": true,
				"enable_text": true
			},
			"ganalytics": {
				"enable": true,
				"utm_campaign": "sendgrid",
				"utm_content": "sendgrid",
				"utm_medium": "email",
				"utm_name": "order_oops",
				"utm_term": ""
			},
			"open_tracking": {
				"enable": true,
				"substitution_tag": "%opentrack"
			}
		}
	};
}