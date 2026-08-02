terraform {
  required_version = ">= 1.10.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }
  backend "s3" {
    bucket       = "expense-tracker-scan-dev-tfstate"
    key          = "scan-service/terraform.tfstate"
    region       = "eu-west-1"
    use_lockfile = true
    encrypt      = true
  }
}

provider "aws" {
  region = local.aws_region
}

locals {
  aws_region = "eu-west-1"
}

module "scan_service" {
  source                      = "../../modules/scan-service"
  project                     = "expense-tracker"
  environment                 = "dev"
  aws_region                  = local.aws_region
  api_token                   = var.api_token
  allowed_origins             = ["http://localhost:3000"]
  lambda_artifacts_dir        = "../../../apps/scan-api/dist/lambdas"
  force_destroy_bucket        = true
  enable_pitr                 = false
  log_retention_days          = 7
  worker_reserved_concurrency = -1
}

output "scan_api_url" {
  value = module.scan_service.api_url
}
