resource "google_project_service" "required_apis" {
  for_each = toset([
    "discoveryengine.googleapis.com",
    "dlp.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}
