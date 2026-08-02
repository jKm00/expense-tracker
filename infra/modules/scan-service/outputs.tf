output "api_url" {
  value = aws_apigatewayv2_api.scan.api_endpoint
}

output "bucket_name" {
  value = aws_s3_bucket.uploads.id
}

output "table_name" {
  value = aws_dynamodb_table.scans.name
}
