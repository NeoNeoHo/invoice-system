'use strict'

angular.module 'goRocketApp'
.controller 'IssuesCtrl', ($scope, $http, $q, Auth) ->
	$http.get('api/orders/issued_order').then ((resp) ->
		$scope.issued_orders = resp.data
		console.log($scope.issued_orders)
		$scope.total_debt = _.reduce($scope.issued_orders, ((sum, order) ->
			sum += Math.round order.total
			return sum
		), 0)
		return
	), (err) ->
		console.log err.status
		return

