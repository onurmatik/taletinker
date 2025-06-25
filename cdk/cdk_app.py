#!/usr/bin/env python3
import aws_cdk as cdk
from app_stack import MyAppStack

app = cdk.App()
MyAppStack(app, "TaletinkerAppStack", env=cdk.Environment(region="us-east-1"))
app.synth()
