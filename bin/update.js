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
if (argv._.length !== 1) {
    console.error('Usage: ' + process.argv.slice(0, 2).join(' ') + ' resource.json');
    process.exit(1);
}
var resourcePath = argv._[0];
var resource;
try {
    resource = JSON.parse(fs.readFileSync(resourcePath));
} catch (ex) {
    console.error('Failed to parse ' + resourcePath, ex, ex.stack);
    process.exit(1);
}

if (!resource.hasOwnProperty('HostedZone')) {
    console.error(resourcePath + ' is missing HostedZone');
    process.exit(1);
}
if (!resource.hasOwnProperty('resources')) {
    console.error(resourcePath + ' is missing resources');
    process.exit(1);
}
var hostedZone = resource.HostedZone;
var resources = resource.resources;
Promise.map(_.pairs(resources), function (pair) {
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
})
.then(function (data) {
    console.log('Done.', data);
})
.catch(function (err) {
    console.error('Error: ', err, err.stack);
});
