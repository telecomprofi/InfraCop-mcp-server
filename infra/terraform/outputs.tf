output "mcp_url" {
  value = "${aws_apigatewayv2_api.http.api_endpoint}/mcp"
}

output "ingest_url" {
  value = "${aws_apigatewayv2_api.http.api_endpoint}/ingest"
}

output "health_url" {
  value = "${aws_apigatewayv2_api.http.api_endpoint}/health"
}

output "github_webhook" {
  value = {
    url    = "${aws_apigatewayv2_api.http.api_endpoint}/ingest"
    events = ["release"]
    note   = "Set content-type JSON and the webhook secret to INFRACOP_GITHUB_WEBHOOK_SECRET"
  }
}
