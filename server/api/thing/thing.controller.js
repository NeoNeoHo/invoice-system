/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /things              ->  index
 * POST    /things              ->  create
 * GET     /things/:id          ->  show
 * PUT     /things/:id          ->  update
 * DELETE  /things/:id          ->  destroy
 */

'use strict';

var _ = require('lodash');
var Thing = require('./thing.model');
var Disqus = require('disqus-node');
var request = require('request');
var q = require('q');
var md5 = require('md5');
var api_config = require('../../config/api_config.js');

var mailchimp_url = 'https://us10.api.mailchimp.com';
var disqus = new Disqus({
	api_key: '',
	// required
	api_secret: '',
	// required when authentication is required
	access_token: '',
	// defaults shown
	logLevel: 'info',
	https: true
});

// Get list of things
exports.index = function(req, res) {
	disqus.forums.listUsers({
		forum: 'vecsgardeniacomtw',
		limit: 30
	}).then(function (response) {
		res.json(response);
	});
};


exports.getMCListSubscriber = function(req, res) {
	var list_id = req.params.list_id;
	var mail_md5 = md5('b95042@gmail.com');
	request.get(mailchimp_url+'/3.0/lists/' + list_id + '/members/'+mail_md5, {
		'auth': {
			'user': api_config.mailChimp_user_pw.user,
			'pass': api_config.mailChimp_user_pw.pw
		}
	}, function(err, response, body) {
		if(err) { return handleError(res, err); }
		res.json(response);
	});
};

exports.getWomenPageUsers = function() {
	var defer = q.defer();
	disqus.forums.listUsers({
		forum: 'vecsgardeniacomtw'
		// limit: 30
	}).then(function(response) {
		defer.resolve(response);
	}, function(err) {
		defer.reject(err);
	});
	return defer.promise;
};

exports.addMCListSubscribers = function(list_id, subscribers) {
	var defer = q.defer();
	var url = mailchimp_url+'/3.0/batches';
	var batch_request = {
		'operations': []
	};
	_.forEach(subscribers, function(lsub) {
		batch_request.operations.push({
			'method': 'POST',
			'path': '/lists/'+ list_id + '/members',
			// 'operation_id': lsub.email,
			'body': JSON.stringify({
				'email_address' : lsub.email,
				'status': 'subscribed',
				'merge_fields': {
						'FNAME': lsub.name
					}
				})
		});
	});
	console.log(batch_request);
	request({
		url: url,
		method: 'POST', 
		json: batch_request
	}, function(err, response, body) {
		if(err) { defer.reject(err); }
		defer.resolve(response);
	}).auth(api_config.mailChimp_user_pw.user, api_config.mailChimp_user_pw.pw, true);
	return defer.promise;
};

// Get a single thing
exports.show = function(req, res) {
	Thing.findById(req.params.id, function (err, thing) {
		if(err) { return handleError(res, err); }
		if(!thing) { return res.status(404).send('Not Found'); }
		return res.json(thing);
	});
};

// Creates a new thing in the DB.
exports.create = function(req, res) {
	Thing.create(req.body, function(err, thing) {
		if(err) { return handleError(res, err); }
		return res.status(201).json(thing);
	});
};

// Updates an existing thing in the DB.
exports.update = function(req, res) {
	if(req.body._id) { delete req.body._id; }
	Thing.findById(req.params.id, function (err, thing) {
		if (err) { return handleError(res, err); }
		if(!thing) { return res.status(404).send('Not Found'); }
		var updated = _.merge(thing, req.body);
		updated.save(function (err) {
			if (err) { return handleError(res, err); }
			return res.status(200).json(thing);
		});
	});
};

// Deletes a thing from the DB.
exports.destroy = function(req, res) {
	Thing.findById(req.params.id, function (err, thing) {
		if(err) { return handleError(res, err); }
		if(!thing) { return res.status(404).send('Not Found'); }
		thing.remove(function(err) {
			if(err) { return handleError(res, err); }
			return res.status(204).send('No Content');
		});
	});
};

function handleError(res, err) {
	return res.status(500).send(err);
}