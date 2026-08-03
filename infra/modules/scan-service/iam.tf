data "aws_caller_identity" "current" {}

resource "aws_iam_role" "lambda" {
  for_each = local.handlers

  name = "${local.name_prefix}-${each.value}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  for_each = local.handlers

  role       = aws_iam_role.lambda[each.key].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

locals {
  lambda_policy_statements = {
    authorizer = []

    create_upload = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:TransactWriteItems"]
        Resource = [aws_dynamodb_table.scans.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = ["${aws_s3_bucket.uploads.arn}/scans/*"]
      }
    ]

    list_scans = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem"]
        Resource = [aws_dynamodb_table.scans.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:Query"]
        Resource = ["${aws_dynamodb_table.scans.arn}/index/user-created-index"]
      }
    ]

    get_scan = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem"]
        Resource = [aws_dynamodb_table.scans.arn]
      }
    ]

    get_scan_file = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem"]
        Resource = [aws_dynamodb_table.scans.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = ["${aws_s3_bucket.uploads.arn}/scans/*"]
      }
    ]

    delete_scan = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:DeleteItem"]
        Resource = [aws_dynamodb_table.scans.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:DeleteObject"]
        Resource = ["${aws_s3_bucket.uploads.arn}/scans/*"]
      }
    ]

    worker = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:UpdateItem"]
        Resource = [aws_dynamodb_table.scans.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:Query"]
        Resource = ["${aws_dynamodb_table.scans.arn}/index/scan-id-index"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = ["${aws_s3_bucket.uploads.arn}/scans/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["textract:AnalyzeExpense"]
        Resource = ["*"]
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = [aws_sqs_queue.scan_events.arn]
      }
    ]
  }
}

resource "aws_iam_role_policy" "lambda" {
  for_each = {
    for handler, statements in local.lambda_policy_statements :
    handler => statements
    if length(statements) > 0
  }

  name = "${local.name_prefix}-${local.handlers[each.key]}"
  role = aws_iam_role.lambda[each.key].id
  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = each.value
  })
}
