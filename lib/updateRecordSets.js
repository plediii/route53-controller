"use strict";

var AWS = require('../lib/aws');
var Promise = require('bluebird');
var _ = require('lodash');
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

var instanceIps = function (instances, privateIp) {
    return _.flatten(_.map(instances, function (instance) {
        var ipAddress;
        if (privateIp) {
            ipAddress = instance.PrivateIpAddress;
        } else {
            ipAddress = instance.PublicIpAddress;
        }
        return ipAddress ? [ipAddress] : [];
    })); 
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

var resourceChange = function (AWS, resourceName, resourceSpec) {
    return Promise.map(resourceSpec.Instances, function (instanceSpec) {
        var ec2 = resourceEC2(AWS, instanceSpec);
        return findInstances(resourceEC2(AWS, instanceSpec), instanceSpec.Filters);
    }).then(function (all) {
        return instanceIps(_.flatten(all), resourceSpec.PrivateIP);
    }).then(function (ips) {
        return changeTemplate(recordSetTemplate(resourceSpec.ResourceRecordSet, ips));
    });
};

var updateResources = function (AWS, resource) {
    var hostedZone = resource.HostedZone;
    var resources = resource.Resources;
    return Promise.map(_.pairs(resources), function (pair) {
        var resourceName = pair[0];
        var resourceSpec = pair[1];
        return resourceChange(AWS, resourceName, resourceSpec);
    }).then(function (changes) {
        return updateHostedZone(new AWS.Route53(), hostedZone, changes);
    });
};

module.exports = Promise.method(function (params) {
    return getResourceDefinition(params).then(function (resource) {
        return updateResources(require('../lib/aws'), resource);
    });
});

_.extend(module.exports, {
    changeTemplate: changeTemplate
    , findInstances: findInstances
    , recordSetTemplate: recordSetTemplate
    , updateHostedZone: updateHostedZone
    , updateResources: updateResources
    , resourceEC2: resourceEC2
    , instanceIps: instanceIps
    , resourceChange: resourceChange
});
