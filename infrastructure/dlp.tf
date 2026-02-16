resource "google_data_loss_prevention_inspect_template" "pii_template" {
  parent       = "projects/${var.project_id}/locations/${var.dlp_location}"
  display_name = "${var.app_name}-pii-inspect-template"
  description  = "PII 검사 템플릿 - 개인정보 탐지용"

  inspect_config {
    min_likelihood = var.dlp_min_likelihood

    info_types {
      name = "EMAIL_ADDRESS"
    }

    info_types {
      name = "PHONE_NUMBER"
    }

    info_types {
      name = "CREDIT_CARD_NUMBER"
    }

    info_types {
      name = "PERSON_NAME"
    }

    info_types {
      name = "KOREA_DRIVERS_LICENSE_NUMBER"
    }

    custom_info_types {
      info_type {
        name = "KOREA_RRN"
      }
      likelihood = "VERY_LIKELY"
      regex {
        pattern = "\\d{6}-[1-4]\\d{6}"
      }
    }
  }

  depends_on = [google_project_service.required_apis]
}
