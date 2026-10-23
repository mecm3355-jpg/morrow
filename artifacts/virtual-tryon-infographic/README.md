# MORROW AI 가상착장 인포그래픽

`ai-virtual-tryon-qwen-blob-cache-infographic.png`는 현재 구현을 기준으로 다음 내용을 반영한 개발용 인포그래픽입니다.

- Qwen Image 2.1 Turbo
- Hugging Face ZeroGPU
- 1024px, 3:4, seed 42
- 인물 이미지와 코디 보드를 이용한 이미지 생성
- 상품 드래그·드롭 시 해당 상품 1개 즉시 AI 착장
- 상품 클릭 선택 후 `코디 한 번에 입어보기`로 AI 착장
- 기본 마네킹 16개 코디 사전 생성 결과 즉시 재사용
- 개인 사진 결과를 IndexedDB에 7일간 최대 16개 영구 캐시
- 서버 Binary Blob 전달 및 사용자별 캐시 키
- 무료 공개 GPU 할당량 제한 안내
