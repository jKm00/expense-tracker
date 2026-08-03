data "archive_file" "lambda" {
  for_each    = local.handlers
  type        = "zip"
  source_file = "${var.lambda_artifacts_dir}/${each.value}.mjs"
  output_path = "${var.lambda_artifacts_dir}/${each.value}.zip"
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each          = local.handlers
  name              = "/aws/lambda/${local.name_prefix}-${each.value}"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

resource "aws_lambda_function" "handler" {
  for_each         = local.handlers
  function_name    = "${local.name_prefix}-${each.value}"
  role             = aws_iam_role.lambda[each.key].arn
  handler          = "${each.value}.handler"
  runtime          = var.lambda_runtime
  filename         = data.archive_file.lambda[each.key].output_path
  source_code_hash = data.archive_file.lambda[each.key].output_base64sha256
  timeout          = each.key == "worker" ? 60 : each.key == "authorizer" ? 5 : 10
  memory_size      = each.key == "worker" ? 512 : 256

  environment {
    variables = {
      API_TOKEN              = var.api_token
      SCAN_TABLE_NAME        = aws_dynamodb_table.scans.name
      SCAN_BUCKET_NAME       = aws_s3_bucket.uploads.id
      DAILY_SCAN_LIMIT       = tostring(var.daily_scan_limit)
      MAX_FILE_SIZE_BYTES    = tostring(var.max_file_size_bytes)
      UPLOAD_URL_TTL_SECONDS = tostring(var.upload_url_ttl_seconds)
      FILE_URL_TTL_SECONDS   = tostring(var.file_url_ttl_seconds)
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_basic, aws_iam_role_policy.lambda, aws_cloudwatch_log_group.lambda]
  tags       = local.tags
}

resource "aws_lambda_event_source_mapping" "worker" {
  event_source_arn = aws_sqs_queue.scan_events.arn
  function_name    = aws_lambda_function.handler["worker"].arn
  batch_size       = 5

  scaling_config {
    maximum_concurrency = var.worker_maximum_concurrency
  }
}
