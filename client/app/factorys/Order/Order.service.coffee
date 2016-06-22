'use strict'

angular.module 'goRocketApp'
.factory 'Order', ($http)->
	Order = () ->
		this.items = []
		this.busy = false
		this.after = 9999999
		return
	Order.prototype.nextPage = ->
		if this.busy
			return
		this.busy = true
		$http.get '/api/orders/order_id/'+this.after
		.success ((rows, err) ->
			main_order_datas = _.map(rows, (row) ->
				_.pick(row, ['order_id', 'invoice_prefix', 'invoice_no', 'customer_id', 'firstname', 'lastname', 'total', 'order_status_name', 'date_added', 'email', 'telephone', 'order_status_id']))
			order_ids = _.pluck _.sortByOrder(main_order_datas, ['order_id', 'asc']), 'order_id'
			this.after = order_ids[0]                              
			this.items = this.items.concat main_order_datas
			this.busy = false
			return
		).bind(this)
	return Order
