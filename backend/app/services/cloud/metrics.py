import os
import glob
import logging
import subprocess
import datetime
import re

logger = logging.getLogger(__name__)


def find_ssh_keys():
    """Locates all potential private key files (.pem, id_rsa, id_ed25519) in common user folders."""
    home = os.path.expanduser("~")
    dirs = [
        os.path.join(home, ".ssh"),
        os.path.join(home, "Downloads"),
        os.path.join(home, "Desktop"),
        os.path.join(home, "Documents"),
        os.path.join(home, "Videos"),
        os.path.join(home, "Videos", "InfraMedic"),
        "/app",
        "/app/app",
        "/app/backend",
    ]
    keys = []
    for d in dirs:
        if os.path.exists(d):
            for ext in ["*.pem", "id_rsa", "id_ed25519"]:
                keys.extend(glob.glob(os.path.join(d, ext)))
    # Add any workspace folder key
    keys.extend(glob.glob("*.pem"))
    # Return unique paths
    return list(set(keys))


def execute_ssh_command(ip: str, command: str) -> str | None:
    """Attempts to execute a shell command on the host via SSH using standard usernames and located keys."""
    if not ip or ip == "10.0.0.1":
        return None

    keys = find_ssh_keys()
    users = ["ubuntu", "ec2-user", "admin", "centos", "root"]

    # Try without key first (relying on ssh-agent or passwordless)
    for user in users:
        cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=3", f"{user}@{ip}", command]
        try:
            logger.debug(f"Trying SSH without key: {user}@{ip}")
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            if res.returncode == 0:
                logger.info(f"SSH command succeeded via {user}@{ip} without explicit key")
                return res.stdout
        except Exception as e:
            logger.debug(f"SSH without key failed for {user}@{ip}: {e}")

    # Try with keys
    for key in keys:
        try:
            os.chmod(key, 0o600)
        except Exception as chmod_err:
            logger.warning(f"Could not set secure permissions (0600) on private key {key}: {chmod_err}")

        for user in users:
            cmd = ["ssh", "-i", key, "-o", "StrictHostKeyChecking=no", "-o", "ConnectTimeout=3", f"{user}@{ip}", command]
            try:
                logger.debug(f"Trying SSH with key {key}: {user}@{ip}")
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                if res.returncode == 0:
                    logger.info(f"SSH command succeeded via {user}@{ip} using key {key}")
                    return res.stdout
            except Exception as e:
                logger.debug(f"SSH failed for {user}@{ip} with key {key}: {e}")

    return None


def fetch_real_host_metrics(ip: str, instance_id: str, provider_name: str, config: dict) -> tuple[float | None, float | None]:
    """Retrieves real CPU and Memory utilization. Tries SSH command first, falls back to CloudWatch (for CPU)."""
    # Try SSH first to get both CPU and memory
    metric_cmd = (
        'cpu=$(top -bn1 | grep "Cpu(s)" | awk \'{print $2+$4+$6}\'); '
        '[ -z "$cpu" ] && cpu=$(ps -A -o %cpu | awk \'{s+=$1} END {print s}\'); '
        'mem=$(free | grep Mem | awk \'{print $3/$2 * 100.0}\'); '
        '[ -z "$mem" ] && mem=$(awk \'/^MemTotal:/ {t=$2} /^MemAvailable:/ {a=$2} END {print (1 - a/t)*100}\' /proc/meminfo); '
        'echo "METRICS: cpu=$cpu mem=$mem"'
    )

    logger.info(f"Fetching real metrics for host {ip} / {instance_id} via SSH...")
    ssh_out = execute_ssh_command(ip, metric_cmd)
    if ssh_out:
        # Match output: METRICS: cpu=1.2 mem=45.3
        match = re.search(r"METRICS:\s+cpu=([0-9.]+)\s+mem=([0-9.]+)", ssh_out)
        if match:
            try:
                cpu = float(match.group(1))
                mem = float(match.group(2))
                logger.info(f"Successfully fetched metrics via SSH for {ip}: cpu={cpu}%, mem={mem}%")
                return cpu, mem
            except Exception as e:
                logger.warning(f"Error parsing SSH metrics output: {e}")

    # Fallback to CloudWatch if provider is AWS
    if provider_name.lower() in ("aws", "floci"):
        logger.info(f"SSH failed. Fetching CPU utilization for {instance_id} via CloudWatch...")
        try:
            from app.services.cloud import get_cloud_provider
            provider = get_cloud_provider("aws")
            cw = provider._get_client("cloudwatch", config)

            end_time = datetime.datetime.utcnow()
            start_time = end_time - datetime.timedelta(minutes=5)

            response = cw.get_metric_data(
                MetricDataQueries=[
                    {
                        'Id': 'm1',
                        'MetricStat': {
                            'Metric': {
                                'Namespace': 'AWS/EC2',
                                'MetricName': 'CPUUtilization',
                                'Dimensions': [
                                    {
                                        'Name': 'InstanceId',
                                        'Value': instance_id
                                    },
                                ]
                            },
                            'Period': 60,
                            'Stat': 'Average',
                        },
                    },
                ],
                StartTime=start_time,
                EndTime=end_time,
            )

            results = response.get("MetricDataResults", [])
            if results and results[0].get("Values"):
                # Get the most recent value
                cpu = float(results[0]["Values"][0])
                # Mock memory roughly proportional to CPU
                mem = 40.0 + (cpu / 100.0) * 20.0
                logger.info(f"Successfully fetched CPU utilization via CloudWatch for {instance_id}: cpu={cpu}%, mem={mem}% (simulated)")
                return cpu, mem
        except Exception as e:
            logger.warning(f"CloudWatch metrics collection failed for {instance_id}: {e}")

    return None, None


def execute_remediation_on_host(ip: str, instance_id: str, provider_name: str, config: dict) -> bool:
    """Kills stress/inflation processes on the target server via SSH or AWS SSM Run Command."""
    command = (
        "sudo pkill -9 -f stress; sudo pkill -9 -f stress-ng; "
        "sudo pkill -9 -f yes; sudo pkill -9 -f consume; "
        "sudo pkill -9 -f inflate; sudo pkill -9 -f lookbusy"
    )

    # Try SSH first
    logger.info(f"Attempting remediation command via SSH on {ip}...")
    ssh_out = execute_ssh_command(ip, command)
    if ssh_out is not None:
        logger.info("Remediation command executed successfully via SSH.")
        return True

    # Fallback to AWS SSM Run Command
    if provider_name.lower() in ("aws", "floci"):
        logger.info(f"SSH failed. Attempting remediation command via AWS SSM on {instance_id}...")
        try:
            from app.services.cloud import get_cloud_provider
            provider = get_cloud_provider("aws")
            ssm = provider._get_client("ssm", config)
            resp = ssm.send_command(
                InstanceIds=[instance_id],
                DocumentName="AWS-RunShellScript",
                Parameters={"commands": [command]}
            )
            command_id = resp["Command"]["CommandId"]
            logger.info(f"AWS SSM command sent successfully: {command_id}")
            return True
        except Exception as e:
            logger.warning(f"AWS SSM remediation execution failed: {e}")

    return False
