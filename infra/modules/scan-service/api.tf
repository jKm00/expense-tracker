resource "aws_apigatewayv2_api" "scan" {
  name          = local.name_prefix
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.allowed_origins
    allow_methods = ["GET", "POST", "DELETE", "OPTIONS"]
    allow_headers = ["authorization", "content-type", "x-user-id"]
  }

  tags = local.tags
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.scan.id
  name        = "$default"
  auto_deploy = true
  tags        = local.tags
}

resource "aws_apigatewayv2_authorizer" "bearer" {
  api_id                            = aws_apigatewayv2_api.scan.id
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = aws_lambda_function.handler["authorizer"].invoke_arn
  identity_sources                  = ["$request.header.Authorization"]
  name                              = "${local.name_prefix}-bearer"
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
}

locals {
  api_routes = {
    create_upload = { route = "POST /scans/uploads", function = "create_upload" }
    list_scans    = { route = "GET /scans", function = "list_scans" }
    get_scan      = { route = "GET /scans/{scanId}", function = "get_scan" }
    get_scan_file = { route = "GET /scans/{scanId}/file", function = "get_scan_file" }
    delete_scan   = { route = "DELETE /scans/{scanId}", function = "delete_scan" }
  }
}

resource "aws_apigatewayv2_integration" "route" {
  for_each               = local.api_routes
  api_id                 = aws_apigatewayv2_api.scan.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.handler[each.value.function].invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "route" {
  for_each           = local.api_routes
  api_id             = aws_apigatewayv2_api.scan.id
  route_key          = each.value.route
  target             = "integrations/${aws_apigatewayv2_integration.route[each.key].id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.bearer.id
}

resource "aws_lambda_permission" "api" {
  for_each      = merge(local.api_routes, { authorizer = { route = "authorizer", function = "authorizer" } })
  statement_id  = "AllowExecutionFromAPIGateway-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.handler[each.value.function].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.scan.execution_arn}/*/*"
}
