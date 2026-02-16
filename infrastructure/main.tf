data "google_project" "current" {
  project_id = var.project_id
}

locals {
  service_name = var.app_name
  labels = {
    app         = var.app_name
    managed_by  = "terraform"
    environment = "production"
  }
}
