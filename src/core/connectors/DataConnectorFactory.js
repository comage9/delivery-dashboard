/**
 * 데이터 커넥터 팩토리
 * 다양한 데이터 소스에 대한 커넥터 생성을 담당
 */

import { CSVConnector } from './CSVConnector.js';
import { JSONConnector } from './JSONConnector.js';
import { APIConnector } from './APIConnector.js';
import { DatabaseConnector } from './DatabaseConnector.js';
import { WebSocketConnector } from './WebSocketConnector.js';
import { GoogleSheetsConnector } from './GoogleSheetsConnector.js';
import { ExcelConnector } from './ExcelConnector.js';
import { StreamConnector } from './StreamConnector.js';

import { DATA_SOURCE_TYPES } from '../UnifiedDataManager.js';

/**
 * 데이터 커넥터 팩토리 클래스
 */
export class DataConnectorFactory {
  static connectorRegistry = new Map([
    [DATA_SOURCE_TYPES.CSV, CSVConnector],
    [DATA_SOURCE_TYPES.JSON, JSONConnector],
    [DATA_SOURCE_TYPES.API, APIConnector],
    [DATA_SOURCE_TYPES.DATABASE, DatabaseConnector],
    [DATA_SOURCE_TYPES.WEBSOCKET, WebSocketConnector],
    [DATA_SOURCE_TYPES.GOOGLE_SHEETS, GoogleSheetsConnector],
    [DATA_SOURCE_TYPES.EXCEL, ExcelConnector],
    [DATA_SOURCE_TYPES.STREAM, StreamConnector]
  ]);

  /**
   * 커넥터 생성
   */
  static async createConnector(type, config) {
    const ConnectorClass = this.connectorRegistry.get(type);
    
    if (!ConnectorClass) {
      throw new Error(`지원하지 않는 데이터 소스 타입: ${type}`);
    }

    try {
      const connector = new ConnectorClass(config);
      
      // 커넥터 초기화
      if (connector.init) {
        await connector.init();
      }

      return connector;
      
    } catch (error) {
      throw new Error(`커넥터 생성 실패 (${type}): ${error.message}`);
    }
  }

  /**
   * 커넥터 등록
   */
  static registerConnector(type, ConnectorClass) {
    if (!ConnectorClass || typeof ConnectorClass !== 'function') {
      throw new Error('유효한 커넥터 클래스를 제공해야 합니다');
    }

    this.connectorRegistry.set(type, ConnectorClass);
  }

  /**
   * 등록된 커넥터 타입 목록 조회
   */
  static getRegisteredTypes() {
    return Array.from(this.connectorRegistry.keys());
  }

  /**
   * 커넥터 타입 지원 여부 확인
   */
  static isSupported(type) {
    return this.connectorRegistry.has(type);
  }
}

export default DataConnectorFactory;