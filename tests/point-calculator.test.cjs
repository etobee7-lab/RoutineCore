const { calculateDailyPoints } = require('../services/pointCalculator.cjs');

describe('RoutineCore Point Calculator', () => {
    test('정상 완료 미션은 100% 점수를 부여해야 함', () => {
        const todos = [
            { text: '아침 기상', days: '월,화,수', completed: true, isFailed: false },
            { text: '운동', days: '월,화,수', completed: true, isFailed: false }
        ];
        const dayStr = '월';
        expect(calculateDailyPoints(todos, dayStr)).toBe(100);
    });

    test('실패(isFailed) 표기 항목은 50%만 인정해야 함', () => {
        const todos = [
            { text: '아침 기상', days: '월,화,수', completed: true, isFailed: true },
            { text: '운동', days: '월,화,수', completed: true, isFailed: false }
        ];
        const dayStr = '월';
        // (0.5 + 1.0) / 2 = 0.75 -> Math.floor(75%)
        expect(calculateDailyPoints(todos, dayStr)).toBe(75);
    });

    test('해당 요일이 아닌 미션은 정산에서 제외해야 함', () => {
        const todos = [
            { text: '아침 기상', days: '월,화,수', completed: true, isFailed: false },
            { text: '주말 청소', days: '토,일', completed: false, isFailed: false }
        ];
        const dayStr = '월';
        // '주말 청소'는 제외되므로 1/1 = 100%
        expect(calculateDailyPoints(todos, dayStr)).toBe(100);
    });

    test('전체 미션 중 일부만 완료 시 정확한 백분율을 반환해야 함', () => {
        const todos = [
            { text: '미션1', days: '월', completed: true, isFailed: false },
            { text: '미션2', days: '월', completed: false, isFailed: false }
        ];
        const dayStr = '월';
        expect(calculateDailyPoints(todos, dayStr)).toBe(50);
    });
});
