from infracop_mcp.validator import validate_terraform

BAD = '''
provider "aws" {
  region = "us-west-2"
}
resource "aws_db_instance" "main" {
  identifier          = "MyDatabase"
  publicly_accessible = true
  tags = { Name = "db" }
}
'''

GOOD = '''
variable "common_tags" {
  default = {
    Organization = "empeek"
    CostCentre   = "tech-services"
    Project      = "empeek:platform"
    Owner        = "platform-services"
    Team         = "platform-services"
    Service      = "payments-api"
    Env          = "prod"
    Environment  = "production"
  }
}
provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      Terraform  = "true"
      GithubRepo = "empeek/platform/"
      GithubPath = "envs/production"
    }
  }
}
resource "aws_db_instance" "primary" {
  identifier = "pay-api-prod-rds-db-001"
  tags = merge(var.common_tags, { Description = "payments primary" })
}
'''

# Typical after-refactor: values live in tfvars, variable block has no defaults,
# provider uses var.common_tags, k8s/VPC names would recreate prod if renamed.
AFTER = '''
variable "common_tags" {
  type        = map(string)
  description = "Mandatory org tags"
}
variable "region" {
  type    = string
  default = "us-east-1"
}
common_tags = {
  Organization = "empeek"
  CostCentre   = "tech-services"
  Project      = "empeek:platform"
  Owner        = "platform-services"
  Team         = "platform-services"
  Service      = "platform"
  Env          = "prod"
  Environment  = "production"
}
provider "aws" {
  region = var.region
  default_tags {
    tags = var.common_tags
  }
}
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags       = merge(var.common_tags, { Name = "platform" })
}
resource "aws_eks_cluster" "this" {
  name = "eks-auto-alb"
  tags = var.common_tags
}
resource "kubectl_manifest" "ingress_class" {
  yaml_body = jsonencode({
    metadata = { name = "eks-auto-alb" }
  })
}
'''

BEFORE = '''
variable "common_tags" {
  default = {
    CostCentre  = "tech-services"
    Project     = "empeek:platform"
    Owner       = "platform-services"
    Environment = "production"
  }
}
provider "aws" {
  region = "us-east-1"
}
resource "aws_vpc" "main" {
  tags = { Name = "platform" }
}
'''


def test_bad_fails():
    result = validate_terraform(BAD, "production")
    assert result["ok"] is False
    assert result["fail"] >= 3
    titles = " ".join(f["title"] for f in result["findings"])
    assert "Publicly accessible" in titles
    assert "allow-list" in titles


def test_good_passes():
    result = validate_terraform(GOOD, "production")
    assert result["fail"] == 0
    assert result["ok"] is True
    assert result["light"] == "green"
    assert result["percent"] == 100


def test_bad_is_red():
    result = validate_terraform(BAD, "production")
    assert result["light"] == "red"
    assert result["percent"] < 65


def test_after_scorecard_credits_tfvars_tags():
    result = validate_terraform(AFTER, "production", mode="scorecard")
    assert result["tags_detected"]["Organization"] == "empeek"
    assert result["tags_detected"]["Env"] == "prod"
    assert result["fail"] == 0
    assert result["percent"] == 100
    assert result["light"] == "green"
    assert result["warn"] >= 1
    titles = " ".join(f["title"] for f in result["findings"])
    assert "kubectl" not in titles
    assert "aws_vpc" in titles or "aws_eks" in titles


def test_before_scorecard_is_worse_than_after():
    before = validate_terraform(BEFORE, "production", mode="scorecard")
    after = validate_terraform(AFTER, "production", mode="scorecard")
    assert before["percent"] < after["percent"]
    assert before["fail"] > after["fail"]


def test_lint_does_not_fail_eks_rename():
    result = validate_terraform(AFTER, "production", mode="lint")
    eks = [f for f in result["findings"] if "aws_eks" in f["title"]]
    assert eks
    assert all(f["severity"] == "warn" for f in eks)


def test_scorecard_counts_rds_naming():
    hcl = AFTER + '''
resource "aws_db_instance" "main" {
  identifier = "db-prod"
  tags       = var.common_tags
}
'''
    result = validate_terraform(hcl, "production", mode="scorecard")
    rds = [f for f in result["findings"] if "aws_db_instance" in f["title"]]
    assert rds
    assert any(f["severity"] == "fail" for f in rds)
    assert result["percent"] < 100
    assert result["light"] != "green"
