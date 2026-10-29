const EVENT = 'notice-processed';

// Number의 십진 표현을 정수와 자릿수로 바꿔 SDK 반올림·부동소수 누적 오차를 피한다.
function decimal(value) {
  const [mantissa, exponent = '0'] = String(value).split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  return { units: BigInt(whole + fraction), scale: fraction.length - Number(exponent) };
}

function fitsBudget(price, count, budget) {
  const a = decimal(price);
  const b = decimal(budget);
  const scale = Math.max(a.scale, b.scale);
  return a.units * BigInt(count) * 10n ** BigInt(scale - a.scale)
    <= b.units * 10n ** BigInt(scale - b.scale);
}

// SDK 3.7.0의 첫 이벤트 예산 예외와 0→Infinity 변환을 저장 전에 차단한다.
export function createNoticeEmitter(actor) {
  const manager = actor.getChargingManager();
  const pricing = manager.getPricingInfo();
  if (typeof pricing?.isPayPerEvent !== 'boolean') throw new Error('Unable to verify pricing.');
  if (!pricing.isPayPerEvent) return result => actor.pushData(result);
  const prices = pricing.perEventPrices;
  if (!prices || Object.keys(prices).length !== 1 || !Object.hasOwn(prices, EVENT)
    || !Number.isFinite(prices[EVENT]) || prices[EVENT] <= 0) throw new Error('Pricing must contain only a positive notice-processed event.');
  if (!Number.isFinite(pricing.maxTotalChargeUsd) || pricing.maxTotalChargeUsd < 0) throw new Error('Set an explicit finite maximum charge budget before running.');
  return async result => {
    const charged = manager.getChargedEventCount(EVENT);
    if (!Number.isSafeInteger(charged) || charged < 0 || charged === Number.MAX_SAFE_INTEGER) throw new Error('Unable to verify charged event count.');
    if (!fitsBudget(prices[EVENT], charged + 1, pricing.maxTotalChargeUsd)) return { eventChargeLimitReached: true };
    const available = manager.calculateMaxEventChargeCountWithinLimit(EVENT);
    if (!Number.isSafeInteger(available) || available < 1) return { eventChargeLimitReached: true };
    const charge = await actor.pushData(result, EVENT);
    // SDK 반환 chargedCount에는 무가격 synthetic dataset 이벤트도 합산된다.
    if (manager.getChargedEventCount(EVENT) !== charged + 1) throw new Error('Dataset write and charge could not be confirmed as one event; do not retry this run.');
    return charge;
  };
}
