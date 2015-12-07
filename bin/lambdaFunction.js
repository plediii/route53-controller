"use strict";

var Promise = require('bluebird');
var fs = require('fs');
var zipDeployment = require('../lib/zipDeployment');

var createFunction = function (AWS, params) {
    return new Promise(function (resolve, reject) {
        return new AWS.Lambda().createFunction(params, function (err, data) {
            if (err) {
                return reject(err);
            } else {
                return resolve(data);
            }
        });
    });
};

var updateFunctionCode = function (AWS, params) {
    return new Promise(function (resolve, reject) {
        return new AWS.Lambda().updateFunctionCode(params, function (err, data) {
            if (err) {
                return reject(err);
            } else {
                return resolve(data);
            }
        });
    });
};

var run = module.exports =  Promise.method(function (aws, zip, args) {
    var argv = require('minimist')(args);
    if (argv._.length === 0) {
        console.error([
            '',
            'Update a lambda deployment.',
            '',
            'Usage: lambdaFunction action [options]',
            '',
            '',
            '',
            'Arguments:',
            ' action                              Either "create" or "update" a lambda function.',
            '',
            'Options: ',
            ' --name functionName                 The name of the lambda function (defaults to "route53-controller").',
            ' --region awsRegion                  The AWS region in which the lambda function should exist.',
            ' --resource resource.json            Include the resource.json from this path.',
            ' --role roleARN                      The lambda function role ARN (required to create).',
            ' --s3location s3location.json        Include the s3 location file from the this path.',
            ''
        ].join('\n'));
        throw new Error('output location required.');
    }

    var action = argv._[0];
    var region = argv.region;
    if (region) {
        aws.config.update({ region: region });
    }
    var resource = argv.resource;
    var s3location = argv.s3location;
    var functionName = argv.name || 'route53-controller';
    if (!(resource || s3location)) {
        throw new Error('--resource or --s3location is required to create a new lambda function.');
    }
    var roleARN = argv.role;
    var zipFile = zipDeployment(zip, {
        resource: resource && JSON.parse(fs.readFileSync(resource))
        , s3Location: s3location && JSON.parse(fs.readFileSync(s3location))
    });

    if (action === 'create') {
        if (!roleARN) {
            throw new Error('--role ARN is required to create a new lambda function.');
        }
        return zipFile
            .then(function (data) {
                return createFunction(aws, {
                    Code: {  ZipFile: data }
                    , FunctionName: functionName
                    , Handler: 'lambda-index.handler'
                    , Role: roleARN
                    , Description: 'route53-controller Lambda function'
                    , Runtime: 'nodejs'
                    , Timeout: 10
                });
            });
    } else if (action === 'update') {
        if (roleARN) {
            throw new Error('--role ARN can not be updated.');
        }
        return zipFile
            .then(function (data) {
                return updateFunctionCode(aws, {
                    FunctionName: functionName
                    , ZipFile: data
                });
            });
    } else {
        throw new Error('Unrecongized action: ' + action);
    }
});

if (!module.parent) {
    run(require('../lib/aws'), require('jszip')(), process.argv.slice(2))
    .then(function (out) {
        console.log('Created ', out);
    })
    .catch(function (err) {
        console.error('Error: ', err, err.stack);
    });
}
