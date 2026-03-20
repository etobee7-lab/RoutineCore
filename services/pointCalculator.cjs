/**
 * RoutineCore Point Calculator Service
 * 자정 정산 로직을 담당하는 비즈니스 모듈입니다.
 */

function calculateDailyPoints(todos, dayStr) {
    let totalMissions = 0;
    let adjustedCount = 0;
    let completedMissions = 0;

    for (const todo of todos) {
        const scheduledDays = todo.days ? todo.days.split(',').map(d => d.trim()) : [];
        if (scheduledDays.includes(dayStr)) {
            totalMissions++;
            if (todo.completed) {
                completedMissions++;
                // 포인트 가산 로직: 실패(isFailed) 표기 항목은 0.5점, 정상 완료는 1.0점
                adjustedCount += todo.isFailed ? 0.5 : 1.0;
            }
        }
    }

    if (totalMissions === 0) return 0;

    // 최종 정산 포인트 (백분율)
    return Math.floor((adjustedCount / totalMissions) * 100);
}

module.exports = {
    calculateDailyPoints
};
