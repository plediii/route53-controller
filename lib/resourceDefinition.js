"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var fs = Promise.promisifyAll(require('fs'));

var resourceDefinition = module.exports = {
    parse: function (data) {
        return new Promise(function (resolve, reject) {
            try {
                return resolve(JSON.parse(data));
            } catch (ex) {
                return reject(new Error('Failed to parse JSON:'  + ex.message));
            }
        })
            .then(function (resource) {
                if (!resource.hasOwnProperty('HostedZone')) {
                    throw new Error('Resource must have HostedZone.');
                }
                if (!_.isString(resource.HostedZone)) {
                    throw new Error('Resource.HostedZone must be a string.');
                }
                if (!resource.hasOwnProperty('Resources')) {
                    throw new Error('Resource must have Resources.');
                }
                if (!_.isObject(resource.Resources)) {
                    throw new Error('Resource.Resources must be a hash of resources.');
                }
                _.each(resource.Resources, function (v, resourceName) {
                    if (!v.hasOwnProperty('Instances')) {
                        throw new Error('Resource "' + resourceName + '" must have Instances');
                    }
                    if (!v.hasOwnProperty('ResourceRecordSet')) {
                        throw new Error('Resource "' + resourceName + '" must have ResourceRecordSet');
                    }
                    if (!v.ResourceRecordSet.hasOwnProperty('Name')) {
                        throw new Error('Resource "' + resourceName + '" ResourceRecordSet must have a Name');
                    }
                    _.each(v.Instances, function (instance) {
                        if (!instance.hasOwnProperty('Filters')) {
                            throw new Error('Resource "' + resourceName + '" must have Filters');
                        }
                    });
                });
                return resource;
            });
    }
    , read: function (resourcePath) {
        return fs.readFileAsync(resourcePath)
        .then(resourceDefinition.parse);
    }
};
