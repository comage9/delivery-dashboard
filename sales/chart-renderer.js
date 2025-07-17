/* global google */

// 차트 렌더링 클래스
export class ChartRenderer {
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

    // 매출 트렌드 라인 차트
    async renderRevenueChart(containerId, dailyData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} not found`);
            }

            // 로딩 표시
            this.showLoading(container);

            const data = new google.visualization.DataTable();
            data.addColumn('date', '날짜');
            data.addColumn('number', '매출');
            data.addColumn('number', '방문자수');

            const rows = dailyData.map(item => [
                item.date,
                item.revenue,
                item.visitors
            ]);

            data.addRows(rows);

            const options = {
                title: '일별 매출 및 방문자 트렌드',
                titleTextStyle: {
                    fontSize: 16,
                    bold: true
                },
                hAxis: {
                    title: '날짜',
                    format: 'M/d',
                    titleTextStyle: { fontSize: 12 }
                },
                vAxes: {
                    0: {
                        title: '매출 (원)',
                        format: 'currency',
                        titleTextStyle: { color: '#1f77b4', fontSize: 12 }
                    },
                    1: {
                        title: '방문자수 (명)',
                        titleTextStyle: { color: '#ff7f0e', fontSize: 12 }
                    }
                },
                series: {
                    0: { targetAxisIndex: 0, color: '#1f77b4', lineWidth: 3 },
                    1: { targetAxisIndex: 1, color: '#ff7f0e', lineWidth: 2 }
                },
                legend: {
                    position: 'top',
                    alignment: 'center'
                },
                backgroundColor: 'transparent',
                chartArea: {
                    left: 80,
                    top: 60,
                    width: '75%',
                    height: '70%'
                },
                curveType: 'function',
                pointSize: 5,
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                }
            };

            const chart = new google.visualization.LineChart(container);
            this.charts[containerId] = chart;

            // 툴팁 이벤트 추가
            this.addTooltipEvents(chart, data);

            chart.draw(data, options);
            this.hideLoading(container);

        } catch (error) {
            console.error('매출 차트 렌더링 실패:', error);
            this.showError(document.getElementById(containerId), '차트를 로드할 수 없습니다.');
        }
    }

    // 카테고리별 파이 차트
    async renderCategoryChart(containerId, categoryData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} not found`);
            }

            this.showLoading(container);

            const data = new google.visualization.DataTable();
            data.addColumn('string', '카테고리');
            data.addColumn('number', '매출');

            const rows = Object.entries(categoryData).map(([category, info]) => [
                category,
                info.revenue
            ]);

            data.addRows(rows);

            const options = {
                title: '카테고리별 매출 분포',
                titleTextStyle: {
                    fontSize: 16,
                    bold: true
                },
                pieHole: 0.4,
                colors: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd'],
                legend: {
                    position: 'right',
                    alignment: 'center'
                },
                backgroundColor: 'transparent',
                chartArea: {
                    left: 20,
                    top: 60,
                    width: '70%',
                    height: '70%'
                },
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                },
                tooltip: {
                    text: 'percentage'
                }
            };

            const chart = new google.visualization.PieChart(container);
            this.charts[containerId] = chart;

            chart.draw(data, options);
            this.hideLoading(container);

        } catch (error) {
            console.error('카테고리 차트 렌더링 실패:', error);
            this.showError(document.getElementById(containerId), '차트를 로드할 수 없습니다.');
        }
    }

    // 지역별 막대 차트
    async renderRegionChart(containerId, regionData) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container ${containerId} not found`);
            }

            this.showLoading(container);

            const data = new google.visualization.DataTable();
            data.addColumn('string', '지역');
            data.addColumn('number', '매출');
            data.addColumn('number', '방문자수');

            const rows = Object.entries(regionData).map(([region, info]) => [
                region,
                info.revenue,
                info.visitors
            ]);

            data.addRows(rows);

            const options = {
                title: '지역별 매출 및 방문자 현황',
                titleTextStyle: {
                    fontSize: 16,
                    bold: true
                },
                hAxis: {
                    title: '지역',
                    titleTextStyle: { fontSize: 12 }
                },
                vAxes: {
                    0: {
                        title: '매출 (원)',
                        format: 'currency',
                        titleTextStyle: { color: '#1f77b4', fontSize: 12 }
                    },
                    1: {
                        title: '방문자수 (명)',
                        titleTextStyle: { color: '#ff7f0e', fontSize: 12 }
                    }
                },
                series: {
                    0: { targetAxisIndex: 0, color: '#1f77b4', type: 'columns' },
                    1: { targetAxisIndex: 1, color: '#ff7f0e', type: 'line', lineWidth: 3, pointSize: 8 }
                },
                legend: {
                    position: 'top',
                    alignment: 'center'
                },
                backgroundColor: 'transparent',
                chartArea: {
                    left: 80,
                    top: 60,
                    width: '75%',
                    height: '70%'
                },
                animation: {
                    startup: true,
                    duration: 1000,
                    easing: 'out'
                }
            };

            const chart = new google.visualization.ComboChart(container);
            this.charts[containerId] = chart;

            chart.draw(data, options);
            this.hideLoading(container);

        } catch (error) {
            console.error('지역 차트 렌더링 실패:', error);
            this.showError(document.getElementById(containerId), '차트를 로드할 수 없습니다.');
        }
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