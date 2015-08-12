#!/usr/bin/env node
// -*- mode: javascript -*-
/*jslint node: true */
/* global -Promise */
"use strict";

var AWS = require('../lib/aws')
var Promise = require('bluebird');
var _ = require('lodash');

// AWS.config.update({region: 'us-east-1'});
// AWS.config.update({region: 'us-west-1'});
var ec2 = new AWS.EC2();

var findInstances = function (filters) {
    var params = {};
    if (filters) {
        params.Filters = filters;
    }
    filters = filters || [];
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

findInstanceIPs()
.then(function (data) {
    console.log('data = ', data);
})
.catch(function (err) {
    console.error('Error: ', err, err.stack);
});
