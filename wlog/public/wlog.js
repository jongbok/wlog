/*
 * @(#) wlog.js 1.0, 2014. 4. 16.
 * 
 * Copyright (c) 2014 Jong-Bok,Park  All rights reserved.
 */
'use strict';
Date.prototype.getHms = function(){
	var hour = this.getHours();
	var min = this.getMinutes();
	var sec = this.getSeconds();
	var format = hour > 9? hour: '0' + hour;
	format += ':';
	format += min > 9? min: '0' + min;
	format += ':';
	format += sec > 9? sec: '0' + sec;
	return format;
};

Date.prototype.setHms = function(hms){
	var arr = hms.split(':');
	var hour = parseInt(arr[0]);
	var min = parseInt(arr[1]);
	var sec = parseInt(arr[2]);
	this.setHours(hour, min, sec, 0);
};

$.blockUI.defaults.css.cursor = 'default';
$.blockUI.defaults.overlayCSS.cursor = 'default';

var socket = io.connect('http://localhost:3000');
var app = angular.module('app', []);

app.controller('wlogCtrl',['$scope', '$http', function($scope, $http){
	$(document).ready(function(){
		$('div.content').block({message:null});
		document.onkeydown = function(evt) {
			switch (evt.keyCode) {
				case 13:
					if($scope.tabs.idx === 1){
						alert('tail start');
					}
					break;
				case 27:
					if($scope.tabs.idx === 1){
						alert('tail stop');
					}
					break;
				case 34:
					if($scope.tabs.idx === 0){
						alert('nextview');
					}
					break;
			}
		};	
		
		var gap = $(window).height() - $("#wrapper").height();
		$("#output").height($(window).height()-250);
		$("#left-sidebar").height($(window).height() - gap - $("#header").height() - $("#footer").height() );
		$(window).resize(function(){
			$("#output").height($(window).height()-250);
			$("#left-sidebar").height($(window).height() - gap - $("#header").height() - $("#footer").height() );
		});
	});
	
	$scope.autocomplete = {};
	$scope.autocomplete.source = ["error|Error|ERROR", "Exception|\\sat\\s"];
	$scope.autocomplete.keypress = function(filterText){
		if(event.keyCode === 13){
			alert(filterText);
		}
	};
	
	function changeDateTime(){
		var d = new Date($scope.search.date);
		var times = $scope.search.time.split(':');
		var start = 0;
		var per = 1;
		var first, last, prev, next, gap;
		d.setHours(times[0], times[1], times[2], 0);
		if(d.getTime() <= $scope.ctime.getTime()){
			console.log('calculate start - 1');
			$scope.search.date = new Date($scope.ctime);
			$scope.search.time = $scope.ctime.getHms();
		}else if(d.getTime() >= $scope.mtime.getTime()){
			console.log('calculate start - 2');
			console.log('>> mtime:' + $scope.mtime);
			$scope.search.date = new Date($scope.mtime);
			$scope.search.time = $scope.mtime.getHms();
			start = $scope.fileSize - 1000;
		}else{
			if($scope.times && $scope.times.length > 1){
				first = new Date($scope.times[0].time);
				last = new Date($scope.times[$scope.times.length-1].time);
				if(d.getTime() <= first.getTime()){
					console.log('calculate start - 3');
					per -= (first.getTime() - d.getTime()) / (first.getTime() - $scope.ctime.getTime());
					start = Math.floor($scope.times[0].size * per);
				}else if(d.getTime() >= last.getTime()){
					console.log('calculate start - 4');
					gap = $scope.fileSize - $scope.times[$scope.times.length-1].size;
					per -= ($scope.mtime.getTime() - d.getTime()) / ($scope.mtime.getTime() - last.getTime());
					start = $scope.times[$scope.times.length-1].size + Math.floor(gap * per);
				}else{
					console.log('calculate start - 5');
					for(var i=1; i<$scope.times.length; i++){
						prev = new Date($scope.times[i-1].time);
						next = new Date($scope.times[i].time);
						gap = $scope.times[i].size - $scope.times[i-1].size;
						if(d.getTime() >= prev.getTime() && d.getTime() <= next.getTime()){
							per -= (next.getTime() - d.getTime()) / (next.getTime() - prev.getTime());
							start = $scope.times[i-1].size + Math.floor(gap * per);
							break;
						}
					}
				}
			}else{
				per -=  ($scope.mtime.getTime() - d.getTime()) / ($scope.mtime.getTime() - $scope.ctime.getTime());
				start = Math.floor($scope.fileSize * per);
			}
		}
		
		console.log('start:' + start);
		$http.jsonp('/wlog/getLog.json?callback=JSON_CALLBACK&id=' + $scope.nodeId + '&start=' + start).
			success(function(data){
				$scope.output = data.output;
				$scope.lastBytes = data.bytes;
			}).
			error(function(){
				alert('error');
			});				
	}
	
	$scope.onChangeDate = changeDateTime;
	$scope.onChangeTime = function(){
		if(event.which === 13){
			changeDateTime();
		}
	};
	
	$scope.tabs = {};
	$scope.tabs.activate = function(tabIdx){
		$scope.tabs.idx = tabIdx;
		if(tabIdx === 1){
			console.log('tail start');
		}else{
			console.log('tail stop');
		}
	};

	$scope.output = '';
	for(var i=1; i<=1000; i++){
		$scope.output += (new Date()).toLocaleTimeString() + ' - ' + i + '\n';
	}
	
	$scope.jstree = {};
	$scope.jstree.initView = function(node){
		if(node.parent === '#'){
			$('div.content').block({message:null});
		}else{
			$http.jsonp('/wlog/nodeInfo.json?callback=JSON_CALLBACK&id=' + node.id).
				success(function(data){
					var dates = [];
					var ctime = new Date(data.ctime);
					var mtime = new Date(data.mtime);
					console.log('ctime:' + ctime + ', mtime:' + mtime);
					var d = new Date(mtime);
					d.setHours(0, 0, 0, 0);
					while(d.getTime() > ctime.getTime()){
						dates.push(new Date(d));
						d.setDate(d.getDate() - 1);
					}
					
					$scope.ctime = ctime;
					$scope.mtime = mtime;
					$scope.times = data.times;
					$scope.fileSize = data.size;
					$scope.fileName = node.text;
					$scope.search.dates = dates;
					$scope.search.date = dates[0];
					$scope.search.time = dates[0].getHms();
					$scope.output = '';
					$scope.nodeId = node.id;
					
					$('div.content').unblock();
				}).
				error(function(data, status, headers, config){
					alert('error');
				});
		}
	};
	
	socket.on('result', function(data) {
		console.log(data);
	});
	
	socket.on('tail', function(data){
		
	});
	
	$scope.slider = {};
	$scope.slider.sliding = function(size){
		alert(size);
	};
}]);

app.directive('slider', function() {
	return {
		restrict : 'A',
		require : 'ngModel',
		link : function(scope, element, attrs, ngModelCtrl) {
			$(function() {
				element.slider({
					min : 0,
					max : 0,
					step : 100,
					slide : function(event, ui) {
						scope.$apply(function(){
							ngModelCtrl.$setViewValue(ui.value);
						});
					},
					stop : function(event, ui) {
						scope.slider.sliding(ui.value);
					}
				});
				scope.$apply(function(){
					ngModelCtrl.$setViewValue(0);
				});
			});
		}
	};
});

app.directive('tabs', function() {
	return {
		restrict : 'A',
		link : function(scope, element, attrs) {
			$(function() {
				element.tabs({
					heightStyle : 'auto',
					activate : function(event, ui) {
						scope.tabs.activate(ui.newTab.index());
					}
				});
			});
		}
	};
});

app.directive('autocomplete', function() {
	return {
		restrict : 'A',
		require : 'ngModel',
		link : function(scope, element, attrs, ngModelCtrl) {
			$(function() {
				element.autocomplete({
					source: scope.autocomplete.source,
					change: function( event, ui ) {
						scope.$apply(function(){
							ngModelCtrl.$setViewValue(ui.value);
						});
					}
				});
			});
		}
	};
});


app.directive('jstree', function() {
	return {
		restrict : 'A',
		require : 'ngModel',
		link : function(scope, element, attrs, ngModelCtrl) {
			$(function() {
				element.jstree({
					'core' : {
						'animation' : 100,
						'multiple' : false,
						'data': { 'url': '/wlog/nodes.json' }
					}
				}).bind('changed.jstree', function(e, data){
					scope.$apply(function(){
						ngModelCtrl.$setViewValue(data.selected[0]);
					});
					var node = data.instance.get_node(data.selected[0]);
					scope.jstree.initView(node);
				});
			});
		}
	};
});