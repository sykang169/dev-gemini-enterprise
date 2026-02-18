# Gemini Enterprise API Reference (Discovery Engine API)

> **Last Updated**: 2026-02-16
> **API Version**: v1 (stable), v1alpha (preview)
> **Base Domain**: `discoveryengine.googleapis.com`

---

## 1. Authentication (인증)

### 1.1 인증 방식

Gemini Enterprise는 Google Cloud OAuth 2.0 Bearer Token을 사용합니다.

```
Authorization: Bearer <ACCESS_TOKEN>
```

### 1.2 서비스 계정 인증 (Server-side)

```typescript
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  // 환경변수 GOOGLE_APPLICATION_CREDENTIALS 또는 ADC 자동 감지
});

const client = await auth.getClient();
const { token } = await client.getAccessToken();
```

### 1.3 환경 변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `GOOGLE_CLOUD_PROJECT_ID` | GCP 프로젝트 ID | `gen-lang-client-0132908516` |
| `GOOGLE_CLOUD_LOCATION` | 데이터 스토어 멀티 리전 | `us`, `eu`, `global` |
| `ENDPOINT_LOCATION` | API 엔드포인트 리전 | `us`, `eu`, `global` |
| `GEMINI_APP_ID` | Gemini Enterprise 앱 ID | `gemini-enterprise-17706830_1770683046014` |
| `GOOGLE_APPLICATION_CREDENTIALS` | 서비스 계정 키 파일 경로 | `/path/to/key.json` |

### 1.4 필요 권한

- `discoveryengine.assistants.assist` - StreamAssist 호출
- `discoveryengine.sessions.create/get/list/delete` - 세션 관리
- `discoveryengine.agents.list` - 에이전트 목록 조회

---

## 2. StreamAssist API (핵심 API)

> Google은 기존 Answer/Search API 대신 **StreamAssist** 사용을 권장합니다.

### 2.1 엔드포인트

```
POST https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/engines/{APP_ID}/assistants/default_assistant:streamAssist
```

### 2.2 요청 본문 (Request Body)

```typescript
interface StreamAssistRequest {
  // === 필수 필드 ===
  query: {
    text: string;  // 사용자 질문 텍스트
  };

  // === 세션 관리 ===
  session?: string;
  // 형식: "projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/engines/{APP_ID}/sessions/{SESSION_ID}"
  // 첫 요청 시 생략하면 새 세션 자동 생성, 응답의 sessionInfo.session 값을 후속 요청에 사용

  // === 파일 컨텍스트 ===
  fileIds?: string[];
  // addContextFile API로 업로드한 파일 ID 목록

  // === 모델 선택 ===
  answerGenerationSpec?: {
    modelSpec?: {
      modelVersion?: string;
      // 사용 가능한 모델:
      // - "gemini-2.5-flash" (일상 작업용)
      // - "gemini-2.5-pro" (복잡한 작업용)
      // - "gemini-3-flash" (프론티어 속도 최적화, preview)
      // - "gemini-3-pro" (최고 추론 성능, preview)
      // - 생략 또는 "auto" -> Gemini Enterprise가 최적 모델 자동 선택
    };
    promptSpec?: {
      preamble?: string;  // 커스텀 지시사항 (톤, 스타일, 길이 조정)
    };
    includeCitations?: boolean;      // 인용 포함 여부 (기본: true)
    answerLanguageCode?: string;     // 답변 언어 (ISO 639-1, 예: "ko", "en")
    ignoreAdversarialQuery?: boolean;    // 악의적 쿼리 무시
    ignoreNonAnswerSeekingQuery?: boolean; // 비답변형 쿼리 무시
    ignoreLowRelevantContent?: boolean;  // 낮은 관련성 콘텐츠 무시
  };

  // === 에이전트 설정 ===
  agentsSpec?: {
    agentSpecs: AgentSpec[];
  };

  // === 도구 설정 ===
  toolsSpec?: {
    // Vertex AI Search 데이터 스토어 연동
    vertexAiSearchSpec?: {
      dataStoreSpecs: DataStoreSpec[];
    };
    // 웹 그라운딩 (Google Search 연동)
    webGroundingSpec?: {};  // 빈 객체로 활성화
  };

  // === 개인화 ===
  userPseudoId?: string;  // 사용자 식별자 (세션 범위 지정용, createSession에서만 사용)
}

interface AgentSpec {
  agentId: string;
  // 사용 가능한 에이전트:
  // - "deep_research" (Deep Research 에이전트)
  // - 커스텀 에이전트 ID (v1alpha agents API로 조회)
  // - Data Insights 에이전트 ID (BigQuery 데이터 분석)
}

interface DataStoreSpec {
  dataStore: string;
  // 형식: "projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/dataStores/{DATA_STORE_ID}"
}
```

### 2.3 응답 구조 (Response)

StreamAssist는 **SSE(Server-Sent Events)** 형식으로 스트리밍 응답을 반환합니다.
실제로는 JSON 배열 형태로 부분 응답이 전달됩니다.

```typescript
interface StreamAssistResponse {
  answer?: {
    // 답변 상태
    state?: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED';

    // 답변 텍스트 (Legacy 필드)
    answerText?: string;

    // 답변 리소스 이름
    name?: string;

    // 스트리밍 응답 (현재 권장)
    replies?: StreamReply[];

    // 처리 단계 (추론 과정)
    steps?: PlanningStep[];

    // 인용 정보
    citations?: Citation[];

    // 참조 문서
    references?: Reference[];

    // 건너뛴 이유
    assistSkippedReasons?: string[];

    // 진단 정보
    diagnosticInfo?: {
      plannerSteps?: PlannerStep[];
    };
  };

  // 세션 정보 (다음 요청에 사용)
  sessionInfo?: {
    session?: string;   // 세션 전체 경로
    queryId?: string;   // 쿼리 추적 ID
  };

  // 어시스트 토큰
  assistToken?: string;
}

interface StreamReply {
  groundedContent?: {
    content?: {
      role?: 'model';
      text?: string;     // 응답 텍스트 조각
      thought?: boolean; // true면 에이전트 내부 추론 과정 (UI에서 구분 표시 가능)
    };
  };
}

interface PlanningStep {
  state?: 'SUCCEEDED' | 'FAILED' | 'IN_PROGRESS';
  description?: string;      // 단계 설명
  thought?: string;          // 추론 과정
  actions?: StepAction[];
}

interface StepAction {
  searchAction?: {
    query?: string;          // 실행된 검색어
  };
  observation?: {
    searchResults?: SearchResult[];
    groundingInfo?: {
      groundingSupport?: GroundingSupport[];
    };
  };
}

interface SearchResult {
  document?: string;         // 문서 리소스 ID
  uri?: string;             // 문서 URL
  title?: string;           // 문서 제목
  snippets?: string[];      // 관련 스니펫
}

interface GroundingSupport {
  segment?: string;
  groundingAttributions?: {
    document?: string;
    confidenceScore?: number; // 0.0 ~ 1.0
  }[];
}

interface Citation {
  startIndex?: number;       // 답변 텍스트 내 시작 인덱스
  endIndex?: number;         // 답변 텍스트 내 끝 인덱스
  sources?: CitationSource[];
}

interface CitationSource {
  referenceId?: string;
  uri?: string;
  title?: string;
}

interface Reference {
  uri?: string;
  title?: string;
  chunkContent?: {
    content?: string;        // 참조된 콘텐츠 조각
    pageIdentifier?: string; // 페이지 식별자
  };
}
```

### 2.4 요청 예시

#### 기본 질문 (새 세션)
```json
{
  "query": {
    "text": "BigQuery와 Cloud SQL의 차이점은?"
  }
}
```

#### 기존 세션 이어서 질문
```json
{
  "query": {
    "text": "성능 차이에 대해 더 자세히 알려줘"
  },
  "session": "projects/my-project/locations/us/collections/default_collection/engines/my-app/sessions/abc123"
}
```

#### 모델 지정 + 데이터 스토어 + 웹 그라운딩
```json
{
  "query": {
    "text": "우리 회사 보안 정책에 대해 알려줘"
  },
  "session": "projects/my-project/locations/us/collections/default_collection/engines/my-app/sessions/abc123",
  "answerGenerationSpec": {
    "modelSpec": {
      "modelVersion": "gemini-2.5-pro"
    }
  },
  "toolsSpec": {
    "vertexAiSearchSpec": {
      "dataStoreSpecs": [
        {
          "dataStore": "projects/my-project/locations/us/collections/default_collection/dataStores/security-docs"
        }
      ]
    },
    "webGroundingSpec": {}
  }
}
```

#### 에이전트 사용 (Deep Research)
```json
{
  "query": {
    "text": "최근 AI 트렌드에 대한 심층 보고서를 작성해줘"
  },
  "agentsSpec": {
    "agentSpecs": [
      {
        "agentId": "deep_research"
      }
    ]
  }
}
```

#### 파일 컨텍스트 포함
```json
{
  "query": {
    "text": "이 문서를 요약해줘"
  },
  "session": "projects/my-project/locations/us/collections/default_collection/engines/my-app/sessions/abc123",
  "fileIds": ["uploaded-file-id-1"]
}
```

---

## 3. Session Management API (세션 관리)

### 3.1 세션 생성 (Create Session)

```
POST https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/engines/{APP_ID}/sessions
```

**Request Body:**
```json
{
  "displayName": "세션 표시 이름",
  "userPseudoId": "user-email@example.com"
}
```

**Response:**
```json
{
  "name": "projects/my-project/locations/us/collections/default_collection/engines/my-app/sessions/SESSION_ID",
  "displayName": "세션 표시 이름",
  "state": "IN_PROGRESS",
  "userPseudoId": "user-email@example.com",
  "startTime": "2026-02-16T00:00:00Z"
}
```

### 3.2 세션 목록 조회 (List Sessions)

```
GET https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/engines/{APP_ID}/sessions
```

**Query Parameters:**
| 파라미터 | 설명 |
|---------|------|
| `filter` | 필터 조건 (예: `userPseudoId="user@example.com"`) |
| `pageSize` | 페이지당 결과 수 |
| `pageToken` | 페이지네이션 토큰 |
| `orderBy` | 정렬 기준 |

**Response:**
```json
{
  "sessions": [
    {
      "name": "projects/.../sessions/SESSION_ID",
      "displayName": "세션 이름",
      "state": "IN_PROGRESS",
      "userPseudoId": "user@example.com",
      "turns": [...],
      "startTime": "2026-02-16T00:00:00Z",
      "endTime": "2026-02-16T01:00:00Z"
    }
  ],
  "nextPageToken": "..."
}
```

### 3.3 세션 상세 조회 (Get Session)

```
GET https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1/{SESSION_NAME}
```

**Query Parameters:**
| 파라미터 | 설명 |
|---------|------|
| `includeAnswerDetails` | `true`면 답변 상세 정보 포함 |

**Response:** Session 객체 (turns 배열 포함)

```typescript
interface Session {
  name: string;
  displayName?: string;
  state?: 'IN_PROGRESS' | 'COMPLETED';
  userPseudoId?: string;
  turns?: Turn[];
  startTime?: string;
  endTime?: string;
}

interface Turn {
  query?: {
    text: string;
    queryId?: string;
  };
  answer?: string; // 답변 리소스 이름 (name)
}
```

### 3.4 세션 업데이트 (Update Session)

```
PATCH https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1/{SESSION_NAME}?updateMask=displayName
```

**Request Body:**
```json
{
  "displayName": "업데이트된 세션 이름"
}
```

### 3.5 세션 삭제 (Delete Session)

```
DELETE https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1/{SESSION_NAME}
```

---

## 4. File Context API (파일 컨텍스트)

### 4.1 파일 업로드 (Add Context File)

```
POST https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/engines/{APP_ID}/assistants/default_assistant:addContextFile
```

**Request Body:**
```json
{
  "file": {
    "displayName": "document.pdf",
    "content": {
      "mimeType": "application/pdf",
      "rawBytes": "<BASE64_ENCODED_FILE_CONTENT>"
    }
  }
}
```

**Response:**
```json
{
  "fileId": "uploaded-file-id",
  "tokenCount": 1500
}
```

**지원 파일 형식:**
| MIME Type | 확장자 |
|-----------|--------|
| `application/pdf` | `.pdf` |
| `text/plain` | `.txt` |
| `text/html` | `.html` |
| `text/csv` | `.csv` |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.docx` |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` |
| `application/vnd.openxmlformats-officedocument.presentationml.presentation` | `.pptx` |

**최대 파일 크기:** 50MB

---

## 5. Agents API (에이전트)

### 5.1 에이전트 목록 조회 (List Agents)

> **API Version**: v1alpha (Preview)

```
GET https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1alpha/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/engines/{APP_ID}/assistants/default_assistant/agents
```

**Response:**
```json
{
  "agents": [
    {
      "name": "projects/.../agents/AGENT_ID",
      "displayName": "에이전트 이름",
      "description": "에이전트 설명",
      "state": "ENABLED"
    }
  ]
}
```

**에이전트 상태:**
| 상태 | 설명 |
|------|------|
| `ENABLED` | 사용 가능 |
| `DISABLED` | 비활성화 |
| `DEPLOYING` | 배포 중 |

### 5.2 내장 에이전트

| Agent ID | 이름 | 설명 |
|----------|------|------|
| `deep_research` | Deep Research | 내부/외부 정보 심층 분석 및 보고서 생성 |
| *(커스텀)* | Data Insights | BigQuery 데이터 자연어 분석 (v1alpha) |

### 5.3 Deep Research 에이전트 사용법

**2단계 프로세스:**

**1단계 - 연구 계획 생성:**
```json
{
  "query": { "text": "AI 트렌드 분석 보고서 작성" },
  "agentsSpec": {
    "agentSpecs": [{ "agentId": "deep_research" }]
  }
}
```
응답에서 연구 계획과 SESSION_ID를 받습니다.

**2단계 - 연구 실행:**
```json
{
  "query": { "text": "Start Research" },
  "session": "{1단계에서 받은 SESSION_ID}"
}
```
스트리밍으로 연구 결과, 인용, 최종 보고서를 수신합니다.

### 5.4 Data Insights 에이전트 (v1alpha)

BigQuery 데이터에 대해 자연어로 질의할 수 있는 에이전트입니다.

**에이전트 생성:**
```
POST https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1alpha/projects/{PROJECT_NUMBER}/locations/{LOCATION}/collections/default_collection/engines/{APP_ID}/assistants/default_assistant/agents
```

```json
{
  "displayName": "Sales Data Agent",
  "description": "매출 데이터 분석 에이전트",
  "dataInsightsAgentConfig": {
    "bqProjectId": "my-bq-project",
    "bqDatasetId": "sales_data",
    "allowlistTables": ["orders", "customers"],
    "authorizationConfig": {
      "toolAuthorizations": [{
        "authorization": "projects/.../authorizations/AUTH_ID"
      }]
    }
  }
}
```

**에이전트 배포:**
```
POST https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1alpha/{AGENT_NAME}:deploy
```

**쿼리 실행 (streamAssist 사용):**
```json
{
  "query": { "text": "이번 달 매출 상위 10개 제품은?" },
  "agentsSpec": {
    "agentSpecs": [{ "agentId": "{DATA_INSIGHTS_AGENT_ID}" }]
  }
}
```

---

## 6. Data Store API (데이터 스토어)

### 6.1 데이터 스토어 목록 조회

```
GET https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/dataStores
```

**Response:**
```json
{
  "dataStores": [
    {
      "name": "projects/.../dataStores/DATA_STORE_ID",
      "displayName": "데이터 스토어 이름",
      "industryVertical": "GENERIC",
      "solutionTypes": ["SOLUTION_TYPE_SEARCH"],
      "createTime": "2026-01-01T00:00:00Z",
      "defaultSchemaId": "default_schema"
    }
  ]
}
```

### 6.2 데이터 스토어 CRUD

| 작업 | HTTP Method | 엔드포인트 |
|------|------------|-----------|
| 생성 | POST | `.../dataStores` |
| 조회 | GET | `.../dataStores/{DATA_STORE_ID}` |
| 목록 | GET | `.../dataStores` |
| 수정 | PATCH | `.../dataStores/{DATA_STORE_ID}` |
| 삭제 | DELETE | `.../dataStores/{DATA_STORE_ID}` |

### 6.3 데이터 소스 타입

| 소스 | 설명 |
|------|------|
| BigQuery | BigQuery 테이블/뷰 |
| Cloud SQL | Cloud SQL 데이터베이스 |
| Cloud Storage (GCS) | GCS 버킷의 문서 |
| Firestore | Firestore 컬렉션 |
| 웹 크롤링 | 지정된 URL 크롤링 |

---

## 7. Answer API (Legacy)

> **주의**: 신규 구현에는 StreamAssist 사용을 권장합니다.

### 7.1 엔드포인트

```
POST https://discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/global/collections/default_collection/engines/{APP_ID}/servingConfigs/default_search:answer
```

### 7.2 요청 본문

```json
{
  "query": { "text": "검색 질의" },
  "queryUnderstandingSpec": {
    "queryRephraserSpec": {
      "disable": false,
      "maxRephraseSteps": 5
    },
    "queryClassificationSpec": {
      "types": ["ADVERSARIAL_QUERY", "NON_ANSWER_SEEKING_QUERY"]
    }
  },
  "searchSpec": {
    "searchParams": {
      "maxReturnResults": 10,
      "filter": "메타데이터 필터",
      "searchResultMode": "DOCUMENTS"
    }
  },
  "answerGenerationSpec": {
    "ignoreAdversarialQuery": true,
    "ignoreNonAnswerSeekingQuery": true,
    "modelSpec": {
      "modelVersion": "gemini-2.5-flash/answer_gen/v1"
    },
    "promptSpec": {
      "preamble": "커스텀 지시사항"
    },
    "includeCitations": true,
    "answerLanguageCode": "ko"
  }
}
```

### 7.3 응답 구조

```json
{
  "answer": {
    "state": "SUCCEEDED",
    "answerText": "생성된 답변",
    "steps": [{
      "state": "SUCCEEDED",
      "description": "처리 단계",
      "actions": [{
        "searchAction": { "query": "검색어" },
        "observation": {
          "searchResults": [{
            "document": "문서 ID",
            "uri": "문서 URL",
            "title": "문서 제목"
          }]
        }
      }]
    }]
  },
  "answerQueryToken": "토큰"
}
```

---

## 8. StreamAnswer API (streamAnswer)

> Legacy Answer API의 스트리밍 버전입니다. StreamAssist 권장.

### 8.1 엔드포인트

```
POST https://discoveryengine.googleapis.com/v1beta/{servingConfig}:streamAnswer
```

### 8.2 응답

성공 시 `AnswerQueryResponse` 객체의 스트림을 반환합니다.

---

## 9. Search API (검색)

### 9.1 검색 (search)

```
POST https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/dataStores/{DATA_STORE_ID}/servingConfigs/default_serving_config:search
```

### 9.2 경량 검색 (searchLite)

```
POST ...servingConfigs/default_serving_config:searchLite
```

### 9.3 추천 (recommend)

```
POST ...servingConfigs/default_serving_config:recommend
```

---

## 10. Conversations API (Legacy 대화)

> StreamAssist의 세션 기반 대화를 권장합니다.

### 10.1 대화 시작/계속 (converse)

```
POST https://{ENDPOINT_LOCATION}-discoveryengine.googleapis.com/v1/projects/{PROJECT_ID}/locations/{LOCATION}/collections/default_collection/dataStores/{DATA_STORE_ID}/conversations/{CONVERSATION_ID}:converse
```

### 10.2 대화 CRUD

| 작업 | Method | 엔드포인트 |
|------|--------|-----------|
| 생성 | POST | `.../conversations` |
| 조회 | GET | `.../conversations/{ID}` |
| 목록 | GET | `.../conversations` |
| 수정 | PATCH | `.../conversations/{ID}` |
| 삭제 | DELETE | `.../conversations/{ID}` |

---

## 11. URL 패턴 정리

### 리소스 경로 구조

```
projects/{PROJECT_ID}
  /locations/{LOCATION}
    /collections/default_collection
      /engines/{APP_ID}
        /assistants/default_assistant
          :streamAssist               <- StreamAssist API
          :addContextFile             <- 파일 업로드
          /agents                     <- 에이전트 관리 (v1alpha)
        /sessions                     <- 세션 관리
          /{SESSION_ID}
      /dataStores
        /{DATA_STORE_ID}
          /servingConfigs
            /default_serving_config
              :search                 <- 검색
              :searchLite             <- 경량 검색
              :answer                 <- Answer API (Legacy)
              :streamAnswer           <- StreamAnswer (Legacy)
              :recommend              <- 추천
          /conversations              <- 대화 (Legacy)
          /documents                  <- 문서 관리
          /schemas                    <- 스키마 관리
```

### Base URL 패턴

| API 버전 | Base URL |
|----------|----------|
| v1 (stable) | `https://{ENDPOINT}-discoveryengine.googleapis.com/v1/` |
| v1alpha (preview) | `https://{ENDPOINT}-discoveryengine.googleapis.com/v1alpha/` |
| v1beta (beta) | `https://{ENDPOINT}-discoveryengine.googleapis.com/v1beta/` |

---

## 12. 클라이언트 라이브러리

### 지원 언어

| 언어 | 패키지 |
|------|--------|
| Python | `google-cloud-discoveryengine` |
| Node.js | `@google-cloud/discoveryengine` |
| Java | `google-cloud-discoveryengine` |
| Go | `cloud.google.com/go/discoveryengine` |
| C# | `Google.Cloud.DiscoveryEngine.V1Beta` |
| PHP | `google/cloud-discoveryengine` |
| Ruby | `google-cloud-discovery_engine-v1beta` |

### Node.js 설치 및 사용

```bash
npm install @google-cloud/discoveryengine
```

```typescript
import { AssistantServiceClient } from '@google-cloud/discoveryengine';

const client = new AssistantServiceClient({
  apiEndpoint: `${endpointLocation}-discoveryengine.googleapis.com`,
});

const request = {
  name: `projects/${projectId}/locations/${location}/collections/default_collection/engines/${appId}/assistants/default_assistant`,
  query: { text: '질문 텍스트' },
};

const stream = client.streamAssist(request);
for await (const response of stream) {
  console.log(response);
}
```

### Python 사용

```python
from google.cloud import discoveryengine_v1 as discoveryengine
from google.api_core.client_options import ClientOptions

client = discoveryengine.AssistantServiceClient(
    client_options=ClientOptions(
        api_endpoint=f"{location}-discoveryengine.googleapis.com"
    )
)

request = discoveryengine.StreamAssistRequest(
    name=client.assistant_path(
        project=project_id,
        location=location,
        collection="default_collection",
        engine=engine_id,
        assistant="default_assistant",
    ),
    query=discoveryengine.Query(text=query),
)

stream = client.stream_assist(request=request)
for response in stream:
    print(response)
```

---

## 13. 에러 코드 및 처리

| HTTP 코드 | 설명 | 대응 방법 |
|-----------|------|----------|
| 400 | Bad Request - 잘못된 요청 | 요청 파라미터 확인 |
| 401 | Unauthorized - 인증 실패 | 토큰 갱신 후 재시도 |
| 403 | Forbidden - 권한 부족 | IAM 권한 확인 |
| 404 | Not Found - 리소스 없음 | 리소스 경로 확인 |
| 429 | Rate Limit - 요청 제한 초과 | 백오프 후 재시도 |
| 500 | Internal Server Error | 재시도 |

### 토큰 갱신 전략 (현재 구현)

```typescript
// 1. 캐시된 토큰 사용
let token = await getAccessToken();
let response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

// 2. 401이면 토큰 갱신 후 재시도
if (response.status === 401) {
  invalidateAccessToken();
  token = await getAccessToken();
  response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
}
```

---

## 14. 프론트엔드 구현 가이드

### 14.1 SSE 스트리밍 처리 패턴

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, sessionId, model, dataStores, agents, enableWebGrounding }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (reader) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  // JSON 배열 파싱 (Gemini Enterprise 응답 형식)
  try {
    const jsonArray = JSON.parse(buffer);
    for (const item of jsonArray) {
      // item.answer.replies 처리
      // item.sessionInfo 처리
    }
  } catch {
    // 아직 완전한 JSON이 아니면 계속 누적
  }
}
```

### 14.2 구현해야 할 전체 기능 목록

| 기능 | API | 상태 | 설명 |
|------|-----|------|------|
| 채팅 (질의/응답) | streamAssist | 구현됨 | 기본 대화 기능 |
| 세션 관리 (CRUD) | sessions | 구현됨 | 세션 생성/조회/삭제/수정 |
| 세션 기반 대화 연속 | streamAssist + session | 구현됨 | 세션 ID로 컨텍스트 유지 |
| 모델 선택 | answerGenerationSpec | 구현됨 | Flash/Pro/Auto 선택 |
| 파일 업로드/컨텍스트 | addContextFile + fileIds | 구현됨 | 파일 기반 질의 |
| 데이터 스토어 검색 | toolsSpec.vertexAiSearchSpec | 구현됨 | 커넥티드 데이터 소스 검색 |
| 웹 그라운딩 | toolsSpec.webGroundingSpec | 구현됨 | Google Search 연동 |
| 에이전트 선택 | agentsSpec | 구현됨 | 에이전트 모드 전환 |
| DLP 검사 | Cloud DLP API | 구현됨 | 민감 정보 탐지 |
| 인용 표시 | citations/references | 구현됨 | 답변 출처 표시 |
| 추론 단계 표시 | steps/plannerSteps | 구현됨 | AI 추론 과정 시각화 |
| 팔로업 제안 | 클라이언트 생성 | 구현됨 | 후속 질문 제안 |
| Deep Research | agentsSpec (deep_research) | 구현됨 | 심층 연구 보고서 |
| 커스텀 프롬프트 | promptSpec.preamble | **미구현** | 답변 톤/스타일 커스터마이징 |
| 답변 언어 설정 | answerLanguageCode | **미구현** | 답변 언어 명시 지정 |
| 쿼리 분류/필터링 | queryUnderstandingSpec | **미구현** | 악성/비답변 쿼리 필터 |
| 검색 필터 | searchSpec.filter | **미구현** | 메타데이터 기반 검색 필터 |
| 검색 부스팅 | searchSpec.boostSpec | **미구현** | 검색 결과 순위 조정 |
| 접지 점수 표시 | groundingSupport | **미구현** | 답변 신뢰도 점수 시각화 |
| Data Insights 에이전트 | v1alpha agents | **미구현** | BigQuery 자연어 분석 |
| 에이전트 생성/관리 | v1alpha agents CRUD | **미구현** | 커스텀 에이전트 생성 |
| 문서 관리 | documents API | **미구현** | 데이터 스토어 문서 CRUD |
| 사용자 이벤트 추적 | userEvents | **미구현** | 사용자 행동 분석 |
| 사이트 검색 관리 | siteSearchEngine | **미구현** | 웹 크롤링 관리 |
| 자동완성 | completeQuery | **미구현** | 검색어 자동완성 |
| 추천 | recommend | **미구현** | 콘텐츠 추천 |

---

## 15. 공식 문서 링크

### 핵심 문서

| 문서 | URL |
|------|-----|
| StreamAssist 사용 가이드 | https://docs.cloud.google.com/gemini/enterprise/docs/get-answers-from-streamassist |
| StreamAssist API Reference (v1) | https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1/projects.locations.collections.engines.assistants/streamAssist |
| StreamAssist API Reference (v1alpha) | https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest/v1alpha/projects.locations.collections.engines.assistants/streamAssist |
| REST API 전체 목록 | https://docs.cloud.google.com/gemini/enterprise/docs/reference/rest |
| RPC API Reference | https://docs.cloud.google.com/gemini/enterprise/docs/reference/rpc |
| 인증 가이드 | https://docs.cloud.google.com/gemini/enterprise/docs/authentication |
| 클라이언트 라이브러리 | https://docs.cloud.google.com/gemini/enterprise/docs/libraries |
| API 목록 | https://docs.cloud.google.com/gemini/enterprise/docs/apis |

### 기능별 가이드

| 문서 | URL |
|------|-----|
| Deep Research | https://docs.cloud.google.com/gemini/enterprise/docs/research-assistant |
| Data Insights 에이전트 | https://docs.cloud.google.com/gemini/enterprise/docs/data-agent |
| Answer API (Legacy) | https://docs.cloud.google.com/gemini/enterprise/docs/answer |
| 에이전트 생성 | https://docs.cloud.google.com/gemini/enterprise/docs/agent-designer/create-agent |
