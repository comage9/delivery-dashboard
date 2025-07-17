/**
 * 데이터 유효성 검사기
 * 스키마 기반 데이터 검증 및 타입 체크
 */

export class DataValidator {
  constructor() {
    this.validators = new Map();
    this.setupDefaultValidators();
  }

  /**
   * 기본 유효성 검사기 설정
   */
  setupDefaultValidators() {
    // 문자열 검사기
    this.validators.set('string', (value, options = {}) => {
      if (value === null || value === undefined) {
        return { valid: options.nullable || false, message: 'null 값은 허용되지 않습니다' };
      }

      const str = String(value);
      
      if (options.minLength && str.length < options.minLength) {
        return { valid: false, message: `최소 길이는 ${options.minLength}입니다` };
      }
      
      if (options.maxLength && str.length > options.maxLength) {
        return { valid: false, message: `최대 길이는 ${options.maxLength}입니다` };
      }
      
      if (options.pattern && !new RegExp(options.pattern).test(str)) {
        return { valid: false, message: `패턴에 맞지 않습니다: ${options.pattern}` };
      }
      
      return { valid: true };
    });

    // 숫자 검사기
    this.validators.set('number', (value, options = {}) => {
      if (value === null || value === undefined) {
        return { valid: options.nullable || false, message: 'null 값은 허용되지 않습니다' };
      }

      const num = Number(value);
      
      if (isNaN(num)) {
        return { valid: false, message: '유효한 숫자가 아닙니다' };
      }
      
      if (options.min !== undefined && num < options.min) {
        return { valid: false, message: `최소값은 ${options.min}입니다` };
      }
      
      if (options.max !== undefined && num > options.max) {
        return { valid: false, message: `최대값은 ${options.max}입니다` };
      }
      
      if (options.integer && !Number.isInteger(num)) {
        return { valid: false, message: '정수여야 합니다' };
      }
      
      return { valid: true };
    });

    // 날짜 검사기
    this.validators.set('date', (value, options = {}) => {
      if (value === null || value === undefined) {
        return { valid: options.nullable || false, message: 'null 값은 허용되지 않습니다' };
      }

      const date = new Date(value);
      
      if (isNaN(date.getTime())) {
        return { valid: false, message: '유효한 날짜가 아닙니다' };
      }
      
      if (options.min && date < new Date(options.min)) {
        return { valid: false, message: `최소 날짜는 ${options.min}입니다` };
      }
      
      if (options.max && date > new Date(options.max)) {
        return { valid: false, message: `최대 날짜는 ${options.max}입니다` };
      }
      
      return { valid: true };
    });

    // 불린 검사기
    this.validators.set('boolean', (value, options = {}) => {
      if (value === null || value === undefined) {
        return { valid: options.nullable || false, message: 'null 값은 허용되지 않습니다' };
      }

      if (typeof value !== 'boolean') {
        return { valid: false, message: '불린 값이어야 합니다' };
      }
      
      return { valid: true };
    });

    // 배열 검사기
    this.validators.set('array', (value, options = {}) => {
      if (value === null || value === undefined) {
        return { valid: options.nullable || false, message: 'null 값은 허용되지 않습니다' };
      }

      if (!Array.isArray(value)) {
        return { valid: false, message: '배열이어야 합니다' };
      }
      
      if (options.minLength && value.length < options.minLength) {
        return { valid: false, message: `최소 길이는 ${options.minLength}입니다` };
      }
      
      if (options.maxLength && value.length > options.maxLength) {
        return { valid: false, message: `최대 길이는 ${options.maxLength}입니다` };
      }
      
      return { valid: true };
    });

    // 이메일 검사기
    this.validators.set('email', (value, options = {}) => {
      if (value === null || value === undefined) {
        return { valid: options.nullable || false, message: 'null 값은 허용되지 않습니다' };
      }

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      if (!emailPattern.test(String(value))) {
        return { valid: false, message: '유효한 이메일 주소가 아닙니다' };
      }
      
      return { valid: true };
    });

    // URL 검사기
    this.validators.set('url', (value, options = {}) => {
      if (value === null || value === undefined) {
        return { valid: options.nullable || false, message: 'null 값은 허용되지 않습니다' };
      }

      try {
        new URL(value);
        return { valid: true };
      } catch {
        return { valid: false, message: '유효한 URL이 아닙니다' };
      }
    });
  }

  /**
   * 스키마에 대한 데이터 검증
   */
  static validateAgainstSchema(data, schema) {
    const validator = new DataValidator();
    return validator.validate(data, schema);
  }

  /**
   * 데이터 검증
   */
  validate(data, schema) {
    const errors = [];
    
    if (!Array.isArray(data)) {
      data = [data];
    }

    for (let i = 0; i < data.length; i++) {
      const record = data[i];
      const recordErrors = this.validateRecord(record, schema, i);
      
      if (recordErrors.length > 0) {
        errors.push(...recordErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      recordCount: data.length,
      errorCount: errors.length
    };
  }

  /**
   * 단일 레코드 검증
   */
  validateRecord(record, schema, recordIndex = 0) {
    const errors = [];

    // 스키마 필드 검증
    for (const field of schema.fields) {
      const value = record[field.name];
      const fieldErrors = this.validateField(
        field.name, 
        value, 
        field, 
        recordIndex
      );
      
      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
      }
    }

    // 추가 필드 검증 (스키마에 정의되지 않은 필드)
    for (const fieldName of Object.keys(record)) {
      const fieldExists = schema.fields.some(f => f.name === fieldName);
      
      if (!fieldExists) {
        errors.push({
          field: fieldName,
          record: recordIndex,
          type: 'unknown_field',
          message: `스키마에 정의되지 않은 필드입니다: ${fieldName}`
        });
      }
    }

    return errors;
  }

  /**
   * 필드 검증
   */
  validateField(fieldName, value, fieldSchema, recordIndex = 0) {
    const errors = [];

    // 필수 필드 검증
    if (!fieldSchema.nullable && (value === null || value === undefined)) {
      errors.push({
        field: fieldName,
        record: recordIndex,
        type: 'required',
        message: `필수 필드입니다: ${fieldName}`
      });
      return errors;
    }

    // null 값이면 더 이상 검증하지 않음
    if (value === null || value === undefined) {
      return errors;
    }

    // 타입 검증
    const validator = this.validators.get(fieldSchema.type);
    
    if (!validator) {
      errors.push({
        field: fieldName,
        record: recordIndex,
        type: 'unknown_type',
        message: `지원하지 않는 타입입니다: ${fieldSchema.type}`
      });
      return errors;
    }

    // 유효성 검사 실행
    const validationResult = validator(value, fieldSchema);
    
    if (!validationResult.valid) {
      errors.push({
        field: fieldName,
        record: recordIndex,
        type: 'validation',
        message: validationResult.message,
        value: value
      });
    }

    // 사용자 정의 검증 함수
    if (fieldSchema.validation && typeof fieldSchema.validation === 'function') {
      try {
        const customResult = fieldSchema.validation(value);
        
        if (!customResult.valid) {
          errors.push({
            field: fieldName,
            record: recordIndex,
            type: 'custom',
            message: customResult.message || '사용자 정의 검증 실패',
            value: value
          });
        }
      } catch (error) {
        errors.push({
          field: fieldName,
          record: recordIndex,
          type: 'custom_error',
          message: `사용자 정의 검증 함수 실행 오류: ${error.message}`,
          value: value
        });
      }
    }

    return errors;
  }

  /**
   * 사용자 정의 검증기 등록
   */
  registerValidator(type, validator) {
    if (typeof validator !== 'function') {
      throw new Error('검증기는 함수여야 합니다');
    }

    this.validators.set(type, validator);
  }

  /**
   * 검증기 제거
   */
  removeValidator(type) {
    return this.validators.delete(type);
  }

  /**
   * 등록된 검증기 목록 조회
   */
  getValidatorTypes() {
    return Array.from(this.validators.keys());
  }

  /**
   * 검증 결과 요약
   */
  static summarizeValidationResult(result) {
    const summary = {
      isValid: result.isValid,
      totalRecords: result.recordCount,
      totalErrors: result.errorCount,
      errorsByType: {},
      errorsByField: {}
    };

    // 타입별 오류 집계
    for (const error of result.errors) {
      summary.errorsByType[error.type] = (summary.errorsByType[error.type] || 0) + 1;
      summary.errorsByField[error.field] = (summary.errorsByField[error.field] || 0) + 1;
    }

    return summary;
  }

  /**
   * 검증 결과를 CSV 형태로 내보내기
   */
  static exportValidationErrors(result) {
    const headers = ['Record', 'Field', 'Type', 'Message', 'Value'];
    const rows = result.errors.map(error => [
      error.record,
      error.field,
      error.type,
      error.message,
      error.value || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  }
}

export default DataValidator;