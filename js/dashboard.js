// Chart.js 플러그인 전역 등록 (Chart.js v3 방식)
Chart.register(ChartDataLabels);

// 대시보드 클래스
class Dashboard {
    constructor(csvUrl, chartId) {
        this.csvUrl = csvUrl;
        this.chartId = chartId;
        this.chart = null;
        this.data = [];
        this.refreshInterval = null;
    }

    async init() {
        console.log('Dashboard initialization started...');
        
        // 먼저 차트를 초기화
        this.initChart();
        
        // 이벤트 핸들러 설정
        this.setupEventHandlers();
        
        // 데이터 로드 및 대시보드 업데이트
        await this.loadData();
        
        console.log('Dashboard initialization completed');
    }

    setupEventHandlers() {
        // 새로고침 버튼
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.refreshData();
        });
    }

    async loadData() {
        try {
            this.showLoading();
            
            // CORS 우회를 위한 프록시 사용 (여러 프록시 서비스 시도)
            const proxyServices = [
                `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(this.csvUrl)}`,
                `https://cors-anywhere.herokuapp.com/${this.csvUrl}`,
                `https://api.allorigins.win/get?url=${encodeURIComponent(this.csvUrl)}`
            ];
            
            let response = null;
            let csvContent = null;
            
            // 프록시 서비스들을 순차적으로 시도
            for (let i = 0; i < proxyServices.length; i++) {
                try {
                    console.log(`Trying proxy service ${i + 1}:`, proxyServices[i]);
                    response = await fetch(proxyServices[i]);
                    
                    if (response.ok) {
                        if (proxyServices[i].includes('allorigins.win')) {
                            const data = await response.json();
                            csvContent = data.contents;
                        } else {
                            csvContent = await response.text();
                        }
                        console.log(`Proxy service ${i + 1} successful`);
                        break;
                    }
                } catch (proxyError) {
                    console.log(`Proxy service ${i + 1} failed:`, proxyError.message);
                    if (i === proxyServices.length - 1) {
                        throw new Error('All proxy services failed');
                    }
                }
            }
            
            if (!csvContent) {
                throw new Error('No valid response from any proxy service');
            }
            
            console.log('Raw response:', csvContent.substring(0, 200));
            
            // base64 데이터인지 확인하고 디코딩
            if (csvContent.startsWith('data:text/csv;base64,')) {
                console.log('Base64 encoded data detected, decoding...');
                const base64Data = csvContent.replace('data:text/csv;base64,', '');
                csvContent = atob(base64Data);
                console.log('Decoded CSV content (first 200 chars):', csvContent.substring(0, 200));
            }
            
            this.data = this.parseCSV(csvContent);
            this.updateDashboard();
            this.updateStatus('연결됨');
            
            // 🔍 데이터 분석 및 예측 검증 시스템 실행
            setTimeout(() => {
                this.performDataAnalysis();
            }, 1000);
            
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            this.showError('데이터 로드에 실패했습니다: ' + error.message);
            this.updateStatus('연결 실패');
        } finally {
            this.hideLoading();
        }
    }

    parseCSV(csvText) {
        console.log('Raw CSV text (first 200 chars):', csvText.substring(0, 200));
        
        const lines = csvText.trim().split('\n');
        console.log('Total lines:', lines.length);
        console.log('First line (headers):', lines[0]);
        console.log('Second line (sample data):', lines[1]);
        
        // 더 강력한 CSV 파싱 (따옴표 처리)
        const headers = this.parseCSVLine(lines[0]);
        console.log('Parsed headers:', headers);
        console.log('Headers length:', headers.length);
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue; // 빈 줄 건너뛰기
            
            const values = this.parseCSVLine(lines[i]);
            console.log(`Line ${i} values:`, values.slice(0, 5), '...'); // 처음 5개만 출력
            
            if (values.length >= 3) { // 최소한 날짜, 요일, 첫 번째 데이터가 있어야 함
                const row = {};
                
                // 첫 번째 컬럼이 날짜인지 확인
                const firstCol = values[0] || '';
                if (firstCol.includes('.') && firstCol.includes('2025')) {
                    // 날짜 형식을 변환 (2025. 2. 1 -> 2025-02-01)
                    const dateStr = firstCol.replace(/\s/g, '').replace(/\./g, '-');
                    const dateParts = dateStr.split('-');
                    if (dateParts.length >= 3) {
                        row.date = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
                        row.dayOfWeek = values[1] || '';
                        
                        // 시간별 데이터 추출 
                        // 데이터 구조: 날짜, 요일, 합계, 0시, 1시, 2시... 23시
                        // 합계는 인덱스 2, 시간별 데이터는 인덱스 3부터 시작
                        const totalValue = parseInt(values[2]) || 0; // 합계값
                        row.total = totalValue;
                        
                        // 0-23시 데이터 추출 (인덱스 3부터 26까지)
                        for (let h = 0; h < 24; h++) {
                            const hourKey = h.toString().padStart(2, '0');
                            const valueIndex = 3 + h; // 합계 다음부터 시간별 데이터
                            
                            if (valueIndex < values.length) {
                                const value = parseInt(values[valueIndex]) || 0;
                                row[`hour_${hourKey}`] = value;
                            } else {
                                row[`hour_${hourKey}`] = 0;
                            }
                        }
                        
                        data.push(row);
                        console.log(`Parsed row for ${row.date}:`, { 
                            date: row.date, 
                            dayOfWeek: row.dayOfWeek, 
                            total: row.total,
                            firstHours: `${row.hour_00 || 0}, ${row.hour_01 || 0}, ${row.hour_02 || 0}`,
                            lastHours: `${row.hour_21 || 0}, ${row.hour_22 || 0}, ${row.hour_23 || 0}`
                        });
                    }
                }
            }
        }
        
        console.log('Parsed data sample:', data.slice(0, 3));
        console.log('Total parsed rows:', data.length);
        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // 두 개의 따옴표는 하나의 따옴표로 처리
                    current += '"';
                    i += 2;
                    continue;
                } else {
                    // 따옴표 토글
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
            i++;
        }
        
        result.push(current.trim());
        return result;
    }

    updateDashboard() {
        this.updateStats();
        this.updateChart();
        this.updateLastUpdate();
    }

    updateStats() {
        if (this.data.length === 0) {
            console.log('No data available for stats');
            return;
        }

        console.log('Updating stats with data:', this.data.length, 'rows');

        // 최신 데이터 (오늘)
        const latestRow = this.data[this.data.length - 1];
        console.log('Latest row:', latestRow);
        
        // 오늘 총 출고량 (현재 시간까지의 실제 누적값)
        let todayTotal = 0;
        if (latestRow) {
            // 현재 시간대까지의 가장 높은 실제값 찾기
            const currentHour = new Date().getHours();
            for (let h = 23; h >= 0; h--) {
                const hourKey = `hour_${h.toString().padStart(2, '0')}`;
                const value = parseInt(latestRow[hourKey]) || 0;
                if (value > 0) {
                    todayTotal = value;
                    break;
                }
            }
            // 실제값이 없으면 합계값 사용
            if (todayTotal === 0) {
                todayTotal = latestRow.total || 0;
            }
        }
        
        // 어제 마지막 출고량 (실제 데이터 중 마지막 값)
        let yesterdayLast = 0;
        if (this.data.length > 1) {
            const yesterdayRow = this.data[this.data.length - 2];
            if (yesterdayRow) {
                // 23시부터 역순으로 검색해서 실제 데이터가 있는 마지막 시간의 값 찾기
                for (let h = 23; h >= 0; h--) {
                    const hourKey = `hour_${h.toString().padStart(2, '0')}`;
                    const value = parseInt(yesterdayRow[hourKey]) || 0;
                    if (value > 0) {
                        yesterdayLast = value;
                        break;
                    }
                }
                // 실제값이 없으면 합계값 사용
                if (yesterdayLast === 0) {
                    yesterdayLast = yesterdayRow.total || 0;
                }
            }
        }

        // 이전 3일 데이터로 평균 출고량 계산
        const recentDays = this.data.slice(-4, -1); // 오늘 제외한 최근 3일
        let dailyTotals = []; // 각 일별 총 출고량
        let hourlyIncrements = []; // 시간당 증가량
        
        recentDays.forEach(row => {
            // 각 일별 최종 출고량 (실제 데이터 중 최대값)
            let dailyMax = 0;
            for (let h = 23; h >= 0; h--) {
                const hourKey = `hour_${h.toString().padStart(2, '0')}`;
                const value = parseInt(row[hourKey]) || 0;
                if (value > 0) {
                    dailyMax = value;
                    break;
                }
            }
            // 실제값이 없으면 합계값 사용
            if (dailyMax === 0) {
                dailyMax = row.total || 0;
            }
            if (dailyMax > 0) {
                dailyTotals.push(dailyMax);
            }
            
            // 시간당 증가량 계산
            for (let h = 1; h < 24; h++) {
                const currentHourKey = `hour_${h.toString().padStart(2, '0')}`;
                const prevHourKey = `hour_${(h-1).toString().padStart(2, '0')}`;
                const currentValue = parseInt(row[currentHourKey]) || 0;
                const prevValue = parseInt(row[prevHourKey]) || 0;
                
                if (currentValue > 0 && prevValue > 0 && currentValue > prevValue) {
                    hourlyIncrements.push(currentValue - prevValue);
                }
            }
        });
        
        // 3일 평균 출고수량
        const avgDaily = dailyTotals.length > 0 ? 
            Math.round(dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length) : 0;
        
        // 평균 시간당 출고량
        const avgHourly = hourlyIncrements.length > 0 ? 
            Math.round(hourlyIncrements.reduce((a, b) => a + b, 0) / hourlyIncrements.length) : 0;

        console.log('Stats calculated:', { todayTotal, yesterdayLast, avgDaily, avgHourly });

        // UI 업데이트
        document.getElementById('today-total').textContent = todayTotal.toLocaleString();
        document.getElementById('yesterday-last').textContent = yesterdayLast.toLocaleString();
        document.getElementById('max-hourly').textContent = avgDaily.toLocaleString();
        document.getElementById('avg-hourly').textContent = avgHourly.toLocaleString();
    }


    initChart() {
        try {
            console.log('Initializing chart...');
            console.log('Chart.js available:', typeof Chart !== 'undefined');
            
            const chartElement = document.getElementById(this.chartId);
            console.log('Chart element found:', chartElement !== null);
            
            if (!chartElement) {
                throw new Error(`Chart element with id '${this.chartId}' not found`);
            }
            
            if (typeof Chart === 'undefined') {
                throw new Error('Chart.js is not loaded');
            }
            
            const ctx = chartElement.getContext('2d');
            console.log('Canvas context created:', ctx !== null);
            
            // Chart.js 플러그인 등록 (v4 호환성)
            console.log('ChartDataLabels 플러그인 로드 확인:', typeof ChartDataLabels);
            
            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: '오늘',
                        data: [],
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        spanGaps: true,
                        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                        pointBorderColor: 'rgba(59, 130, 246, 1)',
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        datalabels: {
                            display: true
                        },
                        segment: {
                            borderColor: function(ctx) {
                                const dataset = ctx.chart.data.datasets[ctx.datasetIndex];
                                const isPredicted = dataset.isPredicted && dataset.isPredicted[ctx.p1DataIndex];
                                return isPredicted ? 'rgba(249, 115, 22, 1)' : 'rgba(59, 130, 246, 1)';
                            },
                            borderDash: function(ctx) {
                                const dataset = ctx.chart.data.datasets[ctx.datasetIndex];
                                const isPredicted = dataset.isPredicted && dataset.isPredicted[ctx.p1DataIndex];
                                return isPredicted ? [5, 5] : []; // 예측 구간은 점선
                            }
                        }
                    }, {
                        label: '어제',
                        data: [],
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderColor: 'rgba(239, 68, 68, 1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        spanGaps: true,
                        pointBackgroundColor: 'rgba(239, 68, 68, 1)',
                        pointBorderColor: 'rgba(239, 68, 68, 1)',
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        datalabels: {
                            display: function(context) {
                                return context.dataIndex === 23;
                            }
                        }
                    }, {
                        label: '그저께',
                        data: [],
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        spanGaps: true,
                        pointBackgroundColor: 'rgba(34, 197, 94, 1)',
                        pointBorderColor: 'rgba(34, 197, 94, 1)',
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        datalabels: {
                            display: function(context) {
                                return context.dataIndex === 23;
                            }
                        }
                    }, {
                        label: '시간별 증감량',
                        type: 'bar',
                        data: [],
                        backgroundColor: function(ctx) {
                            const dataset = ctx.chart.data.datasets[0]; // 오늘 데이터셋 참조
                            const isPredicted = dataset.isPredicted && dataset.isPredicted[ctx.dataIndex];
                            return isPredicted ? 'rgba(249, 115, 22, 0.7)' : 'rgba(59, 130, 246, 0.7)';
                        },
                        borderColor: function(ctx) {
                            const dataset = ctx.chart.data.datasets[0]; // 오늘 데이터셋 참조
                            const isPredicted = dataset.isPredicted && dataset.isPredicted[ctx.dataIndex];
                            return isPredicted ? 'rgba(249, 115, 22, 1)' : 'rgba(59, 130, 246, 1)';
                        },
                        borderWidth: 1,
                        yAxisID: 'y', // 왼쪽 Y축(누적 출고량) 사용
                        order: 2, // 선 그래프보다 뒤에 렌더링
                        barThickness: 'flex',
                        maxBarThickness: 20, // 막대 두께 줄임
                        categoryPercentage: 0.6, // 카테고리 폭 조정
                        barPercentage: 0.8, // 막대 폭 조정
                        datalabels: {
                            display: true,
                            formatter: function(value) {
                                if (value === null || value === undefined || isNaN(value) || value === 0) return '';
                                const numValue = Number(value);
                                if (isNaN(numValue)) return '';
                                return numValue.toLocaleString();
                            }
                        }
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if (!context.parsed || context.parsed.y === null || context.parsed.y === undefined) {
                                        return '';
                                    }
                                    const value = context.parsed.y;
                                    const isPredicted = context.dataset.isPredicted && context.dataset.isPredicted[context.dataIndex];
                                    const suffix = isPredicted ? '개 (예측)' : '개';
                                    return context.dataset.label + ': ' + value.toLocaleString() + suffix;
                                }
                            }
                        },
                        datalabels: {
                            display: function(context) {
                                const value = context.dataset.data[context.dataIndex];
                                
                                // 값이 없거나 0 이하면 라벨 숨김
                                if (value === null || value === undefined || value <= 0) {
                                    return false;
                                }
                                
                                // 오늘 데이터 (dataset 0): 모든 시간대 라벨 표시
                                if (context.datasetIndex === 0) {
                                    return true;
                                }
                                
                                // 어제/그저께 (datasets 1,2): 라벨 표시 안함 (가독성을 위해)
                                if (context.datasetIndex === 1 || context.datasetIndex === 2) {
                                    return false;
                                }
                                
                                // 막대 그래프 (dataset 3): 모든 값 표시
                                if (context.datasetIndex === 3) {
                                    return true;
                                }
                                
                                return false;
                            },
                            color: function(context) {
                                // 오늘 데이터: 예측 여부에 따라 색상 변경
                                if (context.datasetIndex === 0) {
                                    const isPredicted = context.dataset.isPredicted && context.dataset.isPredicted[context.dataIndex];
                                    return isPredicted ? '#f97316' : '#3b82f6'; // 주황/파랑
                                }
                                // 어제 데이터: 빨강
                                if (context.datasetIndex === 1) {
                                    return '#ef4444';
                                }
                                // 그저께 데이터: 초록
                                if (context.datasetIndex === 2) {
                                    return '#22c55e';
                                }
                                // 막대그래프: 예측 여부에 따라 색상 변경
                                if (context.datasetIndex === 3) {
                                    const todayDataset = context.chart.data.datasets[0];
                                    const isPredicted = todayDataset.isPredicted && todayDataset.isPredicted[context.dataIndex];
                                    return isPredicted ? '#f97316' : '#3b82f6';
                                }
                                return '#000000';
                            },
                            backgroundColor: function(context) {
                                // 라벨 배경색 (가독성을 위해)
                                return 'rgba(255, 255, 255, 0.8)';
                            },
                            borderColor: function(context) {
                                // 오늘 데이터: 예측 여부에 따라 테두리 색상
                                if (context.datasetIndex === 0) {
                                    const isPredicted = context.dataset.isPredicted && context.dataset.isPredicted[context.dataIndex];
                                    return isPredicted ? '#f97316' : '#3b82f6';
                                }
                                if (context.datasetIndex === 1) return '#ef4444';
                                if (context.datasetIndex === 2) return '#22c55e';
                                if (context.datasetIndex === 3) {
                                    const todayDataset = context.chart.data.datasets[0];
                                    const isPredicted = todayDataset.isPredicted && todayDataset.isPredicted[context.dataIndex];
                                    return isPredicted ? '#f97316' : '#3b82f6';
                                }
                                return '#000000';
                            },
                            borderRadius: 4,
                            borderWidth: 1,
                            font: {
                                weight: 'bold',
                                size: function(context) {
                                    return context.datasetIndex === 3 ? 9 : 10;
                                }
                            },
                            formatter: function(value, context) {
                                if (value === null || value === undefined || isNaN(value) || value === 0) return '';
                                
                                // 숫자로 변환하여 안전하게 처리
                                const numValue = Number(value);
                                if (isNaN(numValue)) return '';
                                
                                if (context.datasetIndex === 3) {
                                    // 막대그래프: 값만 표시
                                    return numValue.toLocaleString();
                                } else {
                                    // 선그래프: 예측값에 * 표시
                                    const isPredicted = context.dataset.isPredicted && context.dataset.isPredicted[context.dataIndex];
                                    return isPredicted ? numValue.toLocaleString() + '*' : numValue.toLocaleString();
                                }
                            },
                            padding: {
                                top: 2,
                                bottom: 2,
                                left: 4,
                                right: 4
                            },
                            anchor: 'end',
                            align: 'top'
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: '시간',
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                }
                            },
                            ticks: {
                                font: {
                                    size: 12
                                },
                                maxRotation: 0,
                                minRotation: 0
                            },
                            grid: {
                                lineWidth: 1,
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                        y: {
                            display: true,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: '누적 출고량',
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                }
                            },
                            ticks: {
                                font: {
                                    size: 14
                                },
                                padding: 10,
                                callback: function(value) {
                                    if (value === null || value === undefined || isNaN(value)) return '';
                                    const numValue = Number(value);
                                    if (isNaN(numValue)) return '';
                                    return numValue.toLocaleString();
                                }
                            },
                            grid: {
                                lineWidth: 1,
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        }
                    }
                }
            });
            
            console.log('Chart initialized successfully:', this.chart !== null);
        } catch (error) {
            console.error('Chart initialization failed:', error);
            this.showError('차트 초기화에 실패했습니다: ' + error.message);
        }
    }

    updateChart() {
        if (!this.chart) {
            console.error('Chart update failed: Chart not initialized');
            return;
        }
        
        if (this.data.length === 0) {
            console.log('Chart update skipped - no data available');
            return;
        }

        console.log('Updating chart with data length:', this.data.length);

        const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
        
        // 최근 3일 데이터 가져오기
        const recentData = this.data.slice(-3);
        console.log('Recent data for chart:', recentData.map(d => ({ date: d.date, dayOfWeek: d.dayOfWeek })));
        
        const todayData = recentData.length > 0 ? recentData[recentData.length - 1] : {};
        const yesterdayData = recentData.length > 1 ? recentData[recentData.length - 2] : {};
        const dayBeforeYesterdayData = recentData.length > 2 ? recentData[recentData.length - 3] : {};

        console.log('Chart data objects:');
        console.log('Today data keys:', Object.keys(todayData).filter(k => k.startsWith('hour_')).slice(0, 5));
        console.log('Yesterday data keys:', Object.keys(yesterdayData).filter(k => k.startsWith('hour_')).slice(0, 5));

        // 시간별 데이터 배열 생성 
        // 사진 패턴 분석: 0시에 높은 값에서 시작, 1시에 낮은 값으로 급락 후 점진적 증가
        // 이는 0시가 전날 종료값, 1-23시가 당일 시간별 누적값을 나타냄
        const todayValues = hours.map(h => {
            const hourKey = `hour_${h}`;
            const value = parseInt(todayData[hourKey]);
            return (value && value > 0) ? value : null;
        });

        // 오늘 데이터의 예측값 계산 (누락된 시간대에 대해)
        const todayPredictionResult = this.addPredictiveValues(todayValues);
        const todayValuesWithPrediction = todayPredictionResult.values;
        
        const yesterdayValues = hours.map(h => {
            const hourKey = `hour_${h}`;
            const value = parseInt(yesterdayData[hourKey]);
            return (value && value > 0) ? value : null;
        });
        
        const dayBeforeYesterdayValues = hours.map(h => {
            const hourKey = `hour_${h}`;
            const value = parseInt(dayBeforeYesterdayData[hourKey]);
            return (value && value > 0) ? value : null;
        });

        console.log('Chart data arrays:');
        console.log('Today values:', todayValues.slice(0, 10));
        console.log('Yesterday values:', yesterdayValues.slice(0, 10));
        console.log('Day before yesterday values:', dayBeforeYesterdayValues.slice(0, 10));
        
        // 최소한 하나의 데이터셋에 0이 아닌 값이 있는지 확인
        const totalValues = [...todayValues, ...yesterdayValues, ...dayBeforeYesterdayValues];
        const nonZeroCount = totalValues.filter(v => v > 0).length;
        console.log('Non-zero values count:', nonZeroCount);

        try {
            // 시간별 증감량 계산
            const todayIncrements = this.calculateHourlyIncrements(todayValuesWithPrediction, todayPredictionResult.isPredicted);
            
            console.log(`막대그래프 데이터:`, todayIncrements.filter(v => v !== null).slice(0, 10));
            
            this.chart.data.labels = hours.map(h => h + ':00');
            this.chart.data.datasets[0].data = todayValuesWithPrediction;
            this.chart.data.datasets[1].data = yesterdayValues;
            this.chart.data.datasets[2].data = dayBeforeYesterdayValues;
            this.chart.data.datasets[3].data = todayIncrements; // 막대그래프 데이터
            
            // 차트 데이터셋 레이블 업데이트 및 예측값 정보 추가
            if (todayData.date) {
                this.chart.data.datasets[0].label = `오늘 (${todayData.date})`;
                this.chart.data.datasets[0].isPredicted = todayPredictionResult.isPredicted;
            }
            if (yesterdayData.date) {
                this.chart.data.datasets[1].label = `어제 (${yesterdayData.date})`;
            }
            if (dayBeforeYesterdayData.date) {
                this.chart.data.datasets[2].label = `그저께 (${dayBeforeYesterdayData.date})`;
            }
            
            this.chart.update();
            console.log('Chart updated successfully');
        } catch (error) {
            console.error('Chart update failed:', error);
            this.showError('차트 업데이트 실패: ' + error.message);
        }
    }


    updateLastUpdate() {
        document.getElementById('last-update').textContent = new Date().toLocaleString('ko-KR');
    }

    updateStatus(status) {
        const statusBadge = document.getElementById('status-badge');
        statusBadge.textContent = status;
        statusBadge.className = status === '연결됨' ? 'badge badge-success' : 'badge badge-error';
    }

    showLoading() {
        document.getElementById('loading-modal').showModal();
    }

    hideLoading() {
        document.getElementById('loading-modal').close();
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        document.getElementById('error-modal').showModal();
    }

    async refreshData() {
        await this.loadData();
    }

    startAutoRefresh(interval = 30000) {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.refreshData();
        }, interval);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // 현실적 데이터 기반 예측 함수
    addPredictiveValues(values) {
        const result = [...values];
        const isPredicted = new Array(values.length).fill(false);
        
        // 실제 데이터가 있는 마지막 인덱스 찾기
        let lastValidIndex = -1;
        for (let i = values.length - 1; i >= 0; i--) {
            if (values[i] !== null && values[i] !== undefined && values[i] > 0) {
                lastValidIndex = i;
                break;
            }
        }

        if (lastValidIndex === -1) return { values: result, isPredicted };

        // 마지막 유효값부터 23:00까지 예측값 생성
        if (lastValidIndex < 23) {
            const lastValue = values[lastValidIndex];
            
            console.log('=== 현실적 데이터 기반 예측 시작 ===');
            console.log('마지막 유효 시간:', lastValidIndex + ':00');
            console.log('마지막 유효값:', lastValue);
            console.log('전체 과거 데이터 개수:', this.data.length);
            
            // 과거 데이터 샘플 확인
            if (this.data.length > 0) {
                console.log('과거 데이터 샘플 (첫 번째 행):', this.data[0]);
            }
            
            let previousValue = lastValue;
            for (let i = lastValidIndex + 1; i <= 23; i++) {
                // 🚀 새로운 단순화된 예측값 계산
                const predictedValue = this.calculateSimplifiedPrediction({
                    targetHour: i,
                    previousValue: previousValue
                });
                
                console.log(`${i}:00 예측값: ${Math.round(predictedValue)} (이전: ${previousValue})`);
                
                result[i] = Math.round(predictedValue);
                isPredicted[i] = true;
                previousValue = result[i];
            }
            
            console.log('=== 현실적 데이터 기반 예측 완료 ===');
            
            // 예측 결과 요약 출력
            console.log('\n📊 예측 결과 요약:');
            const predictionSummary = Array.from({length: 23 - lastValidIndex}, (_, i) => {
                const hour = lastValidIndex + i + 1;
                return {
                    시간: `${hour}:00`,
                    예측값: result[hour] ? result[hour].toLocaleString() : '-',
                    상태: isPredicted[hour] ? '예측' : '실제'
                };
            });
            console.table(predictionSummary);
            
            // 예측값 검증 테스트 실행
            setTimeout(() => {
                this.testPredictionValues();
            }, 1000);
        }

        return { values: result, isPredicted };
    }
    
    // 현실적 예측값 계산 - 각 시간대별 절대값 기준 유사 사례 분석
    calculateRealisticPrediction(params) {
        const { targetHour, previousPredictedValue } = params;
        
        console.log(`\n=== ${targetHour}시 예측 시작 ===`);
        
        // 1. 해당 시간대의 과거 유사 값들 찾기
        const similarCases = this.findSimilarValueCasesForHour(targetHour, previousPredictedValue);
        console.log(`${targetHour}시 ${previousPredictedValue}와 유사한 과거 사례:`, similarCases.length, '건');
        
        if (similarCases.length === 0) {
            // 유사 사례가 없으면 최소 증가만 적용
            const minIncrease = previousPredictedValue * 0.005; // 0.5% 증가
            return previousPredictedValue + minIncrease;
        }
        
        // 2. 유사 사례들의 다음 시간 값들 분석
        const nextHourValues = this.extractNextHourValues(similarCases, targetHour);
        console.log(`${targetHour}시 유사 사례들의 다음 시간 값들:`, nextHourValues);
        
        // 3. 기본 예측값 계산 (중간값 사용)
        const basePrediction = this.calculateBasePrediction(nextHourValues);
        console.log(`${targetHour}시 기본 예측값:`, basePrediction);
        
        // 4. 요일별 보정 계수 적용
        const dayOfWeekAdjustment = this.getDayOfWeekAdjustment(targetHour);
        console.log(`요일별 보정 (${this.getDayName()}):`, dayOfWeekAdjustment);
        
        // 5. 월중 시기별 보정 계수 적용
        const monthPeriodAdjustment = this.getMonthPeriodAdjustment();
        console.log(`월중 시기별 보정:`, monthPeriodAdjustment);
        
        // 6. 시간대별 증감 추이 보정
        const timeBasedAdjustment = this.getTimeBasedAdjustment(targetHour);
        console.log(`시간대별 증감 추이 보정:`, timeBasedAdjustment);
        
        // 7. 최근 일주일 출고 추이 보정
        const weeklyTrendAdjustment = this.getWeeklyTrendAdjustment();
        console.log(`최근 일주일 추이 보정:`, weeklyTrendAdjustment);
        
        // 8. 최종 예측값 계산 (보정 계수들을 현실적 범위로 제한)
        const limitedDayAdj = Math.max(0.95, Math.min(dayOfWeekAdjustment, 1.10)); // ±10% 제한
        const limitedMonthAdj = Math.max(0.98, Math.min(monthPeriodAdjustment, 1.05)); // ±5% 제한
        const limitedTimeAdj = Math.max(0.98, Math.min(timeBasedAdjustment, 1.05)); // ±5% 제한
        const limitedWeeklyAdj = Math.max(0.90, Math.min(weeklyTrendAdjustment, 1.10)); // ±10% 제한
        
        console.log(`제한된 보정 계수 - 요일: ${limitedDayAdj.toFixed(3)}, 월: ${limitedMonthAdj.toFixed(3)}, 시간: ${limitedTimeAdj.toFixed(3)}, 주간: ${limitedWeeklyAdj.toFixed(3)}`);
        
        let finalPrediction = basePrediction * limitedDayAdj * limitedMonthAdj * limitedTimeAdj * limitedWeeklyAdj;
        
        // 9. 현실적 상한선 적용 (최근 일주일 평균 기준)
        const recentWeeklyAverage = this.getRecentWeeklyAverage();
        const realisticMaxLimit = recentWeeklyAverage * 1.5; // 주간 평균의 1.5배 이하
        
        console.log(`현실성 검증 - 주간평균: ${Math.round(recentWeeklyAverage)}, 상한선: ${Math.round(realisticMaxLimit)}`);
        
        if (finalPrediction > realisticMaxLimit) {
            console.log(`예측값 ${Math.round(finalPrediction)}이 상한선 ${Math.round(realisticMaxLimit)}을 초과하여 조정됨`);
            finalPrediction = realisticMaxLimit;
        }
        
        // 10. 누적 원칙 보장 - 이전값보다 반드시 증가
        const minValue = previousPredictedValue * 1.002; // 최소 0.2% 증가
        finalPrediction = Math.max(finalPrediction, minValue);
        
        console.log(`최종 예측: ${Math.round(finalPrediction)} (기본: ${basePrediction}, 상한선적용후)`);
        
        return finalPrediction;
    }
    
    // 특정 시간대에서 유사한 값을 가진 과거 사례 찾기 (매우 정밀한 범위)
    findSimilarValueCasesForHour(targetHour, referenceValue) {
        const similarCases = [];
        const tolerance = referenceValue * 0.0005; // ±0.05% 범위로 매우 정밀하게
        
        console.log(`${targetHour}시 ${referenceValue}에서 ±${Math.round(tolerance)} 범위로 검색`);
        
        this.data.forEach(row => {
            if (!row.date) return;
            
            const hourKey = `hour_${targetHour.toString().padStart(2, '0')}`;
            const valueAtHour = parseInt(row[hourKey]) || 0;
            
            // 매우 정밀한 범위 내의 데이터만 선택
            if (valueAtHour > 0 && 
                Math.abs(valueAtHour - referenceValue) <= tolerance) {
                
                // 해당 날짜의 모든 시간대 데이터 포함
                const caseData = { 
                    date: row.date, 
                    targetHourValue: valueAtHour,
                    similarity: Math.abs(valueAtHour - referenceValue)
                };
                
                for (let h = 0; h <= 23; h++) {
                    const hKey = `hour_${h.toString().padStart(2, '0')}`;
                    caseData[`hour_${h}`] = parseInt(row[hKey]) || 0;
                }
                similarCases.push(caseData);
            }
        });
        
        // 매우 정밀한 검색으로 사례가 없으면 범위를 점진적으로 확대
        if (similarCases.length === 0) {
            const expandedTolerance = referenceValue * 0.005; // ±0.5%로 확대
            console.log(`정밀 검색 실패, ±${Math.round(expandedTolerance)} 범위로 재검색`);
            
            this.data.forEach(row => {
                if (!row.date) return;
                
                const hourKey = `hour_${targetHour.toString().padStart(2, '0')}`;
                const valueAtHour = parseInt(row[hourKey]) || 0;
                
                if (valueAtHour > 0 && 
                    Math.abs(valueAtHour - referenceValue) <= expandedTolerance) {
                    
                    const caseData = { 
                        date: row.date, 
                        targetHourValue: valueAtHour,
                        similarity: Math.abs(valueAtHour - referenceValue)
                    };
                    
                    for (let h = 0; h <= 23; h++) {
                        const hKey = `hour_${h.toString().padStart(2, '0')}`;
                        caseData[`hour_${h}`] = parseInt(row[hKey]) || 0;
                    }
                    similarCases.push(caseData);
                }
            });
        }
        
        // 여전히 사례가 없으면 최대 5% 범위까지
        if (similarCases.length === 0) {
            const maxTolerance = referenceValue * 0.05; // ±5%
            console.log(`확대 검색 실패, ±${Math.round(maxTolerance)} 범위로 최종 검색`);
            
            this.data.forEach(row => {
                if (!row.date) return;
                
                const hourKey = `hour_${targetHour.toString().padStart(2, '0')}`;
                const valueAtHour = parseInt(row[hourKey]) || 0;
                
                if (valueAtHour > 0 && 
                    Math.abs(valueAtHour - referenceValue) <= maxTolerance) {
                    
                    const caseData = { 
                        date: row.date, 
                        targetHourValue: valueAtHour,
                        similarity: Math.abs(valueAtHour - referenceValue)
                    };
                    
                    for (let h = 0; h <= 23; h++) {
                        const hKey = `hour_${h.toString().padStart(2, '0')}`;
                        caseData[`hour_${h}`] = parseInt(row[hKey]) || 0;
                    }
                    similarCases.push(caseData);
                }
            });
        }
        
        // 유사도 순으로 정렬 (더 비슷한 값 우선)
        similarCases.sort((a, b) => a.similarity - b.similarity);
        
        console.log(`최종 검색 결과: ${similarCases.length}건 (평균 차이: ${similarCases.length > 0 ? Math.round(similarCases.reduce((sum, c) => sum + c.similarity, 0) / similarCases.length) : 0})`);
        
        return similarCases;
    }
    
    // 유사 사례들의 다음 시간 값들 추출
    extractNextHourValues(similarCases, currentHour) {
        const nextHour = currentHour + 1;
        if (nextHour > 23) return [];
        
        const nextHourValues = [];
        
        similarCases.forEach(caseData => {
            const nextValue = caseData[`hour_${nextHour}`];
            if (nextValue > 0) {
                nextHourValues.push({
                    value: nextValue,
                    date: caseData.date,
                    similarity: caseData.similarity
                });
            }
        });
        
        return nextHourValues;
    }
    
    // 기본 예측값 계산 (보수적 접근 - 25번째 백분위수 사용)
    calculateBasePrediction(nextHourValues) {
        if (nextHourValues.length === 0) return 0;
        
        // 값들만 추출하여 정렬
        const values = nextHourValues.map(item => item.value).sort((a, b) => a - b);
        
        // 25번째 백분위수 계산 (더 보수적인 예측)
        const q1Index = Math.floor(values.length * 0.25);
        const q1 = values[q1Index];
        
        // 중간값도 계산
        const medianIndex = Math.floor(values.length / 2);
        const median = values.length % 2 === 0 
            ? (values[medianIndex - 1] + values[medianIndex]) / 2
            : values[medianIndex];
        
        // 25번째 백분위수와 중간값 중 더 보수적인 값 선택
        const conservativeValue = Math.min(q1, median);
        
        console.log(`예측값 계산: Q1=${q1}, 중간값=${median}, 선택값=${conservativeValue}`);
        
        return conservativeValue;
    }
    
    // 시간대별 증감 추이 보정
    getTimeBasedAdjustment(targetHour) {
        // 과거 데이터에서 해당 시간대의 일반적인 증감 패턴 분석
        const hourlyGrowthRates = [];
        
        this.data.forEach(row => {
            if (!row.date) return;
            
            const currentHourKey = `hour_${targetHour.toString().padStart(2, '0')}`;
            const prevHourKey = `hour_${(targetHour-1).toString().padStart(2, '0')}`;
            
            const currentValue = parseInt(row[currentHourKey]) || 0;
            const prevValue = parseInt(row[prevHourKey]) || 0;
            
            if (currentValue > 0 && prevValue > 0) {
                const growthRate = currentValue / prevValue;
                // 극단적인 값들 필터링 (0.5배 ~ 2배 범위만)
                if (growthRate >= 0.5 && growthRate <= 2.0) {
                    hourlyGrowthRates.push(growthRate);
                }
            }
        });
        
        if (hourlyGrowthRates.length === 0) {
            return 1.0; // 기본값
        }
        
        // 중간값 사용
        hourlyGrowthRates.sort((a, b) => a - b);
        const medianIndex = Math.floor(hourlyGrowthRates.length / 2);
        const medianGrowthRate = hourlyGrowthRates.length % 2 === 0 
            ? (hourlyGrowthRates[medianIndex - 1] + hourlyGrowthRates[medianIndex]) / 2
            : hourlyGrowthRates[medianIndex];
        
        // 극단적 보정 방지 (0.9 ~ 1.15 범위)
        return Math.max(0.9, Math.min(medianGrowthRate, 1.15));
    }
    
    // 요일별 보정 계수
    getDayOfWeekAdjustment(targetHour) {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0: 일요일, 1: 월요일, ...
        
        // 과거 데이터에서 해당 요일의 시간대별 평균 활동 수준 분석
        const sameDayData = this.data.filter(row => {
            if (!row.date) return false;
            const rowDate = new Date(row.date);
            return rowDate.getDay() === dayOfWeek;
        });
        
        if (sameDayData.length === 0) {
            return 1.0; // 기본값
        }
        
        // 해당 시간대의 평균 활동도 계산
        const hourlyActivities = [];
        sameDayData.forEach(row => {
            const currentValue = parseInt(row[`hour_${targetHour.toString().padStart(2, '0')}`]) || 0;
            const prevValue = parseInt(row[`hour_${(targetHour-1).toString().padStart(2, '0')}`]) || 0;
            
            if (currentValue > 0 && prevValue > 0) {
                hourlyActivities.push(currentValue / prevValue);
            }
        });
        
        if (hourlyActivities.length === 0) {
            return 1.0;
        }
        
        const avgActivity = hourlyActivities.reduce((a, b) => a + b, 0) / hourlyActivities.length;
        
        // 1.0을 기준으로 정규화하되 극단적 값 방지
        return Math.max(0.8, Math.min(avgActivity, 1.3));
    }
    
    // 월중 시기별 보정 계수 (월초/중순/말)
    getMonthPeriodAdjustment() {
        const today = new Date();
        const dayOfMonth = today.getDate();
        
        // 월중 시기 구분
        let period = 'mid';
        if (dayOfMonth <= 10) {
            period = 'early'; // 월초
        } else if (dayOfMonth >= 21) {
            period = 'late';  // 월말
        }
        
        // 과거 데이터에서 해당 시기의 평균 활동 수준 분석
        const periodData = this.data.filter(row => {
            if (!row.date) return false;
            const rowDate = new Date(row.date);
            const rowDay = rowDate.getDate();
            
            if (period === 'early') return rowDay <= 10;
            if (period === 'late') return rowDay >= 21;
            return rowDay > 10 && rowDay < 21;
        });
        
        if (periodData.length === 0) {
            return 1.0;
        }
        
        // 해당 시기의 평균 성장률 계산
        const growthRates = [];
        periodData.forEach(row => {
            let maxValue = 0;
            for (let h = 0; h <= 23; h++) {
                const value = parseInt(row[`hour_${h.toString().padStart(2, '0')}`]) || 0;
                if (value > maxValue) maxValue = value;
            }
            if (maxValue > 0) {
                growthRates.push(maxValue);
            }
        });
        
        if (growthRates.length === 0) {
            return 1.0;
        }
        
        const avgGrowth = growthRates.reduce((a, b) => a + b, 0) / growthRates.length;
        const overallAvg = this.calculateOverallAverage();
        
        if (overallAvg === 0) return 1.0;
        
        const adjustment = avgGrowth / overallAvg;
        
        // 극단적 값 방지 (0.7 ~ 1.4 범위)
        return Math.max(0.7, Math.min(adjustment, 1.4));
    }
    
    // 전체 데이터의 평균값 계산
    calculateOverallAverage() {
        const allMaxValues = [];
        
        this.data.forEach(row => {
            let maxValue = 0;
            for (let h = 0; h <= 23; h++) {
                const value = parseInt(row[`hour_${h.toString().padStart(2, '0')}`]) || 0;
                if (value > maxValue) maxValue = value;
            }
            if (maxValue > 0) {
                allMaxValues.push(maxValue);
            }
        });
        
        if (allMaxValues.length === 0) return 0;
        
        return allMaxValues.reduce((a, b) => a + b, 0) / allMaxValues.length;
    }
    
    // 최근 일주일 평균 출고량 계산
    getRecentWeeklyAverage() {
        if (this.data.length < 7) {
            return 500; // 기본값
        }
        
        const recentWeekData = this.data.slice(-7);
        const dailyTotals = [];
        
        recentWeekData.forEach(row => {
            let maxValue = 0;
            for (let h = 0; h <= 23; h++) {
                const value = parseInt(row[`hour_${h.toString().padStart(2, '0')}`]) || 0;
                if (value > maxValue) maxValue = value;
            }
            if (maxValue > 0) {
                dailyTotals.push(maxValue);
            }
        });
        
        if (dailyTotals.length === 0) return 500;
        
        return dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length;
    }
    
    // 최근 일주일 출고 추이 보정
    getWeeklyTrendAdjustment() {
        if (this.data.length < 7) {
            return 1.0; // 데이터가 부족하면 보정 없음
        }
        
        // 최근 7일 데이터 가져오기
        const recentWeekData = this.data.slice(-7);
        const dailyTotals = [];
        
        recentWeekData.forEach(row => {
            // 각 일의 최종 출고량 계산
            let maxValue = 0;
            for (let h = 0; h <= 23; h++) {
                const value = parseInt(row[`hour_${h.toString().padStart(2, '0')}`]) || 0;
                if (value > maxValue) maxValue = value;
            }
            if (maxValue > 0) {
                dailyTotals.push(maxValue);
            }
        });
        
        if (dailyTotals.length < 3) {
            return 1.0;
        }
        
        // 최근 3일과 이전 3일 비교
        const recentHalf = dailyTotals.slice(-3); // 최근 3일
        const previousHalf = dailyTotals.slice(-6, -3); // 이전 3일
        
        if (previousHalf.length < 3) {
            return 1.0;
        }
        
        const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
        const previousAvg = previousHalf.reduce((a, b) => a + b, 0) / previousHalf.length;
        
        // 추이 계산
        const trendRatio = recentAvg / previousAvg;
        
        console.log('일주일 추이 분석:', {
            최근3일평균: Math.round(recentAvg),
            이전3일평균: Math.round(previousAvg),
            추이비율: trendRatio.toFixed(3)
        });
        
        // 급격한 변화 방지 (0.85 ~ 1.15 범위)
        return Math.max(0.85, Math.min(trendRatio, 1.15));
    }
    
    // 요일 이름 반환
    getDayName() {
        const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        return days[new Date().getDay()];
    }
    
    // 🔍 데이터 분석 및 예측 검증 시스템
    performDataAnalysis() {
        console.log('\n🔍 === 데이터 분석 및 예측 검증 시스템 시작 ===');
        
        // 1. 전체 데이터 패턴 분석
        this.analyzeOverallDataPatterns();
        
        // 2. 시간별 증가 패턴 분석
        this.analyzeHourlyGrowthPatterns();
        
        // 3. 예측 정확도 역산 테스트
        this.validatePredictionAccuracy();
        
        // 4. 새로운 단순화된 예측 방법 테스트
        this.testSimplifiedPrediction();
    }
    
    // 전체 데이터 패턴 분석
    analyzeOverallDataPatterns() {
        console.log('\n📊 === 전체 데이터 패턴 분석 ===');
        
        if (this.data.length < 3) {
            console.log('❌ 분석에 충분한 데이터가 없습니다');
            return;
        }
        
        // 최근 7일 일별 최종값 분석
        const recentDays = this.data.slice(-7);
        const dailyTotals = [];
        const hourlyAverages = Array(24).fill(0);
        const hourlyGrowthRates = Array(23).fill(0);
        
        recentDays.forEach(row => {
            let maxValue = 0;
            const dayValues = [];
            
            for (let h = 0; h <= 23; h++) {
                const value = parseInt(row[`hour_${h.toString().padStart(2, '0')}`]) || 0;
                dayValues.push(value);
                if (value > maxValue) maxValue = value;
            }
            
            if (maxValue > 0) {
                dailyTotals.push(maxValue);
                
                // 시간별 평균 계산
                dayValues.forEach((value, hour) => {
                    hourlyAverages[hour] += value;
                });
                
                // 시간별 증가율 계산
                for (let h = 0; h < 23; h++) {
                    if (dayValues[h] > 0) {
                        const growthRate = (dayValues[h + 1] - dayValues[h]) / dayValues[h];
                        hourlyGrowthRates[h] += growthRate;
                    }
                }
            }
        });
        
        // 평균 계산
        const avgDaily = dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length;
        hourlyAverages.forEach((sum, index) => {
            hourlyAverages[index] = sum / recentDays.length;
        });
        hourlyGrowthRates.forEach((sum, index) => {
            hourlyGrowthRates[index] = sum / recentDays.length;
        });
        
        console.log(`📈 일별 평균 최종값: ${Math.round(avgDaily)}`);
        console.log(`📊 일별 최종값 범위: ${Math.min(...dailyTotals)} ~ ${Math.max(...dailyTotals)}`);
        console.log(`⭐ 시간별 평균 증가율 (상위 5개):`, 
            hourlyGrowthRates
                .map((rate, hour) => ({ hour, rate }))
                .sort((a, b) => b.rate - a.rate)
                .slice(0, 5)
                .map(item => `${item.hour}시→${item.hour+1}시: +${(item.rate * 100).toFixed(1)}%`)
        );
        
        // 분석 결과 저장
        this.analysisData = {
            avgDaily,
            dailyTotals,
            hourlyAverages,
            hourlyGrowthRates
        };
    }
    
    // 시간별 증가 패턴 분석
    analyzeHourlyGrowthPatterns() {
        console.log('\n⏰ === 시간별 증가 패턴 분석 ===');
        
        if (!this.analysisData) return;
        
        const currentHour = new Date().getHours();
        const currentData = this.getCurrentDayData();
        
        if (!currentData) {
            console.log('❌ 오늘 데이터를 찾을 수 없습니다');
            return;
        }
        
        console.log('📍 현재 상황 분석:');
        for (let h = 0; h <= currentHour && h <= 23; h++) {
            const currentValue = parseInt(currentData[`hour_${h.toString().padStart(2, '0')}`]) || 0;
            const avgValue = this.analysisData.hourlyAverages[h];
            const difference = currentValue - avgValue;
            const diffPercent = avgValue > 0 ? (difference / avgValue * 100) : 0;
            
            console.log(`${h}시: 현재 ${currentValue}, 평균 ${Math.round(avgValue)}, 차이 ${difference > 0 ? '+' : ''}${Math.round(difference)} (${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}%)`);
        }
    }
    
    // 예측 정확도 역산 테스트 
    validatePredictionAccuracy() {
        console.log('\n🎯 === 예측 정확도 역산 테스트 ===');
        
        if (this.data.length < 3) return;
        
        // 어제 데이터로 예측 정확도 테스트
        const yesterdayData = this.data[this.data.length - 2]; // 어제
        const testHours = [12, 15, 18, 21]; // 테스트할 시간대
        
        console.log('🔬 어제 데이터로 예측 정확도 테스트:');
        
        testHours.forEach(hour => {
            if (hour >= 23) return;
            
            const actualCurrent = parseInt(yesterdayData[`hour_${hour.toString().padStart(2, '0')}`]) || 0;
            const actualNext = parseInt(yesterdayData[`hour_${(hour + 1).toString().padStart(2, '0')}`]) || 0;
            const actualGrowth = actualNext - actualCurrent;
            
            // 현재 알고리즘으로 예측
            const similarCases = this.findSimilarValueCasesForHour(hour, actualCurrent);
            if (similarCases.length > 0) {
                const nextHourValues = this.extractNextHourValues(similarCases, hour);
                const prediction = this.calculateBasePrediction(nextHourValues);
                const predictedGrowth = prediction - actualCurrent;
                
                const accuracy = actualNext > 0 ? Math.abs(prediction - actualNext) / actualNext * 100 : 100;
                
                console.log(`${hour}시→${hour+1}시: 실제 ${actualCurrent}→${actualNext} (+${actualGrowth}), 예측 ${Math.round(prediction)} (+${Math.round(predictedGrowth)}), 오차 ${accuracy.toFixed(1)}%`);
            }
        });
    }
    
    // 단순화된 예측 방법 테스트
    testSimplifiedPrediction() {
        console.log('\n🚀 === 단순화된 예측 방법 테스트 ===');
        
        if (!this.analysisData) return;
        
        const currentData = this.getCurrentDayData();
        if (!currentData) return;
        
        const currentHour = new Date().getHours();
        console.log(`\n📍 현재 ${currentHour}시 기준 단순 예측:`);
        
        // 방법 1: 평균 증가율 적용
        const currentValue = parseInt(currentData[`hour_${currentHour.toString().padStart(2, '0')}`]) || 0;
        if (currentValue > 0 && currentHour < 23) {
            const avgGrowthRate = this.analysisData.hourlyGrowthRates[currentHour];
            const method1Prediction = currentValue * (1 + avgGrowthRate);
            
            // 방법 2: 평균 증가량 적용
            const avgCurrentValue = this.analysisData.hourlyAverages[currentHour];
            const avgNextValue = this.analysisData.hourlyAverages[currentHour + 1];
            const avgGrowthAmount = avgNextValue - avgCurrentValue;
            const method2Prediction = currentValue + avgGrowthAmount;
            
            // 방법 3: 현재값 대비 평균값 비율 적용
            const ratio = avgCurrentValue > 0 ? currentValue / avgCurrentValue : 1;
            const method3Prediction = avgNextValue * ratio;
            
            console.log(`방법1 (증가율): ${currentValue} × (1 + ${(avgGrowthRate * 100).toFixed(1)}%) = ${Math.round(method1Prediction)}`);
            console.log(`방법2 (증가량): ${currentValue} + ${Math.round(avgGrowthAmount)} = ${Math.round(method2Prediction)}`);
            console.log(`방법3 (비율적용): ${Math.round(avgNextValue)} × ${ratio.toFixed(2)} = ${Math.round(method3Prediction)}`);
            
            // 가장 보수적인 값 선택
            const conservativePrediction = Math.min(method1Prediction, method2Prediction, method3Prediction);
            console.log(`🎯 권장 예측값 (가장 보수적): ${Math.round(conservativePrediction)}`);
            
            return Math.round(conservativePrediction);
        }
        
        return null;
    }
    
    // 📊 최근 추세 기반 현실적 예측 시스템
    calculateSimplifiedPrediction({ targetHour, previousValue }) {
        console.log(`\n🎯 추세 기반 예측 시작: ${targetHour}시, 이전값: ${previousValue}`);
        
        // 1. 오늘의 현재까지 진행률 분석
        const todayProgress = this.analyzeTodayProgress(targetHour, previousValue);
        console.log(`📈 오늘 진행률 분석:`, todayProgress);
        
        // 2. 최근 3-5일 같은 시간대 실제 증가량 분석
        const recentGrowthPattern = this.analyzeRecentGrowthPattern(targetHour);
        console.log(`📊 최근 증가 패턴:`, recentGrowthPattern);
        
        // 3. 오늘의 추이와 과거 패턴 비교
        const trendComparison = this.compareTrendWithHistory(todayProgress, recentGrowthPattern);
        console.log(`🔍 추이 비교:`, trendComparison);
        
        // 4. 추세 기반 예측 계산
        return this.calculateTrendBasedPrediction({
            targetHour,
            previousValue,
            todayProgress,
            recentPattern: recentGrowthPattern,
            trendFactor: trendComparison
        });
    }
    
    // 오늘의 현재까지 진행률 분석
    analyzeTodayProgress(currentHour, currentValue) {
        const currentData = this.getCurrentDayData();
        if (!currentData || !this.analysisData) {
            return { progressRatio: 1.0, velocityTrend: 1.0 };
        }
        
        // 같은 시간대 평균값 대비 현재 진행률
        const avgAtCurrentHour = this.analysisData.hourlyAverages[currentHour - 1] || currentValue;
        const progressRatio = avgAtCurrentHour > 0 ? currentValue / avgAtCurrentHour : 1.0;
        
        // 최근 3시간 속도 변화 분석
        const recentVelocity = this.calculateRecentVelocity(currentData, currentHour);
        
        return {
            progressRatio: Math.max(0.5, Math.min(2.0, progressRatio)), // 0.5배~2배 범위
            velocityTrend: Math.max(0.7, Math.min(1.5, recentVelocity)), // 0.7배~1.5배 범위
            currentValue
        };
    }
    
    // 최근 3시간 속도 변화 계산
    calculateRecentVelocity(currentData, currentHour) {
        if (currentHour < 3) return 1.0;
        
        const recentHours = Math.min(3, currentHour);
        let totalGrowth = 0;
        let growthCount = 0;
        
        for (let i = 1; i <= recentHours; i++) {
            const prevHour = currentHour - i;
            const currHour = currentHour - i + 1;
            
            const prevValue = parseInt(currentData[`hour_${prevHour.toString().padStart(2, '0')}`]) || 0;
            const currValue = parseInt(currentData[`hour_${currHour.toString().padStart(2, '0')}`]) || 0;
            
            if (prevValue > 0 && currValue > prevValue) {
                totalGrowth += (currValue - prevValue) / prevValue;
                growthCount++;
            }
        }
        
        return growthCount > 0 ? (totalGrowth / growthCount + 1) : 1.0;
    }
    
    // 최근 3-5일 같은 시간대 증가 패턴 분석
    analyzeRecentGrowthPattern(targetHour) {
        if (!this.data || this.data.length < 3) {
            return { avgGrowth: 20, growthRange: [10, 40], pattern: 'insufficient_data' };
        }
        
        const recentDays = this.data.slice(-5); // 최근 5일
        const growthValues = [];
        
        recentDays.forEach(dayData => {
            const fromValue = parseInt(dayData[`hour_${(targetHour - 1).toString().padStart(2, '0')}`]) || 0;
            const toValue = parseInt(dayData[`hour_${targetHour.toString().padStart(2, '0')}`]) || 0;
            
            if (fromValue > 0 && toValue > fromValue) {
                growthValues.push(toValue - fromValue);
            }
        });
        
        if (growthValues.length === 0) {
            return { avgGrowth: 20, growthRange: [15, 30], pattern: 'no_growth_data' };
        }
        
        // 통계 계산
        growthValues.sort((a, b) => a - b);
        const avgGrowth = growthValues.reduce((a, b) => a + b, 0) / growthValues.length;
        const medianGrowth = growthValues[Math.floor(growthValues.length / 2)];
        const minGrowth = growthValues[0];
        const maxGrowth = growthValues[growthValues.length - 1];
        
        return {
            avgGrowth: Math.round(avgGrowth),
            medianGrowth: Math.round(medianGrowth),
            growthRange: [minGrowth, maxGrowth],
            recentTrend: this.detectRecentTrend(growthValues),
            sampleSize: growthValues.length
        };
    }
    
    // 최근 추세 감지
    detectRecentTrend(growthValues) {
        if (growthValues.length < 3) return 'stable';
        
        const recent = growthValues.slice(-3);
        const earlier = growthValues.slice(0, -3);
        
        if (earlier.length === 0) return 'stable';
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        
        const changePct = (recentAvg - earlierAvg) / earlierAvg;
        
        if (changePct > 0.15) return 'increasing';
        if (changePct < -0.15) return 'decreasing';
        return 'stable';
    }
    
    // 추이 비교 분석
    compareTrendWithHistory(todayProgress, recentPattern) {
        const { progressRatio, velocityTrend } = todayProgress;
        const { recentTrend } = recentPattern;
        
        let trendMultiplier = 1.0;
        
        // 오늘 진행률이 평균보다 높으면 더 적극적 예측
        if (progressRatio > 1.2) {
            trendMultiplier *= 1.15;
        } else if (progressRatio < 0.8) {
            trendMultiplier *= 0.9;
        }
        
        // 최근 속도 변화 반영
        trendMultiplier *= velocityTrend;
        
        // 최근 추세 패턴 반영
        switch (recentTrend) {
            case 'increasing':
                trendMultiplier *= 1.1;
                break;
            case 'decreasing':
                trendMultiplier *= 0.95;
                break;
        }
        
        return Math.max(0.8, Math.min(1.3, trendMultiplier));
    }
    
    // 추세 기반 최종 예측 계산
    calculateTrendBasedPrediction({ targetHour, previousValue, todayProgress, recentPattern, trendFactor }) {
        const { avgGrowth, medianGrowth, growthRange } = recentPattern;
        
        // 기본 예측: 최근 중간값 사용
        let basePrediction = previousValue + medianGrowth;
        
        // 추세 조정 적용
        const trendAdjustment = (avgGrowth * trendFactor) - avgGrowth;
        basePrediction += trendAdjustment;
        
        // 범위 내 제한
        const minPrediction = previousValue + Math.max(5, growthRange[0] * 0.8);
        const maxPrediction = previousValue + Math.min(growthRange[1] * 1.2, avgGrowth * 2);
        
        let finalPrediction = Math.max(minPrediction, Math.min(basePrediction, maxPrediction));
        
        // 일일 총량 현실성 체크
        if (this.analysisData) {
            const currentDailyMax = this.analysisData.avgDaily * 1.1; // 평균의 110%까지만
            if (finalPrediction > currentDailyMax) {
                finalPrediction = Math.max(previousValue + 10, currentDailyMax);
                console.log(`📉 일일 한계 적용: ${Math.round(currentDailyMax)}`);
            }
        }
        
        console.log(`📊 예측 세부사항:`);
        console.log(`  - 기본 증가량: ${medianGrowth} (범위: ${growthRange[0]}-${growthRange[1]})`);
        console.log(`  - 추세 계수: ${trendFactor.toFixed(2)}`);
        console.log(`  - 조정된 증가량: ${Math.round(finalPrediction - previousValue)}`);
        console.log(`🎯 최종 예측값: ${Math.round(finalPrediction)}`);
        
        return finalPrediction;
    }
    
    // 오늘 데이터 가져오기
    getCurrentDayData() {
        if (!this.data || this.data.length === 0) {
            return null;
        }
        
        // 가장 최근(마지막) 데이터가 오늘 데이터
        return this.data[this.data.length - 1];
    }
    
    // 시간별 증감량 계산 함수
    calculateHourlyIncrements(values, isPredicted) {
        const increments = [];
        
        for (let i = 0; i < values.length; i++) {
            if (i === 0) {
                // 0시는 증감량 표시하지 않음 (전날 최종값)
                increments.push(null);
                continue;
            }
            
            const currentValue = values[i];
            const previousValue = values[i - 1];
            
            if (currentValue !== null && previousValue !== null && currentValue > 0 && previousValue > 0) {
                const increment = currentValue - previousValue;
                increments.push(increment > 0 ? increment : null);
            } else {
                increments.push(null);
            }
        }
        
        return increments;
    }

    // 요일별 패턴 분석
    analyzeDayOfWeekPattern() {
        const today = new Date();
        const todayDayOfWeek = today.getDay(); // 0: 일요일, 1: 월요일, ...
        
        // 같은 요일의 과거 데이터 수집
        const sameDayData = [];
        this.data.forEach(row => {
            if (row.date) {
                const rowDate = new Date(row.date);
                if (rowDate.getDay() === todayDayOfWeek) {
                    sameDayData.push(row);
                }
            }
        });

        // 같은 요일의 시간별 평균 성장률 계산
        const hourlyRatios = {};
        for (let h = 1; h < 24; h++) {
            const hourKey = h.toString().padStart(2, '0');
            const prevHourKey = (h-1).toString().padStart(2, '0');
            const ratios = [];

            sameDayData.forEach(row => {
                const currentHour = parseInt(row[`hour_${hourKey}`]) || 0;
                const prevHour = parseInt(row[`hour_${prevHourKey}`]) || 0;
                
                if (prevHour > 0 && currentHour > prevHour) {
                    ratios.push(currentHour / prevHour);
                }
            });

            if (ratios.length > 0) {
                hourlyRatios[h] = ratios.reduce((a, b) => a + b, 0) / ratios.length;
            } else {
                hourlyRatios[h] = 1.1; // 기본 성장률 10%
            }
        }

        return hourlyRatios;
    }

    // 시간대별 성장 패턴 분석
    analyzeHourlyGrowthPattern() {
        const hourlyGrowth = {};
        
        // 모든 데이터에서 시간대별 성장 패턴 추출
        this.data.forEach(row => {
            for (let h = 1; h < 24; h++) {
                const hourKey = h.toString().padStart(2, '0');
                const prevHourKey = (h-1).toString().padStart(2, '0');
                
                const currentHour = parseInt(row[`hour_${hourKey}`]) || 0;
                const prevHour = parseInt(row[`hour_${prevHourKey}`]) || 0;
                
                if (prevHour > 0 && currentHour > prevHour) {
                    if (!hourlyGrowth[h]) hourlyGrowth[h] = [];
                    hourlyGrowth[h].push(currentHour - prevHour);
                }
            }
        });

        // 각 시간대별 평균 증가량 계산
        const avgHourlyGrowth = {};
        for (let h = 1; h < 24; h++) {
            if (hourlyGrowth[h] && hourlyGrowth[h].length > 0) {
                avgHourlyGrowth[h] = hourlyGrowth[h].reduce((a, b) => a + b, 0) / hourlyGrowth[h].length;
            } else {
                avgHourlyGrowth[h] = 0;
            }
        }

        return avgHourlyGrowth;
    }

    // 최근 트렌드 분석
    analyzeRecentTrend(values, lastValidIndex) {
        if (lastValidIndex < 3) return 0;
        
        // 최근 3시간의 증가율 분석
        const recentGrowthRates = [];
        for (let i = Math.max(1, lastValidIndex - 2); i <= lastValidIndex; i++) {
            if (values[i] > 0 && values[i-1] > 0) {
                recentGrowthRates.push(values[i] / values[i-1]);
            }
        }

        if (recentGrowthRates.length > 0) {
            return recentGrowthRates.reduce((a, b) => a + b, 0) / recentGrowthRates.length;
        }
        
        return 1.05; // 기본 성장률 5%
    }

    // 계절성 패턴 분석 (주간 패턴)
    analyzeSeasonalPattern() {
        const today = new Date();
        const isWeekend = today.getDay() === 0 || today.getDay() === 6;
        const currentHour = today.getHours();
        
        // 주말/평일별 시간대 가중치
        const weekendFactors = {
            morning: 0.8,   // 09-12시
            afternoon: 1.2, // 13-17시
            evening: 1.1,   // 18-21시
            night: 0.9      // 22-23시
        };
        
        const weekdayFactors = {
            morning: 1.3,   // 09-12시
            afternoon: 1.1, // 13-17시
            evening: 0.9,   // 18-21시
            night: 0.7      // 22-23시
        };
        
        const factors = isWeekend ? weekendFactors : weekdayFactors;
        
        if (currentHour >= 9 && currentHour <= 12) return factors.morning;
        if (currentHour >= 13 && currentHour <= 17) return factors.afternoon;
        if (currentHour >= 18 && currentHour <= 21) return factors.evening;
        if (currentHour >= 22) return factors.night;
        
        return 1.0; // 기본값
    }

    // 다중 모델 예측값 계산
    calculateMultiModelPredictions(params) {
        const { lastValue, lastValidIndex, targetHour, dayOfWeekPattern, 
                hourlyGrowthPattern, recentTrend, seasonalPattern, currentValues } = params;
        
        const predictions = {};
        
        // 1. 요일별 패턴 기반 예측
        if (dayOfWeekPattern[targetHour]) {
            predictions.dayOfWeek = lastValue * Math.pow(dayOfWeekPattern[targetHour], targetHour - lastValidIndex);
        }
        
        // 2. 시간별 성장 패턴 기반 예측
        let growthSum = 0;
        for (let h = lastValidIndex + 1; h <= targetHour; h++) {
            growthSum += hourlyGrowthPattern[h] || 0;
        }
        predictions.hourlyGrowth = lastValue + growthSum;
        
        // 3. 최근 트렌드 기반 예측
        predictions.recentTrend = lastValue * Math.pow(recentTrend, targetHour - lastValidIndex);
        
        // 4. 계절성 패턴 기반 예측
        const baseGrowth = (targetHour - lastValidIndex) * 20; // 시간당 기본 20개 증가
        predictions.seasonal = lastValue + (baseGrowth * seasonalPattern);
        
        // 5. 지수 평활법 예측
        predictions.exponentialSmoothing = this.exponentialSmoothingPrediction(currentValues, lastValidIndex, targetHour);

        return predictions;
    }

    // 지수 평활법 예측
    exponentialSmoothingPrediction(values, lastValidIndex, targetHour) {
        if (lastValidIndex < 2) return values[lastValidIndex] * 1.1;
        
        const alpha = 0.3; // 평활 상수
        let smoothedValue = values[1];
        
        for (let i = 2; i <= lastValidIndex; i++) {
            if (values[i] > 0) {
                smoothedValue = alpha * values[i] + (1 - alpha) * smoothedValue;
            }
        }
        
        // 트렌드 계산
        const trend = lastValidIndex > 2 ? 
            (smoothedValue - values[lastValidIndex - 2]) / 2 : 
            smoothedValue * 0.1;
        
        return smoothedValue + (trend * (targetHour - lastValidIndex));
    }

    // 가중 평균으로 최종 예측값 결정
    weightedPrediction(predictions) {
        const weights = {
            dayOfWeek: 0.25,           // 요일 패턴
            hourlyGrowth: 0.20,        // 시간별 성장
            recentTrend: 0.25,         // 최근 트렌드
            seasonal: 0.15,            // 계절성
            exponentialSmoothing: 0.15  // 지수 평활법
        };
        
        let weightedSum = 0;
        let totalWeight = 0;
        
        Object.keys(predictions).forEach(method => {
            if (predictions[method] && predictions[method] > 0 && weights[method]) {
                weightedSum += predictions[method] * weights[method];
                totalWeight += weights[method];
            }
        });
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    // 예측값 합리성 검증 및 조정
    validatePrediction(prediction, lastValue, targetHour, lastValidIndex) {
        const hourDiff = targetHour - lastValidIndex;
        
        // 1. 최소값 검증: 이전 값보다 작을 수 없음
        if (prediction < lastValue) {
            prediction = lastValue;
        }
        
        // 2. 최대 증가율 제한: 시간당 최대 50% 증가
        const maxIncrease = lastValue * Math.pow(1.5, hourDiff);
        if (prediction > maxIncrease) {
            prediction = maxIncrease;
        }
        
        // 3. 점진적 증가 패턴 유지: 급격한 변화 방지
        const expectedGradualIncrease = lastValue + (hourDiff * lastValue * 0.1); // 시간당 10% 기본 증가
        if (prediction > expectedGradualIncrease * 2) {
            prediction = expectedGradualIncrease * 1.5; // 최대 50% 추가 증가만 허용
        }
        
        // 4. 시간대별 최대값 제한
        const hourlyMaxLimits = this.getHourlyMaxLimits();
        if (hourlyMaxLimits[targetHour] && prediction > hourlyMaxLimits[targetHour]) {
            prediction = hourlyMaxLimits[targetHour];
        }
        
        // 5. 현실적 범위 내 조정
        const dailyTarget = this.estimateDailyTarget();
        const progressRatio = targetHour / 23;
        const expectedAtHour = dailyTarget * progressRatio;
        
        // 예상 진행률 대비 너무 높은 값 조정
        if (prediction > expectedAtHour * 1.3) {
            prediction = expectedAtHour * 1.2;
        }
        
        return Math.max(prediction, lastValue);
    }

    // 시간대별 최대값 제한 설정
    getHourlyMaxLimits() {
        // 과거 데이터를 기반으로 각 시간대별 최대값 계산
        const hourlyMaxes = {};
        
        this.data.forEach(row => {
            for (let h = 0; h < 24; h++) {
                const hourKey = `hour_${h.toString().padStart(2, '0')}`;
                const value = parseInt(row[hourKey]) || 0;
                
                if (!hourlyMaxes[h] || value > hourlyMaxes[h]) {
                    hourlyMaxes[h] = value;
                }
            }
        });
        
        // 최대값에 20% 여유를 두어 상한선 설정
        Object.keys(hourlyMaxes).forEach(hour => {
            hourlyMaxes[hour] = hourlyMaxes[hour] * 1.2;
        });
        
        return hourlyMaxes;
    }

    // 일일 목표값 추정
    estimateDailyTarget() {
        // 최근 7일간의 평균 일일 최종값을 기반으로 목표값 설정
        const recentFinalValues = [];
        
        this.data.slice(-7).forEach(row => {
            const finalValue = row.total || parseInt(row.hour_23) || 0;
            if (finalValue > 0) {
                recentFinalValues.push(finalValue);
            }
        });
        
        if (recentFinalValues.length > 0) {
            const avgDaily = recentFinalValues.reduce((a, b) => a + b, 0) / recentFinalValues.length;
            
            // 요일별 조정 (주말은 80%, 평일은 110%)
            const today = new Date();
            const isWeekend = today.getDay() === 0 || today.getDay() === 6;
            const dayFactor = isWeekend ? 0.8 : 1.1;
            
            return avgDaily * dayFactor;
        }
        
        return 1000; // 기본값
    }
}