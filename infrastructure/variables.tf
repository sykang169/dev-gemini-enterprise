variable "project_id" {
  description = "GCP 프로젝트 ID"
  type        = string
}

variable "region" {
  description = "GCP 리전"
  type        = string
  default     = "asia-northeast3"
}

variable "app_name" {
  description = "애플리케이션 이름"
  type        = string
  default     = "gemini-proxy"
}

# DLP 관련 변수
variable "dlp_location" {
  description = "DLP 검사 템플릿 리전"
  type        = string
  default     = "asia-northeast3"
}

variable "dlp_min_likelihood" {
  description = "DLP 최소 탐지 가능성 수준"
  type        = string
  default     = "POSSIBLE"

  validation {
    condition     = contains(["VERY_UNLIKELY", "UNLIKELY", "POSSIBLE", "LIKELY", "VERY_LIKELY"], var.dlp_min_likelihood)
    error_message = "dlp_min_likelihood must be one of: VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY."
  }
}

# Gemini 관련 변수
variable "gemini_app_id" {
  description = "Gemini Discovery Engine 앱 ID"
  type        = string
}

variable "endpoint_location" {
  description = "Gemini 엔드포인트 리전"
  type        = string
  default     = "global"
}

variable "gemini_location" {
  description = "Gemini 서비스 리전"
  type        = string
  default     = "global"
}

# Cloud Run 관련 변수
variable "cloud_run_image" {
  description = "Cloud Run 컨테이너 이미지 URL"
  type        = string
  default     = ""
}

variable "cloud_run_cpu" {
  description = "Cloud Run CPU 제한"
  type        = string
  default     = "1"
}

variable "cloud_run_memory" {
  description = "Cloud Run 메모리 제한"
  type        = string
  default     = "512Mi"
}
