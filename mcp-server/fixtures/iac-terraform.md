# IaC / Terraform standard

## Mandatory Resource tagging

Make sure you tag resources you create with the minimum set of mandatory tags.
Tags MUST exist, values not empty and longer than 3 chars.

```hcl
variable "common_tags" {
  type = map(string)
  default = {
    Organization = "empeek"
    CostCentre   = "tech-services"
    Project      = "CompName-platform"
    Owner        = "platform-services"
    Team         = "platform-services"
    Service      = "sonarqube"
    Env          = "uat"
    Environment  = "staging"
  }
}
```

## Mandatory Resource Naming convention

Pattern MUST be kebab `{app}-{env}-{type}-{id}`, 47 characters max, env token required.

Example: `bckstg-be-prod-rds-db-001`
