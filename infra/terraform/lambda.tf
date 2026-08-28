resource "aws_cloudwatch_log_group" "mcp" {
  name              = "/aws/lambda/${var.name}"
  retention_in_days = 30
}

resource "aws_cloudwatch_log_group" "ingest" {
  name              = "/aws/lambda/${var.name}-ingest"
  retention_in_days = 30
}

locals {
  common_env = {
    INFRACOP_COLLECTION      = "enterprise_standards"
    INFRACOP_BEDROCK_REGION  = var.aws_region
    INFRACOP_EMBEDDING_MODEL = "amazon.titan-embed-text-v2:0"
    INFRACOP_EMBEDDING_DIMS  = "1024"
    INFRACOP_QDRANT_URL      = var.qdrant_url
    INFRACOP_QDRANT_API_KEY  = var.qdrant_api_key
  }

  vpc_config = {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }
}

resource "aws_lambda_function" "mcp" {
  function_name                  = var.name
  role                           = aws_iam_role.lambda.arn
  package_type                   = "Image"
  image_uri                      = var.image_uri
  image_config {
    command = ["infracop_mcp.handler.handle_mcp"]
  }
  memory_size                    = 1024
  timeout                        = 15
  publish                        = true
  reserved_concurrent_executions = var.reserved_concurrency
  tracing_config { mode = "Active" }
  vpc_config {
    subnet_ids         = local.vpc_config.subnet_ids
    security_group_ids = local.vpc_config.security_group_ids
  }
  environment {
    variables = merge(local.common_env, {
      INFRACOP_API_KEYS = var.mcp_api_keys
    })
  }
  depends_on = [
    aws_cloudwatch_log_group.mcp,
    aws_iam_role_policy_attachment.lambda_vpc,
  ]
}

resource "aws_lambda_alias" "mcp" {
  name             = "live"
  function_name    = aws_lambda_function.mcp.function_name
  function_version = aws_lambda_function.mcp.version
}

resource "aws_lambda_provisioned_concurrency_config" "mcp" {
  function_name                     = aws_lambda_function.mcp.function_name
  qualifier                         = aws_lambda_alias.mcp.name
  provisioned_concurrent_executions = var.provisioned_concurrency
}

resource "aws_lambda_function" "ingest" {
  function_name = "${var.name}-ingest"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = var.image_uri
  image_config {
    command = ["infracop_mcp.handler.handle_ingest"]
  }
  memory_size = 1024
  timeout     = 60
  tracing_config { mode = "Active" }
  vpc_config {
    subnet_ids         = local.vpc_config.subnet_ids
    security_group_ids = local.vpc_config.security_group_ids
  }
  dead_letter_config {
    target_arn = aws_sqs_queue.ingest_dlq.arn
  }
  environment {
    variables = merge(local.common_env, {
      INFRACOP_GITHUB_WEBHOOK_SECRET = var.github_webhook_secret
      INFRACOP_GITHUB_TOKEN          = var.github_token
      INFRACOP_STANDARDS_REPO        = var.standards_repo
    })
  }
  depends_on = [
    aws_cloudwatch_log_group.ingest,
    aws_iam_role_policy_attachment.lambda_vpc,
  ]
}
