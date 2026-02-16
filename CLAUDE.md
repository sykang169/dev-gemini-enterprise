# Project Instructions

## 인프라 작업 규칙

Terraform, GCP, 클라우드 인프라와 관련된 모든 작업은 반드시 `terraform-gcp` 커스텀 에이전트(`.claude/agents/terraform-gcp.md`)를 통해 수행해야 합니다.

### 적용 조건

다음 중 하나라도 해당되면 `terraform-gcp` 에이전트를 실행합니다:

- Terraform 코드 생성, 수정, 리뷰, 디버깅
- GCP 리소스 프로비저닝 또는 설정 변경
- 인프라 관련 `.tf` 파일 작업
- `terraform plan`, `terraform apply` 등 Terraform CLI 실행
- 클라우드 아키텍처 설계 및 검토
- IaC(Infrastructure as Code) 관련 질문 또는 작업

### 에이전트 팀 운영 시

팀(Team)을 구성하여 작업할 때, 인프라 관련 태스크가 포함되면:

1. **인프라 담당 팀원은 반드시 `terraform-gcp` 에이전트 타입으로 생성**합니다.
   - Task 도구 호출 시 `subagent_type`을 적절히 설정하고, 프롬프트에 `.claude/agents/terraform-gcp.md`의 규칙을 따르도록 명시합니다.
2. 인프라 태스크는 해당 팀원에게만 할당합니다.
3. 인프라 팀원은 MCP Terraform 도구와 Google Cloud 공식 문서를 필수로 참조합니다.

### 호출 예시

```
Task(
  subagent_type="general-purpose",
  name="infra-engineer",
  prompt="당신은 terraform-gcp 에이전트입니다. .claude/agents/terraform-gcp.md의 모든 규칙을 따릅니다. [구체적 작업 내용]",
  team_name="project-team"
)
```

## 프론트엔드 작업 규칙

Next.js, UI 개발, Gemini Enterprise 커스텀 UI와 관련된 모든 작업은 반드시 `frontend-nextjs` 커스텀 에이전트(`.claude/agents/frontend-nextjs.md`)를 통해 수행해야 합니다.

### 적용 조건

다음 중 하나라도 해당되면 `frontend-nextjs` 에이전트를 실행합니다:

- Next.js 페이지, 컴포넌트, API Route 생성 및 수정
- Gemini Enterprise streamAssist API 연동 UI 개발
- 프론트엔드 스타일링, 레이아웃, 반응형 디자인 작업
- 클라이언트/서버 컴포넌트 설계 및 구현
- SSE 스트리밍 처리 및 실시간 채팅 UI 구현
- Next.js 설정, 빌드, 성능 최적화
- 브라우저 테스트 및 UI 검증

### 에이전트 팀 운영 시

팀(Team)을 구성하여 작업할 때, 프론트엔드 관련 태스크가 포함되면:

1. **프론트엔드 담당 팀원은 반드시 `frontend-nextjs` 에이전트 규칙을 따르도록 생성**합니다.
   - Task 도구 호출 시 프롬프트에 `.claude/agents/frontend-nextjs.md`의 규칙을 따르도록 명시합니다.
2. 프론트엔드 태스크는 해당 팀원에게만 할당합니다.
3. 프론트엔드 팀원은 MCP next-devtools 도구와 Gemini Enterprise API 문서를 필수로 참조합니다.

### 호출 예시

```
Task(
  subagent_type="general-purpose",
  name="frontend-engineer",
  prompt="당신은 frontend-nextjs 에이전트입니다. .claude/agents/frontend-nextjs.md의 모든 규칙을 따릅니다. [구체적 작업 내용]",
  team_name="project-team"
)
```
