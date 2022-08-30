import cron from '../../helpers/cron.js';
import utils from '../../helpers/utils.js';

describe('Initializing a cron using the day of the week', () => {
  afterEach(() => cron.payoutCronJob.stop());

  test('Init cron with "Mon" period should call a cron job with "0 0 * * Mon" pattern', () => {
    const cronResponseCode = cron.initCron('Mon');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 * * Mon');
  });

  test('Init cron with "Tue" period should call a cron job with "0 0 * * Tue" pattern', () => {
    const cronResponseCode = cron.initCron('Tue');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 * * Tue');
  });

  test('Init cron with "Wed" period should call a cron job with "0 0 * * Wed" pattern', () => {
    const cronResponseCode = cron.initCron('Wed');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 * * Wed');
  });

  test('Init cron with "Thu" period should call a cron job with "0 0 * * Thu" pattern', () => {
    const cronResponseCode = cron.initCron('Thu');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 * * Thu');
  });

  test('Init cron with "Fri" period should call a cron job with "0 0 * * Fri" pattern', () => {
    const cronResponseCode = cron.initCron('Fri');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 * * Fri');
  });

  test('Init cron with "Sat" period should call a cron job with "0 0 * * Sat" pattern', () => {
    const cronResponseCode = cron.initCron('Sat');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 * * Sat');
  });

  test('Init cron with "Sun" period should call a cron job with "0 0 * * Sun" pattern', () => {
    const cronResponseCode = cron.initCron('Sun');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 * * Sun');
  });
});

describe('Initializing a cron using a pattern', () => {
  afterEach(() => cron.payoutCronJob.stop());

  test('Init cron with "1h" period should call a cron job with "0 * * * *" pattern', () => {
    const cronResponseCode = cron.initCron('1h');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 * * * *');
  });

  test('Init cron with "1d" period should call a cron job with "0 0 * * *" pattern', () => {
    const cronResponseCode = cron.initCron('1d');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 * * *');
  });

  test('Init cron with "5d" period should call a cron job with "0 0 */5 * *" pattern', () => {
    const cronResponseCode = cron.initCron('5d');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 */5 * *');
  });

  test('Init cron with "10d" period should call a cron job with "0 0 */10 * *" pattern', () => {
    const cronResponseCode = cron.initCron('10d');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 */10 * *');
  });

  test('Init cron with "15d" period should call a cron job with "0 0 */15 * *" pattern', () => {
    const cronResponseCode = cron.initCron('15d');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 */15 * *');
  });

  test('Init cron with "30d" period should call a cron job with "0 0 1 * *" pattern', () => {
    const cronResponseCode = cron.initCron('30d');

    expect(cronResponseCode).not.toBe(-1);
    expect(cron.payoutCronJob.cronTime.source).toBe('0 0 1 * *');
  });
});

describe('Invalid period', () => {
  beforeAll(() => cron.payoutCronJob = {});

  test('Init cron with "32d" period should return -1', () => {
    const cronResponseCode = cron.initCron('32d');

    expect(cronResponseCode).toBe(-1);
    expect(utils.isPlainObject(cron.payoutCronJob)).toBeTruthy();
  });

  test('Init cron with "2h" period should return -1', () => {
    const cronResponseCode = cron.initCron('2h');

    expect(cronResponseCode).toBe(-1);
    expect(utils.isPlainObject(cron.payoutCronJob)).toBeTruthy();
  });

  test('Init cron with "Sar" period should return -1', () => {
    const cronResponseCode = cron.initCron('Sar');

    expect(cronResponseCode).toBe(-1);
    expect(utils.isPlainObject(cron.payoutCronJob)).toBeTruthy();
  });

  test('Init cron with "" period should return -1', () => {
    const cronResponseCode = cron.initCron('');

    expect(cronResponseCode).toBe(-1);
    expect(utils.isPlainObject(cron.payoutCronJob)).toBeTruthy();
  });

  test('Init cron with null period should return -1', () => {
    const cronResponseCode = cron.initCron(null);

    expect(cronResponseCode).toBe(-1);
    expect(utils.isPlainObject(cron.payoutCronJob)).toBeTruthy();
  });

  test('Init cron with null period should return -1', () => {
    const cronResponseCode = cron.initCron(null);

    expect(cronResponseCode).toBe(-1);
    expect(utils.isPlainObject(cron.payoutCronJob)).toBeTruthy();
  });
});
