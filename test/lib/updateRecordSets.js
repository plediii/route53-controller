"use strict";

var test = require('tape');
var m = require('../../lib/updateRecordSets');
var _ = require('lodash');
var AWS = require('aws-sdk');

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

    t.test('resourceEC2', function (s) {
        s.test('uses resource spec region', function (r) {
            r.plan(1);
            var ec2 = m.resourceEC2(AWS, {
                "Region": "la-region"
            });
            r.equal('la-region', ec2.config.region);
        });
    });

    t.test('findInstances', function (s) {
        s.test('calls provided ec2.describeInstances', function (r) {
            r.plan(1);
            m.findInstances({
                describeInstances: function (params, cb) {
                    r.pass('Calls describeInstances on ec2');
                }
            });
        });

        s.test('returns a promise', function (r) {
            r.plan(1);
            r.ok(_.isFunction(m.findInstances({
                describeInstances: function (params, cb) {}
            }).then), 'Returns thenable');
        });

        s.test('rejects on describeInstances error ', function (r) {
            r.plan(1);
            m.findInstances({
                describeInstances: function (params, cb) {
                    return cb('describeInstances');
                }
            })
            .catch(function (err) {
                r.equal('describeInstances', err);
            });
        });

        s.test('returns flattened Reservation.Instances ', function (r) {
            r.plan(1);
            m.findInstances({
                describeInstances: function (params, cb) {
                    return cb(null, {
                        Reservations: [
                            { 
                                Instances: [
                                    {
                                        a: 1
                                    }
                                    , {
                                        b: 2
                                    }
                                ]
                            }
                            , { 
                                Instances: [
                                    {
                                        c: 3
                                    }
                                ]
                            }
                        ]
                    });
                }
                , filters: []
            })
            .then(function (instances) {
                r.deepEqual(instances, [
                    {
                        a: 1
                    }
                    , {
                        b: 2
                    }
                    , {
                        c: 3
                    }
                ]);
            });
        });

        s.test('calls describeInstances with provided filters', function (r) {
            r.plan(1);
            m.findInstances({
                describeInstances: function (params, cb) {
                    r.deepEqual(['provided'], params.Filters);
                }
            }, ['provided']);
        });
    });

    t.test('instanceIps', function (s) {
        s.test('returns PublicIPAddress by default', function (r) {
            r.plan(2);
            var ips = m.instanceIps([{
                PublicIpAddress: '127.1.1.1'
            }]);
            r.equal(1, ips.length, 'number of IPs returned');
            r.equal('127.1.1.1', ips[0], 'Should return public Ip');
        });

        s.test('returns PublicIPAddress of each instance', function (r) {
            r.plan(3);
            var ips = m.instanceIps([
                {
                    PublicIpAddress: '127.1.1.1'
                    , PrivateIpAddress: '192.1.1.1'
                }
                , {
                    PublicIpAddress: '127.1.1.2'
                    , PrivateIpAddress: '192.1.1.2'
                }]);
            r.equal(2, ips.length, 'number of IPs returned');
            r.ok(ips.indexOf('127.1.1.1') >= 0, 'should have the first public address');
            r.ok(ips.indexOf('127.1.1.2') >= 0, 'should have the second public address');
        });

        s.test('skips instances without PublicIPAddress', function (r) {
            r.plan(2);
            var ips = m.instanceIps([
                {
                    PrivateIpAddress: '127.1.1.1'
                }
                , {
                    PublicIpAddress: '127.1.1.2'
                    , PrivateIpAddress: '192.1.1.2'
                }]);
            r.equal(1, ips.length, 'number of IPs returned');
            r.ok(ips.indexOf('127.1.1.2') >= 0, 'should have the one public address');
        });

        s.test('returns PrivateIPAddress if given in second argument', function (r) {
            r.plan(2);
            var ips = m.instanceIps([{
                PublicIpAddress: '127.1.1.1'
                , PrivateIpAddress: '192.1.1.1'
            }], true);
            r.equal(1, ips.length, 'number of IPs returned');
            r.equal('192.1.1.1', ips[0], 'Should return private Ip');
        });

        s.test('returns PrivateIPAddress of each instance', function (r) {
            r.plan(3);
            var ips = m.instanceIps([
                {
                    PublicIpAddress: '127.1.1.1'
                    , PrivateIpAddress: '192.1.1.1'
                }
                , {
                    PublicIpAddress: '127.1.1.2'
                    , PrivateIpAddress: '192.1.1.2'
                }], true);
            r.equal(2, ips.length, 'number of IPs returned');
            r.ok(ips.indexOf('192.1.1.1') >= 0, 'should have second present address');
            r.ok(ips.indexOf('192.1.1.2') >= 0, 'should have second present  address');
        });

        s.test('skips instances without PrivateIPAddress', function (r) {
            r.plan(2);
            var ips = m.instanceIps([
                {
                    PublicIpAddress: '127.1.1.1'
                }
                , {
                    PublicIpAddress: '127.1.1.2'
                    , PrivateIpAddress: '192.1.1.2'
                }], true);
            r.equal(1, ips.length, 'number of IPs returned');
            r.ok(ips.indexOf('192.1.1.2') >= 0, 'should have the one present address');
        });
    });

    t.test('resourceChange', function (s) {
        s.test('Calls EC2 describeInstances', function (r) {
            r.plan(1);
            m.resourceChange({
                EC2: function () {
                    return {
                        describeInstances: function (params, cb) {
                            r.pass('Called describe instances');
                        }
                    };
                }
            }, 'resourceName', {
                Instances: [
                    {}
                ]
            });
        });

        s.test('Calls EC2 describeInstances', function (r) {
            r.plan(1);
            m.resourceChange({
                EC2: function () {
                    return {
                        describeInstances: function (params, cb) {
                            r.pass('Called describe instances');
                        }
                    };
                }
            }, 'resourceName', {
                Instances: [
                    {}
                ]
            });
        });

        s.test('Returns a change template with publicIPs by default', function (r) {
            r.plan(3);
            m.resourceChange({
                EC2: function () {
                    return {
                        describeInstances: function (params, cb) {
                            cb(null, {
                                Reservations: [{
                                    Instances: [{
                                        PublicIpAddress: '192.1.1.1'
                                    }]
                                }]
                            });
                        }
                    };
                }
            }, 'resourceName', {
                Instances: [
                    {}
                ]
            })
            .then(function (change) {
                r.ok(change, 'Returned change');
                r.equal(change.Action, 'UPSERT');
                r.equal('192.1.1.1', change.ResourceRecordSet.ResourceRecords[0].Value);
	    });
        });

        s.test('Returns a change template with privateIps when requested', function (r) {
            r.plan(3);
            m.resourceChange({
                EC2: function () {
                    return {
                        describeInstances: function (params, cb) {
                            cb(null, {
                                Reservations: [{
                                    Instances: [{
                                        PublicIpAddress: '192.1.1.1'
                                        , PrivateIpAddress: '127.1.1.1'
                                    }]
                                }]
                            });
                        }
                    };
                }
            }, 'resourceName', {
                Instances: [
                    {
                        PrivateIP: true
                    }
                ]
            })
            .then(function (change) {
                r.ok(change, 'Returned change');
                r.equal(change.Action, 'UPSERT');
                r.equal(change.ResourceRecordSet.ResourceRecords[0].Value, '127.1.1.1');
	    });
        });
    });

    t.test('updateResources', function (s) {
        s.test('Calls EC2 describeInstances', function (r) {
            r.plan(1);
            m.updateResources({
                EC2: function () {
                    return {
                        describeInstances: function (params, cb) {
                            r.pass('Called describe instances');
                        }
                    };
                }
            }, {
                HostedZone: "Z148QEXAMPLE8V"
                , Resources: {
                    test:{
                        Instances: [{}]
                        , ResourceRecordSet: { Name: 'resource' }
                    }
                }
            });
        });

        s.test('Rejects on  EC2 describeInstances error', function (r) {
            r.plan(1);
            m.updateResources({
                EC2: function () {
                    return {
                        describeInstances: function (params, cb) {
                            cb('error');
                        }
                    };
                }
            }, {
                HostedZone: "Z148QEXAMPLE8V"
                , Resources: {
                    test:{
                        Instances: [{}]
                        , ResourceRecordSet: { Name: 'resource' }
                    }
                }
            })
            .catch(function (err) {
                r.pass('Rejected on describeInstances error');
            });
        });

        s.test('Calls Route53.changeResourceRecordSets', function (r) {
            r.plan(6);
            m.updateResources({
                EC2: function () {
                    return {
                        describeInstances: function (params, cb) {
                            cb(null, {
                                Reservations: [{
                                    Instances: [{
                                        PublicIpAddress: '192.1.1.1'
                                        , PrivateIpAddress: '127.1.1.1'
                                    }]
                                }]
                            });
                        }
                    };
                }
                , Route53: function () {
                    return {
                        changeResourceRecordSets: function (params, cb) {
                            r.pass('Called changeResourceRecordSets');
                            r.equal("Z148QEXAMPLE8V", params.HostedZoneId);
                            r.equal(1, params.ChangeBatch.Changes.length);
                            r.equal(1, params.ChangeBatch.Changes[0].ResourceRecordSet.ResourceRecords.length);
                            r.equal("192.1.1.1", params.ChangeBatch.Changes[0].ResourceRecordSet.ResourceRecords[0].Value);
                            return cb();
                        }
                    };
                }
            }, {
                HostedZone: "Z148QEXAMPLE8V"
                , Resources: {
                    test:{
                        Instances: [{}]
                        , ResourceRecordSet: { Name: 'resource' }
                    }
                }
            })
            .then(function () {
                r.pass('Completed successfully.');
            });
        });

        s.test('Calls Route53.changeResourceRecordSets even if some resource is empty', function (r) {
            r.plan(6);
            m.updateResources({
                EC2: function () {
                    return {
                        describeInstances: function (params, cb) {
                            if (!params.Filters || params.Filters.length === 0) {
                                cb(null, {
                                    Reservations: [{
                                        Instances: []
                                    }]
                                });
                            } else {
                                cb(null, {
                                    Reservations: [{
                                        Instances: [{
                                            PublicIpAddress: '192.1.1.1'
                                            , PrivateIpAddress: '127.1.1.1'
                                        }]
                                    }]
                                });
                            }
                        }
                    };
                }
                , Route53: function () {
                    return {
                        changeResourceRecordSets: function (params, cb) {
                            r.pass('Called changeResourceRecordSets');
                            r.equal("Z148QEXAMPLE8V", params.HostedZoneId);
                            r.equal(1, params.ChangeBatch.Changes.length);
                            r.equal(1, params.ChangeBatch.Changes[0].ResourceRecordSet.ResourceRecords.length);
                            r.equal("192.1.1.1", params.ChangeBatch.Changes[0].ResourceRecordSet.ResourceRecords[0].Value);
                            return cb();
                        }
                    };
                }
            }, {
                HostedZone: "Z148QEXAMPLE8V"
                , Resources: {
                    test: {
                        Instances: [{
                            Filters: [{
                                "Name": "tag:Name",
                                "Values": [ "not.empty" ]
                            }]
                        }]
                        , ResourceRecordSet: { Name: 'resource' }
                    }
                    , empty: {
                        Instances: [{
                            Filters: []
                        }]
                        , ResourceRecordSet: { Name: 'empty' }
                    } 
                }
            })
            .then(function () {
                r.pass('Completed successfully.');
            });
        });

        s.test('Rejects on  Route53.changeResourceRecordSets error', function (r) {
            r.plan(1);
            m.updateResources({
                EC2: function () {
                    return {
                        describeInstances: function (params, cb) {
                            cb(null, {
                                Reservations: [{
                                    Instances: [{
                                        PublicIpAddress: '192.1.1.1'
                                        , PrivateIpAddress: '127.1.1.1'
                                    }]
                                }]
                            });
                        }
                    };
                }
                , Route53: function () {
                    return {
                        changeResourceRecordSets: function (params, cb) {
                            cb('Error');
                        }
                    };
                }
            }, {
                HostedZone: "Z148QEXAMPLE8V"
                , Resources: {
                    test:{
                        Instances: [{}]
                        , ResourceRecordSet: { Name: 'resource' }
                    }
                }
            })
            .catch(function (err) {
                r.pass('OK rejected on changeResourceRecordSets error');
            });
        });
    });
});
