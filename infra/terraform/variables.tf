variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "name" {
  type    = string
  default = "infracop-mcp"
}

variable "qdrant_url" {
  type = string
}

variable "qdrant_api_key" {
  type      = string
  sensitive = true
}

variable "github_webhook_secret" {
  type      = string
  sensitive = true
}

variable "mcp_api_keys" {
  type        = string
  sensitive   = true
  description = "Comma-separated per-team API keys"
}

variable "github_token" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Optional PAT if Ent-DevOps-Standards is private"
}

variable "standards_repo" {
  type    = string
  default = "telecomprofi/Ent-DevOps-Standards"
}

variable "provisioned_concurrency" {
  type    = number
  default = 3
}

variable "reserved_concurrency" {
  type    = number
  default = 25
}

variable "image_uri" {
  type        = string
  description = "ECR image URI built from mcp-server/Dockerfile"
}
