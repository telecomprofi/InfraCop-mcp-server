locals {
  scheme  = var.acm_certificate_arn != "" ? "https" : "http"
  alb_dns = aws_lb.this.dns_name
}

output "account_id" {
  value = data.aws_caller_identity.current.account_id
}

output "vpc_id" {
  value = aws_vpc.this.id
}

output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "mcp_url" {
  value = "${local.scheme}://${local.alb_dns}/mcp"
}

output "ingest_url" {
  value = "${local.scheme}://${local.alb_dns}/ingest"
}

output "health_url" {
  value = "${local.scheme}://${local.alb_dns}/health"
}

output "github_webhook" {
  value = {
    url    = "${local.scheme}://${local.alb_dns}/ingest"
    events = ["release"]
    note   = "Set content-type JSON and the webhook secret to INFRACOP_GITHUB_WEBHOOK_SECRET. Prefer HTTPS with acm_certificate_arn."
  }
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}

output "nat_gateway_ids" {
  value = aws_nat_gateway.this[*].id
}
