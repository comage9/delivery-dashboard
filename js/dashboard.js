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
        
        // 오늘 총 출고량 (합계값 또는 23시 값)
        let todayTotal = 0;
        if (latestRow) {
            // 합계값이 있으면 사용, 없으면 23시 값 사용
            todayTotal = latestRow.total || parseInt(latestRow.hour_23) || 0;
        }
        
        // 어제 마지막 출고량
        let yesterdayLast = 0;
        if (this.data.length > 1) {
            const yesterdayRow = this.data[this.data.length - 2];
            if (yesterdayRow) {
                yesterdayLast = yesterdayRow.total || parseInt(yesterdayRow.hour_23) || 0;
            }
        }

        // 오늘을 제외한 이전 3일 데이터로 최대/평균 시간당 출고량 계산
        const excludeTodayData = this.data.slice(-4, -1); // 오늘 제외한 이전 3일
        let dailyMaxValues = []; // 각 일별 최대 출고량
        let hourlyIncrements = []; // 시간당 증가량
        
        excludeTodayData.forEach(row => {
            // 각 일별 최대 출고량 (23시 또는 합계값)
            const dailyMax = row.total || parseInt(row.hour_23) || 0;
            if (dailyMax > 0) {
                dailyMaxValues.push(dailyMax);
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
        
        // 최대 시간당 출고량: 오늘 제외한 이전 3일간 최고 출고량의 평균
        const maxHourly = dailyMaxValues.length > 0 ? 
            Math.round(dailyMaxValues.reduce((a, b) => a + b, 0) / dailyMaxValues.length) : 0;
        
        // 평균 시간당 출고량: 오늘 제외한 이전 3일간 시간당 증가량의 평균
        const avgHourly = hourlyIncrements.length > 0 ? 
            Math.round(hourlyIncrements.reduce((a, b) => a + b, 0) / hourlyIncrements.length) : 0;

        console.log('Stats calculated:', { todayTotal, yesterdayLast, maxHourly, avgHourly });

        // UI 업데이트
        document.getElementById('today-total').textContent = todayTotal.toLocaleString();
        document.getElementById('yesterday-last').textContent = yesterdayLast.toLocaleString();
        document.getElementById('max-hourly').textContent = maxHourly.toLocaleString();
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
            
            // Chart.js 플러그인 등록
            Chart.register(ChartDataLabels);
            
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
                        pointHoverRadius: 5
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
                        pointHoverRadius: 5
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
                                // 오늘 데이터(첫 번째 데이터셋)에서만 라벨 표시하고 null 값 제외
                                return context.datasetIndex === 0 && 
                                       context.parsed && 
                                       context.parsed.y !== null && 
                                       context.parsed.y !== undefined &&
                                       context.parsed.y > 0;
                            },
                            backgroundColor: function(context) {
                                const isPredicted = context.dataset.isPredicted && context.dataset.isPredicted[context.dataIndex];
                                return isPredicted ? 'rgba(249, 115, 22, 0.8)' : 'rgba(59, 130, 246, 0.8)';
                            },
                            borderColor: function(context) {
                                const isPredicted = context.dataset.isPredicted && context.dataset.isPredicted[context.dataIndex];
                                return isPredicted ? 'rgba(249, 115, 22, 1)' : 'rgba(59, 130, 246, 1)';
                            },
                            borderRadius: 4,
                            borderWidth: 1,
                            color: 'white',
                            font: {
                                weight: 'bold',
                                size: 10
                            },
                            formatter: function(value, context) {
                                if (value === null || value === undefined) return '';
                                const isPredicted = context.dataset.isPredicted && context.dataset.isPredicted[context.dataIndex];
                                return isPredicted ? value.toLocaleString() + '*' : value.toLocaleString();
                            },
                            padding: {
                                top: 2,
                                bottom: 2,
                                left: 4,
                                right: 4
                            },
                            anchor: 'end',
                            align: 'top',
                            offset: 4
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
                                    return value.toLocaleString();
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
            this.chart.data.labels = hours.map(h => h + ':00');
            this.chart.data.datasets[0].data = todayValuesWithPrediction;
            this.chart.data.datasets[1].data = yesterdayValues;
            this.chart.data.datasets[2].data = dayBeforeYesterdayValues;
            
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

    // 예측값 추가 함수
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

        // 현재 시간을 기준으로 예측값 계산
        const currentHour = new Date().getHours();
        
        // 마지막 유효값부터 23:00까지 예측값 생성
        if (lastValidIndex < 23) {
            const lastValue = values[lastValidIndex];
            
            // 간단한 선형 증가 모델 (시간당 평균 증가량 기반)
            let hourlyIncrease = 0;
            if (lastValidIndex > 0) {
                // 이전 시간들의 평균 증가량 계산
                let totalIncrease = 0;
                let increaseCount = 0;
                for (let i = 1; i <= lastValidIndex; i++) {
                    if (values[i] !== null && values[i-1] !== null && values[i] > values[i-1]) {
                        totalIncrease += (values[i] - values[i-1]);
                        increaseCount++;
                    }
                }
                if (increaseCount > 0) {
                    hourlyIncrease = totalIncrease / increaseCount;
                }
            }

            // 예측값 생성 (23:00까지)
            for (let i = lastValidIndex + 1; i <= 23; i++) {
                const predictedValue = Math.round(lastValue + (hourlyIncrease * (i - lastValidIndex)));
                result[i] = Math.max(predictedValue, lastValue); // 감소하지 않도록
                isPredicted[i] = true;
            }
        }

        return { values: result, isPredicted };
    }
}