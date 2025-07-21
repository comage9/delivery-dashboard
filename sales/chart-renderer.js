/* global google */

// 차트 렌더링 클래스
class ChartRenderer {
    constructor() {
        this.charts = {};
        this.isGoogleChartsLoaded = false;
    }

    // Google Charts 초기화
    async initGoogleCharts() {
        return new Promise((resolve, reject) => {
            if (this.isGoogleChartsLoaded) {
                resolve();
                return;
            }

            google.charts.load('current', {
                packages: ['corechart', 'line', 'bar', 'table'],
                language: 'ko'
            });

            google.charts.setOnLoadCallback(() => {
                this.isGoogleChartsLoaded = true;
                resolve();
            });

            // 타임아웃 설정
            setTimeout(() => {
                if (!this.isGoogleChartsLoaded) {
                    reject(new Error('Google Charts 로드 타임아웃'));
                }
            }, 10000);
        });
    }

    // 매출 트렌드 차트
    renderRevenueTrend(data, containerId) {
        if (!data || data.length === 0) {
            this.showError(containerId, '데이터가 없습니다.');
            return;
        }

        // 일별 데이터 집계
        const dailyData = {};
        data.forEach(row => {
            const dateStr = row.날짜.toISOString().split('T')[0];
            const revenue = parseFloat(row.매출) || 0;
            const quantity = parseInt(row.수량) || 0;
            
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = { revenue: 0, quantity: 0 };
            }
            dailyData[dateStr].revenue += revenue;
            dailyData[dateStr].quantity += quantity;
        });

        const chartData = new google.visualization.DataTable();
        chartData.addColumn('date', '날짜');
        chartData.addColumn('number', '매출');
        chartData.addColumn('number', '수량');

        Object.entries(dailyData)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .forEach(([date, info]) => {
                chartData.addRow([
                    new Date(date),
                    info.revenue,
                    info.quantity
                ]);
            });

        const options = {
            title: '일별 매출 및 수량 추이',
            titleTextStyle: { fontSize: 16, bold: true },
            hAxis: {
                title: '날짜',
                format: 'MM/dd',
                titleTextStyle: { fontSize: 12 }
            },
            vAxes: {
                0: {
                    title: '매출 (원)',
                    format: '#,###',
                    titleTextStyle: { color: '#1f77b4', fontSize: 12 }
                },
                1: {
                    title: '수량',
                    titleTextStyle: { color: '#ff7f0e', fontSize: 12 }
                }
            },
            series: {
                0: { type: 'line', targetAxisIndex: 0, color: '#1f77b4', lineWidth: 3 },
                1: { type: 'line', targetAxisIndex: 1, color: '#ff7f0e', lineWidth: 3 }
            },
            backgroundColor: 'transparent',
            legend: { position: 'top', alignment: 'center' },
            chartArea: { left: 80, top: 60, width: '75%', height: '70%' },
            curveType: 'function'
        };

        const chart = new google.visualization.ComboChart(document.getElementById(containerId));
        chart.draw(chartData, options);
        this.charts[containerId] = chart;
    }

    // 카테고리별 파이 차트
    renderCategoryChart(data) {
        if (!data || data.length === 0) {
            this.showError('categoryChart', '데이터가 없습니다.');
            return;
        }

        // 카테고리별 매출 집계
        const categoryData = {};
        data.forEach(row => {
            const category = row.카테고리 || '기타';
            const revenue = parseFloat(row.매출) || 0;
            categoryData[category] = (categoryData[category] || 0) + revenue;
        });

        const chartData = new google.visualization.DataTable();
        chartData.addColumn('string', '카테고리');
        chartData.addColumn('number', '매출');

        Object.entries(categoryData).forEach(([category, revenue]) => {
            chartData.addRow([category, revenue]);
        });

        const options = {
            title: '카테고리별 매출 분포',
            titleTextStyle: { fontSize: 16, bold: true },
            backgroundColor: 'transparent',
            legend: { position: 'right', alignment: 'center' },
            chartArea: { left: 20, top: 60, width: '70%', height: '70%' },
            pieSliceText: 'percentage',
            pieSliceTextStyle: { fontSize: 12 },
            colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
            tooltip: {
                text: 'both',
                textStyle: { fontSize: 12 }
            }
        };

        const chart = new google.visualization.PieChart(document.getElementById('categoryChart'));
        chart.draw(chartData, options);
        this.charts.categoryChart = chart;
    }

    // 지역별 막대 차트
    renderRegionChart(data) {
        if (!data || data.length === 0) {
            this.showError('regionChart', '데이터가 없습니다.');
            return;
        }

        // 지역별 매출 집계
        const regionData = {};
        data.forEach(row => {
            const region = row.지역 || '기타';
            const revenue = parseFloat(row.매출) || 0;
            const quantity = parseInt(row.수량) || 0;
            
            if (!regionData[region]) {
                regionData[region] = { revenue: 0, quantity: 0 };
            }
            regionData[region].revenue += revenue;
            regionData[region].quantity += quantity;
        });

        const chartData = new google.visualization.DataTable();
        chartData.addColumn('string', '지역');
        chartData.addColumn('number', '매출');
        chartData.addColumn('number', '수량');

        Object.entries(regionData).forEach(([region, info]) => {
            chartData.addRow([region, info.revenue, info.quantity]);
        });

        const options = {
            title: '지역별 성과',
            titleTextStyle: { fontSize: 16, bold: true },
            hAxis: {
                title: '지역',
                titleTextStyle: { fontSize: 12 }
            },
            vAxes: {
                0: {
                    title: '매출 (원)',
                    format: '#,###',
                    titleTextStyle: { color: '#1f77b4', fontSize: 12 }
                },
                1: {
                    title: '수량',
                    titleTextStyle: { color: '#ff7f0e', fontSize: 12 }
                }
            },
            series: {
                0: { targetAxisIndex: 0, color: '#1f77b4', type: 'columns' },
                1: { targetAxisIndex: 1, color: '#ff7f0e', type: 'line', lineWidth: 3 }
            },
            backgroundColor: 'transparent',
            legend: { position: 'top', alignment: 'center' },
            chartArea: { left: 80, top: 60, width: '75%', height: '70%' },
            animation: {
                startup: true,
                duration: 1000,
                easing: 'out'
            }
        };

        const chart = new google.visualization.ComboChart(document.getElementById('regionChart'));
        chart.draw(chartData, options);
        this.charts.regionChart = chart;
    }

    // 산점도 차트 (방문자 vs 전환율)
    async renderScatterChart(containerId, scatterData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} not found`);
            }

            this.showLoading(container);

            const data = new google.visualization.DataTable();
            data.addColumn('number', '방문자수');
            data.addColumn('number', '전환율');
            data.addColumn('string', '카테고리');

            const rows = scatterData.map(item => [
                item.visitors,
                item.conversion,
                `${item.category} (${item.region})`
            ]);

            data.addRows(rows);

            const options = {
                title: '방문자수 vs 전환율 상관관계',
                titleTextStyle: {
                    fontSize: 16,
                    bold: true
                },
                hAxis: {
                    title: '방문자수 (명)',
                    titleTextStyle: { fontSize: 12 }
                },
                vAxis: {
                    title: '전환율 (%)',
                    titleTextStyle: { fontSize: 12 }
                },
                legend: 'none',
                backgroundColor: 'transparent',
                chartArea: {
                    left: 80,
                    top: 60,
                    width: '75%',
                    height: '70%'
                },
                pointSize: 8,
                colors: ['#1f77b4'],
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                },
                trendlines: {
                    0: {
                        type: 'linear',
                        color: '#ff7f0e',
                        lineWidth: 2,
                        opacity: 0.7
                    }
                }
            };

            const chart = new google.visualization.ScatterChart(container);
            this.charts[containerId] = chart;

            chart.draw(data, options);
            this.hideLoading(container);

        } catch (error) {
            console.error('산점도 차트 렌더링 실패:', error);
            this.showError(document.getElementById(containerId), '차트를 로드할 수 없습니다.');
        }
    }

    // 변환율 분석 차트
    renderConversionChart(data) {
        if (!data || data.length === 0) {
            this.showError('conversionChart', '데이터가 없습니다.');
            return;
        }

        // 일별 변환율 계산
        const dailyData = {};
        data.forEach(row => {
            const dateStr = row.날짜.toISOString().split('T')[0];
            const quantity = parseInt(row.수량) || 0;
            const visitors = parseInt(row.방문자) || 1; // 기본값 1로 설정하여 0으로 나누기 방지
            
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = { totalQuantity: 0, totalVisitors: 0 };
            }
            dailyData[dateStr].totalQuantity += quantity;
            dailyData[dateStr].totalVisitors += visitors;
        });

        const chartData = new google.visualization.DataTable();
        chartData.addColumn('number', '방문자수');
        chartData.addColumn('number', '변환율 (%)');
        chartData.addColumn('string', '날짜');

        Object.entries(dailyData).forEach(([date, info]) => {
            const conversionRate = (info.totalQuantity / info.totalVisitors) * 100;
            chartData.addRow([
                info.totalVisitors,
                parseFloat(conversionRate.toFixed(2)),
                date
            ]);
        });

        const options = {
            title: '방문자수 vs 변환율 분석',
            titleTextStyle: { fontSize: 16, bold: true },
            hAxis: {
                title: '방문자수 (명)',
                titleTextStyle: { fontSize: 12 }
            },
            vAxis: {
                title: '변환율 (%)',
                titleTextStyle: { fontSize: 12 }
            },
            backgroundColor: 'transparent',
            legend: 'none',
            chartArea: { left: 80, top: 60, width: '75%', height: '70%' },
            pointSize: 8,
            colors: ['#2ca02c'],
            animation: {
                startup: true,
                duration: 1000,
                easing: 'out'
            },
            tooltip: {
                trigger: 'selection',
                textStyle: { fontSize: 12 }
            }
        };

        const chart = new google.visualization.ScatterChart(document.getElementById('conversionChart'));
        chart.draw(chartData, options);
        this.charts.conversionChart = chart;
    }

    // 툴팁 이벤트 추가
    addTooltipEvents(chart, data) {
        google.visualization.events.addListener(chart, 'onmouseover', (e) => {
            // 커스텀 툴팁 로직 (필요시 구현)
        });

        google.visualization.events.addListener(chart, 'onmouseout', (e) => {
            // 툴팁 숨기기 로직 (필요시 구현)
        });
    }

    // 로딩 표시
    showLoading(container) {
        container.innerHTML = `
            <div class="chart-loading">
                <span class="loading loading-spinner loading-lg"></span>
                <div class="chart-loading-text">차트를 로드하는 중...</div>
            </div>
        `;
    }

    // 로딩 숨기기
    hideLoading(container) {
        const loadingElement = container.querySelector('.chart-loading');
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    // 에러 표시
    showError(container, message) {
        container.innerHTML = `
            <div class="chart-error">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>${message}</div>
            </div>
        `;
    }

    // 데이터 없음 표시
    showNoData(container) {
        container.innerHTML = `
            <div class="no-data">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div>표시할 데이터가 없습니다.</div>
            </div>
        `;
    }

    // 차트 업데이트
    updateChart(chartId, newData, chartType) {
        const chart = this.charts[chartId];
        if (chart && newData) {
            // 차트 타입에 따라 적절한 렌더링 메서드 호출
            switch (chartType) {
                case 'revenue':
                    this.renderRevenueChart(chartId, newData);
                    break;
                case 'category':
                    this.renderCategoryChart(chartId, newData);
                    break;
                case 'region':
                    this.renderRegionChart(chartId, newData);
                    break;
                case 'scatter':
                    this.renderScatterChart(chartId, newData);
                    break;
            }
        }
    }

    // 모든 차트 새로고침
    refreshAllCharts() {
        Object.keys(this.charts).forEach(chartId => {
            const container = document.getElementById(chartId);
            if (container && this.charts[chartId]) {
                // 차트 재렌더링 트리거
                google.visualization.events.trigger(this.charts[chartId], 'ready');
            }
        });
    }

    // 차트 리사이즈 (반응형)
    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.draw) {
                // 리사이즈 이벤트 트리거
                setTimeout(() => {
                    google.visualization.events.trigger(chart, 'ready');
                }, 100);
            }
        });
    }
}