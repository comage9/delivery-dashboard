/**
 * 데이터 변환기
 * 다양한 데이터 변환 및 조작 기능 제공
 */

export class DataTransformer {
  constructor() {
    this.transformers = new Map();
    this.setupDefaultTransformers();
  }

  /**
   * 기본 변환기 설정
   */
  setupDefaultTransformers() {
    // 필드 선택
    this.transformers.set('select', (data, options) => {
      const { fields } = options;
      
      if (!Array.isArray(fields)) {
        throw new Error('select 변환은 fields 배열이 필요합니다');
      }

      return data.map(record => {
        const newRecord = {};
        fields.forEach(field => {
          newRecord[field] = record[field];
        });
        return newRecord;
      });
    });

    // 필드 제외
    this.transformers.set('exclude', (data, options) => {
      const { fields } = options;
      
      if (!Array.isArray(fields)) {
        throw new Error('exclude 변환은 fields 배열이 필요합니다');
      }

      return data.map(record => {
        const newRecord = { ...record };
        fields.forEach(field => {
          delete newRecord[field];
        });
        return newRecord;
      });
    });

    // 필드 이름 변경
    this.transformers.set('rename', (data, options) => {
      const { mapping } = options;
      
      if (!mapping || typeof mapping !== 'object') {
        throw new Error('rename 변환은 mapping 객체가 필요합니다');
      }

      return data.map(record => {
        const newRecord = {};
        
        Object.keys(record).forEach(field => {
          const newFieldName = mapping[field] || field;
          newRecord[newFieldName] = record[field];
        });
        
        return newRecord;
      });
    });

    // 필드 계산 (computed field)
    this.transformers.set('compute', (data, options) => {
      const { field, expression } = options;
      
      if (!field || !expression) {
        throw new Error('compute 변환은 field와 expression이 필요합니다');
      }

      return data.map(record => {
        const newRecord = { ...record };
        
        try {
          if (typeof expression === 'function') {
            newRecord[field] = expression(record);
          } else {
            // 간단한 수식 평가 (보안상 제한적)
            newRecord[field] = this.evaluateExpression(expression, record);
          }
        } catch (error) {
          console.warn(`계산 필드 '${field}' 생성 실패:`, error);
          newRecord[field] = null;
        }
        
        return newRecord;
      });
    });

    // 필터링
    this.transformers.set('filter', (data, options) => {
      const { condition } = options;
      
      if (!condition) {
        throw new Error('filter 변환은 condition이 필요합니다');
      }

      return data.filter(record => {
        try {
          if (typeof condition === 'function') {
            return condition(record);
          } else {
            return this.evaluateCondition(condition, record);
          }
        } catch (error) {
          console.warn('필터 조건 평가 실패:', error);
          return false;
        }
      });
    });

    // 정렬
    this.transformers.set('sort', (data, options) => {
      const { field, direction = 'asc' } = options;
      
      if (!field) {
        throw new Error('sort 변환은 field가 필요합니다');
      }

      return [...data].sort((a, b) => {
        const aValue = a[field];
        const bValue = b[field];
        
        let comparison = 0;
        
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        return direction === 'desc' ? -comparison : comparison;
      });
    });

    // 그룹화
    this.transformers.set('group', (data, options) => {
      const { field, aggregations = {} } = options;
      
      if (!field) {
        throw new Error('group 변환은 field가 필요합니다');
      }

      const groups = {};
      
      // 그룹 분류
      data.forEach(record => {
        const groupKey = record[field];
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        
        groups[groupKey].push(record);
      });

      // 집계 계산
      const result = [];
      
      Object.keys(groups).forEach(groupKey => {
        const groupRecords = groups[groupKey];
        const aggregatedRecord = {
          [field]: groupKey,
          _count: groupRecords.length
        };

        // 집계 함수 적용
        Object.keys(aggregations).forEach(aggField => {
          const aggFunc = aggregations[aggField];
          const values = groupRecords.map(r => r[aggField]).filter(v => v !== null && v !== undefined);
          
          aggregatedRecord[aggField] = this.applyAggregation(values, aggFunc);
        });

        result.push(aggregatedRecord);
      });

      return result;
    });

    // 타입 변환
    this.transformers.set('cast', (data, options) => {
      const { field, type } = options;
      
      if (!field || !type) {
        throw new Error('cast 변환은 field와 type이 필요합니다');
      }

      return data.map(record => {
        const newRecord = { ...record };
        
        try {
          newRecord[field] = this.castValue(record[field], type);
        } catch (error) {
          console.warn(`타입 변환 실패 (${field}):`, error);
          newRecord[field] = null;
        }
        
        return newRecord;
      });
    });

    // 중복 제거
    this.transformers.set('distinct', (data, options) => {
      const { field } = options;
      
      if (field) {
        // 특정 필드 기준 중복 제거
        const seen = new Set();
        return data.filter(record => {
          const value = record[field];
          if (seen.has(value)) {
            return false;
          }
          seen.add(value);
          return true;
        });
      } else {
        // 전체 레코드 중복 제거
        const seen = new Set();
        return data.filter(record => {
          const key = JSON.stringify(record);
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
      }
    });

    // 제한
    this.transformers.set('limit', (data, options) => {
      const { count, offset = 0 } = options;
      
      if (!count) {
        throw new Error('limit 변환은 count가 필요합니다');
      }

      return data.slice(offset, offset + count);
    });

    // 조인 (단순 버전)
    this.transformers.set('join', (data, options) => {
      const { rightData, leftKey, rightKey, type = 'inner' } = options;
      
      if (!rightData || !leftKey || !rightKey) {
        throw new Error('join 변환은 rightData, leftKey, rightKey가 필요합니다');
      }

      const result = [];
      
      // 우측 데이터 인덱싱
      const rightIndex = {};
      rightData.forEach(record => {
        const key = record[rightKey];
        if (!rightIndex[key]) {
          rightIndex[key] = [];
        }
        rightIndex[key].push(record);
      });

      // 조인 수행
      data.forEach(leftRecord => {
        const key = leftRecord[leftKey];
        const rightRecords = rightIndex[key] || [];
        
        if (rightRecords.length > 0) {
          // 매칭되는 레코드가 있는 경우
          rightRecords.forEach(rightRecord => {
            result.push({ ...leftRecord, ...rightRecord });
          });
        } else if (type === 'left') {
          // 좌측 조인인 경우 좌측 레코드만 포함
          result.push(leftRecord);
        }
      });

      return result;
    });
  }

  /**
   * 데이터 변환
   */
  async transform(data, transformConfig) {
    if (!Array.isArray(data)) {
      throw new Error('데이터는 배열이어야 합니다');
    }

    let result = [...data];

    // 변환 설정이 배열인 경우 순차 적용
    if (Array.isArray(transformConfig)) {
      for (const config of transformConfig) {
        result = await this.applyTransform(result, config);
      }
    } else {
      result = await this.applyTransform(result, transformConfig);
    }

    return result;
  }

  /**
   * 단일 변환 적용
   */
  async applyTransform(data, config) {
    const { type, ...options } = config;
    
    if (!type) {
      throw new Error('변환 타입이 필요합니다');
    }

    const transformer = this.transformers.get(type);
    
    if (!transformer) {
      throw new Error(`지원하지 않는 변환 타입: ${type}`);
    }

    try {
      return await transformer(data, options);
    } catch (error) {
      throw new Error(`변환 실패 (${type}): ${error.message}`);
    }
  }

  /**
   * 사용자 정의 변환기 등록
   */
  registerTransformer(type, transformer) {
    if (typeof transformer !== 'function') {
      throw new Error('변환기는 함수여야 합니다');
    }

    this.transformers.set(type, transformer);
  }

  /**
   * 변환기 제거
   */
  removeTransformer(type) {
    return this.transformers.delete(type);
  }

  /**
   * 등록된 변환기 목록 조회
   */
  getTransformerTypes() {
    return Array.from(this.transformers.keys());
  }

  // === 내부 유틸리티 메소드 ===

  /**
   * 집계 함수 적용
   */
  applyAggregation(values, func) {
    if (values.length === 0) return null;

    switch (func) {
      case 'sum':
        return values.reduce((sum, val) => sum + (Number(val) || 0), 0);
      case 'avg':
        return values.reduce((sum, val) => sum + (Number(val) || 0), 0) / values.length;
      case 'min':
        return Math.min(...values.map(v => Number(v)).filter(v => !isNaN(v)));
      case 'max':
        return Math.max(...values.map(v => Number(v)).filter(v => !isNaN(v)));
      case 'count':
        return values.length;
      case 'first':
        return values[0];
      case 'last':
        return values[values.length - 1];
      case 'concat':
        return values.join(', ');
      default:
        throw new Error(`지원하지 않는 집계 함수: ${func}`);
    }
  }

  /**
   * 값 타입 변환
   */
  castValue(value, type) {
    if (value === null || value === undefined) {
      return null;
    }

    switch (type) {
      case 'string':
        return String(value);
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`숫자로 변환할 수 없습니다: ${value}`);
        }
        return num;
      case 'integer':
        const int = parseInt(value);
        if (isNaN(int)) {
          throw new Error(`정수로 변환할 수 없습니다: ${value}`);
        }
        return int;
      case 'float':
        const float = parseFloat(value);
        if (isNaN(float)) {
          throw new Error(`실수로 변환할 수 없습니다: ${value}`);
        }
        return float;
      case 'boolean':
        if (typeof value === 'boolean') return value;
        const str = String(value).toLowerCase();
        return str === 'true' || str === '1' || str === 'yes';
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`날짜로 변환할 수 없습니다: ${value}`);
        }
        return date;
      default:
        throw new Error(`지원하지 않는 타입: ${type}`);
    }
  }

  /**
   * 간단한 수식 평가 (보안상 제한적)
   */
  evaluateExpression(expression, record) {
    // 매우 기본적인 수식 평가
    // 실제 구현에서는 더 안전한 expression evaluator 사용 권장
    
    let result = expression;
    
    // 필드 값 치환
    Object.keys(record).forEach(field => {
      const value = record[field];
      const regex = new RegExp(`\\{${field}\\}`, 'g');
      result = result.replace(regex, value);
    });

    // 기본 연산자만 허용
    if (!/^[0-9+\-*/().\s]+$/.test(result)) {
      throw new Error('허용되지 않는 문자가 포함된 수식입니다');
    }

    try {
      return Function(`"use strict"; return (${result})`)();
    } catch (error) {
      throw new Error(`수식 평가 실패: ${error.message}`);
    }
  }

  /**
   * 조건 평가
   */
  evaluateCondition(condition, record) {
    const { field, operator, value } = condition;
    
    if (!field || !operator) {
      throw new Error('조건에는 field와 operator가 필요합니다');
    }

    const fieldValue = record[field];

    switch (operator) {
      case '==':
        return fieldValue == value;
      case '===':
        return fieldValue === value;
      case '!=':
        return fieldValue != value;
      case '!==':
        return fieldValue !== value;
      case '>':
        return fieldValue > value;
      case '>=':
        return fieldValue >= value;
      case '<':
        return fieldValue < value;
      case '<=':
        return fieldValue <= value;
      case 'contains':
        return fieldValue && fieldValue.toString().includes(value);
      case 'startsWith':
        return fieldValue && fieldValue.toString().startsWith(value);
      case 'endsWith':
        return fieldValue && fieldValue.toString().endsWith(value);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'notIn':
        return Array.isArray(value) && !value.includes(fieldValue);
      default:
        throw new Error(`지원하지 않는 조건 연산자: ${operator}`);
    }
  }

  /**
   * 변환 파이프라인 생성
   */
  createPipeline(transforms) {
    return {
      transforms,
      async execute(data) {
        return await this.transform(data, transforms);
      }.bind(this)
    };
  }
}

export default DataTransformer;