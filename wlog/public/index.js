/*
 * @(#) index.js 1.0, 2014. 4. 25.
 * 
 * Copyright (c) 2014 Jong-Bok,Park  All rights reserved.
 */
'use strict';

var app = angular.module('app', []);

app.controller('indexCtrl',['$scope', '$http', function($scope, $http){

	$scope.user = {};
	$scope.login = function(){
		if(!$scope.user.id){
			$scope.errMsg = 'Input your User ID!';
			return;
		}
		if(!$scope.user.passWd){
			$scope.errMsg = 'Input your Password!';
			return;
		}
		console.log($scope.user);
		$http.post('/login', $scope.user).
			success(function(data){
				if(data.success){
					window.location.href = '/wlog';
				}else{
					$scope.errMsg = 'Invalid User ID or Password.';
				}
			}).
			error(function(){
				alert('error');
			});
	};
	
	$scope.keypress = function(){
		if(event.which === 13){
			$scope.login();
		}
	};
	
}]);