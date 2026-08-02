resource "aws_sqs_queue" "scan_dlq" {
  name                      = "${local.name_prefix}-dlq"
  message_retention_seconds = 1209600
  tags                      = local.tags
}

resource "aws_sqs_queue" "scan_events" {
  name                       = "${local.name_prefix}-events"
  visibility_timeout_seconds = 90
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.scan_dlq.arn
    maxReceiveCount     = 3
  })
  tags = local.tags
}

resource "aws_sqs_queue_policy" "scan_events" {
  queue_url = aws_sqs_queue.scan_events.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "s3.amazonaws.com" }
      Action    = "sqs:SendMessage"
      Resource  = aws_sqs_queue.scan_events.arn
      Condition = {
        ArnEquals = { "aws:SourceArn" = aws_s3_bucket.uploads.arn }
      }
    }]
  })
}

resource "aws_s3_bucket_notification" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  queue {
    queue_arn     = aws_sqs_queue.scan_events.arn
    events        = ["s3:ObjectCreated:Put"]
    filter_prefix = "scans/"
  }
  depends_on = [aws_sqs_queue_policy.scan_events]
}
