# route53-controller [![Build Status](https://travis-ci.org/plediii/route53-controller.svg)](https://travis-ci.org/plediii/route53-controller)

When launching new EC2 instances in AWS, it is often desirable to add
the new instance's IP to a route53 record set.  For instance when an
autoscaling group launches a new node, AWS provides facilities to
automatically add the instances to a load balancer, but there are no
facilities to automatically add the new instance to a route53 record
set. 

*route53-controller* provides the service to automatically add
instances to Route53 record sets.  You provide a `resource.json`
describing which instances to add to which record set, and
*route53-controller* adds the appropriate IPs to your record sets.

`route53-controller` can be run as standalone CLI script, but also
provides scripts which build and install an AWS Lambda function to
perform the task.  

## Resource description: *resource.json* 

The instances and resource record sets to which to add the instances'
IPs are described by a JSON format, referred to as *resource.json*.

Given a `resource.json` we may immediately update our resource record
sets by using `./bin/update.js`. It is not necessary to upload a Lambda function.
```
$ node bin/update.js --resource resource.json
```

The root structure of the *resource.json* is 
```javascript
{
    "HostedZone": "Z148QEXAMPLE8V",
    "Resources": {
        /* Resources describing (Instance -> record set) pairs */
    }
 }
```

#### **HostedZone**

The *HostedZone* is the ID of a pre-existing route53 Hosted Zone.
There may be only *HostedZone* one per *resource.json*.  If multiple
*HostedZone*s must be controlled, you will need to create additional
*route53-controller* resource descriptions, and AWS Lambda functions.

#### **Resources**

The *Resources* attribute is a list of all the record sets which will
be modified, along with the filters describing the instances whose IPs
will be associated to the record set.  There may be one or more
instances/record set pairs.  The format of the *Resources* is

```javascript
"Resources": {
   "ResourceID": {
      "ResourceRecordSet": {  
         /* Description of the Route53 resource record set update */
      },
      "Instances": [
         /* One or more EC2 instance descriptions to be associated to the route53 record set */
      ]
      
   }
}
```

The **ResourceID** of the *instances*/*record set* pair is used to *name*
the pair for convenience, but has no effect on the logical operation
of the record set update.  Any valid JSON attribute name is acceptable.

##### ResourceRecordSet

The **ResourceRecordSet** describes the Resource Record to be updated.
The basic required format is
```javascript
"ResourceRecordSet": {
    "Name": "bar.example.com", // domain name to be modified
 }
```

*route53-controller* will locate the instances to be used in the
record set, then it will use the *ResourceRecordSet* set to update the
record.


After *route53-controller* executes, **all** of the IPs associated
with the record set will be replaced.

The *ResourceRecordSet* object will used as the `ResourceRecordSet`
parameter in a call to the AWS SDK
**route53.changeResourceRecordSets** function, except:

* *ResourceRecords* will be set to to the list of instance IPs
* The required *Type* will default to "A"

 See the [changeResourceRecordSets API
documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Route53.html#changeResourceRecordSets-property)
for more information about attributes.

##### Instances

The *Instances* attribute is an array of descriptions of EC2
instance IPs to be associated with the *ResourceRecordSet*.  The
format is
```javascript
"Instances": [
   /* one or more instance descriptions */
   {
      "Filters": [
         // One or more ec2.describeInstances filters
      ],
      "PrivateIP": true || false, // Optional: whether to use the instance's private IP
      "Region": "us-east-1" || "us-west-2" || "eu-central-1" || etc. // the AWS Region in which to find the instances
   }
 ]
```

By default, the *public IP* of each EC2 instance will be used.
However, if the **PrivateIP** attribute is present and `true`, then
the *private IPs* will be used instead.

The **Region** attribute specifies the AWS region in which to find the
instances. Only *one* region may be specified per *instance
description*. If the record set must include IPs of instances from
different regions, then *multiple* instance descriptions must be used.

The **Filters** describe which EC2 instances will be included in the
new value of the route53 record set.  The filters will be used
directly in an `ec2.describeInstances` operation without modification.
See the [describeInstances API
documentation](http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeInstances-property)
for information and examples of possible filters.

### Example *resources.json*

A complete mock example of a *resource.json* is
```javascript
{
    "HostedZone": "Z148QEXAMPLE8V",
    "Resources": {
        "bar.example": {
            "Instances": [
                {
                    "Region": "us-west-1",
                    "PrivateIP": true,
                    "Filters": [
                        {
                            "Name": "tag:Name",
                            "Values": [
                                "bar.example"
                            ]
                        }
                    ]
                }
            ],
            "ResourceRecordSet": {
                "Name": "bar.example.com",
                "TTL": 30
            }
        }
    },
    "foo.example": {
        "Instances": [
            {
                "Region": "us-west-2",
                "Filters": [
                    {
                        "Name": "tag:Name",
                        "Values": [
                            "foo.example"
                        ]
                    }
                ]
            },
            {
                "Region": "us-east-1",
                "Filters": [
                    {
                        "Name": "tag:Name",
                        "Values": [
                            "foo.example"
                        ]
                    }
                ]
            }
        ],
        "ResourceRecordSet": {
            "Name": "foo.example.com",
        }
    }
}
```

Here, the *resource.json* file describes modifying the recordset in
a fake example HostedZone.  

* All instances tagged with the `Name` of `bar.example` in the `us-west-1` region are included as IPs in the record set `bar.example.com`.  
* All instances tagged with the `Name` of `foo.example` in the `us-west-2` and `us-east-1` regions are included as IPs in the record set `foo.example.com`.

## Uploading/Updating the AWS Lambda function

`route53-controller` provides a convenience script,
'bin/lambdaFunction' to upload and update the Lambda function directly.  By
default, *route53-contoller* will name the Lambda function as
`route53-controller`.  You may specify a different name by providing
the `--name` argument.

You may create the Lambda function by running
```
$ node bin/lambdaFunction.js create --resource resource.json --role arn:aws:iam::NNNNNNNNNNNN:role/lambda_role --region=us-west-2
```

A role ARN must be provided when creating the lambda function.  Also,
not all regions support Lambda functions, so you may need to specify
the region explicitly.  The region where the Lambda function does not
affect which resource record sets and ec2 instances
`route53-controller` may change or see.

An existing `route53-controller` may be updated by running
```
$ node bin/lambdaFunction.js update --resource resource.json --region=us-west-2
```
Again, the region may be required, but the role ARN is not requirewd
to update the Lambda function.

## Creating a Lambda deployment package

If you prefer to upload the function manually *route53-controller* can
be used to create the AWS Lambda deployment package, but not upload it.  Follow, for
example, the [AWS Lambda
walkthrough](http://docs.aws.amazon.com/lambda/latest/dg/walkthrough-s3-events-adminuser-prepare.html).
Create a lambda execution role with the required `route53-controller`
IAM policy, and upload the zip file created by
`./bin/createLambdaPackage.js`.

For example:
```
$ node bin/createLambdaPackage.js --resource resource.json
```

## Invoking the Lambda function

After uploading the lambda function, you may invoke it either with the AWS console, or via with the AWS CLI:
```
$ aws lambda invoke --region us-west-2 --function-name route53-controller  --invocation-type RequestResponse --log-type Tail  --payload '{}' lambda-output.txt
```
Make sure to invoke the function with the `region` and `function-name`
you chose.  The payload does not have any effect on the `route53-controller` behavior.

## Trigger Lambda function when autoscaling group changes

See the Auto Scaling developer guide ["Getting Notifications When Your
Auto Scaling Group
Changes"](http://docs.aws.amazon.com/AutoScaling/latest/DeveloperGuide/ASGettingNotifications.html)
to set up SNS notifications when your autoscaling group changes.

Then see the Amazon Simple Notification Service Developer Guide
["Invoking Lambda functions using Amazon SNS
notifications"](http://docs.aws.amazon.com/sns/latest/dg/sns-lambda.html)
to trigger the lambda function when the SNS event occurs.


## IAM policies

When updating record sets either in CLI mode, or in AWS Lambda, AWS
requires appropriate IAM permissions to both describe the EC2
instances, and modify the record sets.

The script `./bin/create-policy.js` can be used to create the
necessary policy.  `create-policy.js` requires either a local copy of
the `resource.json` file or an `s3location.json` file describing where
to fetch the `resource.json` (more information below).

Alternatively, `./bin/create-policy.js` can create a policy which may
be *attached* to roles or users by including the `--createPolicy`
option:

```
$ node bin/createPolicy.js --resource resource.json --createPolicy route53-controller
```

`./bin/createPolicy.js` may also attach the policy inline for an
existing user or role by providing the `--userPolicy` or
`--rolePolicy` respectively.

```
$ node bin/createPolicy.js --resource resource.json --rolePolicy lambda_role
```

If an `s3location.json` file is provided, the policy will include read
access to that s3 location.
```
$ node bin/createPolicy.js --resource resource.json --s3location s3location.json
```

## Storing `resource.json` in S3

Normally, the `resource.json` will be uploaded as part of the Lambda
function deployment package.  However, if `resource.json` must be
updated frequently, it may be more convenient (and require 
fewer permissions) to store `resource.json` at an S3 location,
where it can be updated without requiring redeployment of the Lambda
function.  

The S3 location is describe by an `s3Location.json` file.  For example: 

```javascript
{
    "Bucket": "my-bucket",
    "Key": "resource.json"
}
```

The resource file may be uploaded by `./bin/uploadResourceDefinition.js`

```
$ node bin/uploadResourceDefinition.js s3Location.json resource.json
```

Now `route53-controller` requires read access to the static s3
location.  The necessary policy may be created by
```
$ node bin/createPolicy.js --s3location s3Location.json
```

Then, we may provide the `s3location.json` file in place of `resource.json`.
```
$ node bin/lambdaFunction.js update --s3location resource.json --region=us-west-2
$ node bin/lambdaFunction.js --s3location s3Location.json
```

