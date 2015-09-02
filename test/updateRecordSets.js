"use strict";

var test = require('tape');
var m = require('../lib/updateRecordSets');
var _ = require('lodash');

test('updateRecordSets', function (t) {
    t.test('changeTemplate', function (s) {
        s.plan(1);
        s.deepEqual({
            Action: 'UPSERT'
            , ResourceRecordSet: {
                a: 'z'
            }
        }, m.changeTemplate({ a: 'z' }),
                    "Fills in ResourceRecordSet.");
    });


    t.test('recordSetTemplate', function (s) {
        s.plan(6);
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "A",
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
            "Type": "A",
        }, ['127.1.1.1']),
                    "Fills in single IP.");
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "A",
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }, {
                Value: '127.1.1.2'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
            "Type": "A",
        }, ['127.1.1.1', '127.1.1.2']),
                    "Fills in two ips IP.");
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "AA",
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
            "Type": "AA",
        }, ['127.1.1.1']),
                    "Type overridable.");
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "A",
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
        }, ['127.1.1.1']),
                    "Type optional.");
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "A",
            "TTL": 30,
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
            "TTL": 30
        }, ['127.1.1.1']),
                    "Additional parameters available.");
        s.deepEqual({
            "Name": "bar.example.com",
            "Type": "A",
            "ResourceRecords": [{
                Value: '127.1.1.1'
            }]
        }, m.recordSetTemplate({
            "Name": "bar.example.com",
            "ResourceRecords": [{
                Value: '192.168.0.1'
            }]
        }, ['127.1.1.1']),
                    "ResourceRecords overriden.");
    });

    t.test('updateHostedZone', function (s) {

        s.test('Calls route53.changeResourceRecordSets', function (r) {
            r.plan(1);
            m.updateHostedZone({
                changeResourceRecordSets: function (params) {
                    r.pass('Calls changeResourceRecordSets on route53');
                }
            }, 'HostedZone', [ 'change' ]);
        });

        s.test('Returns thenable', function (r) {
            r.plan(1);
            r.ok(_.isFunction(m.updateHostedZone({
                changeResourceRecordSets: function (params, cb) {}
            }, 'HostedZone', [ 'change' ]).then)
                 , 'Returns thenable');
        });

        s.test('Resolves to route53.changeResourceRecordSets result', function (r) {
            r.plan(1);
            m.updateHostedZone({
                changeResourceRecordSets: function (params, cb) {
                    return cb(null, 'result');
                }
            }, 'HostedZone', [ 'change' ]).then(function (data) {
                r.equal(data, 'result', 'Resolves to changeResourceRecordSets result');
            });
        });

        s.test('Rejects with route53.changeResourceRecordSets error', function (r) {
            r.plan(1);
            m.updateHostedZone({
                changeResourceRecordSets: function (params, cb) {
                    return cb('error');
                }
            }, 'HostedZone', [ 'change' ]).catch(function (data) {
                r.equal(data, 'error', 'Rejects with changeResourceRecordSets error');
            });
        });

        s.test('Rejects if HostedZone is not provided', function (r) {
            r.plan(1);
            m.updateHostedZone({
                changeResourceRecordSets: function (params, cb) {}
            }).catch(function (data) {
                r.pass('Rejects if HostedZone is not provided.');
            });
        });

        s.test('Rejects if changes is not an array', function (r) {
            r.plan(1);
            m.updateHostedZone({
                changeResourceRecordSets: function (params, cb) {}
            }, 'HostedZone', {}).catch(function (data) {
                r.pass('Rejects if Changes is not an array.');
            });
        });

        s.test('Rejects if changes empty', function (r) {
            r.plan(1);
            m.updateHostedZone({
                changeResourceRecordSets: function (params, cb) {}
            }, 'HostedZone', []).catch(function (data) {
                r.pass('Rejects if Changes is array is empty.');
            });
        });

        s.test('Rejects if changes empty', function (r) {
            r.plan(1);
            m.updateHostedZone({
                changeResourceRecordSets: function (params, cb) {}
            }, 'HostedZone', []).catch(function (data) {
                r.pass('Rejects if Changes is array is empty.');
            });
        });

        s.test('Calls with first argument as param HostedZone', function (r) {
            r.plan(1);
            m.updateHostedZone({
                changeResourceRecordSets: function (params, cb) {
                    r.equal(params.HostedZoneId, 'HostedZone', 'Calls with first param as HostedZone');
                }
            }, 'HostedZone', [ 'change' ]);
        });

        s.test('Calls with second argument as changes', function (r) {
            r.plan(2);
            m.updateHostedZone({
                changeResourceRecordSets: function (params, cb) {
                    r.ok(params.ChangeBatch, 'Param always has change batch');
                    r.deepEqual(params.ChangeBatch.Changes, [ 'change' ], 'Calls with second argument as changes');
                }
            }, 'HostedZone', [ 'change' ]);
        });

        s.test('Provides default comment param', function (r) {
            r.plan(1);
            m.updateHostedZone({
                changeResourceRecordSets: function (params, cb) {
                    r.ok(params.ChangeBatch.Comment.match(/route53-controller/), 'Default comment mentions route53-controller');
                }
            }, 'HostedZone', [ 'change' ]);
        });

        s.test('Overrides default comment param with third argument', function (r) {
            r.plan(2);
            m.updateHostedZone({
                changeResourceRecordSets: function (params, cb) {
                    r.ok(params.ChangeBatch, 'Param always has change batch');
                    r.equal(params.ChangeBatch.Comment, 'comment', 'Third argument overrides comment');
                }
            }, 'HostedZone', [ 'change' ], 'comment');
        });
    });
});
