# InfraMedic Production Deployment Guide: GCP

This guide outlines setup requirements for observing resources and metrics in Google Cloud Platform (GCP).

## 1. Credentials Configuration

InfraMedic's cloud adapter uses the `google-cloud` python SDK, resolving credentials via Application Default Credentials (ADC).

### Authentication Methods

*   **Workload Identity**: Recommended for GKE cluster workloads.
*   **Compute Engine Service Accounts**: Recommended for Compute Engine VMs.
*   **Service Account Key (Environment Variables)**:
    ```bash
    GOOGLE_APPLICATION_CREDENTIALS=/path/to/keyfile.json
    GCP_PROJECT_ID=my-gcp-project-name
    ```

---

## 2. Least-Privilege IAM Custom Role

Define a custom IAM role at the project level containing the minimal read-only permissions for GCP services:

```yaml
title: "InfraMedicObserver"
description: "Least-privilege read-only discovery permissions"
stage: "GA"
includedPermissions:
- compute.instances.list
- compute.instances.get
- compute.networks.list
- container.clusters.list
- storage.buckets.list
- sql.instances.list
- secretmanager.secrets.list
- monitoring.timeSeries.list
- logging.logEntries.list
```

---

## 3. Required APIs to Enable

Enable the following APIs in your GCP project console:

1.  **Compute Engine API** (`compute.googleapis.com`)
2.  **Kubernetes Engine API** (`container.googleapis.com`)
3.  **Cloud SQL Admin API** (`sqladmin.googleapis.com`)
4.  **Secret Manager API** (`secretmanager.googleapis.com`)
5.  **Cloud Monitoring API** (`monitoring.googleapis.com`)
6.  **Cloud Logging API** (`logging.googleapis.com`)

---

## 4. Monitoring & Metrics Ingestion

InfraMedic queries the **Google Cloud Monitoring API** for telemetry metrics. Ensure the Ops Agent is installed on Compute Engine VMs to collect memory usage and application metrics.

---

## 5. Security & Network Configuration

*   **Private Google Access**: Enable Private Google Access on subnets containing InfraMedic instances to allow secure, private endpoint calls.
*   **Key Rotation**: If utilizing service account JSON files, rotate them every 90 days.
