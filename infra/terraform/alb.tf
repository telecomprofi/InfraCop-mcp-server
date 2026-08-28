resource "aws_security_group" "alb" {
  name        = "${var.name}-alb"
  description = "Internet-facing ALB — only ingress into the isolated account"
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = var.allowed_ingress_cidrs
  }

  ingress {
    description = "HTTP (redirect to HTTPS when a certificate is set)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_ingress_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name}-alb" }
}

resource "aws_lb" "this" {
  name                       = var.name
  load_balancer_type         = "application"
  internal                   = false
  subnets                    = aws_subnet.public[*].id
  security_groups            = [aws_security_group.alb.id]
  idle_timeout               = 60
  drop_invalid_header_fields = true
  tags                       = { Name = var.name }
}

resource "aws_lb_target_group" "mcp" {
  name        = "${var.name}-mcp"
  target_type = "lambda"
}

resource "aws_lb_target_group" "ingest" {
  name        = "${var.name}-ingest"
  target_type = "lambda"
}

resource "aws_lambda_permission" "alb_mcp" {
  statement_id  = "AllowALBMCP"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.mcp.function_name
  qualifier     = aws_lambda_alias.mcp.name
  principal     = "elasticloadbalancing.amazonaws.com"
  source_arn    = aws_lb_target_group.mcp.arn
}

resource "aws_lambda_permission" "alb_ingest" {
  statement_id  = "AllowALBIngest"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingest.function_name
  principal     = "elasticloadbalancing.amazonaws.com"
  source_arn    = aws_lb_target_group.ingest.arn
}

resource "aws_lb_target_group_attachment" "mcp" {
  target_group_arn = aws_lb_target_group.mcp.arn
  target_id        = aws_lambda_alias.mcp.arn
  depends_on       = [aws_lambda_permission.alb_mcp]
}

resource "aws_lb_target_group_attachment" "ingest" {
  target_group_arn = aws_lb_target_group.ingest.arn
  target_id        = aws_lambda_function.ingest.arn
  depends_on       = [aws_lambda_permission.alb_ingest]
}

locals {
  https = var.acm_certificate_arn != ""
}

resource "aws_lb_listener" "http" {
  count             = local.https ? 0 : 1
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "application/json"
      message_body = jsonencode({ error = "not found" })
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener" "http_redirect" {
  count             = local.https ? 1 : 0
  load_balancer_arn = aws_lb.this.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener_rule" "http_mcp" {
  count        = local.https ? 0 : 1
  listener_arn = aws_lb_listener.http[0].arn
  priority     = 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mcp.arn
  }
  condition {
    path_pattern {
      values = ["/mcp", "/mcp/*", "/health"]
    }
  }
}

resource "aws_lb_listener_rule" "http_ingest" {
  count        = local.https ? 0 : 1
  listener_arn = aws_lb_listener.http[0].arn
  priority     = 20
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ingest.arn
  }
  condition {
    path_pattern {
      values = ["/ingest"]
    }
  }
}

resource "aws_lb_listener" "https" {
  count             = local.https ? 1 : 0
  load_balancer_arn = aws_lb.this.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "application/json"
      message_body = jsonencode({ error = "not found" })
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener_rule" "https_mcp" {
  count        = local.https ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 10
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.mcp.arn
  }
  condition {
    path_pattern {
      values = ["/mcp", "/mcp/*", "/health"]
    }
  }
}

resource "aws_lb_listener_rule" "https_ingest" {
  count        = local.https ? 1 : 0
  listener_arn = aws_lb_listener.https[0].arn
  priority     = 20
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.ingest.arn
  }
  condition {
    path_pattern {
      values = ["/ingest"]
    }
  }
}

