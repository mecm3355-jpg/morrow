# 쇼핑몰 서버

Node.js, Express, MongoDB(Mongoose)로 구성한 API 서버입니다.

## 실행 방법

1. `.env.example`을 `.env`로 복사합니다.
2. MongoDB를 실행하거나 `MONGODB_URI`에 MongoDB Atlas 연결 주소를 입력합니다.
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
- `PORTONE_INCLUDE_SANDBOX_PAYMENTS`: 테스트 채널 결제를 단건 조회할 때만 `true` (운영은 `false`)

주문 페이지는 결제창을 열기 전에 고객사 식별코드 일치 여부와 V1 API 인증을 확인합니다. API Key와 Secret은 서버에만 저장하고 클라이언트 환경변수에 넣지 않습니다.
