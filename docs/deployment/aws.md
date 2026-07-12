# InfraMedic Production Deployment Guide: AWS

This guide details the requirements, permissions, and security considerations for deploying InfraMedic in an active Amazon Web Services (AWS) environment.

## 1. Credentials Configuration

InfraMedic's cloud adapter reads credentials from standard AWS locations. By default, it uses the standard credential provider chain in `boto3`.

### Supported Authentication Methods

*   **IAM Roles for Service Accounts (IRSA)**: Recommended for EKS clusters.
*   **EC2 Instance Profiles**: Recommended for deployments running on VMs.
*   **Environment Variables**:
    ```bash
    AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
    AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    AWS_DEFAULT_REGION=us-east-1
    ```
*   **Shared Credentials File** (`~/.aws/credentials`).

---

## 2. Least-Privilege IAM Policy

The following IAM policy grants the minimal permissions necessary to discover resources, poll metrics, reboot instances, and execute SSM remediation commands on target hosts.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "InfraMedicDiscoveryAndRemediation",
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeSecurityGroups",
                "ec2:RebootInstances",
                "ssm:SendCommand",
                "ecs:ListClusters",
                "ecs:DescribeClusters",
                "ecs:ListTasks",
                "ecs:DescribeTasks",
                "eks:ListClusters",
                "eks:DescribeCluster",
                "lambda:ListFunctions",
                "rds:DescribeDBInstances",
                "s3:ListAllMyBuckets",
                "s3:GetBucketLocation",
                "secretsmanager:ListSecrets",
                "ssm:DescribeParameters",
                "elasticloadbalancing:DescribeLoadBalancers",
                "cloudwatch:GetMetricData",
                "cloudwatch:GetMetricStatistics",
                "cloudwatch:ListMetrics",
                "logs:DescribeLogGroups",
                "logs:FilterLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
```

---

## 3. Required APIs to Enable

Ensure the following service APIs are enabled in your AWS Account Console:

1.  **EC2 API** (`ec2.amazonaws.com`)
2.  **RDS API** (`rds.amazonaws.com`)
3.  **S3 API** (`s3.amazonaws.com`)
4.  **Lambda API** (`lambda.amazonaws.com`)
5.  **EKS API** (`eks.amazonaws.com`)
6.  **ECS API** (`ecs.amazonaws.com`)
7.  **Secrets Manager API** (`secretsmanager.amazonaws.com`)
8.  **CloudWatch API** (`monitoring.amazonaws.com`)

---

## 4. Network and Monitoring Configuration

### Outbound Access
The InfraMedic daemon requires HTTPS egress on port `443` to target the AWS regional endpoints:
*   `ec2.<region>.amazonaws.com`
*   `rds.<region>.amazonaws.com`
*   `monitoring.<region>.amazonaws.com` (CloudWatch)

### CloudWatch Agent
To capture container-level metrics (e.g. `OOMKills`, CPU, Memory utilization metrics) for ECS or EKS, ensure the AWS CloudWatch Agent or Prometheus Container Insights daemon is deployed to publish performance counters to CloudWatch Metrics.

---

## 5. Security Considerations

*   **Least-Privilege Boundary**: Only grant read-only discovery permissions and targeted remediation rights (`ec2:RebootInstances` and `ssm:SendCommand`). Never add full administrative or destructive rights (such as `ec2:RunInstances` or `rds:DeleteDBInstance`) to the InfraMedic executor IAM role.
*   **Secrets Storage**: Do not store plaintext access keys on disk. Prefer IAM Roles or instance profiles.
*   **VPC Peering**: Deploy InfraMedic inside a dedicated management VPC, peering to workload VPCs via Transit Gateway or VPC Peering for metrics access.
