# 출고 현황 대시보드

Google Sheets 데이터를 실시간으로 시각화하는 웹 대시보드입니다.

## 기능

- **실시간 데이터 시각화**: Google Sheets CSV 데이터를 실시간으로 불러와 차트로 표시
- **시간별 출고 현황**: 최근 3일간의 시간별 누적 출고량을 라인 차트로 표시
- **예측 기능**: 오늘 데이터의 누락된 시간대에 대한 예측값 제공
- **자동 새로고침**: 10분 주기로 자동 데이터 업데이트
- **반응형 디자인**: 다양한 화면 크기에 대응

## 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Tailwind CSS, DaisyUI
- **Chart Library**: Chart.js, ChartJS DataLabels Plugin
- **Data Source**: Google Sheets (CSV export)

## 프로젝트 구조

```
/
├── index.html          # 메인 HTML 파일
├── css/
│   └── style.css       # 커스텀 스타일
├── js/
│   ├── dashboard.js    # 대시보드 메인 로직
│   └── app.js          # 애플리케이션 유틸리티
├── README.md           # 프로젝트 문서
└── .gitignore          # Git 제외 파일 목록
```

## 설치 및 실행

1. 프로젝트 클론:
```bash
git clone <repository-url>
cd delivery-dashboard
```

2. 간단한 HTTP 서버 실행:
```bash
python -m http.server 8001
```

3. 브라우저에서 접속:
```
http://localhost:8001
```

## 주요 특징

### 데이터 시각화
- **오늘**: 파란색 실선 (예측 구간은 주황색 점선)
- **어제**: 빨간색 실선
- **그저께**: 초록색 실선

### 통계 카드
- 오늘 총 출고량
- 어제 마지막 출고량  
- 3일 평균 출고수량
- 평균 시간당 출고량

### 예측 알고리즘
- 이전 시간대의 평균 증가량을 기반으로 한 선형 예측
- 23:00까지의 누락된 시간대 예측값 제공
- 예측값은 주황색으로 구분 표시

## 데이터 소스

Google Sheets의 CSV 출력을 사용하며, 다음과 같은 구조를 가집니다:

```
날짜, 요일, 합계, 0시, 1시, 2시, ..., 23시
2025.7.11, Thu, 621, 20, 31, 35, ..., 621
```

## 브라우저 지원

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## 라이선스

MIT License