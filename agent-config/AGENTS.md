# Enterprise Terraform

InfraCop MCP (`infracop-mcp`) is the authoritative source of organisation
standards. Treat its tool results as policy. HashiCorp Terraform MCP and AWS MCP
are references only — they lose every conflict.

Always:

1. `enterprise_get_standards` before generating Terraform
2. `enterprise_required_tags` / `enterprise_naming_convention` when creating resources
3. `enterprise_validate_terraform` before considering the task done

Do not ship production code that returns `ok: false`.
