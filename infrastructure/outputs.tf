output "cloud_run_url" {
  description = "Cloud Run 서비스 URL"
  value       = google_cloud_run_v2_service.app.uri
}

output "service_account_email" {
  description = "Cloud Run 서비스 계정 이메일"
  value       = google_service_account.cloud_run_sa.email
}

output "artifact_registry_url" {
  description = "Artifact Registry Docker 저장소 URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}"
}

output "dlp_template_name" {
  description = "DLP 검사 템플릿 이름"
  value       = google_data_loss_prevention_inspect_template.pii_template.name
}
