.PHONY: deploy destroy output

deploy:
	pnpm --filter @expense-tracker/scan-api build
	terraform -chdir=infra/environments/dev init
	terraform -chdir=infra/environments/dev apply -var-file=local.tfvars

destroy:
	terraform -chdir=infra/environments/dev init
	terraform -chdir=infra/environments/dev destroy -var-file=local.tfvars

output:
	terraform -chdir=infra/environments/dev output scan_api_url
