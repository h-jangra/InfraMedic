from pydantic import BaseModel


class CloudSettings(BaseModel):
    aws_endpoint_url: str
    aws_region: str
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_bucket_name: str

    azure_endpoint_url: str
    azure_account_name: str
    azure_account_key: str
    azure_container_name: str

    gcp_endpoint_url: str
    gcp_project_id: str
    gcp_credentials_json: str
    gcp_bucket_name: str
