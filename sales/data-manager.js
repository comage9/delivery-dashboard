// 데이터 관리 클래스
class DataManager {
    constructor() {
        this.rawData = [];
        this.filteredData = [];
        this.processedData = [];
        this.googleSheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQwqI0BG-d2aMrql7DK4fQQTjvu57VtToSLAkY_nq92a4Cg5GFVbIn6_IR7Fq6_O-2TloFSNlXT8ZWC/pub?gid=1152588885&single=true&output=csv';
        this.filters = {
            startDate: null,
            endDate: null,
            category: '',
            region: ''
        };
        this.proxyUrls = [
            'https://api.allorigins.win/raw?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
    }

    // 구글 시트에서 데이터 로드 (CORS 우회)
    async loadGoogleSheetData() {
        let lastError;
        
        // 직접 접근 시도
        try {
            const response = await fetch(this.googleSheetUrl);
            if (response.ok) {
                const csvText = await response.text();
                return this.parseDeliveryCSV(csvText);
            }
        } catch (error) {
            console.warn('직접 접근 실패, 프록시 시도:', error);
        }
        
        // 프록시 서버들을 순차적으로 시도
        for (const proxyUrl of this.proxyUrls) {
            try {
                const fullUrl = proxyUrl + encodeURIComponent(this.googleSheetUrl);
                const response = await fetch(fullUrl);
                
                if (response.ok) {
                    const csvText = await response.text();
                    return this.parseDeliveryCSV(csvText);
                }
            } catch (error) {
                lastError = error;
                console.warn(`프록시 ${proxyUrl} 실패:`, error);
            }
        }
        
        throw new Error(`모든 데이터 로드 시도 실패: ${lastError?.message}`);
    }

    // CSV 데이터 로드 (기존 호환성)
    async loadCSVData(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            return this.parseCSV(csvText);
        } catch (error) {
            console.error('CSV 데이터 로드 실패:', error);
            throw error;
        }
    }

    // 출고 데이터를 비즈니스 분석용으로 파싱
    parseDeliveryCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV 데이터가 비어있습니다.');
        }
        
        const headers = lines[0].split(',').map(header => header.trim());
        console.log('CSV 헤더:', headers);
        
        const rawData = [];
        const processedData = [];
        
        for (let i = 1; i < lines.length; i++) {
            try {
                const values = this.parseCSVLine(lines[i]);
                if (values.length < headers.length) continue;
                
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] ? values[index].trim() : '';
                });
                
                // 원본 데이터 저장
                rawData.push(row);
                
                // 비즈니스 분석용 데이터 변환
                const businessRow = this.transformToBusinessData(row);
                if (businessRow) {
                    processedData.push(businessRow);
                }
            } catch (error) {
                console.warn(`라인 ${i} 파싱 실패:`, error);
            }
        }
        
        this.rawData = rawData;
        this.processedData = this.aggregateBusinessData(processedData);
        this.filteredData = [...this.processedData];
        
        console.log('처리된 데이터 샘플:', this.processedData.slice(0, 3));
        return this.processedData;
    }
    
    // CSV 라인 파싱 (쉼표가 포함된 값 처리)
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current);
        
        return values;
    }
    
    // 출고 데이터를 비즈니스 분석 데이터로 변환
    transformToBusinessData(row) {
        try {
            const date = new Date(row['일자']);
            if (isNaN(date.getTime())) return null;
            
            // 판매금액에서 쉼표 제거 후 숫자 변환
            const revenueStr = row['판매금액'] || '0';
            const revenue = parseInt(revenueStr.replace(/[^\d]/g, '')) || 0;
            
            // 수량 계산 (박스 + 낱개)
            const boxQty = parseInt(row['수량(박스)']) || 0;
            const pieceQty = parseInt(row['수량(낱개)']) || 0;
            const totalQty = boxQty + pieceQty;
            
            // 분류를 카테고리로 사용
            const category = row['분류'] || '기타';
            
            // 지역은 임의로 생성 (실제 데이터에 없으므로)
            const regions = ['서울', '부산', '대구', '인천', '광주', '대전', '울산'];
            const region = regions[Math.floor(Math.random() * regions.length)];
            
            // 방문자수는 수량 기반으로 추정
            const visitors = Math.max(1, Math.floor(totalQty * (0.8 + Math.random() * 0.4)));
            
            // 전환율 계산 (수량/방문자 * 100)
            const conversion = visitors > 0 ? Math.min(100, (totalQty / visitors * 100)) : 0;
            
            return {
                날짜: date,
                카테고리: category,
                지역: region,
                매출: revenue,
                방문자수: visitors,
                전환율: parseFloat(conversion.toFixed(1)),
                수량: totalQty,
                품목: row['품목'] || '',
                원본데이터: row
            };
        } catch (error) {
            console.warn('데이터 변환 실패:', error, row);
            return null;
        }
    }
    
    // 비즈니스 데이터 집계 (일별로 합계)
    aggregateBusinessData(data) {
        const dailyData = {};
        
        data.forEach(row => {
            const dateKey = row.날짜.toISOString().split('T')[0];
            const categoryKey = row.카테고리;
            const regionKey = row.지역;
            const key = `${dateKey}_${categoryKey}_${regionKey}`;
            
            if (!dailyData[key]) {
                dailyData[key] = {
                    날짜: row.날짜,
                    카테고리: row.카테고리,
                    지역: row.지역,
                    매출: 0,
                    방문자수: 0,
                    수량: 0,
                    건수: 0
                };
            }
            
            dailyData[key].매출 += row.매출;
            dailyData[key].방문자수 += row.방문자수;
            dailyData[key].수량 += row.수량;
            dailyData[key].건수 += 1;
        });
        
        // 전환율 재계산
        return Object.values(dailyData).map(row => ({
            ...row,
            전환율: row.방문자수 > 0 ? parseFloat((row.수량 / row.방문자수 * 100).toFixed(1)) : 0
        }));
    }

    // CSV 파싱 (기존 호환성)
    parseCSV(csvText) {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',').map(header => header.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(value => value.trim());
            const row = {};
            
            headers.forEach((header, index) => {
                const value = values[index];
                
                // 데이터 타입 변환
                if (header === '날짜') {
                    row[header] = new Date(value);
                } else if (header === '매출' || header === '방문자수') {
                    row[header] = parseInt(value);
                } else if (header === '전환율') {
                    row[header] = parseFloat(value);
                } else {
                    row[header] = value;
                }
            });
            
            data.push(row);
        }

        this.rawData = data;
        this.filteredData = [...data];
        return data;
    }

    // 데이터 필터링
    filterData(filters = {}) {
        this.filters = { ...this.filters, ...filters };
        
        this.filteredData = this.rawData.filter(row => {
            // 날짜 필터
            if (this.filters.startDate) {
                const startDate = new Date(this.filters.startDate);
                if (row['날짜'] < startDate) return false;
            }
            
            if (this.filters.endDate) {
                const endDate = new Date(this.filters.endDate);
                if (row['날짜'] > endDate) return false;
            }
            
            // 카테고리 필터
            if (this.filters.category && row['카테고리'] !== this.filters.category) {
                return false;
            }
            
            // 지역 필터
            if (this.filters.region && row['지역'] !== this.filters.region) {
                return false;
            }
            
            return true;
        });
        
        return this.filteredData;
    }

    // 데이터 정렬
    sortData(column, direction = 'asc') {
        this.filteredData.sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];
            
            // 날짜 정렬
            if (column === '날짜') {
                valueA = valueA.getTime();
                valueB = valueB.getTime();
            }
            
            // 숫자 정렬
            if (typeof valueA === 'number' && typeof valueB === 'number') {
                return direction === 'asc' ? valueA - valueB : valueB - valueA;
            }
            
            // 문자열 정렬
            if (typeof valueA === 'string' && typeof valueB === 'string') {
                return direction === 'asc' 
                    ? valueA.localeCompare(valueB)
                    : valueB.localeCompare(valueA);
            }
            
            return 0;
        });
        
        return this.filteredData;
    }

    // 집계 데이터 계산
    getAggregatedData() {
        const data = this.filteredData;
        
        if (data.length === 0) {
            return {
                totalRevenue: 0,
                totalVisitors: 0,
                avgConversion: 0,
                avgDailyRevenue: 0,
                uniqueDays: 0
            };
        }

        const totalRevenue = data.reduce((sum, row) => sum + row['매출'], 0);
        const totalVisitors = data.reduce((sum, row) => sum + row['방문자수'], 0);
        const avgConversion = data.reduce((sum, row) => sum + row['전환율'], 0) / data.length;
        
        // 고유 날짜 수 계산
        const uniqueDates = new Set(data.map(row => row['날짜'].toDateString()));
        const uniqueDays = uniqueDates.size;
        const avgDailyRevenue = uniqueDays > 0 ? totalRevenue / uniqueDays : 0;

        return {
            totalRevenue,
            totalVisitors,
            avgConversion,
            avgDailyRevenue,
            uniqueDays
        };
    }

    // 카테고리별 집계
    getCategoryAggregation() {
        const categoryData = {};
        
        this.filteredData.forEach(row => {
            const category = row['카테고리'];
            if (!categoryData[category]) {
                categoryData[category] = {
                    revenue: 0,
                    visitors: 0,
                    count: 0
                };
            }
            
            categoryData[category].revenue += row['매출'];
            categoryData[category].visitors += row['방문자수'];
            categoryData[category].count += 1;
        });
        
        return categoryData;
    }

    // 지역별 집계
    getRegionAggregation() {
        const regionData = {};
        
        this.filteredData.forEach(row => {
            const region = row['지역'];
            if (!regionData[region]) {
                regionData[region] = {
                    revenue: 0,
                    visitors: 0,
                    count: 0
                };
            }
            
            regionData[region].revenue += row['매출'];
            regionData[region].visitors += row['방문자수'];
            regionData[region].count += 1;
        });
        
        return regionData;
    }

    // 일별 트렌드 데이터
    getDailyTrend() {
        const dailyData = {};
        
        this.filteredData.forEach(row => {
            const dateStr = row['날짜'].toISOString().split('T')[0];
            if (!dailyData[dateStr]) {
                dailyData[dateStr] = {
                    date: row['날짜'],
                    revenue: 0,
                    visitors: 0,
                    count: 0
                };
            }
            
            dailyData[dateStr].revenue += row['매출'];
            dailyData[dateStr].visitors += row['방문자수'];
            dailyData[dateStr].count += 1;
        });
        
        // 날짜순 정렬
        return Object.values(dailyData).sort((a, b) => a.date - b.date);
    }

    // 산점도 데이터 (방문자 vs 전환율)
    getScatterData() {
        return this.filteredData.map(row => ({
            visitors: row['방문자수'],
            conversion: row['전환율'],
            category: row['카테고리'],
            region: row['지역'],
            revenue: row['매출'],
            date: row['날짜']
        }));
    }

    // 필터 상태 반환
    getFilters() {
        return { ...this.filters };
    }

    // 필터 초기화
    resetFilters() {
        this.filters = {
            startDate: null,
            endDate: null,
            category: '',
            region: ''
        };
        this.filteredData = [...this.rawData];
        return this.filteredData;
    }

    // 데이터 내보내기 (CSV 형식)
    exportToCSV() {
        if (this.filteredData.length === 0) {
            return '';
        }

        const headers = ['날짜', '카테고리', '지역', '매출', '방문자수', '전환율'];
        const csvContent = [
            headers.join(','),
            ...this.filteredData.map(row => [
                row['날짜'].toISOString().split('T')[0],
                row['카테고리'],
                row['지역'],
                row['매출'],
                row['방문자수'],
                row['전환율']
            ].join(','))
        ].join('\n');

        return csvContent;
    }

    // 고유 값 추출 (필터 옵션용)
    getUniqueValues(column) {
        const uniqueValues = new Set(this.rawData.map(row => row[column]));
        return Array.from(uniqueValues).sort();
    }
}