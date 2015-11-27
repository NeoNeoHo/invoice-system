'use strict'

angular.module 'goRocketApp'
.controller 'InvoiceBuildModalCtrl', ($scope, $http, $filter, $uibModalInstance, info) ->
	console.log info
	$scope.info = info
	$scope.enableCreateInvoice = true

	$scope.ok = () ->
		$http.post('/api/invoices/createInvoiceNo/', 'date': info.dt)
		.then (status_code) ->	
			$scope.enableCreateInvoice = false
			$scope.ret_data = status_code.data
			# $uibModalInstance.close(status_code)
		, (err) ->
			$scope.ret_data = err

	$scope.printInvoice = () ->
		if not $scope.ret_data
			console.log 'No'
			return
		else
			console.log $scope.ret_data.success
			$http.post('/api/invoices/printInvoice/all/', 'orders': $scope.ret_data.success)
			.then (invoices) ->
				console.log invoices
			, (err) ->
				console.log err

	$scope.cancel = () ->
		$uibModalInstance.dismiss('cancel')

	$scope.exportAction = () ->
		$scope.$broadcast 'export-pdf', {}
		# switch $scope.export_action
		# 	when 'pdf'
		# 		$scope.$broadcast 'export-pdf', {}
		# 	when 'excel'
		# 		$scope.$broadcast 'export-excel', {}
		# 	when 'doc'
		# 		$scope.$broadcast 'export-doc', {}
		# 	else
		# 		console.log 'no event caught'
		return

