// CSV 로더 클래스
class CSVLoader {
    constructor(defaultUrl = '') {
        this.defaultUrl = defaultUrl;
    }

    async loadCSV(url) {
        try {
            // CORS 문제를 해결하기 위해 프록시 서비스 사용
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return this.parseCSVText(data.contents);
        } catch (error) {
            console.error('CSV 로드 오류:', error);
            throw new Error(`CSV 파일을 로드할 수 없습니다: ${error.message}`);
        }
    }

    parseCSVText(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length === 0) {
            throw new Error('CSV 파일이 비어있습니다');
        }

        const headers = this.parseCSVLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }

        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    validateURL(url) {
        try {
            new URL(url);
            return url.includes('docs.google.com') || url.includes('.csv');
        } catch {
            return false;
        }
    }
}

// 대시보드 클래스
class Dashboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.currentData = [];
    }

    renderTable(data) {
        if (!data || data.length === 0) {
            this.showEmptyState();
            return;
        }

        this.currentData = data;
        const headers = Object.keys(data[0]);
        
        // 테이블 헤더 생성
        const tableHead = document.getElementById('tableHead');
        tableHead.innerHTML = `
            <tr>
                ${headers.map(header => `<th class="font-semibold">${this.escapeHtml(header)}</th>`).join('')}
            </tr>
        `;

        // 테이블 바디 생성
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = data.map(row => `
            <tr>
                ${headers.map(header => `<td>${this.escapeHtml(String(row[header] || ''))}</td>`).join('')}
            </tr>
        `).join('');

        // 테이블에 애니메이션 클래스 추가
        const table = document.getElementById('dataTable');
        table.classList.add('table-animate');

        // 통계 업데이트
        this.updateStats(data, headers);
    }

    updateStats(data, headers) {
        document.getElementById('totalRows').textContent = data.length;
        document.getElementById('totalColumns').textContent = headers.length;
        document.getElementById('lastUpdate').textContent = new Date().toLocaleString('ko-KR');
        
        const statsSection = document.getElementById('statsSection');
        statsSection.classList.remove('hidden');
    }

    showEmptyState() {
        const tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="100%" class="text-center text-gray-500 py-8">
                    데이터가 없습니다
                </td>
            </tr>
        `;
        
        const statsSection = document.getElementById('statsSection');
        statsSection.classList.add('hidden');
    }

    showLoading() {
        const indicator = document.getElementById('loadingIndicator');
        indicator.classList.remove('hidden');
    }

    hideLoading() {
        const indicator = document.getElementById('loadingIndicator');
        indicator.classList.add('hidden');
    }

    showError(message) {
        const errorAlert = document.getElementById('errorAlert');
        const errorMessage = document.getElementById('errorMessage');
        
        errorMessage.textContent = message;
        errorAlert.classList.remove('hidden');
        
        // 5초 후 자동으로 숨기기
        setTimeout(() => {
            errorAlert.classList.add('hidden');
        }, 5000);
    }

    hideError() {
        const errorAlert = document.getElementById('errorAlert');
        errorAlert.classList.add('hidden');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 메인 애플리케이션 클래스
class App {
    constructor() {
        // 기본 구글 시트 CSV URL (예시)
        this.defaultCSVUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/export?format=csv';
        this.csvLoader = new CSVLoader(this.defaultCSVUrl);
        this.dashboard = new Dashboard('dataTable');
        this.currentUrl = this.defaultCSVUrl;
    }

    async init() {
        this.setupEventListeners();
        this.setupDefaultURL();
        
        // 페이지 로드 시 자동으로 기본 데이터 로드
        if (this.defaultCSVUrl) {
            await this.loadData(this.defaultCSVUrl);
        }
    }

    setupEventListeners() {
        // URL 입력 필드에서 Enter 키 처리
        const urlInput = document.getElementById('csvUrl');
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadCustomURL();
            }
        });

        // URL 입력 필드 변경 시 에러 메시지 숨기기
        urlInput.addEventListener('input', () => {
            this.dashboard.hideError();
        });
    }

    setupDefaultURL() {
        const urlInput = document.getElementById('csvUrl');
        urlInput.value = this.defaultCSVUrl;
        urlInput.placeholder = this.defaultCSVUrl;
    }

    async loadData(url = this.currentUrl) {
        try {
            this.dashboard.showLoading();
            this.dashboard.hideError();
            
            if (!this.csvLoader.validateURL(url)) {
                throw new Error('올바른 URL 형식이 아닙니다. 구글 시트 CSV URL을 입력해주세요.');
            }

            const data = await this.csvLoader.loadCSV(url);
            this.dashboard.renderTable(data);
            this.currentUrl = url;
            
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            this.dashboard.showError(error.message);
            this.dashboard.showEmptyState();
        } finally {
            this.dashboard.hideLoading();
        }
    }

    async loadCustomURL() {
        const urlInput = document.getElementById('csvUrl');
        const url = urlInput.value.trim();
        
        if (!url) {
            this.dashboard.showError('URL을 입력해주세요.');
            return;
        }

        await this.loadData(url);
    }

    async refreshData() {
        await this.loadData(this.currentUrl);
    }

    exportToCSV() {
        if (!this.dashboard.currentData || this.dashboard.currentData.length === 0) {
            this.dashboard.showError('내보낼 데이터가 없습니다.');
            return;
        }

        const data = this.dashboard.currentData;
        const headers = Object.keys(data[0]);
        
        let csvContent = headers.join(',') + '\n';
        csvContent += data.map(row => 
            headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        this.downloadFile(csvContent, 'data.csv', 'text/csv');
    }

    exportToJSON() {
        if (!this.dashboard.currentData || this.dashboard.currentData.length === 0) {
            this.dashboard.showError('내보낼 데이터가 없습니다.');
            return;
        }

        const jsonContent = JSON.stringify(this.dashboard.currentData, null, 2);
        this.downloadFile(jsonContent, 'data.json', 'application/json');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 전역 앱 인스턴스 생성 및 초기화
const app = new App();

// DOM 로드 완료 후 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// 전역 스코프에 app 노출 (HTML에서 onclick 이벤트 사용을 위해)
window.app = app;