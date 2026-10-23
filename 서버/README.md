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

## 드래그앤드롭 AI 가상착장

장바구니에서 상품을 기본 마네킹으로 드래그하면 `POST /api/products/try-on/generate`가 현재 코디 상품을 DB에서 조회한 뒤 Vercel AI Gateway를 통해 새로운 착장 이미지를 생성합니다. 미리 제작한 착장 이미지를 선택하는 방식이 아닙니다.

- Vercel 배포: 프로젝트 OIDC 인증을 자동으로 사용하므로 별도 OpenAI 키가 필요하지 않습니다.
- 로컬 실행: `AI_GATEWAY_API_KEY`를 서버 환경변수로 설정하거나 `vercel env pull`로 개발용 OIDC 토큰을 받습니다.
- `AI_TRYON_MODEL`: 기본값 `openai/gpt-image-2.5-sunburst`
- `AI_TRYON_MANNEQUIN_URL`: 브라우저 Origin을 쓸 수 없는 호출에서 사용할 마네킹 공개 URL(선택)
- `AI_TRYON_ALLOWED_IMAGE_HOSTS`: Cloudinary 외에 상품 이미지가 저장된 허용 호스트(선택)

비밀값은 서버 또는 Vercel 환경변수에만 저장하고 `VITE_` 접두사를 붙이지 않습니다. 생성 요청은 로그인한 사용자만 가능하며 IP당 시간당 30회로 제한합니다. AI 생성이 실패하면 화면은 기존 수동 배치 상태를 유지합니다.
