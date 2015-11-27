'use strict'

angular.module 'goRocketApp'
.controller 'MainCtrl', ($scope, $http, Order, $uibModal, $log) ->
	$scope.orders = new Order()
	$scope.dt = new Date()
	$scope.status = 
		opened: false
	$scope.openDatePicker = ($event) ->
		$scope.status.opened = true

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

