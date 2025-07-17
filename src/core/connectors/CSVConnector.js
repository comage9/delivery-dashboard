/**
 * CSV 데이터 커넥터
 * CSV 파일 및 CSV 형태의 데이터를 처리하는 커넥터
 */

import { BaseConnector } from './BaseConnector.js';
import { DataSchema } from '../UnifiedDataManager.js';

export class CSVConnector extends BaseConnector {
  constructor(config) {
    super(config);
    
    this.url = config.url;
    this.delimiter = config.delimiter || ',';
    this.encoding = config.encoding || 'utf-8';
    this.hasHeaders = config.hasHeaders !== false;
    this.skipEmptyLines = config.skipEmptyLines !== false;
    this.proxyUrls = config.proxyUrls || [
      'https://api.allorigins.win/get?url=',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://cors-anywhere.herokuapp.com/'
    ];
    
    // 캐시된 데이터
    this.cachedData = null;
    this.lastFetchTime = null;
    this.cacheDuration = config.cacheDuration || 300000; // 5분
  }

  /**
   * 연결 테스트
   */
  async connect() {
    try {
      await this.fetchData();
      this.status = 'connected';
      console.log('CSV 커넥터 연결 성공');
    } catch (error) {
      this.status = 'error';
      throw new Error(`CSV 커넥터 연결 실패: ${error.message}`);
    }
  }

  /**
   * 연결 해제
   */
  async disconnect() {
    this.status = 'disconnected';
    this.cachedData = null;
    this.lastFetchTime = null;
    console.log('CSV 커넥터 연결 해제');
  }

  /**
   * 데이터 조회
   */
  async query(queryParams = {}) {
    try {
      // 캐시 확인
      if (this.isCacheValid()) {
        console.log('CSV 데이터 캐시 사용');
        return this.applyQuery(this.cachedData, queryParams);
      }

      // 데이터 fetch
      const rawData = await this.fetchData();
      const parsedData = this.parseCSV(rawData);
      
      // 캐시 저장
      this.cachedData = parsedData;
      this.lastFetchTime = Date.now();

      return this.applyQuery(parsedData, queryParams);
      
    } catch (error) {
      throw new Error(`CSV 데이터 조회 실패: ${error.message}`);
    }
  }

  /**
   * 스키마 추론
   */
  async inferSchema() {
    try {
      const data = await this.query();
      
      if (!data || data.length === 0) {
        throw new Error('스키마 추론을 위한 데이터가 없습니다');
      }

      const schema = new DataSchema();
      const firstRow = data[0];

      // 각 필드의 타입 추론
      for (const [fieldName, value] of Object.entries(firstRow)) {
        const inferredType = this.inferFieldType(fieldName, data);
        
        schema.addField(fieldName, inferredType.type, {
          nullable: inferredType.nullable,
          format: inferredType.format
        });
      }

      return schema;
      
    } catch (error) {
      throw new Error(`스키마 추론 실패: ${error.message}`);
    }
  }

  /**
   * 실시간 지원 여부
   */
  supportsRealtime() {
    return false; // CSV는 실시간 지원 안함
  }

  // === 내부 메소드 ===

  /**
   * 데이터 fetch
   */
  async fetchData() {
    if (!this.url) {
      throw new Error('CSV URL이 설정되지 않았습니다');
    }

    let lastError = null;

    // 프록시 URL들을 순차적으로 시도
    for (const proxyUrl of this.proxyUrls) {
      try {
        console.log(`CSV 데이터 로딩 시도: ${proxyUrl}`);
        
        const fullUrl = proxyUrl + encodeURIComponent(this.url);
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'text/csv',
            'Accept': 'text/csv,text/plain,*/*'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let csvText;
        
        // allorigins는 JSON 형태로 반환
        if (proxyUrl.includes('allorigins.win')) {
          const jsonData = await response.json();
          csvText = jsonData.contents;
        } else {
          csvText = await response.text();
        }

        // Base64 인코딩 확인 및 디코딩
        if (csvText.startsWith('data:text/csv;base64,')) {
          const base64Data = csvText.replace('data:text/csv;base64,', '');
          csvText = atob(base64Data);
        }

        console.log(`CSV 데이터 로딩 성공: ${csvText.length} 문자`);
        return csvText;
        
      } catch (error) {
        lastError = error;
        console.warn(`프록시 실패: ${proxyUrl}`, error.message);
        continue;
      }
    }

    throw new Error(`모든 프록시 서비스 실패. 마지막 오류: ${lastError?.message}`);
  }

  /**
   * CSV 파싱
   */
  parseCSV(csvText) {
    if (!csvText || csvText.trim() === '') {
      throw new Error('CSV 데이터가 비어있습니다');
    }

    const lines = csvText.trim().split('\n');
    
    if (lines.length === 0) {
      throw new Error('CSV 라인이 없습니다');
    }

    let headers = [];
    let startIndex = 0;

    // 헤더 처리
    if (this.hasHeaders) {
      headers = this.parseCSVLine(lines[0]);
      startIndex = 1;
    } else {
      // 첫 번째 행을 기준으로 헤더 생성
      const firstLine = this.parseCSVLine(lines[0]);
      headers = firstLine.map((_, index) => `column_${index}`);
    }

    const data = [];

    // 데이터 행 처리
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (this.skipEmptyLines && line === '') {
        continue;
      }

      const values = this.parseCSVLine(line);
      
      if (values.length === headers.length) {
        const row = {};
        
        headers.forEach((header, index) => {
          row[header] = this.convertValue(values[index]);
        });
        
        data.push(row);
      }
    }

    console.log(`CSV 파싱 완료: ${data.length}개 레코드`);
    return data;
  }

  /**
   * CSV 라인 파싱
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // 이스케이프된 따옴표
          current += '"';
          i += 2;
        } else {
          // 따옴표 토글
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === this.delimiter && !inQuotes) {
        // 구분자 발견
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // 마지막 필드 추가
    result.push(current.trim());
    
    return result;
  }

  /**
   * 값 변환
   */
  convertValue(value) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // 문자열 정리
    value = value.toString().trim();
    
    // 따옴표 제거
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    // 숫자 변환 시도
    if (!isNaN(value) && !isNaN(parseFloat(value))) {
      const num = parseFloat(value);
      return Number.isInteger(num) ? parseInt(value) : num;
    }

    // 날짜 변환 시도
    if (this.isDateString(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // 불린 변환 시도
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === 'false') {
      return lowerValue === 'true';
    }

    return value;
  }

  /**
   * 날짜 문자열 확인
   */
  isDateString(value) {
    // 간단한 날짜 형식 패턴
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
      /^\d{4}\/\d{2}\/\d{2}$/,         // YYYY/MM/DD
      /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, // ISO 8601
      /^\d{4}\.\d{2}\.\d{2}$/          // YYYY.MM.DD
    ];

    return datePatterns.some(pattern => pattern.test(value));
  }

  /**
   * 필드 타입 추론
   */
  inferFieldType(fieldName, data) {
    const values = data.map(row => row[fieldName]).filter(v => v !== null && v !== undefined);
    
    if (values.length === 0) {
      return { type: 'string', nullable: true };
    }

    const typeCount = {
      number: 0,
      date: 0,
      boolean: 0,
      string: 0
    };

    let format = null;

    for (const value of values) {
      if (typeof value === 'number') {
        typeCount.number++;
      } else if (value instanceof Date) {
        typeCount.date++;
      } else if (typeof value === 'boolean') {
        typeCount.boolean++;
      } else {
        typeCount.string++;
      }
    }

    // 가장 많은 타입을 선택
    const maxType = Object.keys(typeCount).reduce((a, b) => 
      typeCount[a] > typeCount[b] ? a : b
    );

    // 날짜 포맷 추론
    if (maxType === 'date') {
      const dateValue = values.find(v => v instanceof Date);
      if (dateValue) {
        format = 'YYYY-MM-DD';
      }
    }

    return {
      type: maxType,
      nullable: values.length < data.length,
      format
    };
  }

  /**
   * 캐시 유효성 확인
   */
  isCacheValid() {
    if (!this.cachedData || !this.lastFetchTime) {
      return false;
    }

    return (Date.now() - this.lastFetchTime) < this.cacheDuration;
  }

  /**
   * 쿼리 적용
   */
  applyQuery(data, queryParams) {
    let result = [...data];

    // 필터링
    if (queryParams.filters && queryParams.filters.length > 0) {
      result = result.filter(row => {
        return queryParams.filters.every(filter => {
          const fieldValue = row[filter.field];
          return this.applyFilter(fieldValue, filter.operator, filter.value);
        });
      });
    }

    // 정렬
    if (queryParams.sorts && queryParams.sorts.length > 0) {
      result = result.sort((a, b) => {
        for (const sort of queryParams.sorts) {
          const aValue = a[sort.field];
          const bValue = b[sort.field];
          
          let comparison = 0;
          
          if (aValue < bValue) comparison = -1;
          else if (aValue > bValue) comparison = 1;
          
          if (comparison !== 0) {
            return sort.direction === 'desc' ? -comparison : comparison;
          }
        }
        return 0;
      });
    }

    // 필드 선택
    if (queryParams.fields && queryParams.fields.length > 0) {
      result = result.map(row => {
        const newRow = {};
        queryParams.fields.forEach(field => {
          newRow[field] = row[field];
        });
        return newRow;
      });
    }

    // 오프셋
    if (queryParams.offset) {
      result = result.slice(queryParams.offset);
    }

    // 제한
    if (queryParams.limit) {
      result = result.slice(0, queryParams.limit);
    }

    return result;
  }

  /**
   * 필터 적용
   */
  applyFilter(value, operator, filterValue) {
    switch (operator) {
      case 'eq':
        return value === filterValue;
      case 'ne':
        return value !== filterValue;
      case 'gt':
        return value > filterValue;
      case 'gte':
        return value >= filterValue;
      case 'lt':
        return value < filterValue;
      case 'lte':
        return value <= filterValue;
      case 'contains':
        return value && value.toString().includes(filterValue);
      case 'startsWith':
        return value && value.toString().startsWith(filterValue);
      case 'endsWith':
        return value && value.toString().endsWith(filterValue);
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(value);
      case 'notIn':
        return Array.isArray(filterValue) && !filterValue.includes(value);
      default:
        return true;
    }
  }
}

export default CSVConnector;