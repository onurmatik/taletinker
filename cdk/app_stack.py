from aws_cdk import (
    Stack,
    RemovalPolicy,
    aws_ec2 as ec2,
    aws_s3 as s3,
    aws_iam as iam,
    aws_ses as ses,
    aws_ses_actions as ses_actions,
    aws_route53 as route53,
    aws_route53_targets as targets
)
from constructs import Construct

class MyAppStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # DOMAIN SETUP
        domain_name = "taletinker.org"
        subdomain = ""

        # 1. Lookup existing hosted zone
        hosted_zone = route53.HostedZone.from_lookup(
            self, "TaletinkerZone", domain_name=domain_name
        )

        # 2. Create S3 Bucket
        bucket = s3.Bucket(self, "AppDataBucket",
            versioned=True,
            removal_policy=RemovalPolicy.RETAIN
        )

        # 3. Create EC2 VPC + Instance
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

        # 4. Grant S3 permissions to EC2
        bucket.grant_read_write(instance.role)

        # 5. Allow EC2 to send email via SES
        instance.role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSESFullAccess")
        )

        # 6. Create DNS A record for app.taletinker.org pointing to instance public IP
        route53.ARecord(self, "AppSubdomainRecord",
            zone=hosted_zone,
            record_name=subdomain,  # 'app'
            target=route53.RecordTarget.from_ip_addresses(instance.instance_public_ip)
        )

        # Optional: SES identity (already commented)
        # ses.EmailIdentity(self, "SESIdentity", identity=ses.Identity.email("you@example.com"))
