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

    // 간단하고 확실한 누적 예측 함수
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
            
            console.log('=== 간단한 누적 예측 시작 ===');
            console.log('마지막 유효 시간:', lastValidIndex + ':00');
            console.log('마지막 유효값:', lastValue);
            
            // 과거 동일 요일 데이터에서 현재 시간 기준 예상 최종값 계산
            const expectedFinalValue = this.calculateSimpleExpectedFinal(lastValidIndex, lastValue);
            console.log('예상 최종값:', expectedFinalValue);
            
            // 남은 시간에 따른 점진적 증가
            const remainingHours = 23 - lastValidIndex;
            const totalIncrease = Math.max(0, expectedFinalValue - lastValue);
            
            let previousValue = lastValue;
            for (let i = lastValidIndex + 1; i <= 23; i++) {
                // 시간대별 가중치 적용한 점진적 증가
                const hourWeight = this.getHourWeight(i);
                const remainingFromThis = 23 - i + 1;
                
                // 기본 증가량 계산
                const baseIncrease = totalIncrease * hourWeight / remainingFromThis;
                
                // 최소 증가량 보장 (이전값보다 항상 증가)
                const minIncrease = previousValue * 0.01; // 최소 1% 증가
                const actualIncrease = Math.max(baseIncrease, minIncrease);
                
                const predictedValue = previousValue + actualIncrease;
                
                console.log(`${i}:00 예측값: ${Math.round(predictedValue)} (이전: ${previousValue}, 증가: ${Math.round(actualIncrease)})`);
                
                result[i] = Math.round(predictedValue);
                isPredicted[i] = true;
                previousValue = result[i];
            }
            
            console.log('=== 간단한 누적 예측 완료 ===');
        }

        return { values: result, isPredicted };
    }
    
    // 간단한 예상 최종값 계산
    calculateSimpleExpectedFinal(currentHour, currentValue) {
        const today = new Date();
        const todayDayOfWeek = today.getDay();
        
        // 같은 요일 과거 데이터에서 현재 시간 기준 진행률 찾기
        const progressRatios = [];
        
        this.data.forEach(row => {
            if (row.date) {
                const rowDate = new Date(row.date);
                if (rowDate.getDay() === todayDayOfWeek) {
                    // 해당 요일의 최종값 찾기
                    let finalValue = 0;
                    for (let h = 23; h >= 0; h--) {
                        const hourKey = `hour_${h.toString().padStart(2, '0')}`;
                        const value = parseInt(row[hourKey]) || 0;
                        if (value > 0) {
                            finalValue = value;
                            break;
                        }
                    }
                    
                    // 현재 시간대의 값
                    const currentHourKey = `hour_${currentHour.toString().padStart(2, '0')}`;
                    const currentHourValue = parseInt(row[currentHourKey]) || 0;
                    
                    if (finalValue > 0 && currentHourValue > 0) {
                        progressRatios.push(finalValue / currentHourValue);
                    }
                }
            }
        });
        
        // 보수적 예측: 중간값 사용하고 현재값의 2배를 넘지 않음
        let expectedRatio = 1.5; // 기본값
        if (progressRatios.length > 0) {
            progressRatios.sort((a, b) => a - b);
            const medianIndex = Math.floor(progressRatios.length / 2);
            const medianRatio = progressRatios.length % 2 === 0 
                ? (progressRatios[medianIndex - 1] + progressRatios[medianIndex]) / 2
                : progressRatios[medianIndex];
            expectedRatio = Math.min(medianRatio, 2.0); // 최대 2배로 제한
        }
        
        return Math.round(currentValue * expectedRatio);
    }
    
    // 시간대별 가중치
    getHourWeight(hour) {
        const weights = {
            9: 1.2, 10: 1.3, 11: 1.4, 12: 1.2,
            13: 1.1, 14: 1.2, 15: 1.3, 16: 1.4,
            17: 1.2, 18: 1.0, 19: 0.8, 20: 0.6,
            21: 0.4, 22: 0.3, 23: 0.2
        };
        return weights[hour] || 0.5;
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