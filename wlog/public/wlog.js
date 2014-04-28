/*
 * @(#) wlog.js 1.0, 2014. 4. 16.
 * 
 * Copyright (c) 2014 Jong-Bok,Park  All rights reserved.
 */
'use strict';

var wlog = {};

wlog.init = function(){
	var initHeight = $(window).height();
	var gap = initHeight - $("#wrapper").height();
	$("#output").height(initHeight-250);
	$("#left-sidebar").height(initHeight - gap - $("#header").height() - $("#footer").height() );
};

wlog.sizeToTime = function(bytes, timesize){
	var ret = new Date();
	var per, gap, time, prev, next;
	for(var i=1; i<timesize.length; i++){
		prev = timesize[i-1];
		next = timesize[i];
		if(bytes >= prev.size && bytes <= next.size){
			var prevTime = new Date(prev.time).getTime();
			var nextTime = new Date(next.time).getTime();
			gap = nextTime - prevTime;
			per = (bytes - prev.size) / (next.size - prev.size);
			time = prevTime + Math.floor(gap * per);
			console.log('sizeToTime>> prev:{time:' + prev.time + ',size:' + prev.size + '}, next:{time:' + next.time + ', size:' + next.size + '}');
			console.log('sizeTotime>> gap:' + gap + ', per:' + per);
			break;
		}
	}
	ret.setTime(time);
	return ret;
};

wlog.timeToSize = function(time, timesize){
	var bytes = 0;
	var per = 1;
	var prev, next, prevTime, nextTime, gap;
	for(var i=1; i<timesize.length; i++){
		prev = timesize[i-1];
		next = timesize[i];
		prevTime = new Date(prev.time).getTime();
		nextTime = new Date(next.time).getTime();
		if(time.getTime() >= prevTime && time.getTime() <= nextTime){
			gap = next.size - prev.size;
			per = (time.getTime() - prevTime) / (nextTime - prevTime);
			bytes = prev.size + Math.floor(gap * per);
			console.log('timeToSize>> prev:{time:' + prev.time + ',size:' + prev.size + '}, next:{time:' + next.time + ', size:' + next.size + '}');
			console.log('timeToSize>> gap:' + gap + ', per:' + per);
			break;
		}
	}
	return bytes;	
};

$.blockUI.defaults.css.cursor = 'default';
$.blockUI.defaults.overlayCSS.cursor = 'default';

var socket = io.connect(location.protocol + '//' + location.host);
var app = angular.module('app', []);

app.controller('wlogCtrl',['$scope', '$http', function($scope, $http){
	$scope.tail = {};
	$(document).ready(function(){
		$('div.content').block({message:null});
		$(document).keydown(function(evt){
			switch(evt.which){
				case 27:
					socket.emit('unwatch', {id: $scope.nodeId});
					$scope.$apply(function(){
						$scope.tail.state = false;
					});
					console.log('tail stop keyevent');
					break;
				case 78:
					console.log('tab.idx:' + $scope.tabs.idx);
					var tabIdx = $scope.tabs.idx || 0;
					if(tabIdx === 0){
						console.log('next');
						var start = $scope.lastBytes || 0;
						$http.jsonp('/wlog/getLog.json?callback=JSON_CALLBACK&id=' + $scope.nodeId + '&start=' + $scope.lastBytes).
						success(function(data){
							$('#output').scrollTop($('#output')[0].scrollHeight);
							var output = $scope.output + data.output;
							var rows = output.split('\n');
							$scope.output = rows.slice(rows.length - 10000).join('\n');
							$scope.lastBytes = data.bytes;
						}).
						error(function(data, status, headers, config){
							$scope.errMsg = 'status:' + status + ' - cannot get next log!';
						});				
					}else{
						socket.emit('watch', {id: $scope.nodeId});
						$scope.$apply(function(){
							$scope.tail.state = true;
						});
						console.log('tail start keyevent');
					}
					break;
			}
		});
		
		wlog.init();
	});
	
	$scope.autocomplete = {};
	$scope.autocomplete.source = ["error|Error|ERROR", "Exception|\\sat\\s"];
	$scope.autocomplete.keypress = function(text){
		if(event.which === 13){
			socket.emit('filter', {filterText: text});
			console.log('emit filter:' + text);
		}
	};
	
	function getLog(start){
		if(isNaN(start) || start < 0){
			$scope.errMsg = 'start:' + start + ' - start is not valid!';
			return;
		}
		$scope.slider.setValue(start);
		$scope.search.bytes = start;
		console.log('start:' + start);
		$http.jsonp('/wlog/getLog.json?callback=JSON_CALLBACK&id=' + $scope.nodeId + '&start=' + start).
			success(function(data){
				$scope.output = data.output;
				$scope.lastBytes = data.bytes;
			}).
			error(function(data, status, headers, config){
				$scope.errMsg = 'status:' + status + ',start:' + start + ' - cannot get log!';
			});				
	}
	$scope.onChangeDate = function(){
		var time = new Date($scope.search.date);
		if(time <= $scope.ctime){
			console.log('min date');
			time = new Date($scope.ctime);
			$scope.$apply(function(){
				$scope.search.date = time;
			});
		}else if(time >= $scope.mtime){
			time = new Date($scope.mtime);
			$scope.$apply(function(){
				$scope.search.date = time;
			});
		}
		var start = wlog.timeToSize(time, $scope.timesize);
		getLog(start);
	};
	
	$scope.tabs = {};
	$scope.tabs.activate = function(tabIdx){
		$scope.tabs.idx = tabIdx;
		if(tabIdx === 1){
			console.log('tail start');
			$scope.$apply(function(){
				$scope.output = '';
				$scope.tail.state = true;
			});
			socket.emit('watch', {id: $scope.nodeId});
		}else{
			console.log('unwatch');
			$scope.tail.state = false;
			socket.emit('unwatch', {id: $scope.nodeId});
			getLog(0);
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
					$scope.tabs.refresh();
					var ctime = new Date(data.ctime);
					var mtime = new Date(data.mtime);
					console.log('ctime:' + ctime + ', mtime:' + mtime);
					
					$scope.search = $scope.search || {};
					$scope.ctime = ctime;
					$scope.mtime = mtime;
					$scope.timesize = data.timesize;
					$scope.fileSize = data.size;
					$scope.fileName = node.text;
					$scope.search.date = ctime;
					$scope.output = '';
					$scope.nodeId = node.id;
					getLog(0);
					$('div.content').unblock();
				}).
				error(function(data, status, headers, config){
					$scope.errMsg = 'status:' + status + ' - cannot get node info!';
				});
		}
	};
	
	socket.on('tail', function(text){
		var output = $scope.output + text;
		var rows = output.split('\n');
		$scope.output = rows.slice(rows.length - 10000).join('\n');
		$scope.$digest();
		$('#output').scrollTop($('#output').scrollHeight);
	});
	
	$scope.slider = $scope.slider || {};
	$scope.slider.sliding = function(size){
		$scope.search.date = wlog.sizeToTime(size, $scope.timesize);
		getLog(size);
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
				scope.tabs = scope.tabs || {};
				scope.tabs.refresh = function(){
					element.tabs('option','active',0);
				};
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