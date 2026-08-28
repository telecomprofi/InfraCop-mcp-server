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

variable "vpc_cidr" {
  type        = string
  default     = "10.42.0.0/16"
  description = "Dedicated VPC CIDR. Chosen to avoid 10.0.0.0/16 collisions if this account is later attached to a landing zone."
}

variable "nat_gateway_count" {
  type        = number
  default     = 2
  description = "NAT Gateways in public subnets (1 = cheaper, 2 = multi-AZ for 99% availability)."
}

variable "acm_certificate_arn" {
  type        = string
  default     = ""
  description = "ACM cert in us-east-1 for the ALB HTTPS listener. Empty = HTTP only (not for production)."
}

variable "allowed_ingress_cidrs" {
  type        = list(string)
  default     = ["0.0.0.0/0"]
  description = "CIDRs allowed to the ALB. Restrict to GitHub webhook + agent egress ranges in production."
}
