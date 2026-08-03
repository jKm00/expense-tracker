variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be dev or prod."
  }
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "create_github_oidc_role" {
  type    = bool
  default = false
}

variable "github_repository" {
  type    = string
  default = ""
}
