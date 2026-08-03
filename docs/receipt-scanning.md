# Receipt Scanning

Receipt scanning is split between the TanStack app and a small AWS service backed by Textract.

The AWS service owns file upload, extraction, scan status, raw file access, and daily scan quota. The TanStack app owns auth, product matching, transaction creation/replacement, and all user-facing UI.

## Environments

AWS Organizations is used with separate member accounts. Do not deploy app workloads into the management account.

| Environment | AWS account | Deploy path | Notes |
| --- | --- | --- | --- |
| Dev | `889568839517` | Local Terraform via `make deploy` | Local AWS SSO profile is `edv-dev`. |
| Prod | prod member account | GitHub Actions OIDC on `main` | Role ARN is stored in GitHub variable `AWS_PROD_ROLE_ARN`. |

Regions:

- IAM Identity Center SSO region: `eu-north-1`
- Workload region: `eu-west-1`

## Local Setup

Use Node 24:

```sh
nvm use
```

Login to dev AWS:

```sh
aws sso login --profile edv-dev
aws sts get-caller-identity --profile edv-dev
```

Create `infra/environments/dev/local.tfvars`:

```hcl
api_token = "<long-random-token>"
```

Deploy dev:

```sh
AWS_PROFILE=edv-dev make deploy
AWS_PROFILE=edv-dev make output
```

Set web env vars in `apps/web/.env`:

```env
AWS_SCAN_API_URL="https://<api-id>.execute-api.eu-west-1.amazonaws.com"
AWS_SCAN_API_TOKEN="<same value as local.tfvars api_token>"
```

## Bootstrap

Bootstrap creates the Terraform state bucket. Run once per account.

Use a separate Terraform workspace per environment. The bootstrap root uses local state, so the dev and prod accounts must not share the same bootstrap workspace.

Dev:

```sh
AWS_PROFILE=edv-dev terraform -chdir=infra/bootstrap init
AWS_PROFILE=edv-dev terraform -chdir=infra/bootstrap workspace select -or-create=true dev
AWS_PROFILE=edv-dev terraform -chdir=infra/bootstrap apply -var='environment=dev'
```

Prod:

```sh
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap workspace select -or-create=true prod
terraform -chdir=infra/bootstrap apply \
  -var='environment=prod' \
  -var='create_github_oidc_role=true' \
  -var='github_repository=<owner>/<repo>'
```

Use the `github_deploy_role_arn` output as GitHub repository variable `AWS_PROD_ROLE_ARN`.

## Architecture

AWS resources are defined in `infra/modules/scan-service`:

- API Gateway HTTP API with a Lambda bearer-token authorizer.
- Lambda handlers from `apps/scan-api`.
- S3 bucket for uploaded receipt files.
- SQS queue and DLQ for upload processing.
- DynamoDB table for scan records and daily usage counters.
- CloudWatch alarms for API errors, worker errors, and DLQ messages.

Flow:

1. TanStack server function calls `POST /scans/uploads` on the AWS API.
2. AWS validates quota and creates a scan row plus a daily usage counter update in one DynamoDB transaction.
3. AWS returns a presigned S3 `PUT` URL.
4. Browser uploads the file directly to S3.
5. S3 sends an event to SQS.
6. Worker Lambda reads the object, validates magic bytes, calls Textract `AnalyzeExpense`, parses the receipt, and updates scan status.
7. TanStack polls `GET /scans/{scanId}`.
8. When completed, TanStack fetches the scan, performs product matching in app code, and renders the review form.
9. Completing the review creates or replaces transactions in the app database.

## Ownership Boundaries

AWS owns:

- raw receipt files
- scan status: `upload_pending`, `processing`, `completed`, `failed`
- extracted receipt JSON
- presigned upload/file URLs
- daily scan usage counter

TanStack owns:

- user authentication/session
- app authorization
- product matching
- receipt item mappings
- transaction creation/replacement
- all UI routes and review forms

## API Contracts

All AWS API requests go through TanStack server functions in `apps/web/src/features/receipt-scanning/aws-scan-api.ts`. The browser never calls API Gateway directly.

Required headers from TanStack to AWS:

```http
Authorization: Bearer <AWS_SCAN_API_TOKEN>
X-User-Id: <authenticated app user id>
Content-Type: application/json
```

The bearer token authenticates the app to AWS. `X-User-Id` scopes scan records to the authenticated app user.

Routes:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/scans/uploads` | Create scan row, reserve daily quota, return S3 upload URL. |
| `GET` | `/scans` | List scans and return daily usage. |
| `GET` | `/scans/{scanId}` | Get one scan and its extracted result if completed. |
| `GET` | `/scans/{scanId}/file` | Return a short-lived file URL. |
| `DELETE` | `/scans/{scanId}` | Delete the scan row and uploaded file. Does not refund quota. |

Create upload request:

```json
{
  "fileName": "receipt.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 123456,
  "mode": "transaction"
}
```

Modes:

- `transaction` - create a new transaction from the scan.
- `transaction-replacement` - replace entries on an existing transaction.
- `shopping-checkout` - complete shopping checkout from a receipt.

Allowed content types:

- `image/jpeg`
- `image/png`
- `application/pdf`

Max file size: `10 MB`.

Upload response:

```json
{
  "scanId": "uuid",
  "uploadUrl": "https://...",
  "uploadHeaders": { "Content-Type": "application/pdf" },
  "expiresAt": 1790000000
}
```

List response:

```json
{
  "items": [],
  "nextCursor": "optional-cursor",
  "usage": {
    "used": 2,
    "limit": 5,
    "remaining": 3,
    "resetsAt": "2026-08-03T00:00:00.000Z"
  }
}
```

## Daily Limit

The daily scan limit is enforced in AWS, not the UI.

The limit is currently `5/day`. Creating an upload reserves one slot immediately. Deleting a scan does not refund the slot.

Usage is stored as a separate DynamoDB item in the same table:

```txt
pk = USER#<userId>
sk = USAGE#<day-start-iso>
used = <number>
```

Scan records are separate items:

```txt
pk = USER#<userId>
sk = SCAN#<scanId>
```

This is normal DynamoDB single-table design: related entity types share one table and are distinguished by key prefixes. The quota counter is independent from deletable scan records, so users cannot bypass the limit by deleting scans.

Old usage items have `expiresAt` and are removed later by DynamoDB TTL. Expiry does not need to be exact because each day has a different key.

## Web Routes

- `/dashboard/scans` - upload, usage indicator, scan history, delete scans.
- `/dashboard/scans/$scanId` - polling/progress, scan result review, view original file.
- `/dashboard/transactions/$id/scan` - replace an existing transaction using a receipt scan.
- Transaction creation and edit pages link into these scan flows.

## Deployment

Dev:

```sh
AWS_PROFILE=edv-dev make deploy
```

Prod:

- Runs from `.github/workflows/deploy-scan-prod.yml` on pushes to `main`.
- Uses GitHub OIDC to assume `AWS_PROD_ROLE_ARN`.
- Uses GitHub secret `AWS_SCAN_API_TOKEN` for Terraform `api_token`.

## Useful Commands

```sh
pnpm test:scan-api
pnpm build:scan-api
pnpm test:web
pnpm build
terraform -chdir=infra/environments/dev validate
terraform -chdir=infra/environments/prod validate
```

Get dev API URL:

```sh
AWS_PROFILE=edv-dev make output
```

Inspect create-upload IAM policy:

```sh
aws iam get-role-policy \
  --role-name expense-tracker-scan-dev-create-upload \
  --policy-name expense-tracker-scan-dev-create-upload \
  --profile edv-dev
```

## Operational Notes

- API bearer token is stored in Terraform state because Lambda env vars are managed by Terraform.
- Dev upload bucket uses `force_destroy = true`; prod does not.
- Dev worker uses unreserved concurrency because small/new accounts may not allow reserved concurrency without raising Lambda quotas.
- Prod worker has reserved concurrency configured in Terraform.
- If IAM changes were just deployed and Lambda still gets `AccessDenied`, wait for IAM propagation or redeploy to recycle warm Lambda credentials.
- Every successful `POST /scans/uploads` counts against the daily limit, even if upload, validation, Textract, or review later fails.
