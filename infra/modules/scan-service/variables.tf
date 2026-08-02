variable "project" {
  type = string
}

variable "service" {
  type    = string
  default = "scan"
}

variable "environment" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "api_token" {
  type      = string
  sensitive = true
}

variable "allowed_origins" {
  type = list(string)
}

variable "lambda_runtime" {
  type    = string
  default = "nodejs24.x"
}

variable "lambda_artifacts_dir" {
  type = string
}

variable "force_destroy_bucket" {
  type    = bool
  default = false
}

variable "enable_pitr" {
  type    = bool
  default = false
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "daily_scan_limit" {
  type    = number
  default = 5
}

variable "max_file_size_bytes" {
  type    = number
  default = 10485760
}

variable "upload_url_ttl_seconds" {
  type    = number
  default = 600
}

variable "file_url_ttl_seconds" {
  type    = number
  default = 900
}

variable "worker_reserved_concurrency" {
  type    = number
  default = 2
}

locals {
  name_prefix = "${var.project}-${var.service}-${var.environment}"
  tags = {
    Project     = var.project
    Service     = var.service
    Environment = var.environment
    ManagedBy   = "terraform"
  }
  handlers = {
    authorizer    = "authorizer"
    create_upload = "create-upload"
    list_scans    = "list-scans"
    get_scan      = "get-scan"
    get_scan_file = "get-scan-file"
    delete_scan   = "delete-scan"
    worker        = "worker"
  }
}
