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
