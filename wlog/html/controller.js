/*
 * @(#) controller.js 1.0, 2014. 4. 16.
 * 
 * Copyright (c) 2014 Jong-Bok,Park  All rights reserved.
 */
'use strict';
$.blockUI.defaults.css.cursor = 'default';
$.blockUI.defaults.overlayCSS.cursor = 'default';

var app = angular.module('app', []);

app.controller('wlogCtrl',['$scope', function($scope){
	$(document).ready(function(){
		$('div.content').block({message:null});
		document.onkeydown = function(evt) {
			switch (evt.keyCode) {
				case 13:
					alert('tail start');
					break;
				case 27:
					alert('tail stop');
					break;
				case 33:
					alert('preview');
					break;
				case 34:
					alert('nextview');
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
	
	$scope.timepicker = {};
	$scope.timepicker.select = function(time){
		console.log('>> ' + time);
	};
	 
	$scope.tabs = {};
	$scope.tabs.activate = function(tabIdx){
		if(tabIdx === 1){
			console.log('tail start');
		}else{
			console.log('tail stop');
		}
	};

	$scope.jstree = {};
	$scope.jstree.data = [ {
		"id" : "recap1",
		"parent" : "#",
		"text" : "기간계 AP1"
	}, {
		"id" : "recap2",
		"parent" : "#",
		"text" : "기간계 AP2"
	}, {
		"id" : "potap1",
		"parent" : "#",
		"text" : "포털 AP1"
	}, {
		"id" : "potap2",
		"parent" : "#",
		"text" : "포털 AP2"
	}, {
		"id" : "recap1_20140414",
		"parent" : "recap1",
		"text" : "recap1_20140414.log",
		"icon" : "images/document.png",
		"li_attr" : {
			"fileSize": 4500236
		}
	}, {
		"id" : "recap1_20140415",
		"parent" : "recap1",
		"text" : "recap1_20140415.log",
		"icon" : "images/document.png",
		"li_attr" : {
			"fileSize": 6798821
		}
	} ];
	
	$scope.output = '';
	for(var i=1; i<=1000; i++){
		$scope.output += (new Date()).toLocaleTimeString() + ' - ' + i + '\n';
	}
	
	$scope.jstree.initView = function(node){
		if(node.parent === '#'){
			$('div.content').block({message:null});
		}else{
			$('div.content').unblock();
			$scope.fileName = node.text;
			$scope.fileSize = node.li_attr.fileSize;
			$scope.search.dates = ['20140414', '20140415'];
			$scope.search.date = $scope.search.dates[0];
			$scope.output = '';
		}
	};
	
	$scope.slider = {};
	$scope.slider.sliding = function(size){
		alert(size);
	};
}]);

app.directive('datepicker', function() {
	return {
		restrict : 'A',
		require : 'ngModel',
		link : function(scope, element, attrs, ngModelCtrl) {
			$(function() {
				element.datepicker({
					showAnim : 'slideDown',
					showOn : 'button',
					buttonImage : 'images/calendar.gif',
					buttonImageOnly : true,
					dateFormat : 'yy/mm/dd',
					onSelect : function(date) {
						scope.$apply(function() {
							ngModelCtrl.$setViewValue(element.datepicker('getDate'));
						});
					}
				});
				var date = new Date();
				element.datepicker("setDate", date);
				ngModelCtrl.$setViewValue(element.datepicker("getDate"));
			});
		}
	};
});

app.directive('timepicker', function() {
	return {
		restrict : 'A',
		require : 'ngModel',
		link : function(scope, element, attrs, ngModelCtrl) {
			$(function() {
				element.timepicker({
					showAnim : 'slideDown',
					timeFormat : 'HH:mm:ss',
					onSelect : function(time){
						console.log(time);
						scope.timepicker.select(time);
					}
				});
			});
		}
	};
});

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
				scope.$watch('fileSize', function(){
					element.slider('option', 'max', scope.fileSize);
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
						'data' : scope.jstree.data
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