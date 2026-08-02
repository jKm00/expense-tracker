# Bootstrap

Run this once per AWS account before deploying `infra/environments/dev` or `infra/environments/prod`.

Use a separate Terraform workspace per environment. The bootstrap root uses local state, so reusing the same workspace across accounts makes Terraform try to manage one account's state bucket while authenticated to another account.

Dev:

```sh
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap workspace select -or-create=true dev
terraform -chdir=infra/bootstrap apply -var='environment=dev'
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

Use the `github_deploy_role_arn` output as the GitHub repository variable `AWS_PROD_ROLE_ARN`.
