# 모로우 서버

Node.js, Express, MongoDB(Mongoose)로 구성한 API 서버입니다.

## 실행 방법

1. `.env.example`을 `.env`로 복사합니다.
2. `MONGODB_ATLAS_URI`에 MongoDB Atlas 연결 주소를 입력합니다.
3. 개발 서버를 실행합니다.

```powershell
Copy-Item .env.example .env
npm.cmd run dev
```

기본 주소는 `http://localhost:5000`이며 상태 확인 API는 `GET /api/health`입니다.

## 포트원 V1 결제 설정

포트원 콘솔의 같은 V1 상점 계정에서 확인한 값을 `.env`에 설정합니다.

- `PORTONE_MERCHANT_CODE`: 고객사 식별코드
- `PORTONE_API_KEY`: REST API Key
- `PORTONE_API_SECRET`: REST API Secret
- `PORTONE_INCLUDE_SANDBOX_PAYMENTS`: 테스트 채널 결제를 주문 조회에 포함할 때만 `true`(운영은 `false`)

주문 페이지가 결제창을 열기 전에 고객사 식별코드 일치 여부와 V1 API 인증을 확인합니다. API Key와 Secret은 서버에만 저장하고 클라이언트 환경변수에는 넣지 않습니다.

## 무료 AI 가상착장

장바구니 상품을 착장 화면으로 드래그하면 해당 상품을 크게 확대한 참조 이미지와 상품 종류별 정밀 지시문을 서버로 보내 개별 착장을 즉시 생성합니다. 상품을 클릭해 선택한 뒤 `코디 한 번에 입어보기` 버튼을 누르면 기존처럼 상의·하의·가방·모자 코디 보드를 사용해 한 장의 코디 착장 이미지를 생성합니다. 두 방식 모두 서버를 거쳐 Hugging Face 공개 Space의 Qwen Image Turbo를 사용합니다.

기본 모델은 `hugging-apps/qwen-qwen-image-2-1-turbo`이며 `HF_SPACE_ID`로 변경할 수 있습니다. 공개 GPU 상태에 따라 대기하거나 할당량 제한이 발생할 수 있고, 결과는 연구·평가용 미리보기이므로 실제 사이즈와 핏을 보장하지 않습니다.

앱 자체 제한은 사용자당 시간당 10회의 성공한 생성이며 실패 요청은 횟수에서 제외합니다. 기본 마네킹의 지원 코디는 사전 생성 이미지를 사용해 ZeroGPU를 호출하지 않습니다. 개인 사진의 동일한 상품 또는 코디 결과는 브라우저 IndexedDB에 7일간 최대 16개를 저장해 다시 생성하지 않습니다. 서버의 `HF_TOKEN`에 무료 Hugging Face 계정 토큰을 Secret으로 설정하면 비인증 요청보다 많은 ZeroGPU 일일 할당량을 사용할 수 있습니다. 토큰은 클라이언트 환경변수나 Git 저장소에 넣지 않습니다.
