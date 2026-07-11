# InfraMedic Production Deployment Guide: Azure

This guide outlines requirements and credentials setups for deploying InfraMedic as an infrastructure observer on Microsoft Azure.

## 1. Credentials Configuration

InfraMedic's cloud adapter uses the `azure-identity` library to resolve credentials.

### Authentication Methods

*   **Managed Identity (System/User Assigned)**: Recommended when running InfraMedic on Azure VMs or AKS.
*   **Service Principal (Environment Variables)**:
    ```bash
    AZURE_TENANT_ID=00000000-0000-0000-0000-000000000000
    AZURE_CLIENT_ID=00000000-0000-0000-0000-000000000000
    AZURE_CLIENT_SECRET=my-client-secret-value
    AZURE_SUBSCRIPTION_ID=00000000-0000-0000-0000-000000000000
    ```

---

## 2. Least-Privilege Role Definition (Azure RBAC)

Create a custom Azure RBAC role with the following JSON actions structure to grant read-only discovery permissions:

```json
{
    "Name": "InfraMedicObserverRole",
    "Description": "InfraMedic read-only infrastructure observer role",
    "Actions": [
        "Microsoft.Compute/virtualMachines/read",
        "Microsoft.ContainerService/managedClusters/read",
        "Microsoft.Storage/storageAccounts/read",
        "Microsoft.Storage/storageAccounts/blobServices/containers/read",
        "Microsoft.Network/virtualNetworks/read",
        "Microsoft.Network/loadBalancers/read",
        "Microsoft.KeyVault/vaults/read",
        "Microsoft.KeyVault/vaults/secrets/read",
        "Microsoft.Insights/metrics/read",
        "Microsoft.Insights/diagnosticSettings/read"
    ],
    "NotActions": [],
    "AssignableScopes": [
        "/subscriptions/00000000-0000-0000-0000-000000000000"
    ]
}
```

---

## 3. Required Providers

Register the following resource providers in your Azure subscription:

1.  `Microsoft.Compute`
2.  `Microsoft.ContainerService`
3.  `Microsoft.Storage`
4.  `Microsoft.Network`
5.  `Microsoft.KeyVault`
6.  `Microsoft.Insights`

---

## 4. Monitoring & Telemetry Integration

InfraMedic queries the **Azure Monitor Metrics API** to obtain virtual machine CPU utilization, disk metrics, and Kubernetes node stats. Make sure **Diagnostic Settings** are enabled on AKS clusters and Azure SQL server databases to route logs to a Log Analytics Workspace for log anomaly detection.

---

## 5. Security & Network Controls

*   **Service Endpoints**: Utilize Private Link or Service Endpoints for Key Vault and Storage accounts so InfraMedic can resolve credentials and metadata over Azure's backbone.
*   **Token Expiry**: Azure Managed Identities automatically refresh tokens, eliminating secret expiration security risks.
