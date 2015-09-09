"use strict";

var AWS = require('../lib/aws');
var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var moment = require('moment');
var getResourceDefinition = require('../lib/getResourceDefinition');

var resourceEC2 = function (AWS, instanceSpec) {
    if (instanceSpec.hasOwnProperty('Region')) {
        AWS.config.update({ region: instanceSpec.Region });
    }
    return new AWS.EC2();
};

var findInstances = function (ec2, filters) {
    var params = {};
    if (filters && filters.length > 0) {
        params.Filters = filters;
    }
    return new Promise(function (resolve, reject) {
        return ec2.describeInstances(params, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(_.flatten(_.map(data.Reservations, function (reservation) {
                    return reservation.Instances;
                })));
            }
        });
    });
};

var findInstanceIPs = function (filters, privateIP, region) {
    return findInstances(filters, region)
    .then(function (instances) {
        return _.flatten(_.map(instances, function (instance) {
            if (privateIP && instance.PrivateIpAddress) {
                return [instance.PrivateIpAddress];
            } else if (instance.PublicIpAddress) {
                return [instance.PublicIpAddress];
            } else {
                return [];
            }
        }));
    });
};

var IpToResourceRecord = function (ip) {
    return {
        Value: ip
    };
};

var recordSetTemplate = function (recordTemplate, ips) {
    return _.defaults({
        ResourceRecords: _.map(ips, IpToResourceRecord)
    }, recordTemplate, {
        Type: "A"
    });
};

var changeTemplate = function (resourceRecordSet) {
    return {
        Action: 'UPSERT'
        , ResourceRecordSet: resourceRecordSet
    };
};

var updateHostedZone = function (route53, hostedZoneId, changes, comment) {
    if (!hostedZoneId) {
        return Promise.reject('HostedZoneId required for updateHostedZone');
    }
    if (!_.isArray(changes) || changes.length < 1) {
        return Promise.reject('updatedHostedZone requires one or more change.');
    }
    return new Promise(function (resolve, reject) {
        route53.changeResourceRecordSets({
            HostedZoneId: hostedZoneId
            , ChangeBatch: { 
                Changes: changes
                , Comment: comment || ('route53-controller change at ' + moment().toISOString())
            }
        }, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
};

module.exports = Promise.method(function (params) {
    var getResource = getResourceDefinition(params);

    return getResource
        .then(function (resource) {
            var hostedZone = resource.HostedZone;
            var resources = resource.Resources;
            return Promise.map(_.pairs(resources), function (pair) {
                var resourceName = pair[0];
                var resourceSpec = pair[1];
                if (!resourceSpec.hasOwnProperty('ResourceRecordSet')) {
                    throw new Error('Missing ResourceRecordSet for resource ' + resourceName);
                }
                if (!resourceSpec.hasOwnProperty('Instances')) {
                    throw new Error('Missing Instances for resource ' + resourceName);
                }
                return Promise.map(resourceSpec.Instances, function (instanceSpec) {
                    if (!instanceSpec.hasOwnProperty('Filters')) {
                        throw new Error('Missing an instance Filters for resource ' + resourceName);
                    }
                    return findInstanceIPs(instanceSpec.Filters, instanceSpec.PrivateIP, instanceSpec.Region || resource.Region);
                })
                    .then(function (ipsets) {
                        return _.flatten(ipsets);
                    })
                    .then(function (ips) {
                        if (ips.length < 1) {
                            throw new Error('No IPs for resource ' + resourceName);
                        }
                        return changeTemplate(recordSetTemplate(resourceSpec.ResourceRecordSet, ips));
                    });
            })
                .then(function (changes) {
                    return updateHostedZone(new AWS.Route53(), hostedZone, changes);
                });
        });   
});

_.extend(module.exports, {
    changeTemplate: changeTemplate
    , findInstances: findInstances
    , recordSetTemplate: recordSetTemplate
    , updateHostedZone: updateHostedZone
    , resourceEC2: resourceEC2
});
