terraform {
  required_version = ">= 1.7.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Terraform  = "true"
      GithubRepo = "infracop-mcp"
      Service    = "infracop-mcp"
      Team       = "platform-services"
    }
  }
}

data "aws_caller_identity" "current" {}

resource "aws_secretsmanager_secret" "infracop" {
  name = "${var.name}/runtime"
}

resource "aws_secretsmanager_secret_version" "infracop" {
  secret_id = aws_secretsmanager_secret.infracop.id
  secret_string = jsonencode({
    INFRACOP_QDRANT_URL            = var.qdrant_url
    INFRACOP_QDRANT_API_KEY        = var.qdrant_api_key
    INFRACOP_GITHUB_WEBHOOK_SECRET = var.github_webhook_secret
    INFRACOP_API_KEYS              = var.mcp_api_keys
    INFRACOP_GITHUB_TOKEN          = var.github_token
    INFRACOP_STANDARDS_REPO        = var.standards_repo
  })
}

resource "aws_sqs_queue" "ingest_dlq" {
  name                      = "${var.name}-ingest-dlq"
  message_retention_seconds = 1209600
}
