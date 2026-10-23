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

## 무료 드래그앤드롭 가상착장

장바구니 가상착장은 클라이언트 브라우저에서만 처리합니다. 상품을 마네킹으로 드래그하면 원본 상품 이미지를 최대 900px로 축소하고, 모서리 픽셀로 밝은 무채색 배경을 판별합니다. 이미지 가장자리와 연결된 배경 픽셀만 투명화해 상품 내부의 흰색을 보존한 다음 상품 카테고리별 기준 위치와 크기에 배치합니다. 사용자는 크기와 각도를 추가로 조절할 수 있습니다.

상품 이미지와 사용자가 선택한 사진을 서버나 외부 AI API로 전송하지 않으므로 API 키와 이미지 생성 비용이 필요하지 않습니다. 생성형 AI가 옷 주름이나 가려짐을 새로 그리는 방식은 아니므로 실제 핏과 차이가 있을 수 있습니다.
