/**
 * 기본 대시보드 예제
 * Chart MCP 대시보드 플랫폼의 기본 사용법을 보여주는 예제
 */

import { DashboardAppFactory } from '../src/DashboardApp.js';

// 대시보드 애플리케이션 생성
const dashboardApp = DashboardAppFactory.createWithDefaults({
  debug: true,
  environment: 'development'
});

// 애플리케이션 이벤트 리스너 설정
dashboardApp.on('initComplete', (data) => {
  console.log('✅ 대시보드 애플리케이션 초기화 완료:', data);
  runBasicExample();
});

dashboardApp.on('initError', (data) => {
  console.error('❌ 대시보드 애플리케이션 초기화 실패:', data);
});

dashboardApp.on('userLogin', (data) => {
  console.log('👤 사용자 로그인:', data);
});

dashboardApp.on('chartCreated', (data) => {
  console.log('📊 차트 생성 완료:', data);
});

dashboardApp.on('dataLoaded', (data) => {
  console.log('📂 데이터 로드 완료:', data);
});

dashboardApp.on('error', (error) => {
  console.error('⚠️ 애플리케이션 오류:', error);
});

/**
 * 기본 예제 실행
 */
async function runBasicExample() {
  try {
    console.log('\n=== 기본 대시보드 예제 시작 ===\n');
    
    // 1. 사용자 로그인
    await loginUser();
    
    // 2. 샘플 데이터 로드
    await loadSampleData();
    
    // 3. 차트 생성
    await createCharts();
    
    // 4. 실시간 차트 설정
    await setupRealtimeCharts();
    
    // 5. 사용자 커스터마이징 적용
    await applyCustomizations();
    
    // 6. 시스템 상태 확인
    await checkSystemStatus();
    
    console.log('\n=== 기본 대시보드 예제 완료 ===\n');
    
  } catch (error) {
    console.error('예제 실행 중 오류:', error);
  }
}

/**
 * 사용자 로그인
 */
async function loginUser() {
  console.log('1. 사용자 로그인 중...');
  
  try {
    const user = await dashboardApp.loginUser('demo-user', {
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'admin'
    });
    
    console.log('사용자 로그인 성공:', user);
    return user;
    
  } catch (error) {
    console.error('사용자 로그인 실패:', error);
    throw error;
  }
}

/**
 * 샘플 데이터 로드
 */
async function loadSampleData() {
  console.log('2. 샘플 데이터 로드 중...');
  
  try {
    // 출고 데이터 생성
    const deliveryData = generateDeliveryData();
    await dashboardApp.loadData('delivery-data', {
      data: deliveryData,
      type: 'json'
    });
    
    // 매출 데이터 생성
    const salesData = generateSalesData();
    await dashboardApp.loadData('sales-data', {
      data: salesData,
      type: 'json'
    });
    
    console.log('샘플 데이터 로드 완료');
    
  } catch (error) {
    console.error('샘플 데이터 로드 실패:', error);
    throw error;
  }
}

/**
 * 차트 생성
 */
async function createCharts() {
  console.log('3. 차트 생성 중...');
  
  try {
    // 출고 현황 라인 차트
    const deliveryChart = await dashboardApp.createChart('delivery-chart', {
      type: 'line',
      data: {
        labels: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
        datasets: [{
          label: '오늘 출고량',
          data: [120, 150, 180, 200, 230, 250, 280, 300],
          borderColor: '#3B82F6',
          backgroundColor: '#3B82F620',
          tension: 0.4
        }, {
          label: '어제 출고량',
          data: [100, 130, 160, 190, 210, 240, 270, 290],
          borderColor: '#EF4444',
          backgroundColor: '#EF444420',
          borderDash: [5, 5],
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '시간별 출고 현황'
          },
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: '시간'
            }
          },
          y: {
            title: {
              display: true,
              text: '출고량'
            },
            beginAtZero: true
          }
        }
      }
    });
    
    // 매출 현황 바 차트
    const salesChart = await dashboardApp.createChart('sales-chart', {
      type: 'bar',
      data: {
        labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
        datasets: [{
          label: '매출액',
          data: [1200, 1900, 3000, 5000, 2000, 3000],
          backgroundColor: '#10B981',
          borderColor: '#059669',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '월별 매출 현황'
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: '월'
            }
          },
          y: {
            title: {
              display: true,
              text: '매출액 (만원)'
            },
            beginAtZero: true
          }
        }
      }
    });
    
    // 지역별 판매량 파이 차트
    const regionChart = await dashboardApp.createChart('region-chart', {
      type: 'pie',
      data: {
        labels: ['서울', '경기', '인천', '대전', '대구', '부산'],
        datasets: [{
          label: '지역별 판매량',
          data: [300, 250, 100, 150, 120, 180],
          backgroundColor: [
            '#3B82F6',
            '#EF4444',
            '#10B981',
            '#F59E0B',
            '#8B5CF6',
            '#06B6D4'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '지역별 판매량'
          },
          legend: {
            display: true,
            position: 'right'
          }
        }
      }
    });
    
    console.log('차트 생성 완료');
    
  } catch (error) {
    console.error('차트 생성 실패:', error);
    throw error;
  }
}

/**
 * 실시간 차트 설정
 */
async function setupRealtimeCharts() {
  console.log('4. 실시간 차트 설정 중...');
  
  try {
    // 실시간 데이터 스트림 생성
    const streamManager = dashboardApp.modules.streamManager;
    
    if (streamManager) {
      // 실시간 출고 데이터 스트림
      const deliveryStream = await streamManager.createStream('delivery-stream', {
        websocketUrl: 'ws://localhost:8080/delivery',
        reconnectInterval: 3000,
        maxReconnectAttempts: 5
      });
      
      // 실시간 매출 데이터 스트림
      const salesStream = await streamManager.createStream('sales-stream', {
        websocketUrl: 'ws://localhost:8080/sales',
        reconnectInterval: 3000,
        maxReconnectAttempts: 5
      });
      
      console.log('실시간 차트 설정 완료');
    } else {
      console.warn('스트림 매니저를 사용할 수 없습니다');
    }
    
  } catch (error) {
    console.error('실시간 차트 설정 실패:', error);
    // 실시간 기능은 선택적이므로 오류를 던지지 않음
  }
}

/**
 * 사용자 커스터마이징 적용
 */
async function applyCustomizations() {
  console.log('5. 사용자 커스터마이징 적용 중...');
  
  try {
    const customizationManager = dashboardApp.modules.customizationManager;
    
    if (customizationManager) {
      // 사용자 환경설정 업데이트
      await customizationManager.updateUserPreferences('demo-user', {
        theme: {
          id: 'business',
          custom: null
        },
        dashboard: {
          autoRefresh: true,
          refreshInterval: 30000,
          showTooltips: true,
          enableAnimations: true
        }
      });
      
      // 사용자 레이아웃 설정
      await customizationManager.updateUserLayout('demo-user', 'main-layout', {
        components: [
          { id: 'delivery-chart', type: 'chart', position: { x: 0, y: 0, w: 6, h: 4 } },
          { id: 'sales-chart', type: 'chart', position: { x: 6, y: 0, w: 6, h: 4 } },
          { id: 'region-chart', type: 'chart', position: { x: 0, y: 4, w: 6, h: 4 } }
        ],
        settings: {
          gridSize: 12,
          margin: 10,
          isDraggable: true,
          isResizable: true
        }
      });
      
      // 레이아웃 적용
      await dashboardApp.applyLayout('main-layout');
      
      console.log('사용자 커스터마이징 적용 완료');
    } else {
      console.warn('커스터마이징 매니저를 사용할 수 없습니다');
    }
    
  } catch (error) {
    console.error('사용자 커스터마이징 적용 실패:', error);
    // 커스터마이징은 선택적이므로 오류를 던지지 않음
  }
}

/**
 * 시스템 상태 확인
 */
async function checkSystemStatus() {
  console.log('6. 시스템 상태 확인 중...');
  
  try {
    const systemStatus = dashboardApp.getSystemStatus();
    console.log('시스템 상태:', systemStatus);
    
    const metrics = dashboardApp.getMetrics();
    console.log('성능 메트릭:', metrics);
    
    console.log('시스템 상태 확인 완료');
    
  } catch (error) {
    console.error('시스템 상태 확인 실패:', error);
    throw error;
  }
}

/**
 * 샘플 출고 데이터 생성
 */
function generateDeliveryData() {
  const hours = [];
  const todayData = [];
  const yesterdayData = [];
  
  for (let i = 9; i <= 16; i++) {
    hours.push(`${i}:00`);
    todayData.push(Math.floor(Math.random() * 100) + 100);
    yesterdayData.push(Math.floor(Math.random() * 100) + 80);
  }
  
  return {
    labels: hours,
    today: todayData,
    yesterday: yesterdayData
  };
}

/**
 * 샘플 매출 데이터 생성
 */
function generateSalesData() {
  const months = ['1월', '2월', '3월', '4월', '5월', '6월'];
  const salesData = [];
  
  for (let i = 0; i < 6; i++) {
    salesData.push(Math.floor(Math.random() * 3000) + 1000);
  }
  
  return {
    labels: months,
    data: salesData
  };
}

/**
 * 5초 후 시스템 정리 (데모용)
 */
setTimeout(async () => {
  console.log('\n=== 시스템 정리 시작 ===\n');
  
  try {
    await dashboardApp.destroy();
    console.log('시스템 정리 완료');
  } catch (error) {
    console.error('시스템 정리 실패:', error);
  }
}, 30000);

// 프로세스 종료 시 정리
process.on('SIGINT', async () => {
  console.log('\n프로세스 종료 신호 수신...');
  try {
    await dashboardApp.destroy();
    process.exit(0);
  } catch (error) {
    console.error('정리 중 오류:', error);
    process.exit(1);
  }
});

// 예제 실행 시작
console.log('Chart MCP 대시보드 플랫폼 시작...');
dashboardApp.init();