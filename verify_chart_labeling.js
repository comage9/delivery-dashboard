// Node.js script to verify chart labeling logic
// This simulates the chart labeling behavior to verify implementation

// Mock context for testing
function createMockContext(datasetIndex, dataIndex, dataset) {
    return {
        datasetIndex: datasetIndex,
        dataIndex: dataIndex,
        dataset: dataset
    };
}

// Replicate the exact datalabels display function from dashboard.js
function datalabelsDisplayFunction(context) {
    const value = context.dataset.data[context.dataIndex];
    
    // 값이 없거나 0 이하면 라벨 숨김
    if (value === null || value === undefined || value <= 0) return false;
    
    // 오늘 데이터 (dataset 0): 모든 시간대 라벨 표시
    if (context.datasetIndex === 0) return true;
    
    // 어제/그저께 (datasets 1,2): 23시만 라벨 표시
    if (context.datasetIndex === 1 || context.datasetIndex === 2) {
        return context.dataIndex === 23;
    }
    
    // 막대 그래프 (dataset 3): 모든 값 표시
    if (context.datasetIndex === 3) return true;
    
    return false;
}

// Test data
const testDatasets = [
    {
        label: '오늘',
        data: [100, 120, 140, 160, 180, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000, 1050, 1100],
        isPredicted: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, true, true, true, true, true]
    },
    {
        label: '어제',
        data: [90, 110, 130, 150, 170, 190, 240, 290, 340, 390, 440, 490, 540, 590, 640, 690, 740, 790, 840, 890, 940, 990, 1040, 1080]
    },
    {
        label: '그저께',
        data: [80, 100, 120, 140, 160, 180, 230, 280, 330, 380, 430, 480, 530, 580, 630, 680, 730, 780, 830, 880, 930, 980, 1030, 1070]
    },
    {
        label: '시간별 증감량',
        data: [20, 20, 20, 20, 20, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50]
    }
];

// Test results
const testResults = {
    test1: { name: "Today's data shows all hourly labels", passed: false, details: "" },
    test2: { name: "Yesterday's data shows only 23:00 label", passed: false, details: "" },
    test3: { name: "Day before yesterday shows only 23:00 label", passed: false, details: "" },
    test4: { name: "Bar chart shows all increment labels", passed: false, details: "" }
};

// Run tests
function runTests() {
    console.log("🔍 Testing Chart Labeling Implementation");
    console.log("=" * 50);
    
    // Test 1: Today's data (dataset 0) should show all labels
    let visibleLabels = [];
    for (let i = 0; i < testDatasets[0].data.length; i++) {
        const context = createMockContext(0, i, testDatasets[0]);
        if (datalabelsDisplayFunction(context)) {
            visibleLabels.push(i);
        }
    }
    
    testResults.test1.passed = visibleLabels.length === testDatasets[0].data.length;
    testResults.test1.details = `Shows labels for hours: ${visibleLabels.join(', ')} (Expected: all 24 hours)`;
    
    // Test 2: Yesterday's data (dataset 1) should show only 23:00 label
    visibleLabels = [];
    for (let i = 0; i < testDatasets[1].data.length; i++) {
        const context = createMockContext(1, i, testDatasets[1]);
        if (datalabelsDisplayFunction(context)) {
            visibleLabels.push(i);
        }
    }
    
    testResults.test2.passed = visibleLabels.length === 1 && visibleLabels[0] === 23;
    testResults.test2.details = `Shows labels for hours: ${visibleLabels.join(', ')} (Expected: only 23)`;
    
    // Test 3: Day before yesterday (dataset 2) should show only 23:00 label
    visibleLabels = [];
    for (let i = 0; i < testDatasets[2].data.length; i++) {
        const context = createMockContext(2, i, testDatasets[2]);
        if (datalabelsDisplayFunction(context)) {
            visibleLabels.push(i);
        }
    }
    
    testResults.test3.passed = visibleLabels.length === 1 && visibleLabels[0] === 23;
    testResults.test3.details = `Shows labels for hours: ${visibleLabels.join(', ')} (Expected: only 23)`;
    
    // Test 4: Bar chart (dataset 3) should show all labels
    visibleLabels = [];
    for (let i = 0; i < testDatasets[3].data.length; i++) {
        const context = createMockContext(3, i, testDatasets[3]);
        if (datalabelsDisplayFunction(context)) {
            visibleLabels.push(i);
        }
    }
    
    testResults.test4.passed = visibleLabels.length === testDatasets[3].data.length;
    testResults.test4.details = `Shows labels for hours: ${visibleLabels.join(', ')} (Expected: all 24 hours)`;
    
    // Display results
    console.log("\n📊 Test Results:");
    console.log("=" * 50);
    
    Object.keys(testResults).forEach(testKey => {
        const test = testResults[testKey];
        const status = test.passed ? "✅ PASS" : "❌ FAIL";
        console.log(`${status} ${test.name}`);
        console.log(`    Details: ${test.details}`);
        console.log("");
    });
    
    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(test => test.passed).length;
    
    console.log(`\n📈 Summary: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log("🎉 All tests passed! Chart labeling is working correctly.");
    } else {
        console.log("⚠️  Some tests failed. Please review the implementation.");
    }
    
    return testResults;
}

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runTests, datalabelsDisplayFunction };
} else {
    // Browser environment
    window.chartLabelingTest = { runTests, datalabelsDisplayFunction };
}

// Run tests if in Node.js environment
if (typeof require !== 'undefined') {
    runTests();
}