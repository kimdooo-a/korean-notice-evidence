const EVENT = 'notice-processed';

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
    const available = manager.calculateMaxEventChargeCountWithinLimit(EVENT);
    if (!Number.isSafeInteger(available) || available < 1) return { eventChargeLimitReached: true };
    return actor.pushData(result, EVENT);
  };
}
