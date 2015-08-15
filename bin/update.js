#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var AWS = require('../lib/aws');
var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var minimist = require('minimist');
var moment = require('moment');
var resourceDefinition = require('../lib/resourceDefinition');
var s3location = require('../lib/s3location');

// AWS.config.update({region: 'us-east-1'});
// AWS.config.update({region: 'us-west-1'});
var ec2 = new AWS.EC2();
var route53 = new AWS.Route53();

var findInstances = function (filters) {
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

var findInstanceIPs = function (filters, privateIP) {
    return findInstances(filters)
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
    return _.extend(_.defaults({}, recordTemplate, {
    }), {
        ResourceRecords: _.map(ips, IpToResourceRecord)
    });
};

var changeTemplate = function (resourceRecordSet) {
    return {
        Action: 'UPSERT'
        , ResourceRecordSet: resourceRecordSet
    };
};

var updateRecordSets = function (hostedZoneId, changes, comment) {
    comment = comment || ('Changed at ' +  moment().toISOString());
    console.log('Change record set: ', {
        HostedZoneId: hostedZoneId
        , ChangeBatch: { 
            Changes: changes
            , Comment: 'Changed ' + moment().toISOString() + ' '
        }
    });
    return new Promise(function (resolve, reject) {
        route53.changeResourceRecordSets({
            HostedZoneId: hostedZoneId
            , ChangeBatch: { 
                Changes: changes
                , Comment: 'Changed ' + moment().toISOString() + ' '
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

var argv = require('minimist')(process.argv.slice(2));
if (!(argv.hasOwnProperty('resource') || argv.hasOwnProperty('s3location'))) {
    console.error('Usage: ' + process.argv.slice(0, 2).join(' ') + ' --resource resource.json --s3location location.json');
    console.error(' Provide the resource definitions either in a local file (via --resource), or at an s3 location  (--s3location)');
    process.exit(1);
}

var getResource;
if (argv.hasOwnProperty('resource')) {
    getResource = resourceDefinition.read(argv.resource);
} else {
    getResource = s3location.read(argv.s3location)
    .then(s3location.download)
    .then(resourceDefinition.parse);
}

getResource
    .then(function (resource) {
        var hostedZone = resource.HostedZone;
        var resources = resource.resources;
        return Promise.map(_.pairs(resources), function (pair) {
            var resourceName = pair[0];
            var resource = pair[1];
            if (!resource.hasOwnProperty('Filters')) {
                throw new Error('Missing Filters for resource ' + resourceName);
            }
            if (!resource.hasOwnProperty('ResourceRecordSet')) {
                throw new Error('Missing ResourceRecordSet for resource ' + resourceName);
            }
            return findInstanceIPs(resource.Filters)
                .then(function (ips) {
                    return changeTemplate(recordSetTemplate(resource.ResourceRecordSet, ips));
                });
        })
            .then(function (changes) {
                return updateRecordSets(hostedZone, changes);
            });
    })
    .then(function (data) {
        console.log('Done.', data);
    })
    .catch(function (err) {
        console.error('Error: ', err, err.stack);
    });
