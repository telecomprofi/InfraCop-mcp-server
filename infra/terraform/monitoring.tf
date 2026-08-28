resource "aws_cloudwatch_metric_alarm" "mcp_p99" {
  alarm_name          = "${var.name}-p99"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = 60
  extended_statistic  = "p99"
  threshold           = 500
  alarm_description   = "Warm MCP p99 above 500ms SLO"
  dimensions = {
    FunctionName = aws_lambda_function.mcp.function_name
    Resource     = "${aws_lambda_function.mcp.function_name}:live"
  }
}

resource "aws_cloudwatch_metric_alarm" "mcp_errors" {
  alarm_name          = "${var.name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 60
  statistic           = "Sum"
  threshold           = 2
  dimensions = {
    FunctionName = aws_lambda_function.mcp.function_name
  }
}

resource "aws_cloudwatch_metric_alarm" "ingest_dlq" {
  alarm_name          = "${var.name}-ingest-dlq"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  dimensions = {
    QueueName = aws_sqs_queue.ingest_dlq.name
  }
}
