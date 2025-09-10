import * as cdk from 'aws-cdk-lib';
import * as AmplifyHelpers from '@aws-amplify/cli-extensibility-helper';
import { AmplifyDependentResourcesAttributes } from '../../types/amplify-dependent-resources-ref';
import { Construct } from 'constructs';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as iam from 'aws-cdk-lib/aws-iam';
//import * as sns from 'aws-cdk-lib/aws-sns';
//import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
//import * as sqs from 'aws-cdk-lib/aws-sqs';

export class cdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps, amplifyResourceProps?: AmplifyHelpers.AmplifyResourceProps) {
    super(scope, id, props);
    /* Do not remove - Amplify CLI automatically injects the current deployment environment in this input parameter */
    new cdk.CfnParameter(this, 'env', {
      type: 'String',
      description: 'Current Amplify CLI env name',
    });
    
    // SES Setup for Invitation Emails
    const amplifyProjectInfo = AmplifyHelpers.getProjectInfo();
    
    // Create SES Email Identity (you can change this to your domain/email)
    // IMPORTANT: Use a CloudFormation condition so the value is resolved at deploy time,
    // not at synth time (the env parameter is a Token at synth time).
    const isProdCondition = new cdk.CfnCondition(this, 'IsProduction', {
      expression: cdk.Fn.conditionEquals(cdk.Fn.ref('env'), 'production'),
    });

    const fromEmailAddress = cdk.Fn.conditionIf(
      isProdCondition.logicalId,
      'noreply@kiyanaw.net',
      'noreply@kiyanaw.dev',
    ).toString();
    
    const emailIdentity = new ses.EmailIdentity(this, 'InviteEmailIdentity', {
      identity: ses.Identity.email(fromEmailAddress),
    });
    
    // Create IAM role for SES sending permissions
    const sesRoleResourceNamePrefix = `SESInviteRole-${amplifyProjectInfo.projectName}`;
    const sesRole = new iam.Role(this, 'SESInviteRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: `${sesRoleResourceNamePrefix}-${cdk.Fn.ref('env')}`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });
    
    // Add SES sending permissions to the role
    sesRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ses:SendEmail',
          'ses:SendRawEmail',
          'ses:SendTemplatedEmail',
        ],
        resources: ['*'], // You can restrict this to specific email identities if needed
      }),
    );
    
    // Output SES configuration for Lambda functions to reference
    new cdk.CfnOutput(this, 'SESFromEmailAddress', {
      value: fromEmailAddress,
      description: 'The email address to send invitations from',
      exportName: `${amplifyProjectInfo.projectName}-${cdk.Fn.ref('env')}-SESFromEmailAddress`,
    });
    
    new cdk.CfnOutput(this, 'SESRoleArn', {
      value: sesRole.roleArn,
      description: 'The ARN of the IAM role with SES permissions',
      exportName: `${amplifyProjectInfo.projectName}-${cdk.Fn.ref('env')}-SESRoleArn`,
    });
    
    new cdk.CfnOutput(this, 'SESEmailIdentityArn', {
      value: emailIdentity.emailIdentityArn,
      description: 'The ARN of the SES email identity',
      exportName: `${amplifyProjectInfo.projectName}-${cdk.Fn.ref('env')}-SESEmailIdentityArn`,
    });
    
  }
}