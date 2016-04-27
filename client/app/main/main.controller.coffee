'use strict'

angular.module 'goRocketApp'
.controller 'MainCtrl', ($scope, $http, Order, $uibModal, $log) ->
	$scope.orders = new Order()
	$scope.dt = new Date()
	$scope.test = () ->
		$http.get '/api/rewards/reset/2015/20000'
		.then (data) ->
			console.log data
	$scope.status = 
		opened: false
	$scope.openDatePicker = ($event) ->
		$scope.status.opened = true
	$scope.add_mailChimp_sub = () ->
		$http.post '/api/things/mailchimp', {
			'list_id': '31093812',
			'email': 'b9999@gmail.com'
			}
		.then (data) ->
			console.log data
	$scope.openInvoiceBuildModal = () ->
		modalInstance = $uibModal.open(
			animation: true
			templateUrl: '/app/main/invoice_build_confirm_modal.html'
			controller: 'InvoiceBuildModalCtrl'
			resolve: 
				info:
					dt: $scope.dt
		)
		modalInstance.result.then ((selectedItem) ->
			$scope.selected = selectedItem
			return
		), ->
			$log.info 'Modal dismissed at: ' + new Date
			return
		return

