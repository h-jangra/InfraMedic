# Floci

InfraMedic uses Floci for local S3-compatible cloud storage.

```powershell
irm https://floci.io/install.ps1 | iex
floci start
floci env | Invoke-Expression
```

After Floci exports its environment variables, mirror the endpoint and credentials into `.env` using `.env.example` as the template. The backend `FlociStorage` adapter writes incident artifacts to the bucket configured by `FLOCI_BUCKET_NAME`.
