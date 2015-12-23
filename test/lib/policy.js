"use strict";

var test = require('tape');
var route53PolicyStatements = require('../../lib/route53PolicyStatements');
var s3PolicyStatements = require('../../lib/s3PolicyStatements');

test('route53 statements', function (t) {
    t.test('HostedZone', function (s) {
        s.plan(2);
        var testZone = 'XXX';
        var statements = route53PolicyStatements({
            HostedZone: testZone
        });
        s.deepEqual([
            {
                "Effect": "Allow",
                "Action": [
                    "route53:ChangeResourceRecordSets"
                ],
                "Resource": [ 'arn:aws:route53:::hostedzone/' + testZone]
            }
        ], statements);
        s.throws(function () {
            route53PolicyStatements({});
        }, /HostedZone/);
    });
});

test('s3 statements', function (t) {
    t.test('Bucket', function (s) {
        s.plan(2);
        s.deepEqual([
            {
                "Effect": "Allow",
                "Action": [
                    "s3:Get*"
                ],
                "Resource": [
                    "arn:aws:s3:::testBucket/testKey"
                ]
            }
        ], s3PolicyStatements({ Bucket: 'testBucket', Key: 'testKey' }));

        s.throws(function () {
            s3PolicyStatements({ Key: 'key' });
        }, /Bucket/);
    });

    t.test('Key', function (s) {
        s.plan(2);
        s.deepEqual([
            {
                "Effect": "Allow",
                "Action": [
                    "s3:Get*"
                ],
                "Resource": [
                    "arn:aws:s3:::testBucket/testKey"
                ]
            }
        ], s3PolicyStatements({ Bucket: 'testBucket', Key: 'testKey' }));

        s.throws(function () {
            s3PolicyStatements({ Bucket: 'bucket' });
        }, /Key/);
    });
});
