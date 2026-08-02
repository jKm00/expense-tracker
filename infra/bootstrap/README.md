# Bootstrap

Run this once per AWS account before deploying `infra/environments/dev` or `infra/environments/prod`.

Dev:

```sh
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap apply -var='environment=dev'
```

Prod:

```sh
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap apply \
  -var='environment=prod' \
  -var='create_github_oidc_role=true' \
  -var='github_repository=<owner>/<repo>'
```

Use the `github_deploy_role_arn` output as the GitHub repository variable `AWS_PROD_ROLE_ARN`.
