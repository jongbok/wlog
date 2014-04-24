/*
 * @(#) wlog.js 1.0, 2014. 4. 16.
 * 
 * Copyright (c) 2014 Jong-Bok,Park  All rights reserved.
 */
'use strict';

function sizeToTime($scope){
	var bytes = $scope.search.bytes;
	var ret = new Date();
	var per, gap, time, prev, next, first, last;
	if($scope.times && $scope.times.length > 0){
		first = $scope.times[0];
		last = $scope.times[$scope.times.length-1];
		if(bytes <= first.size){
			per = bytes / first.size;
			gap = new Date(first.time).getTime() - $scope.ctime.getTime();
			time = $scope.ctime.getTime() + Math.floor(gap * per);
		}else if(bytes >= last.size){
			var lastTime = new Date(last.time).getTime();
			per = 1 - ($scope.fileSize - bytes) / ($scope.fileSize - last.size);
			gap = $scope.mtime.getTime() - lastTime;
			time = lastTime + Math.floor(gap * per);
		}else{
			for(var i=1; i<$scope.times.length; i++){
				prev = $scope.times[i-1];
				next = $scope.times[i];
				if(bytes >= prev.size && bytes <= next.size){
					var prevTime = new Date(prev.time).getTime();
					var nextTime = new Date(next.time).getTime();
					per = 1 - (next.size - bytes) / (next.size - prev.size);
					gap = nextTime - prevTime;
					time = prevTime + Math.floor(gap * per);
					break;
				}
			}
		}
	}else{
		per = bytes / $scope.fileSize;
		gap = $scope.mtime.getTime() - $scope.ctime.getTime();
		time = $scope.ctime.getTime() + Math.floor(gap * per);
	}
	ret.setTime(time);
	return ret;
}

function timeToSize($scope){
	var d = new Date($scope.search.date);
	var start = 0;
	var per = 1;
	var first, last, prev, next, gap;
	if(d.getTime() <= $scope.ctime.getTime()){
		$scope.search.date = new Date($scope.ctime);
	}else if(d.getTime() >= $scope.mtime.getTime()){
		console.log('>> mtime:' + $scope.mtime);
		$scope.search.date = new Date($scope.mtime);
		start = $scope.fileSize - 1000;
	}else{
		if($scope.times && $scope.times.length > 0){
			first = new Date($scope.times[0].time);
			last = new Date($scope.times[$scope.times.length-1].time);
			if(d.getTime() <= first.getTime()){
				per -= (first.getTime() - d.getTime()) / (first.getTime() - $scope.ctime.getTime());
				start = Math.floor($scope.times[0].size * per);
			}else if(d.getTime() >= last.getTime()){
				gap = $scope.fileSize - $scope.times[$scope.times.length-1].size;
				per -= ($scope.mtime.getTime() - d.getTime()) / ($scope.mtime.getTime() - last.getTime());
				start = $scope.times[$scope.times.length-1].size + Math.floor(gap * per);
			}else{
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
	return start;
}

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
	$scope.autocomplete.keypress = function(text){
		if(event.which === 13){
			socket.emit('filter', {filterText: text});
			console.log('emit filter:' + text);
		}
	};
	
	function changeDateTime(){
		var start = timeToSize($scope);
		$scope.slider.setValue(start);
		$scope.search.bytes = start;
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
			$scope.output = '';
			socket.emit('watch', {id: $scope.nodeId});
		}else{
			socket.emit('unwatch', {id: $scope.nodeId});
		}
	};

	$scope.output = '';
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
					do{
						dates.push(new Date(d));
						d.setDate(d.getDate() - 1);
					}while(d.getTime() > ctime.getTime());
					
					$scope.search = $scope.search || {};
					$scope.ctime = ctime;
					$scope.mtime = mtime;
					$scope.times = data.times;
					$scope.fileSize = data.size;
					$scope.fileName = node.text;
					$scope.search.dates = dates;
					$scope.search.date = ctime;
					$scope.output = '';
					$scope.nodeId = node.id;
					
					$('div.content').unblock();
				}).
				error(function(data, status, headers, config){
					alert('error');
				});
		}
	};
	
	$scope.setOutput = function(text){
		$scope.$apply(function(){
			$scope.output += text;
		});
		console.log(text);
	};
	socket.on('tail', $scope.setOutput);
	
	$scope.slider = $scope.slider || {};
	$scope.slider.sliding = function(size){
		var d = sizeToTime($scope);
		$scope.search.date = d;
		$http.jsonp('/wlog/getLog.json?callback=JSON_CALLBACK&id=' + $scope.nodeId + '&start=' + size).
		success(function(data){
			$scope.output = data.output;
			$scope.lastBytes = data.bytes;
		}).
		error(function(){
			alert('error');
		});
	};
}]);

app.directive('slider', function() {
	return {
		restrict : 'A',
		link : function(scope, element, attrs, ngModelCtrl) {
			$(function() {
				element.slider({
					min : 0,
					max : 0,
					step : 100,
					slide : function(event, ui) {
						scope.search.bytes = ui.value;
						/*
						scope.$apply(function(){
							ngModelCtrl.$setViewValue(ui.value);
						});
						*/
					},
					stop : function(event, ui) {
						scope.slider.sliding(ui.value);
					}
				});
				scope.$watch('fileSize',function(){
					element.slider('option', 'max', scope.fileSize);
				});
				scope.slider = scope.slider || {};
				scope.slider.setValue = function(val){
					element.slider('value', val);
				};
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

app.directive('datetimepicker', function() {
	return {
		restrict : 'A',
		link : function(scope, element, attrs) {
			$(function() {
				element.datetimepicker({
					dateFormat: 'yy/mm/dd',
					timeFormat: 'HH:mm:ss',
					onSelect: function(time){
						scope.search.date = time;
						scope.onChangeDate();
					}
				});
			});
			scope.$watch('search.date', function(){
				if(scope.search && scope.search.date){
					element.datetimepicker('setDate', scope.search.date);
				}
			});
		}
	};
});