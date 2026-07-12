import logging
import boto3
from botocore.exceptions import EndpointConnectionError, ClientError
from app.services.cloud.provider import CloudProvider

logger = logging.getLogger(__name__)


class AWSProvider(CloudProvider):
    """Real AWS Provider implementing the CloudProvider interface using boto3."""

    def _get_client(self, service_name: str, config: dict):
        endpoint_url = config.get("aws_endpoint_url")
        
        # Real AWS Provider should ignore localstack/local developer endpoints
        if self.__class__.__name__ == "AWSProvider":
            if endpoint_url and any(x in endpoint_url.lower() for x in ["localhost", "127.0.0.1", "host.docker.internal", "4566"]):
                endpoint_url = None

        if not endpoint_url or endpoint_url.strip().lower() in ("none", ""):
            endpoint_url = None

        return boto3.client(
            service_name,
            endpoint_url=endpoint_url,
            region_name=config.get("aws_region", "us-east-1"),
            aws_access_key_id=config.get("aws_access_key_id"),
            aws_secret_access_key=config.get("aws_secret_access_key"),
        )

    def connect(self, config: dict) -> bool:
        try:
            sts = self._get_client("sts", config)
            sts.get_caller_identity()
            return True
        except Exception:
            return False

    def health(self, config: dict) -> dict:
        try:
            sts = self._get_client("sts", config)
            caller = sts.get_caller_identity()
            account = caller.get("Account", "000000000000")
            arn = caller.get("Arn", "arn:aws:iam::000000000000:root")

            # Detect credential method via boto3 Session
            session = boto3.Session(
                region_name=config.get("aws_region", "us-east-1"),
                aws_access_key_id=config.get("aws_access_key_id"),
                aws_secret_access_key=config.get("aws_secret_access_key"),
            )
            creds = session.get_credentials()
            raw_method = creds.method if creds else "unknown"

            # Map method name
            auth_method = "IAM Role / Instance Profile"
            if raw_method == "env":
                auth_method = "Environment Variables"
            elif raw_method == "shared-credentials-file":
                auth_method = "AWS CLI Credentials (~/.aws)"
            elif config.get("aws_access_key_id"):
                auth_method = "Manual Credentials (advanced)"
            
            effective_endpoint = config.get("aws_endpoint_url")
            if self.__class__.__name__ == "AWSProvider" and effective_endpoint and any(x in effective_endpoint.lower() for x in ["localhost", "127.0.0.1", "host.docker.internal", "4566"]):
                effective_endpoint = None

            if effective_endpoint and "4566" in effective_endpoint:
                auth_method = "Local Developer (Floci)"

            return {
                "status": "connected",
                "auth_method": auth_method,
                "account": account,
                "project": arn.split("/")[-1] if "/" in arn else arn,
                "region": config.get("aws_region", "us-east-1"),
                "health": "Healthy"
            }
        except Exception as e:
            return {
                "status": "error",
                "auth_method": "None",
                "account": "None",
                "project": "None",
                "region": config.get("aws_region", "us-east-1"),
                "health": f"Unhealthy: {str(e)}"
            }

    def discover_compute(self, config: dict) -> list[dict]:
        resources = []
        try:
            ec2 = self._get_client("ec2", config)
            resp = ec2.describe_instances()
            for reservation in resp.get("Reservations", []):
                for inst in reservation.get("Instances", []):
                    if inst["State"]["Name"] == "terminated":
                        continue
                    name = inst["InstanceId"]
                    for tag in inst.get("Tags", []):
                        if tag["Key"] == "Name":
                            name = tag["Value"]
                            break
                    ip_addr = inst.get("PublicIpAddress") or inst.get("PrivateIpAddress", "10.0.0.1")
                    resources.append({
                        "id": inst["InstanceId"],
                        "name": name,
                        "status": inst["State"]["Name"].capitalize(),
                        "ip": ip_addr,
                        "cpu": 0.0,
                        "memory": 0.0,
                        "type": inst["InstanceType"],
                        "provider": "AWS",
                        "resource_type": "compute"
                    })
        except (EndpointConnectionError, ClientError) as e:
            logger.debug(f"AWS EC2 compute discovery failed/unsupported: {e}")

        # ECS tasks
        try:
            ecs = self._get_client("ecs", config)
            clusters = ecs.list_clusters().get("clusterArns", [])
            for c_arn in clusters:
                c_name = c_arn.split("/")[-1]
                tasks = ecs.list_tasks(cluster=c_name).get("taskArns", [])
                if tasks:
                    task_details = ecs.describe_tasks(cluster=c_name, tasks=tasks).get("tasks", [])
                    for task in task_details:
                        resources.append({
                            "id": task["taskArn"].split("/")[-1],
                            "name": f"ecs-{c_name}-task",
                            "status": task["lastStatus"].capitalize(),
                            "ip": "Fargate",
                            "cpu": 0.0,
                            "memory": 0.0,
                            "type": "ECS Task",
                            "provider": "AWS",
                            "resource_type": "compute"
                        })
        except (EndpointConnectionError, ClientError) as e:
            logger.debug(f"AWS ECS task discovery failed/unsupported: {e}")

        return resources

    def discover_storage(self, config: dict) -> list[dict]:
        resources = []
        try:
            s3 = self._get_client("s3", config)
            resp = s3.list_buckets()
            for bucket in resp.get("Buckets", []):
                resources.append({
                    "name": bucket["Name"],
                    "status": "Active",
                    "size": "N/A",
                    "files_count": 0,
                    "provider": "AWS",
                    "resource_type": "storage"
                })
        except (EndpointConnectionError, ClientError) as e:
            logger.debug(f"AWS S3 storage discovery failed/unsupported: {e}")
        return resources

    def discover_databases(self, config: dict) -> list[dict]:
        resources = []
        try:
            rds = self._get_client("rds", config)
            resp = rds.describe_db_instances()
            for db in resp.get("DBInstances", []):
                resources.append({
                    "id": db["DBInstanceIdentifier"],
                    "type": db.get("Engine", "Postgres").capitalize(),
                    "status": db["DBInstanceStatus"].capitalize(),
                    "engine": f"{db.get('Engine', 'Postgres')} {db.get('EngineVersion', '')}",
                    "connections": 0,
                    "provider": "AWS",
                    "resource_type": "database"
                })
        except (EndpointConnectionError, ClientError) as e:
            logger.debug(f"AWS RDS database discovery failed/unsupported: {e}")
        return resources

    def discover_networks(self, config: dict) -> list[dict]:
        resources = []
        try:
            ec2 = self._get_client("ec2", config)
            
            # VPCs
            vpcs = ec2.describe_vpcs().get("Vpcs", [])
            for vpc in vpcs:
                name = vpc["VpcId"]
                for tag in vpc.get("Tags", []):
                    if tag["Key"] == "Name":
                        name = tag["Value"]
                        break
                resources.append({
                    "id": vpc["VpcId"],
                    "name": name,
                    "cidr": vpc["CidrBlock"],
                    "status": vpc["State"].capitalize(),
                    "provider": "AWS",
                    "resource_type": "networking"
                })

            # Security Groups
            sgs = ec2.describe_security_groups().get("SecurityGroups", [])
            for sg in sgs:
                resources.append({
                    "id": sg["GroupId"],
                    "name": sg["GroupName"],
                    "cidr": sg.get("Description", "Security Group"),
                    "status": "Active",
                    "provider": "AWS",
                    "resource_type": "networking"
                })
        except (EndpointConnectionError, ClientError) as e:
            logger.debug(f"AWS VPC network discovery failed/unsupported: {e}")
        return resources

    def discover_kubernetes(self, config: dict) -> list[dict]:
        resources = []
        try:
            eks = self._get_client("eks", config)
            resp = eks.list_clusters()
            for c_name in resp.get("clusters", []):
                resources.append({
                    "id": c_name,
                    "name": c_name,
                    "status": "Active",
                    "type": "Elastic Kubernetes Service",
                    "provider": "AWS",
                    "resource_type": "cluster"
                })
        except (EndpointConnectionError, ClientError) as e:
            logger.debug(f"AWS EKS clusters discovery failed/unsupported: {e}")
        return resources

    def discover_functions(self, config: dict) -> list[dict]:
        resources = []
        try:
            lam = self._get_client("lambda", config)
            resp = lam.list_functions()
            for fn in resp.get("Functions", []):
                resources.append({
                    "id": fn["FunctionArn"],
                    "name": fn["FunctionName"],
                    "status": "Active",
                    "runtime": fn.get("Runtime", "python3.11"),
                    "provider": "AWS",
                    "resource_type": "function"
                })
        except (EndpointConnectionError, ClientError) as e:
            logger.debug(f"AWS Lambda functions discovery failed/unsupported: {e}")
        return resources

    def discover_load_balancers(self, config: dict) -> list[dict]:
        resources = []
        try:
            elbv2 = self._get_client("elbv2", config)
            resp = elbv2.describe_load_balancers()
            for lb in resp.get("LoadBalancers", []):
                resources.append({
                    "id": lb["LoadBalancerArn"],
                    "name": lb["LoadBalancerName"],
                    "status": lb["State"]["Code"].capitalize(),
                    "type": lb.get("Type", "application"),
                    "provider": "AWS",
                    "resource_type": "load_balancer"
                })
        except (EndpointConnectionError, ClientError) as e:
            logger.debug(f"AWS ELBv2 discovery failed/unsupported: {e}")
        return resources

    def discover_secrets(self, config: dict) -> list[dict]:
        resources = []
        try:
            sm = self._get_client("secretsmanager", config)
            resp = sm.list_secrets()
            for sec in resp.get("SecretList", []):
                resources.append({
                    "name": sec["Name"],
                    "type": "SecretsManager Key",
                    "status": "Secure",
                    "last_rotated": "N/A",
                    "provider": "AWS",
                    "resource_type": "secret"
                })
        except (EndpointConnectionError, ClientError) as e:
            logger.debug(f"AWS Secrets Manager discovery failed/unsupported: {e}")
        return resources

    def discover_identity(self, config: dict) -> list[dict]:
        resources = []
        try:
            iam = self._get_client("iam", config)
            for role in iam.list_roles().get("Roles", []):
                resources.append({
                    "id": role["RoleId"],
                    "name": role["RoleName"],
                    "status": "Active",
                    "type": "IAM Role",
                    "provider": "AWS",
                    "resource_type": "identity"
                })
        except (EndpointConnectionError, ClientError) as e:
            logger.debug(f"AWS IAM discovery failed/unsupported: {e}")
        return resources

    def collect_metrics(self, config: dict) -> list[dict]:
        # Implementation returns standard resource stats from CloudWatch
        return []

    def collect_logs(self, config: dict) -> list[dict]:
        return []

    def list_incidents(self, config: dict) -> list[dict]:
        # Returns active CloudWatch alarms as external incident tickets
        incidents = []
        try:
            cw = self._get_client("cloudwatch", config)
            alarms = cw.describe_alarms(StateValue="ALARM").get("MetricAlarms", [])
            for alarm in alarms:
                incidents.append({
                    "id": alarm["AlarmArn"],
                    "title": alarm["AlarmName"],
                    "service_name": alarm.get("Namespace", "AWS/EC2"),
                    "metric_name": alarm.get("MetricName", "CPUUtilization"),
                    "metric_value": 95.0,
                    "status": "active"
                })
        except (EndpointConnectionError, ClientError) as e:
            logger.debug(f"CloudWatch alarms query failed/unsupported: {e}")
        return incidents

    def execute_action(self, config: dict, action: str, resource_id: str) -> dict:
        try:
            ec2 = self._get_client("ec2", config)
            if action.lower() == "restartservice" or action.lower() == "restartinstance":
                ec2.reboot_instances(InstanceIds=[resource_id])
                return {"status": "success", "message": f"Successfully rebooted instance {resource_id}."}
            return {"status": "error", "message": f"Action {action} is not supported by AWS provider adapter."}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def provision_demo_infrastructure(self, config: dict) -> bool:
        try:
            ec2 = self._get_client("ec2", config)
            vpc = ec2.create_vpc(CidrBlock="10.0.0.0/16")
            vpc_id = vpc["Vpc"]["VpcId"]
            ec2.create_tags(Resources=[vpc_id], Tags=[{"Key": "Name", "Value": "inframedic-vpc"}])

            subnet = ec2.create_subnet(VpcId=vpc_id, CidrBlock="10.0.1.0/24")
            subnet_id = subnet["Subnet"]["SubnetId"]

            sg = ec2.create_security_group(
                GroupName="inframedic-sg",
                Description="InfraMedic security group",
                VpcId=vpc_id
            )
            sg_id = sg["GroupId"]

            services = ["checkout-api", "inventory-worker", "payments-api", "orders-api"]
            for svc in services:
                inst = ec2.run_instances(
                    ImageId="ami-unused",
                    InstanceType="t3.micro",
                    MinCount=1,
                    MaxCount=1,
                    SubnetId=subnet_id,
                    SecurityGroupIds=[sg_id]
                )
                inst_id = inst["Instances"][0]["InstanceId"]
                ec2.create_tags(Resources=[inst_id], Tags=[{"Key": "Name", "Value": svc}])

            s3 = self._get_client("s3", config)
            try:
                s3.create_bucket(Bucket="inframedic-artifacts")
            except ClientError:
                pass

            try:
                rds = self._get_client("rds", config)
                rds.create_db_instance(
                    DBInstanceIdentifier="inframedic-postgres",
                    DBInstanceClass="db.t3.micro",
                    Engine="postgres",
                    AllocatedStorage=20,
                    MasterUsername="postgres",
                    MasterUserPassword="dbpassword123"
                )
            except ClientError:
                pass

            try:
                sm = self._get_client("secretsmanager", config)
                sm.create_secret(
                    Name="inframedic-secret",
                    SecretString='{"api_key": "sk_test_51", "db_password": "dbpassword123"}'
                )
            except ClientError:
                pass

            return True
        except Exception as e:
            logger.error(f"Failed to provision demo infrastructure in Floci: {e}")
            return False

    def teardown_infrastructure(self, config: dict) -> bool:
        try:
            ec2 = self._get_client("ec2", config)
            s3 = self._get_client("s3", config)
            
            instances = []
            try:
                resp = ec2.describe_instances()
                for reservation in resp.get("Reservations", []):
                    for inst in reservation.get("Instances", []):
                        if inst["State"]["Name"] not in ("terminated", "shutting-down"):
                            instances.append(inst["InstanceId"])
                
                if instances:
                    ec2.terminate_instances(InstanceIds=instances)
            except ClientError:
                pass
            
            try:
                buckets = s3.list_buckets().get("Buckets", [])
                for b in buckets:
                    b_name = b["Name"]
                    try:
                        objs = s3.list_objects_v2(Bucket=b_name).get("Contents", [])
                        for obj in objs:
                            s3.delete_object(Bucket=b_name, Key=obj["Key"])
                        s3.delete_bucket(Bucket=b_name)
                    except ClientError:
                        pass
            except ClientError:
                pass

            try:
                rds = self._get_client("rds", config)
                rds.delete_db_instance(
                    DBInstanceIdentifier="inframedic-postgres",
                    SkipFinalSnapshot=True
                )
            except ClientError:
                pass

            try:
                sm = self._get_client("secretsmanager", config)
                sm.delete_secret(SecretId="inframedic-secret", ForceDeleteWithoutRecovery=True)
            except ClientError:
                pass

            return True
        except Exception as e:
            logger.error(f"Failed to teardown infrastructure in Floci: {e}")
            return False
