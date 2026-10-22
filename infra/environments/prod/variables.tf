variable "api_token" {
  type      = string
  sensitive = true
}

variable "budget_alert_email" {
  type = string
}

variable "monthly_budget_usd" {
  type    = number
  default = 10
}
