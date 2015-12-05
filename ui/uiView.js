/**
 * Created by arminhammer on 11/18/15.
 */

"use strict";

console.log('Loaded!');
//var P = require('bluebird');

var m = require('mithril');
var _ = require('lodash');

// In renderer process (web page).
var ipcRenderer = require('electron').ipcRenderer;

var log = function(msg, level) {
	if(!level) {
		level = 'info';
	}
	ipcRenderer.send('send-log', { from: 'UI:', level: level, msg: msg });
};

log('Initialized UI.');

function addToTemplate(resourceReq) {
	ipcRenderer.send('add-to-template-request', resourceReq);
}

function removeFromTemplate(resourceReq) {
	ipcRenderer.send('remove-from-template-request', resourceReq);
}

function toggleParamInTemplate(paramReq) {
	ipcRenderer.send('toggle-param', paramReq);
}

var resources = m.prop({});

ipcRenderer.send('update-resources', 'AWS_AutoScaling_AutoScalingGroup');
//ipcRenderer.send('update-resources', 'AWS_AUTOSCALING_LAUNCHCONFIGURATION');
//ipcRenderer.send('update-resources', 'AWS_AUTOSCALING_LIFECYCLEHOOK');
//ipcRenderer.send('update-resources', 'AWS_AUTOSCALING_SCALINGPOLICY');
//ipcRenderer.send('update-resources', 'AWS_AUTOSCALING_SCHEDULINGACTION');
ipcRenderer.send('update-resources', 'AWS_EC2_VPC');
ipcRenderer.send('update-resources', "AWS_EC2_SUBNET");
ipcRenderer.send('update-resources', "AWS_EC2_SECURITYGROUP");

/*
 AWS::EC2::CustomerGateway
 AWS::EC2::DHCPOptions
 AWS::EC2::EIP
 AWS::EC2::EIPAssociation
 AWS::EC2::Instance
 AWS::EC2::InternetGateway
 AWS::EC2::NetworkAcl
 AWS::EC2::NetworkAclEntry
 AWS::EC2::NetworkInterface
 AWS::EC2::NetworkInterfaceAttachment
 AWS::EC2::PlacementGroup
 AWS::EC2::Route
 AWS::EC2::RouteTable
 AWS::EC2::SecurityGroupEgress
 AWS::EC2::SecurityGroupIngress
 AWS::EC2::SpotFleet
 AWS::EC2::SubnetNetworkAclAssociation
 AWS::EC2::SubnetRouteTableAssociation
 AWS::EC2::Volume
 AWS::EC2::VolumeAttachment
 AWS::EC2::VPCDHCPOptionsAssociation
 AWS::EC2::VPCEndpoint
 AWS::EC2::VPCGatewayAttachment
 AWS::EC2::VPCPeeringConnection
 AWS::EC2::VPNConnection
 AWS::EC2::VPNConnectionRoute
 AWS::EC2::VPNGateway
 AWS::EC2::VPNGatewayRoutePropagation
 */

ipcRenderer.on('update-resources', function(event, res) {
	m.startComputation();
	log('Updating resources');
	resources(res);
	console.log('Updating resources');
	console.log(resources());
	m.endComputation();
});

ipcRenderer.on('get-resource-reply', function(event, res) {
	//console.log('Adding resources');
	m.startComputation();
	var params = {};
	switch(res.type) {
		case "AWS::EC2::VPC":
			params = { resBlock: res.Vpcs, constructor: Resource.AWS_EC2_VPC, name: "VpcId", targetBlock: resources.EC2.VPC };
			break;
		case "AWS::EC2::SUBNET":
			params = { resBlock: res.Subnets, constructor: Resource.AWS_EC2_SUBNET, name: "SubnetId", targetBlock: resources.EC2.Subnet };
			break;
		case "AWS::EC2::SECURITYGROUP":
			params = { resBlock: res.SecurityGroups, constructor: Resource.AWS_EC2_SECURITYGROUP, name: "GroupId", targetBlock: resources.EC2.SecurityGroup };
			break;
		default:
			console.log('Resource type not found.');
			break;
	}
	params.resBlock.forEach(function(r) {
		var newResource = new params.constructor(r[params.name], r);
		newResource.toggleInTemplate = function(setting) {
			newResource.inTemplate(setting);
			if(setting) {
				addToTemplate(newResource);
			} else {
				removeFromTemplate(newResource);
			}
		};
		params.targetBlock.push(newResource);
	});
	m.endComputation();
});

function openTemplateWindow() {
	ipcRenderer.send('open-template-window');
}

var uiView = {
	controller: function() {
		this.resources = resources;
		this.openTemplateWindow = openTemplateWindow;
		this.addTooltip = function(element, isInitialized, context) {
			if(isInitialized) {
				return;
			}
			$(element).tooltip();
		}
	},
	view: function(controller) {
		return m(".container-fluid", [
			/*m(".navbar.navbar-fixed-top", [
				m(".container", [
					m(".navbar-header", [
						m("a.navbar-brand[href='#']", "Bellerophon"),
						m("button.btn.btn-success.navbar-btn.navbar-right.pull-right#templateButton", { onclick: controller.openTemplateWindow }, "Show Template")
					])
				])
			]),*/
			m(".row.MainContent", [
				m("nav.col-xs-3.bs-docs-sidebar", [
					m("ul.nav.nav-stacked.fixed[id='sidebar']", [
						_.map(controller.resources(), function(resource, key) {
							return m("li", [
								m("a[href='#" + key + "']", key),
								m("ul.nav.nav-stacked", [
									_.map(controller.resources()[key], function(subResource, subKey) {
										if(Object.keys(controller.resources()[key][subKey]).length > 0) {
											return m("li", [m("a[href='#" + key + subKey + "']", subKey)])
										}
									})
								])
							])
						})
					])
				]),
				m(".col-xs-9", [
					_.map(controller.resources(), function(group, key) {
						return	m('.row', [
							m(".group[id='" + key + "']", [
								m("h3", key),
								_.map(controller.resources()[key], function(subResource, subKey) {
									var subKeySize = Object.keys(controller.resources()[key][subKey]).length;
									if(subKeySize > 0) {
										return m('.row', [
											m(".col-xs-12", [
												m(".subgroup[id='" + key + subKey + "']", [
													m("h4", subKey),
													_.map(controller.resources()[key][subKey], function (resource) {
														var colSizes = { xs: 12, md: 6, lg: 4};
														if(subKeySize === 1 || subKeySize === 2) {
															colSizes = { xs: 12, md: 6, lg: 6}
														}
														var colSizeString = 'col-xs-' + colSizes.xs + ' col-md-' + colSizes.md + ' col-lg-' + colSizes.lg;
														return m('div', [
															m("div", { class: colSizeString },[
																m('div', [
																	[m(".panel.panel-warning", [
																		m(".panel-heading", [
																			m("h3.panel-title", [
																				m("input[type=checkbox]", {
																					checked: resource.inTemplate,
																					name: resource.id,
																					onclick: m.withAttr("checked", function() {
																						log('Checked ' + resource);
																						if(resource.inTemplate) {
																							removeFromTemplate({resource: resource, key: key, subKey: subKey});
																						} else {
																							addToTemplate({resource: resource, key: key, subKey: subKey});
																						}
																					})
																				}),
																				resource.id
																			])
																		]),
																		m(".panel-body", [
																			m('table.table', [
																				m('tr', [
																					m('th.col-xs-2', 'Param.'),
																					m('th.col-xs-3', 'Name'),
																					m('th.col-xs-7', 'Value')
																				]),
																				_.map(resource.body, function(pVal, pKey) {
																					return m('tr', [
																						m('td.col-xs-2', [
																							m("input[type=checkbox]", {
																								checked: resource.templateParams[pKey],
																								//name: resource.id,
																								onclick: m.withAttr("checked", function() {
																									log('Checked ' + resource);
																									toggleParamInTemplate({resource: resource, key: key, subKey: subKey, pKey: pKey });
																									//if(resource.templateParams[pKey]) {} else {
																									//	addParamToTemplate({resource: resource, key: key, subKey: subKey});
																									//}
																								})
																							})
																						]),
																						m('td.col-xs-3', [
																							m('b', {title: pKey, config: controller.addTooltip }, _.trunc(pKey,15))
																						]),
																						m('td.col-xs-7', [
																							m("i[data-toggle='tooltip'][data-placement='top']", {title: pVal, config: controller.addTooltip }, _.trunc(pVal,30))
																						])
																					])
																				})
																			])
																		])
																	])]
																])
															])
														])
													})
												])
											])
										])
									}
								})
							])
						])
					})
				])
			])
		])
	}
};

m.mount(document.body,uiView);