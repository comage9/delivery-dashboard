// 데이터 관리 클래스
export class DataManager {
    constructor() {
        this.rawData = [];
        this.filteredData = [];
        this.filters = {
            startDate: null,
            endDate: null,
            category: '',
            region: ''
        };
    }

    // CSV 데이터 로드
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

    // CSV 파싱
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