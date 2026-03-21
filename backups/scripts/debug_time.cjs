const now = new Date();
console.log('getTime:', now.getTime());
console.log('getDay:', now.getDay());
console.log('toLocaleDateString:', now.toLocaleDateString());
console.log('getHours:', now.getHours());
console.log('getMinutes:', now.getMinutes());
const DAYS_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토'];
console.log('currentDay:', DAYS_OF_WEEK[now.getDay()]);
