resource "google_cloud_run_v2_service" "app" {
  name     = local.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run_sa.email

    containers {
      image = var.cloud_run_image != "" ? var.cloud_run_image : "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker_repo.repository_id}/${var.app_name}:latest"

      ports {
        container_port = 8080
      }

      env {
        name  = "PROJECT_ID"
        value = var.project_id
      }

      env {
        name  = "LOCATION"
        value = var.region
      }

      env {
        name  = "APP_ID"
        value = var.gemini_app_id
      }

      env {
        name  = "DLP_LOCATION"
        value = var.dlp_location
      }

      env {
        name  = "ENDPOINT_LOCATION"
        value = var.endpoint_location
      }

      env {
        name  = "GEMINI_LOCATION"
        value = var.gemini_location
      }

      env {
        name  = "DLP_TEMPLATE_NAME"
        value = google_data_loss_prevention_inspect_template.pii_template.name
      }

      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
      }
    }
  }

  labels = local.labels

  depends_on = [google_project_service.required_apis]
}

resource "google_cloud_run_v2_service_iam_member" "public_access" {
  name     = google_cloud_run_v2_service.app.name
  location = google_cloud_run_v2_service.app.location
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}
