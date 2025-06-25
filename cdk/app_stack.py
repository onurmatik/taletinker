from aws_cdk import (
    Stack,
    RemovalPolicy,
    aws_ec2 as ec2,
    aws_s3 as s3,
    aws_iam as iam,
    aws_ses as ses,
    aws_ses_actions as ses_actions
)
from constructs import Construct

class MyAppStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # 1. Create S3 Bucket
        bucket = s3.Bucket(self, "AppDataBucket",
            versioned=True,
            removal_policy=RemovalPolicy.RETAIN
        )

        # 2. Create EC2 Instance
        vpc = ec2.Vpc(self, "AppVPC",
            max_azs=2,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                )
            ]
        )

        sg = ec2.SecurityGroup(self, "AppSG", vpc=vpc)
        sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(22), "Allow SSH")
        sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(80), "Allow HTTP")

        instance = ec2.Instance(self, "AppInstance",
            instance_type=ec2.InstanceType("t3.micro"),
            machine_image=ec2.MachineImage.latest_amazon_linux2(),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            security_group=sg
        )

        # 3. Add S3 permissions to EC2
        bucket.grant_read_write(instance.role)

        # 4. Allow EC2 to send email via SES
        instance.role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSESFullAccess")
        )

        # Optional: SES Verify Identity
        # ses.EmailIdentity(self, "SESIdentity", identity=ses.Identity.email("you@example.com"))
