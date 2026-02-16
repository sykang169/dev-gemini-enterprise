resource "google_artifact_registry_repository" "docker_repo" {
  repository_id = "${var.app_name}-repo"
  location      = var.region
  format        = "DOCKER"
  description   = "${var.app_name} Docker 이미지 저장소"
  labels        = local.labels

  depends_on = [google_project_service.required_apis]
}
