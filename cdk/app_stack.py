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


# DOMAIN SETUP
domain_name = "taletinker.org"
subdomain = ""
hosted_zone_id = "Z02565232GU1G598M419U"
repo_url = "https://github.com/onurmatik/taletinker.git"


class MyAppStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Lookup existing hosted zone
        hosted_zone = route53.HostedZone.from_hosted_zone_attributes(
            self,
            "TaletinkerZone",
            hosted_zone_id=hosted_zone_id,
            zone_name="taletinker.org"
        )

        # Create S3 Bucket
        bucket = s3.Bucket(self, "AppDataBucket",
            versioned=True,
            removal_policy=RemovalPolicy.RETAIN
        )

        # Create EC2 VPC + Instance
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
        sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(443), "Allow HTTPS")

        # User data script for Ubuntu 24.04
        user_data = ec2.UserData.for_linux()
        user_data.add_commands(
            "sudo apt-get update -y",
            "sudo apt-get install -y python3-pip python3-venv git nginx",
            "sudo apt-get install -y build-essential libssl-dev libffi-dev python3-dev",
            "cd /home/ubuntu",
            f"git clone {repo_url} || true",
            "cd taletinker",
            "python3 -m venv venv",
            "source venv/bin/activate",
            "pip install --upgrade pip",
            "pip install -r requirements.txt",
            "sudo chown -R ubuntu:ubuntu /home/ubuntu/taletinker"
            
            # Django setup
            "sudo -u ubuntu /home/ubuntu/taletinker/venv/bin/python manage.py migrate",
            "sudo -u ubuntu /home/ubuntu/taletinker/venv/bin/python manage.py collectstatic --noinput",

            # Gunicorn systemd setup
            "sudo tee /etc/systemd/system/taletinker.service > /dev/null <<EOF",
            "[Unit]",
            "Description=Gunicorn daemon for TaleTinker",
            "After=network.target",

            "[Service]",
            "User=ubuntu",
            "Group=ubuntu",
            "WorkingDirectory=/home/ubuntu/taletinker",
            "Environment='PATH=/home/ubuntu/taletinker/venv/bin'",
            "ExecStart=/home/ubuntu/taletinker/venv/bin/gunicorn taletinker.wsgi:application --workers 3 --bind 0.0.0.0:8000",

            "[Install]",
            "WantedBy=multi-user.target",
            "EOF",

            # Start and enable service
            "sudo systemctl daemon-reexec",
            "sudo systemctl daemon-reload",
            "sudo systemctl enable taletinker",
            "sudo systemctl start taletinker"

            # Nginx config
            "sudo tee /etc/nginx/sites-available/taletinker > /dev/null <<EOF",
            "server {",
            "    listen 80;",
            "    server_name taletinker.org;",
            "",
            "    location = /favicon.ico { access_log off; log_not_found off; }",
            "    location /static/ {",
            "        alias /home/ubuntu/taletinker/static/;",
            "    }",
            "",
            "    location / {",
            "        proxy_pass http://127.0.0.1:8000;",
            "        proxy_set_header Host $host;",
            "        proxy_set_header X-Real-IP $remote_addr;",
            "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
            "        proxy_set_header X-Forwarded-Proto $scheme;",
            "    }",
            "}",
            "EOF",

            # Enable and restart Nginx
            "sudo ln -sf /etc/nginx/sites-available/taletinker /etc/nginx/sites-enabled",
            "sudo rm -f /etc/nginx/sites-enabled/default",
            "sudo nginx -t",
            "sudo systemctl restart nginx"

        )

        # Ubuntu 24.04 LTS Canonical AMI; find using:
        # aws ssm get-parameters --names /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id
        ubuntu_ami = ec2.MachineImage.generic_linux({
            "us-east-1": "ami-0731becbf832f281e"
        })

        instance = ec2.Instance(self, "AppInstance",
            instance_type=ec2.InstanceType("t3.micro"),
            machine_image=ubuntu_ami,
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            security_group=sg,
            key_name='taletinker-ec2-key',
            user_data=user_data,
        )

        # Allocate Elastic IP
        eip = ec2.CfnEIP(self, "AppElasticIP", domain="vpc")

        # Associate it with the EC2 instance
        ec2.CfnEIPAssociation(
            self, "AppElasticIPAssoc",
            eip=eip.ref,
            instance_id=instance.instance_id
        )

        # Grant S3 permissions to EC2
        bucket.grant_read_write(instance.role)

        # Allow EC2 to send email via SES
        instance.role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSESFullAccess")
        )

        # 6. Create DNS A record for app.taletinker.org pointing to instance public IP
        """
        route53.ARecord(self, "AppSubdomainRecord",
            zone=hosted_zone,
            record_name=subdomain,  # 'app'
            target=route53.RecordTarget.from_ip_addresses(instance.instance_public_ip)
        )
        """

        # Optional: SES identity (already commented)
        # ses.EmailIdentity(self, "SESIdentity", identity=ses.Identity.email("you@example.com"))
